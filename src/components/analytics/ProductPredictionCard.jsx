// src/components/analytics/ProductPredictionCard.jsx
import React from 'react';
import { Calendar, Clock, AlertTriangle, TrendingUp, Package, Info } from 'lucide-react';

const ProductPredictionCard = ({ prediction, product, onClick }) => {
  if (!prediction || !product) return null;

  const getConfidenceColor = () => {
    switch(prediction.confidence) {
      case 'alta': return 'bg-green-100 text-green-800 border-green-200';
      case 'media': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDaysLeftColor = () => {
    if (prediction.estimatedDaysLeft <= 3) return 'text-red-600 bg-red-50 border-red-200';
    if (prediction.estimatedDaysLeft <= 7) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getProgressPercentage = () => {
    if (!product.quantityTotal || product.quantityTotal === 0) return 0;
    return (product.quantityCurrent / product.quantityTotal) * 100;
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all cursor-pointer overflow-hidden"
    >
      {/* Header con producto */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{product.name}</h3>
            <p className="text-sm text-gray-600 capitalize">{product.category}</p>
          </div>
          
          {/* Indicador de confianza */}
          <span className={`text-xs px-2 py-1 rounded-full border ${getConfidenceColor()}`}>
            Confianza {prediction.confidence}
          </span>
        </div>
      </div>

      {/* Cuerpo de la predicción */}
      <div className="p-4 space-y-4">
        {/* Barra de progreso */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-700">Stock actual</span>
            <span className="font-medium text-gray-900">
              {product.quantityCurrent} / {product.quantityTotal} {product.unit}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${
                getProgressPercentage() < 20 ? 'bg-red-500' :
                getProgressPercentage() < 50 ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
        </div>

        {/* Métricas clave */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`p-3 rounded-lg border ${getDaysLeftColor()}`}>
            <div className="flex items-center mb-1">
              <Clock className="h-4 w-4 mr-1" />
              <span className="text-xs font-medium">Días restantes</span>
            </div>
            <span className="text-xl font-bold">
              {prediction.estimatedDaysLeft || '?'}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-blue-100 bg-blue-50">
            <div className="flex items-center mb-1">
              <TrendingUp className="h-4 w-4 text-blue-600 mr-1" />
              <span className="text-xs font-medium text-blue-800">Consumo diario</span>
            </div>
            <span className="text-xl font-bold text-blue-700">
              {prediction.dailyConsumptionRate?.toFixed(2) || '0'}
            </span>
          </div>
        </div>

        {/* Fecha estimada de agotamiento */}
        {prediction.estimatedFinishDate && (
          <div className="flex items-center text-sm p-2 bg-gray-50 rounded-lg">
            <Calendar className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-gray-700">
              Se agotará alrededor del{' '}
              <span className="font-medium">
                {new Date(prediction.estimatedFinishDate).toLocaleDateString()}
              </span>
            </span>
          </div>
        )}

        {/* Insights */}
        {prediction.insights && prediction.insights.length > 0 && (
          <div className="space-y-2">
            {prediction.insights.slice(0, 2).map((insight, idx) => (
              <div key={idx} className="flex items-start text-sm">
                <Info className="h-4 w-4 text-primary-500 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">{insight}</span>
              </div>
            ))}
          </div>
        )}

        {/* Alerta de bajo stock */}
        {(product.status === 'low' || product.status === 'out') && (
          <div className="flex items-center p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-600 mr-2 flex-shrink-0" />
            <span className="text-sm text-amber-800">
              {product.status === 'out' 
                ? 'Producto agotado - agregar a lista de compras'
                : 'Producto en bajo stock'}
            </span>
          </div>
        )}
      </div>

      {/* Indicador de calidad de datos */}
      {prediction.dataQuality && prediction.dataQuality.includes('Muy baja') && (
        <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center text-xs text-gray-600">
            <Info className="h-3 w-3 mr-1 flex-shrink-0" />
            <span>Registra más consumos para mejorar predicciones</span>
          </div>
        </div>
      )}

      {/* Indicador de confianza para analytics */}
      {prediction.confidence && (
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-gray-500">Confianza:</span>
          <span className={`px-2 py-0.5 rounded-full ${
            prediction.confidence === 'alta' ? 'bg-green-100 text-green-800' :
            prediction.confidence === 'media' ? 'bg-amber-100 text-amber-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {prediction.confidence}
          </span>
        </div>
      )}
      
      {/* Mostrar calidad de datos */}
      {prediction.dataQuality && (
        <div className="mt-1 flex items-center text-xs text-gray-500">
          <Info className="h-3 w-3 mr-1" />
          <span>{prediction.dataQuality}</span>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 flex justify-between">
        <span>Recomendado: {prediction.recommendedPurchaseQuantity} {product.unit}</span>
        <span>Calidad datos: {prediction.dataQuality || 'Básica'}</span>
      </div>
    </div>
  );
};

export default ProductPredictionCard;