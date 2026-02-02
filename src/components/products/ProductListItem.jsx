import React, { useState } from 'react';
import { 
  Package, 
  Battery,
  Calendar,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Minus,
  PackageOpen,
  ShoppingCart
} from 'lucide-react';
import ProductDetailModal from './ProductDetailModal';

const ProductListItem = ({ product, onConsume, onOpen, onRestore }) => {
  const [showDetail, setShowDetail] = useState(false);
  const [consuming, setConsuming] = useState(false);

  const getStatusInfo = (status) => {
    switch(status) {
      case 'out': return { color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle };
      case 'low': return { color: 'text-amber-600', bg: 'bg-amber-100', icon: TrendingDown };
      default: return { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle };
    }
  };

  const statusInfo = getStatusInfo(product.status);
  const StatusIcon = statusInfo.icon;

  // Calcular porcentaje
  const percentage = product.quantityTotal > 0 
    ? Math.round((product.quantityCurrent / product.quantityTotal) * 100) 
    : 0;

  // Manejar consumo rápido
  const handleQuickConsume = async (e) => {
    e.stopPropagation();
    if (consuming || product.status === 'out') return;
    
    setConsuming(true);
    try {
      await onConsume(product.id, 1);
    } catch (error) {
      console.error('Error consumiendo:', error);
    } finally {
      setConsuming(false);
    }
  };

  // Formatear fecha corta
  const formatShortDate = (date) => {
    if (!date) return null;
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      const today = new Date();
      const diffDays = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return 'Vencido';
      if (diffDays <= 7) return `${diffDays}d`;
      return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
    } catch {
      return null;
    }
  };

  const expirationBadge = formatShortDate(product.expirationDate);

  return (
    <>
      <div 
        className="bg-white border-b border-gray-200 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => setShowDetail(true)}
      >
        <div className="flex items-center justify-between">
          {/* Información principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <div className="p-2 bg-primary-50 rounded-lg mr-3">
                <Package className="h-5 w-5 text-primary-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900 truncate">
                    {product.name}
                  </h3>
                  <span className="text-sm text-gray-500 ml-2">
                    {product.quantityCurrent}/{product.quantityTotal} {product.unit}
                  </span>
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  {/* Estado */}
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {product.status === 'out' ? 'Agotado' : 
                     product.status === 'low' ? 'Bajo' : 
                     'Disponible'}
                  </span>
                  
                  {/* Fecha de vencimiento */}
                  {expirationBadge && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      <Calendar className="h-3 w-3 mr-1" />
                      {expirationBadge}
                    </span>
                  )}
                  
                  {/* En lista de compras */}
                  {product.autoAddedToShopping && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-700">
                      <ShoppingCart className="h-3 w-3 mr-1" />
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Barra de progreso compacta */}
            <div className="mt-2 ml-11">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center">
                  <Battery className={`h-4 w-4 mr-2 ${
                    percentage <= 20 ? 'text-red-500' :
                    percentage <= 50 ? 'text-amber-500' :
                    'text-green-500'
                  }`} />
                  <span className="text-xs text-gray-500">
                    {percentage}%
                  </span>
                </div>
                <span className="text-xs text-gray-400">
                  {product.category || 'Sin categoría'}
                </span>
              </div>
              
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${
                    product.status === 'out' ? 'bg-red-500' :
                    product.status === 'low' ? 'bg-amber-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Acciones rápidas */}
          <div className="flex items-center ml-4 space-x-1">
            {/* Botón de consumo rápido */}
            {product.status !== 'out' && (
              <button
                onClick={handleQuickConsume}
                disabled={consuming}
                className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="Consumir 1 unidad"
              >
                {consuming ? (
                  <span className="animate-spin text-sm">⟳</span>
                ) : (
                  <Minus className="h-4 w-4" />
                )}
              </button>
            )}
            
            {/* Flecha para detalles */}
            <ChevronRight className="h-5 w-5 text-gray-400 ml-2" />
          </div>
        </div>
      </div>

      {/* Modal de detalles */}
      <ProductDetailModal
        product={product}
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        onConsume={onConsume}
        onOpen={onOpen}
        onRestore={onRestore}
      />
    </>
  );
};

export default ProductListItem;