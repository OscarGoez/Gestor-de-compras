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
  ShoppingCart,
  Battery,
  Minus,
  PackageOpen,
  RotateCcw,
  Clock,
  History,
  ChevronDown,
  ChevronUp,
  Info,
  Plus,
  Eye
} from 'lucide-react';
import ProductDeleteModal from './ProductDeleteModal';
import { formatDate } from '../../utils/date.utils';
import ConsumeModal from './ConsumeModal';

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

  // Función para formatear fecha corta
  const formatDateShort = (date) => {
    if (!date) return 'Nunca';
    
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      if (isNaN(dateObj.getTime())) return 'Fecha inválida';
      
      const now = new Date();
      const diffTime = now.getTime() - dateObj.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Hoy';
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;
      
      return dateObj.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // ✅ FUNCIÓN: Solo permite abrir si NUNCA se ha abierto
  const canOpenProduct = () => {
    // No se puede abrir si está agotado
    if (product.status === 'out') return false;

    // Solo se puede abrir si NUNCA se ha abierto
    return !product.lastOpenedAt;
  };

  // Manejar clic en tarjeta
  const handleCardClick = (e) => {
    // Prevenir que se abra cuando se hace clic en botones
    if (e.target.closest('button') || e.target.closest('a') || e.target.closest('.no-click')) {
      return;
    }
    
    if (onViewDetails) {
      onViewDetails();
    }
  };

  // Manejar consumo de producto
  const handleConsume = async (amount = 1) => {
    if (!product.id || consuming) return;
    
    setConsuming(true);
    try {
      if (onConsume) {
        await onConsume(product.id, amount);
      } else {
        const { productsService } = await import('../../api/products.service.js');
        await productsService.consumeProduct(product.id, amount);
      }
    } catch (error) {
      console.error('❌ Error consumiendo producto:', error);
      alert('Error al consumir producto: ' + error.message);
    } finally {
      setConsuming(false);
    }
  };

  // Manejar apertura de producto
  const handleOpenProduct = async () => {
    if (!product.id || opening || !canOpenProduct()) return;
    
    setOpening(true);
    try {
      if (onOpen) {
        await onOpen(product.id);
      } else {
        const { productsService } = await import('../../api/products.service.js');
        await productsService.openProduct(product.id);
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

  // Manejar restauración de producto
  const handleRestoreProduct = async () => {
    if (!product.id || restoring) return;
    
    const confirmMessage = `¿Restaurar "${product.name}" como recién comprado?\n\n✅ Se registrará el fin del ciclo actual\n✅ Se restablecerá el stock al 100%\n✅ Se creará un nuevo ciclo de tracking\n✅ Se actualizará la fecha de vencimiento`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }
    
    setRestoring(true);
    try {
      if (onRestore) {
        await onRestore(product.id);
      } else {
        const { productsService } = await import('../../api/products.service.js');
        await productsService.restoreProduct(product.id);
      }
      
      if (onUpdate) {
        onUpdate();
      }
      
      alert(`✅ Producto "${product.name}" restaurado y listo para nuevo ciclo`);
    } catch (error) {
      console.error('❌ Error restaurando producto:', error);
      alert('Error al restaurar producto: ' + error.message);
    } finally {
      setRestoring(false);
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
        className="relative w-full bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer group no-select"
      >
        {/* Indicador visual de que es clickeable */}
        <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary-100 rounded-2xl transition-colors pointer-events-none" />
        
        {/* Header con info clave visible */}
        <div className="flex items-start gap-3 mb-3">
          {/* Icono del producto */}
          <div className="p-2 bg-gradient-to-br from-primary-100 to-primary-50 rounded-xl flex-shrink-0">
            <Package className="h-6 w-6 text-primary-600" />
          </div>
          
          {/* Info principal */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-base truncate mb-1">
              {product.name}
            </h3>
            
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${statusInfo.color}`}>
                <StatusIcon className="h-3 w-3" />
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
          
          {/* Cantidad visible */}
          <div className="text-right flex-shrink-0">
            <div className="text-xl font-bold text-gray-900">
              {product.quantityCurrent || 0}
            </div>
            <div className="text-xs text-gray-500">
              de {product.quantityTotal} {product.unit}
            </div>
          </div>
        </div>
        
        {/* Barra de progreso visible */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-medium text-gray-700">Stock</span>
            <span className="text-xs font-bold text-gray-900">{percentage}%</span>
          </div>
          <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-700 ${
                product.status === 'out' ? 'bg-red-500' :
                product.status === 'low' ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                'bg-gradient-to-r from-green-400 to-green-500'
              }`}
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
        </div>
        
        {/* Contenido expandible para móvil */}
        <div className={`mt-3 ${expanded ? 'block' : 'hidden md:block'}`}>
          {/* Info adicional rápida */}
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
          
          {/* ✅ SECCIÓN DE ACCIONES */}
          <div className="space-y-2">
            {/* Mensaje informativo para productos NUNCA abiertos */}
            {product.status !== 'out' && !product.lastOpenedAt && (
              <div className={`${statusInfo.bgColor} border ${statusInfo.color.split(' ')[2]} rounded-lg p-3`}>
                <div className="flex items-center mb-2">
                  <Info className="h-4 w-4 mr-2" />
                  <span className="text-sm font-medium">Primer uso</span>
                </div>
                <p className="text-xs mb-2">
                  Para comenzar a trackear este producto, primero debes abrirlo.
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenProduct();
                  }}
                  disabled={opening || !canOpenProduct()}
                  className={`w-full px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center transition-colors ${
                    opening || !canOpenProduct() 
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                      : `${statusInfo.actionBg} ${statusInfo.actionColor} hover:opacity-90`
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

            {/* ✅ Botones de consumo si YA fue abierto */}
            {product.status !== 'out' && product.lastOpenedAt && (
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleConsume(1);
                  }}
                  disabled={consuming || product.quantityCurrent <= 0}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs md:text-sm font-medium flex items-center justify-center transition-colors ${
                    consuming ? 'bg-gray-100 text-gray-500' : 'bg-primary-50 text-primary-600 hover:bg-primary-100'
                  }`}
                >
                  {consuming ? (
                    <>
                      <span className="animate-spin mr-1">⟳</span>
                      Consumiendo...
                    </>
                  ) : (
                    <>
                      <Minus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                      Consumir 1 {product.unit}
                    </>
                  )}
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onViewDetails) onViewDetails();
                  }}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center"
                  title="Ver detalles completos"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* ✅ Botón de restauración - SOLO si está agotado */}
            {product.status === 'out' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEdit) {
                    onEdit();
                  } else {
                    navigate(`/products?action=edit&id=${product.id}`);
                  }
                }}
                disabled={restoring}
                className={`w-full px-3 py-2 rounded-lg text-xs md:text-sm font-medium flex items-center justify-center transition-colors ${
                  restoring ? 'bg-gray-100 text-gray-500' : 'bg-green-50 text-green-600 hover:bg-green-100'
                }`}
              >
                <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                {restoring ? 'Cargando...' : 'Reabastecer'}
              </button>
            )}
          </div>
        </div>

        {/* Menú de acciones para mobile */}
        <div className="md:hidden mt-3 pt-3 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center text-xs text-gray-500 hover:text-gray-700"
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
            
            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEdit) {
                    onEdit();
                  } else {
                    navigate(`/products?action=edit&id=${product.id}`);
                  }
                }}
                className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="Editar"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(true);
                }}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Menú de acciones para desktop */}
        <div className="hidden md:block absolute top-3 right-3">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            
            {showActions && (
              <div 
                className="absolute right-0 top-8 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => {
                    if (onEdit) {
                      onEdit();
                    } else {
                      navigate(`/products?action=edit&id=${product.id}`);
                    }
                    setShowActions(false);
                  }}
                  className="flex items-center w-full px-3 py-2 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </button>
                
                <button
                  onClick={() => {
                    if (onViewDetails) onViewDetails();
                    setShowActions(false);
                  }}
                  className="flex items-center w-full px-3 py-2 text-blue-600 hover:bg-blue-50 transition-colors text-sm"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver detalles
                </button>
                
                {canOpenProduct() && (
                  <button
                    onClick={() => {
                      handleOpenProduct();
                      setShowActions(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-purple-600 hover:bg-purple-50 transition-colors text-sm"
                    disabled={opening}
                  >
                    <PackageOpen className="h-4 w-4 mr-2" />
                    {opening ? 'Abriendo...' : 'Abrir producto'}
                  </button>
                )}
                
                {product.status === 'out' && (
                  <button
                    onClick={() => {
                      if (onEdit) onEdit();
                      setShowActions(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-green-600 hover:bg-green-50 transition-colors text-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Reabastecer
                  </button>
                )}
                
                <div className="border-t border-gray-100 my-2"></div>
                
                <button
                  onClick={() => {
                    setShowDeleteModal(true);
                    setShowActions(false);
                  }}
                  className="flex items-center w-full px-3 py-2 text-red-600 hover:bg-red-50 transition-colors text-sm"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

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

// CSS adicional inline para evitar selección de texto
const styles = `
.no-select {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
`;

// Añadir estilos al documento
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = styles;
  document.head.appendChild(styleSheet);
}

export default ProductCard;