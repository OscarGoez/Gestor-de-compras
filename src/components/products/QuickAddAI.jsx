// src/components/products/QuickAddAI.jsx
import React, { useState } from 'react';
import { Sparkles, X, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { productsService } from '../../api/products.service';
import { useHousehold } from '../../context/HouseholdContext';
import aiService from '../../api/ai.service';

const QuickAddAI = ({ onClose, onAdd }) => {
  const [inputText, setInputText] = useState('');
  const [parsedProduct, setParsedProduct] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [adding, setAdding] = useState(false);
  
  const { householdId } = useHousehold();

  const handleParse = async () => {
    if (!inputText.trim()) {
      setError('Por favor escribe algo');
      return;
    }

    setLoading(true);
    setError(null);
    setParsedProduct(null);

    try {
      console.log('🤖 Procesando:', inputText);
      const result = await aiService.parseProductFromText(inputText);
      
      console.log('📦 Resultado:', result);
      
      // VALIDACIÓN CORREGIDA
      if (result && typeof result === 'object' && result.name) {
        console.log('✅ Producto válido:', result);
        setParsedProduct(result);
      } else {
        console.log('❌ Producto inválido - estructura incorrecta');
        setError('No pude interpretar el producto. Intenta con otro formato.');
      }
    } catch (err) {
      console.error('❌ Error:', err);
      setError('Error al procesar con IA');
    } finally {
      setLoading(false);
    }
  };

  // En QuickAddAI.jsx, reemplaza handleAddProduct con esta versión:

  const handleAddProduct = async () => {
    if (!parsedProduct || !householdId) {
      setError('No hay producto para añadir o no hay hogar seleccionado');
      return;
    }
  
    setAdding(true);
    setError(null);
  
    try {
      // Validar nombre
      if (!parsedProduct.name || parsedProduct.name.trim() === '') {
        throw new Error('El nombre del producto es obligatorio');
      }
    
      // 1. CATEGORÍAS - MAPEO EXACTO
      const categoryMap = {
        'Alimentos': 'alimentos',
        'Aseo Personal': 'aseo',
        'Bebidas': 'bebidas',
        'Limpieza': 'limpieza',
        'Farmacia': 'farmacia',
        'Otros': 'otros',
        'alimentos': 'alimentos',
        'aseo personal': 'aseo',
        'aseo': 'aseo',
        'bebidas': 'bebidas',
        'limpieza': 'limpieza',
        'farmacia': 'farmacia',
        'otros': 'otros'
      };
    
      const iaCategory = parsedProduct.category;
      console.log('🎯 Categoría IA:', iaCategory);
      
      const category = categoryMap[iaCategory] || 'otros';
      console.log('📋 Categoría validada:', category);
    
      // 2. UNIDADES - MAPEO
      const unitMap = {
        'ml': 'ml',
        'grams': 'g',
        'units': 'units'
      };
      
      const unit = unitMap[parsedProduct.unit] || 'units';
      console.log('📏 Unidad:', unit);
    
      // 3. CANTIDAD
      const quantity = Number(parsedProduct.quantity) || 1;
    
      // 4. PREPARAR DATOS
      const productData = {
        name: parsedProduct.name.trim(),
        category: category,
        quantityCurrent: quantity,
        quantityTotal: quantity,
        unit: unit,
        status: 'available',
        lowStockThreshold: 0.2,
        autoAddedToShopping: false,
        householdId: householdId,
        notes: `Añadido con IA desde: "${inputText}"`,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastOpenedAt: null,
        expirationDate: parsedProduct.expirationDate || null
      };
    
      console.log('💾 Datos finales:', productData);
      
      const result = await productsService.createProduct(productData, householdId);
    
      if (result?.success) {
        setSuccess(true);
        setTimeout(() => {
          onAdd?.();
          onClose();
        }, 1500);
      } else {
        const errorMsg = result?.validationErrors 
          ? result.validationErrors.join(', ')
          : (result?.error || 'Error al guardar');
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error('❌ Error guardando:', err);
      setError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleParse();
    }
  };

  // Unidades para mostrar
  const getUnitLabel = (unit) => {
    const labels = {
      'ml': 'ml',
      'grams': 'g',
      'units': 'uds'
    };
    return labels[unit] || unit;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-4 z-50">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 animate-slide-up">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-semibold">Añadir con IA</h3>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            disabled={loading || adding}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-green-700 text-sm">¡Producto añadido correctamente!</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Input */}
        <div className="mb-4">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ej: jabón de manos 3 unidades o leche 2 litros"
            className="w-full p-3 border rounded-lg resize-none h-24 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            disabled={loading || adding || success}
            autoFocus
          />
          <p className="text-xs text-gray-400 mt-1">
            ⏎ Enter para interpretar
          </p>
        </div>

        {/* Botón interpretar */}
        {!parsedProduct && (
          <button
            onClick={handleParse}
            disabled={loading || !inputText.trim() || success}
            className="w-full bg-purple-500 text-white py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-600 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                Interpretando con IA...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Interpretar con IA
              </>
            )}
          </button>
        )}

        {/* Resultado */}
        {parsedProduct && !success && (
          <div className="mt-4 bg-purple-50 p-4 rounded-lg border border-purple-200">
            <h4 className="font-medium mb-3 flex items-center gap-2 text-purple-900">
              <Sparkles className="w-4 h-4" />
              Producto detectado por IA:
            </h4>
            
            <div className="space-y-3 text-sm mb-4">
              <div className="flex justify-between items-center py-2 border-b border-purple-200">
                <span className="text-gray-600">Nombre:</span>
                <span className="font-semibold text-purple-900 capitalize">
                  {parsedProduct.name}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-purple-200">
                <span className="text-gray-600">Cantidad:</span>
                <span className="font-semibold">
                  {parsedProduct.quantity} {
                    parsedProduct.unit === 'ml' ? 'ml' :
                    parsedProduct.unit === 'grams' ? 'g' :
                    'unidades'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">Categoría:</span>
                <span className="font-semibold bg-purple-100 px-3 py-1 rounded-full text-purple-700">
                  {parsedProduct.category}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleAddProduct}
                disabled={adding}
                className="flex-1 bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {adding ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Añadiendo...
                  </>
                ) : (
                  '✓ Confirmar y añadir'
                )}
              </button>
              <button
                onClick={() => {
                  setParsedProduct(null);
                  setInputText('');
                }}
                disabled={adding}
                className="px-4 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Corregir
              </button>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="mt-4 text-xs text-gray-400">
          <p className="font-medium mb-2">💡 Ejemplos con IA:</p>
          <div className="grid grid-cols-2 gap-2">
            <span className="bg-gray-50 p-2 rounded">jabón 3</span>
            <span className="bg-gray-50 p-2 rounded">leche 2 litros</span>
            <span className="bg-gray-50 p-2 rounded">arroz 5 kilos</span>
            <span className="bg-gray-50 p-2 rounded">cloro 1 galón</span>
            <span className="bg-gray-50 p-2 rounded">shampoo 400 ml</span>
            <span className="bg-gray-50 p-2 rounded">huevos 12</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuickAddAI;