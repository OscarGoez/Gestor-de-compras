import React, { useState } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { Calendar } from 'lucide-react';

const ExpirationDateModal = ({ 
  isOpen, 
  onClose, 
  productName,
  onConfirm,
  initialDate = null
}) => {
  const [dateType, setDateType] = useState('default'); // 'default', 'specific', 'none'
  const [specificDate, setSpecificDate] = useState('');
  const [customDays, setCustomDays] = useState(30);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    let expirationDate = null;

    if (dateType === 'specific' && specificDate) {
      expirationDate = new Date(specificDate);
      if (isNaN(expirationDate.getTime())) {
        alert('Fecha inválida');
        return;
      }
    } else if (dateType === 'default') {
      expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + customDays);
    }
    // Si es 'none', expirationDate queda null

    setLoading(true);
    try {
      await onConfirm(expirationDate);
      onClose();
    } catch (error) {
      console.error('Error al confirmar fecha:', error);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 5);
  const maxDateString = maxDate.toISOString().split('T')[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Nueva fecha de vencimiento - ${productName}`}
      size="md"
    >
      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">
            Este producto tenía fecha de vencimiento anteriormente.
            ¿Cómo deseas configurar la nueva fecha?
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                checked={dateType === 'default'}
                onChange={() => setDateType('default')}
                className="h-4 w-4 text-blue-600"
              />
              <div className="flex-1">
                <span className="font-medium text-gray-900">Usar fecha por defecto</span>
                <p className="text-sm text-gray-600">
                  {customDays} días desde hoy
                </p>
              </div>
            </label>
            
            {dateType === 'default' && (
              <div className="mt-3 ml-7">
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="1"
                    max="365"
                    value={customDays}
                    onChange={(e) => setCustomDays(parseInt(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium text-gray-700 w-16">
                    {customDays} días
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Nueva fecha: {(() => {
                    const date = new Date();
                    date.setDate(date.getDate() + customDays);
                    return date.toLocaleDateString('es-ES', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    });
                  })()}
                </p>
              </div>
            )}
          </div>

          <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              checked={dateType === 'specific'}
              onChange={() => setDateType('specific')}
              className="h-4 w-4 text-blue-600"
            />
            <div className="flex-1">
              <span className="font-medium text-gray-900">Elegir fecha específica</span>
              <p className="text-sm text-gray-600">
                Selecciona una fecha exacta
              </p>
            </div>
          </label>
          
          {dateType === 'specific' && (
            <div className="mt-3 ml-7">
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  min={today}
                  max={maxDateString}
                  className="px-3 py-2 border border-gray-300 rounded-md w-full"
                />
              </div>
              {specificDate && (
                <p className="text-xs text-gray-500 mt-1">
                  Seleccionado: {new Date(specificDate).toLocaleDateString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              )}
            </div>
          )}

          <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              checked={dateType === 'none'}
              onChange={() => setDateType('none')}
              className="h-4 w-4 text-blue-600"
            />
            <div className="flex-1">
              <span className="font-medium text-gray-900">Sin fecha de vencimiento</span>
              <p className="text-sm text-gray-600">
                El producto no caduca
              </p>
            </div>
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            loading={loading}
          >
            Confirmar
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ExpirationDateModal;