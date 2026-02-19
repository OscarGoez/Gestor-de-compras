// components/products/ProductCard.jsx - VERSIÓN ACTUALIZADA
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { 
  Package, 
  Edit2, 
  Trash2, 
  CheckCircle,
  AlertTriangle,
  TrendingDown,
  Calendar,
  MoreVertical,
  Battery,
  Minus,
  PackageOpen,
  RotateCcw,
  Clock,
  History,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  Eye,
  Plus
} from 'lucide-react';
import ProductDeleteModal from './ProductDeleteModal';
import ConsumeModal from './ConsumeModal'; 
import { formatDateShort } from '../../utils/date.utils';

const ProductCard = ({ 
  product, 
  onUpdate, 
  onDelete, 
  onConsume, 
  onOpen, 
  onRestore, 
  onEdit,
  onViewDetails 
}) => {
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [consuming, setConsuming] = useState(false);
  const [opening, setOpening] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showConsumeModal, setShowConsumeModal] = useState(false); // ← NUEVO ESTADO

  const getStatusInfo = (status) => {
    switch(status) {
      case 'out': return { 
        color: 'bg-red-100 text-red-800 border-red-200',
        bgColor: 'bg-red-50',
        icon: AlertTriangle,
        label: 'Agotado',
        actionColor: 'text-red-600',
        actionBg: 'bg-red-50'
      };
      case 'low': return { 
        color: 'bg-amber-100 text-amber-800 border-amber-200',
        bgColor: 'bg-amber-50',
        icon: TrendingDown,
        label: 'Bajo stock',
        actionColor: 'text-amber-600',
        actionBg: 'bg-amber-50'
      };
      default: return { 
        color: 'bg-green-100 text-green-800 border-green-200',
        bgColor: 'bg-green-50',
        icon: CheckCircle,
        label: 'Disponible',
        actionColor: 'text-green-600',
        actionBg: 'bg-green-50'
      };
    }
  };
  

  const statusInfo = getStatusInfo(product.status);
  const StatusIcon = statusInfo.icon;

  // Calcular porcentaje
  const percentage = product.quantityTotal > 0 
    ? Math.round((product.quantityCurrent / product.quantityTotal) * 100) 
    : 0;

  // Formatear fecha de vencimiento
  const formatExpirationDate = (date) => {
    if (!date) return 'Sin fecha';
    
    try {
      const expDate = date.toDate ? date.toDate() : new Date(date);
      const today = new Date();
      const diffTime = expDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return 'Vencido';
      if (diffDays === 0) return 'Hoy';
      if (diffDays === 1) return 'Mañana';
      if (diffDays <= 7) return `En ${diffDays} días`;
      
      return expDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Solo permite abrir si NUNCA se ha abierto
  const canOpenProduct = () => {
    if (product.status === 'out') return false;
    return !product.lastOpenedAt;
  };

  // Manejar clic en tarjeta
  const handleCardClick = (e) => {
    if (e.target.closest('button') || e.target.closest('a')) {
      return;
    }
    
    if (onViewDetails) {
      onViewDetails();
    }
  };

  // Consumir cantidad específica
  const handleConsumeWithAmount = async (amount) => {
    if (!product.id || consuming) return;
    
    setConsuming(true);
    try {
      if (onConsume) {
        await onConsume(product.id, amount);
      }
      
      // Cerrar modal después de consumir
      setShowConsumeModal(false);
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('❌ Error consumiendo producto:', error);
      alert('Error al consumir producto: ' + error.message);
    } finally {
      setConsuming(false);
    }
  };

  // Consumir 1 unidad rápidamente (comportamiento actual)
  const handleQuickConsume = async (amount = 1) => {
    if (!product.id || consuming) return;
    
    setConsuming(true);
    try {
      if (onConsume) {
        await onConsume(product.id, amount);
      }
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('❌ Error consumiendo producto:', error);
      alert('Error al consumir producto: ' + error.message);
    } finally {
      setConsuming(false);
    }
  };

  // Manejar apertura
  const handleOpenProduct = async () => {
    if (!product.id || opening || !canOpenProduct()) return;
    
    setOpening(true);
    try {
      if (onOpen) {
        await onOpen(product.id);
      }
      
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('❌ Error abriendo producto:', error);
      alert('Error al abrir producto: ' + error.message);
    } finally {
      setOpening(false);
    }
  };

  // Manejar eliminación exitosa
  const handleDeleteSuccess = (deletedProductId, productName) => {
    onDelete?.(deletedProductId);
    console.log(`✅ Producto "${productName}" eliminado`);
  };

  return (
    <>
      <div 
        onClick={handleCardClick}
        className="w-full bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all duration-200 cursor-pointer product-card-item"
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-start flex-1 min-w-0">
            <div className="p-2 bg-primary-100 rounded-lg mr-3">
              <Package className="h-5 w-5 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-base truncate mb-1">
                {product.name}
              </h3>
              
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                  <StatusIcon className="inline-block h-3 w-3 mr-1" />
                  {statusInfo.label}
                </span>
                
                {product.expirationDate && (
                  <span className="flex items-center text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatExpirationDate(product.expirationDate)}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Cantidad */}
          <div className="text-right">
            <div className="text-xl font-bold text-gray-900">
              {product.quantityCurrent || 0}
            </div>
            <div className="text-xs text-gray-500">
              de {product.quantityTotal} {product.unit}
            </div>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-gray-700">Stock</span>
            <span className="text-xs font-bold text-gray-900">{percentage}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ${
                product.status === 'out' ? 'bg-red-500' :
                product.status === 'low' ? 'bg-amber-500' :
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
        </div>

        {/* Contenido expandible para móvil */}
        <div className={`mt-3 ${expanded ? 'block' : 'hidden md:block'}`}>
          {/* Info adicional */}
          <div className="grid grid-cols-2 gap-2 mb-3 text-xs text-gray-600">
            <div className="flex items-center">
              <span className="font-medium mr-1">Categoría:</span>
              <span className="truncate">{product.category || 'General'}</span>
            </div>
            <div className="flex items-center">
              <span className="font-medium mr-1">Actualizado:</span>
              <span>{product.updatedAt ? 
                formatDateShort(product.updatedAt) : 'Nunca'}</span>
            </div>
          </div>

          {/* Acciones principales */}
          <div className="space-y-2">
            {/* Producto nunca abierto */}
            {product.status !== 'out' && !product.lastOpenedAt && (
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <div className="flex items-center mb-2">
                  <Info className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-800">Primer uso</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenProduct();
                  }}
                  disabled={opening || !canOpenProduct()}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition-colors ${
                    opening || !canOpenProduct() 
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  }`}
                >
                  {opening ? (
                    <>
                      <span className="animate-spin mr-2">⟳</span>
                      Abriendo...
                    </>
                  ) : (
                    <>
                      <PackageOpen className="h-4 w-4 mr-2" />
                      Abrir producto
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Producto ya abierto - BOTONES MODIFICADOS */}
            {product.status !== 'out' && product.lastOpenedAt && (
              <div className="flex gap-2">
                {/* Botón principal para abrir modal de consumo */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConsumeModal(true); // ← ABRIR MODAL
                  }}
                  disabled={consuming || product.quantityCurrent <= 0}
                  className="flex-1 px-3 py-2 bg-primary-50 text-primary-600 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors flex items-center justify-center"
                >
                  <Minus className="h-4 w-4 mr-1" />
                  Consumir
                </button>
                
                {/* Botón rápido para 1 unidad */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickConsume(1); // ← CONSUMIR 1 RÁPIDAMENTE
                  }}
                  disabled={consuming || product.quantityCurrent < 1}
                  className="px-3 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors flex items-center justify-center"
                >
                  1 {product.unit}
                </button>
                
                {/* Botón para ver detalles */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onViewDetails) onViewDetails();
                  }}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                  title="Ver detalles"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Producto agotado */}
            {product.status === 'out' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEdit) {
                    onEdit();
                  }
                }}
                className="w-full px-3 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors flex items-center justify-center"
              >
                <Plus className="h-4 w-4 mr-2" />
                Reabastecer
              </button>
            )}
          </div>

          {/* Acciones secundarias */}
          <div className="flex gap-2 pt-3 mt-3 border-t border-gray-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onEdit) onEdit();
              }}
              className="flex-1 px-3 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors flex items-center justify-center"
            >
              <Edit2 className="h-4 w-4 mr-1" />
              Editar
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteModal(true);
              }}
              className="flex-1 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Eliminar
            </button>
          </div>
        </div>

        {/* Toggle para móvil */}
        <div className="md:hidden mt-3 pt-3 border-t border-gray-100">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-center text-xs text-gray-500 hover:text-gray-700"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3 w-3 mr-1" />
                Menos detalles
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3 mr-1" />
                Más detalles
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal de consumo con cantidad */}
      <ConsumeModal
        product={product}
        isOpen={showConsumeModal}
        onClose={() => setShowConsumeModal(false)}
        onConsume={handleConsumeWithAmount}
        isLoading={consuming}
      />

      {/* Modal de eliminación */}
      <ProductDeleteModal
        product={product}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onDeleteSuccess={handleDeleteSuccess}
      />
    </>
  );
};

export default ProductCard;