// components/products/ConsumeModal.jsx
import React, { useState, useEffect } from 'react';
import { Minus, Plus, X, Package, RotateCcw } from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';

const ConsumeModal = ({ 
  product, 
  isOpen, 
  onClose, 
  onConsume,
  isLoading = false
}) => {
  const [amount, setAmount] = useState('1');
  const [suggestedAmounts, setSuggestedAmounts] = useState([]);
  const [error, setError] = useState('');

  // Calcular cantidades sugeridas basadas en el tipo de unidad
  useEffect(() => {
    if (!product || !isOpen) {
      setAmount('1');
      setError('');
      return;
    }
    
    const unit = (product.unit || 'units').toLowerCase();
    const currentQuantity = Number(product.quantityCurrent) || 0;
    
    // Mapeo de sugerencias por tipo de unidad
    const suggestionsMap = {
      // Unidades enteras
      'units': [1, 2, 5, 10],
      'unidades': [1, 2, 5, 10],
      'piezas': [1, 2, 5, 10],
      'bolsas': [1, 2, 3, 5],
      'paquetes': [1, 2, 3, 5],
      'botellas': [1, 2, 3, 6],
      'latas': [1, 2, 4, 6, 12],
      
      // Peso (kg, g)
      'kg': [0.1, 0.25, 0.5, 1, 2],
      'g': [50, 100, 250, 500, 1000],
      'gramos': [50, 100, 250, 500, 1000],
      
      // Volumen (L, ml)
      'l': [0.1, 0.25, 0.5, 1, 1.5],
      'litros': [0.1, 0.25, 0.5, 1, 1.5],
      'ml': [50, 100, 250, 500, 1000],
      'mililitros': [50, 100, 250, 500, 1000],
      
      // Por defecto
      'default': [1, 2, 5, 10]
    };

    // Obtener sugerencias o usar las por defecto
    let suggestions = suggestionsMap[unit] || suggestionsMap.default;
    
    // Filtrar sugerencias que no excedan la cantidad disponible
    suggestions = suggestions.filter(s => s <= currentQuantity && s > 0);
    
    // Si no hay sugerencias válidas, crear algunas basadas en la cantidad disponible
    if (suggestions.length === 0 && currentQuantity > 0) {
      if (currentQuantity <= 10) {
        suggestions = [1, Math.floor(currentQuantity / 2), currentQuantity];
      } else {
        suggestions = [
          1, 
          2, 
          5, 
          Math.floor(currentQuantity / 4), 
          Math.floor(currentQuantity / 2),
          currentQuantity
        ].filter(s => s > 0);
      }
    }
    
    setSuggestedAmounts(suggestions.slice(0, 6));
    
    // Si el producto tiene 0 unidades, mostrar error
    if (currentQuantity <= 0) {
      setError('Este producto está agotado. No puedes consumirlo.');
      setAmount('0');
    } else {
      setError('');
      setAmount('1');
    }
  }, [product, isOpen]);

  const handleConsume = () => {
    if (!product) return;
    
    const consumeAmount = parseFloat(amount);
    
    // Validaciones
    if (!amount || isNaN(consumeAmount) || consumeAmount <= 0) {
      setError('Por favor ingresa una cantidad válida (mayor a 0)');
      return;
    }

    if (consumeAmount > product.quantityCurrent) {
      setError(`No puedes consumir más de ${product.quantityCurrent} ${product.unit}`);
      return;
    }

    // Limpiar error y consumir
    setError('');
    onConsume(consumeAmount);
  };

  const handleQuickConsume = (quickAmount) => {
    if (!product) return;
    
    if (quickAmount > product.quantityCurrent) {
      setError(`Cantidad máxima: ${product.quantityCurrent} ${product.unit}`);
      return;
    }
    
    setAmount(quickAmount.toString());
    setError('');
  };

  const handleConsumeAll = () => {
    if (!product || product.quantityCurrent <= 0) return;
    
    setAmount(product.quantityCurrent.toString());
    setError('');
  };

  const handleInputChange = (value) => {
    // Permitir números con decimales y vacío
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
      setError('');
    }
  };

  const handleIncrement = () => {
    if (!product) return;
    
    const current = parseFloat(amount) || 0;
    const step = (product.unit || 'units').toLowerCase() === 'units' ? 1 : 0.1;
    const max = product.quantityCurrent;
    const newValue = Math.min(max, current + step);
    
    if (newValue > max) {
      setError(`Cantidad máxima: ${max} ${product.unit}`);
    } else {
      setAmount(newValue.toFixed(2));
      setError('');
    }
  };

  const handleDecrement = () => {
    const current = parseFloat(amount) || 0;
    const step = (product.unit || 'units').toLowerCase() === 'units' ? 1 : 0.1;
    const newValue = Math.max(0, current - step);
    
    setAmount(newValue > 0 ? newValue.toFixed(2) : '');
    setError('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleConsume();
    }
  };

  if (!product) return null;

  const unit = product.unit || 'units';
  const remainingAfterConsumption = product.quantityCurrent - (parseFloat(amount) || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Consumir ${product.name}`}
      size="sm"
    >
      <div className="space-y-6">
        {/* Información del producto */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <div className="p-2 bg-primary-100 rounded-lg mr-3">
                <Package className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">{product.name}</h4>
                <div className="text-sm text-gray-600">
                  Disponible: <span className="font-bold">{product.quantityCurrent} {unit}</span>
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {product.category || 'Sin categoría'}
            </div>
          </div>
          {error && (
            <div className="mt-2 p-2 bg-red-50 text-red-700 rounded text-sm">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Control de cantidad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Cantidad a consumir ({unit})
          </label>
          
          <div className="flex items-center justify-center space-x-4 mb-4">
            <button
              type="button"
              onClick={handleDecrement}
              disabled={!amount || parseFloat(amount) <= 0}
              className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Minus className="h-5 w-5 text-gray-700" />
            </button>
            
            <div className="relative flex-1 max-w-xs">
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-3 text-2xl font-bold text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="0"
                autoFocus
                disabled={product.quantityCurrent <= 0}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                {unit}
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleIncrement}
              disabled={parseFloat(amount || 0) >= product.quantityCurrent || product.quantityCurrent <= 0}
              className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="h-5 w-5 text-gray-700" />
            </button>
          </div>
          
          {/* Indicador visual */}
          {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
            <div className="text-center mb-4">
              <div className="inline-block px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm mb-1">
                Consumirás: <span className="font-bold">{parseFloat(amount)} {unit}</span>
              </div>
              <div className="text-xs text-gray-500">
                Quedarán: <span className="font-medium">{Math.max(0, remainingAfterConsumption).toFixed(2)} {unit}</span>
              </div>
            </div>
          )}
        </div>

        {/* Consumir todo */}
        {product.quantityCurrent > 1 && (
          <button
            type="button"
            onClick={handleConsumeAll}
            className="w-full px-4 py-3 bg-red-50 text-red-700 rounded-lg font-medium hover:bg-red-100 transition-colors flex items-center justify-center"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Consumir todo ({product.quantityCurrent} {unit})
          </button>
        )}

        {/* Cantidades sugeridas */}
        {suggestedAmounts.length > 0 && (
          <div>
            <p className="text-sm text-gray-600 mb-3">Cantidades comunes:</p>
            <div className="grid grid-cols-3 gap-2">
              {suggestedAmounts.map((suggestedAmount) => (
                <button
                  key={suggestedAmount}
                  type="button"
                  onClick={() => handleQuickConsume(suggestedAmount)}
                  disabled={suggestedAmount > product.quantityCurrent}
                  className={`px-3 py-3 text-sm font-medium rounded-lg transition-colors ${
                    suggestedAmount > product.quantityCurrent
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                  }`}
                >
                  {suggestedAmount} {unit}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sugerencias específicas para pan */}
        {(product.name.toLowerCase().includes('pan') || product.name.toLowerCase().includes('rebanada')) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-sm font-medium text-yellow-800 mb-2">🍞 Para pan tajado:</p>
            <div className="grid grid-cols-3 gap-2">
              {[2, 4, 8, 12, 16, 20].map(slices => (
                <button
                  key={slices}
                  type="button"
                  onClick={() => handleQuickConsume(slices)}
                  disabled={slices > product.quantityCurrent}
                  className={`px-2 py-2 text-xs rounded hover:bg-yellow-200 ${
                    slices > product.quantityCurrent
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {slices} rebanadas
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConsume}
            disabled={
              !amount || 
              isLoading || 
              parseFloat(amount) > product.quantityCurrent || 
              parseFloat(amount) <= 0 ||
              product.quantityCurrent <= 0
            }
            loading={isLoading}
            className="flex-1"
          >
            Confirmar consumo
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConsumeModal;