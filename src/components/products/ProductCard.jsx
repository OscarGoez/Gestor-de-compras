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
  Info // ← AGREGADO
} from 'lucide-react';
import ProductDeleteModal from './ProductDeleteModal';
import { formatDate } from '../../utils/date.utils';

const ProductCard = ({ product, onUpdate, onDelete, onConsume, onOpen, onRestore, onEdit }) => {
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
        icon: AlertTriangle,
        label: 'Agotado',
        actionColor: 'text-red-600',
        actionBg: 'bg-red-50'
      };
      case 'low': return { 
        color: 'bg-amber-100 text-amber-800 border-amber-200', 
        icon: TrendingDown,
        label: 'Bajo stock',
        actionColor: 'text-amber-600',
        actionBg: 'bg-amber-50'
      };
      default: return { 
        color: 'bg-green-100 text-green-800 border-green-200', 
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

  // ✅ FUNCIÓN CORREGIDA: Solo permite abrir si NUNCA se ha abierto
  const canOpenProduct = () => {
    // No se puede abrir si está agotado
    if (product.status === 'out') return false;

    // Solo se puede abrir si NUNCA se ha abierto
    return !product.lastOpenedAt;
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

  // Ver historial de consumo
  const handleViewHistory = async () => {
    try {
      const { consumptionService } = await import('../../api/consumption.service.js');
      const result = await consumptionService.getProductHistory(product.id);
      
      if (result.success && result.logs && result.logs.length > 0) {
        let historyText = `📊 Historial de consumo: ${product.name}\n\n`;
        
        result.logs.forEach((log, index) => {
          const opened = formatDate(log.openedAt || log.createdAt);
          const finished = log.finishedAt ? formatDate(log.finishedAt) : 'En uso';
          const duration = log.durationDays ? `${log.durationDays} días` : 'No completado';
          
          historyText += `Ciclo ${index + 1}:\n`;
          historyText += `  Abierto: ${opened}\n`;
          historyText += `  Terminado: ${finished}\n`;
          historyText += `  Duración: ${duration}\n`;
          historyText += `  Acción: ${log.actionType || 'N/A'}\n`;
          historyText += `  Cantidad: ${log.quantity || 'N/A'} ${product.unit}\n\n`;
        });
        
        alert(historyText);
      } 
    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      alert('Error al obtener historial de consumo');
    }
  };

  // Manejar eliminación exitosa
  const handleDeleteSuccess = (deletedProductId, productName) => {
    onDelete?.(deletedProductId);
    console.log(`✅ Producto "${productName}" eliminado`);
  };

  // Calcular duración actual si está abierto
  const getCurrentDuration = () => {
    if (!product.lastOpenedAt) return null;
    
    try {
      const openedDate = product.lastOpenedAt.toDate 
        ? product.lastOpenedAt.toDate() 
        : new Date(product.lastOpenedAt);
      
      if (isNaN(openedDate.getTime())) return null;
      
      const now = new Date();
      const diffTime = now.getTime() - openedDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    } catch (error) {
      return null;
    }
  };

  const currentDuration = getCurrentDuration();

  return (
    <>
      <div className="w-full bg-white rounded-xl border border-gray-200 p-4 md:p-5 hover:shadow-md transition-all duration-200 overflow-hidden">
        {/* Header compacto para móvil */}
        <div className="flex justify-between items-start">
          <div className="flex items-start flex-1 min-w-0">
            <div className="p-2 md:p-3 bg-primary-100 rounded-lg mr-3 md:mr-4">
              <Package className="h-5 w-5 md:h-6 md:w-6 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm md:text-base truncate pr-2">
                  {product.name}
                </h3>
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="md:hidden p-1 text-gray-400 hover:text-gray-600"
                >
                  {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>
              
              <div className="flex flex-wrap gap-1 md:gap-2 mt-1">
                <span className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color} border whitespace-nowrap`}>
                  <StatusIcon className="inline-block h-3 w-3 mr-1" />
                  {statusInfo.label}
                </span>
                
                {product.expirationDate && (
                  <span className="flex items-center text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatExpirationDate(product.expirationDate)}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Menú de acciones - versión móvil simplificada */}
          <div className="relative md:hidden">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            
            {showActions && (
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-10">
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
                    {opening ? 'Abriendo...' : (product.lastOpenedAt ? 'Volver a abrir' : 'Abrir')}
                  </button>
                )}
                
                
                
                {product.status === 'out' && (
                  <button
                    onClick={() => {
                      handleRestoreProduct();
                      setShowActions(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-green-600 hover:bg-green-50 transition-colors text-sm"
                    disabled={restoring}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    {restoring ? 'Restaurando...' : 'Restaurar'}
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

        {/* Contenido expandible para móvil */}
        <div className={`mt-3 ${expanded ? 'block' : 'hidden md:block'}`}>
          {/* Barra de progreso */}
          <div className="mb-3 md:mb-4">
            <div className="flex justify-between items-center mb-1 md:mb-2">
              <span className="text-xs md:text-sm font-medium text-gray-700">Stock</span>
              <span className="text-xs md:text-sm font-bold text-gray-900">
                {product.quantityCurrent || 0}/{product.quantityTotal || 0} {product.unit}
              </span>
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
            <div className="flex justify-between items-center mt-1">
              <div className="text-xs text-gray-500">
                {percentage}% del total
              </div>
              <div className="text-xs font-medium" style={{ color: statusInfo.actionColor }}>
                {product.quantityCurrent <= 0 ? '¡AGOTADO!' : 
                 product.status === 'low' ? '¡BAJO STOCK!' : 
                 'DISPONIBLE'}
              </div>
            </div>
          </div>

          {/* Indicador de batería (oculto en móvil para ahorrar espacio) */}
          <div className="hidden md:block mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Nivel de stock</span>
              <Battery className={`h-5 w-5 ${
                product.status === 'out' ? 'text-red-500' :
                product.status === 'low' ? 'text-amber-500' :
                'text-green-500'
              }`} />
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  product.status === 'out' ? 'bg-red-500' :
                  product.status === 'low' ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                  'bg-gradient-to-r from-green-400 to-green-600'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>

          {/* ✅ SECCIÓN DE TRACKING DE CICLO (solo si está abierto) */}
          {product.lastOpenedAt && product.status !== 'out' && (
            <div className="mb-3 md:mb-4 bg-blue-50 border border-blue-100 rounded-lg p-2 md:p-3">
              <div className="flex items-center justify-between mb-1 md:mb-2">
                <div className="flex items-center">
                  <Clock className="h-3 w-3 md:h-4 md:w-4 text-blue-600 mr-1 md:mr-2" />
                  <span className="text-xs md:text-sm font-medium text-blue-800">Ciclo actual</span>
                </div>
                {currentDuration !== null && (
                  <span className="text-xs font-bold text-blue-700">
                    Día {currentDuration + 1}
                  </span>
                )}
              </div>
              <div className="text-xs text-blue-700 mb-1 md:mb-2">
                Abierto: {formatDate(product.lastOpenedAt)}
              </div>
              <div className="text-xs text-blue-600">
                Ciclo finaliza cuando se agote y restaures.
              </div>
            </div>
          )}

          {/* ✅ SECCIÓN DE ACCIONES CORREGIDA */}
          <div className="space-y-2 md:space-y-3">
            {/* Mensaje informativo para productos NUNCA abiertos */}
            {product.status !== 'out' && !product.lastOpenedAt && (
              <div className="mb-3 bg-blue-50 border border-blue-100 rounded-lg p-3">
                <div className="flex items-center mb-2">
                  <Info className="h-4 w-4 text-blue-600 mr-2" />
                  <span className="text-sm font-medium text-blue-800">Primer uso</span>
                </div>
                <p className="text-xs text-blue-700 mb-2">
                  Para comenzar a trackear este producto, primero debes abrirlo.
                </p>
                <button
                  onClick={handleOpenProduct}
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
                      Abrir producto para comenzar seguimiento
                    </>
                  )}
                </button>
              </div>
            )}

            {/* ✅ Botones de consumo y re-apertura SOLO si YA fue abierto */}
            {product.status !== 'out' && product.lastOpenedAt && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleConsume(1)}
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
                
                {/* ✅ Botón de re-apertura - SOLO si han pasado 24 horas desde la última apertura */}
                {canOpenProduct() && (
                  <button
                    onClick={handleOpenProduct}
                    disabled={opening}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs md:text-sm font-medium flex items-center justify-center transition-colors ${
                      opening ? 'bg-gray-100 text-gray-500' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                    }`}
                  >
                    {opening ? (
                      <>
                        <span className="animate-spin mr-1">⟳</span>
                        Abriendo...
                      </>
                    ) : (
                      <>
                        <PackageOpen className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                        Volver a abrir
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* ✅ Botón de restauración - SOLO si está agotado */}
            {product.status === 'out' && (
              <button
                onClick={() => {                  
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
                <RotateCcw className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                {restoring ? 'Cargando...' : 'Reabastecer'}
              </button>
            )}

            {/* ✅ Acciones secundarias CORREGIDAS - versión móvil */}
            <div className="flex gap-1 md:gap-2 pt-2 md:pt-3 border-t border-gray-100">
              <button
                onClick={() => {
                  if (onEdit) {
                    onEdit();
                  } else {
                    navigate(`/products?action=edit&id=${product.id}`);
                  }
                }}
                className="px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
              >
                <Edit2 className="h-3 w-3 md:h-4 md:w-4 inline-block mr-1" />
                <span className="hidden md:inline">Editar</span>
                <span className="md:hidden">Editar</span>
              </button>
              
              
              
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-2 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="h-3 w-3 md:h-4 md:w-4 inline-block mr-1" />
                <span className="hidden md:inline">Eliminar</span>
                <span className="md:hidden">Eliminar</span>
              </button>
            </div>
          </div>

          {/* Info adicional - oculta en móvil por defecto */}
          <div className="mt-3 md:mt-4 pt-2 md:pt-4 border-t border-gray-100 text-xs text-gray-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1 md:gap-2">
              <div className="flex items-center">
                <span className="font-medium mr-1">Categoría:</span>
                <span className="truncate">{product.category || 'Sin categoría'}</span>
              </div>
              <div className="flex items-center">
                <span className="font-medium mr-1">Actualizado:</span>
                <span>{product.updatedAt ? 
                  formatDate(product.updatedAt) : 
                  'Nunca'}</span>
              </div>
            </div>
            
            {/* ✅ Mostrar estado de "agregado a lista" */}
            {product.autoAddedToShopping && (
              <div className="mt-1 md:mt-2 flex items-center text-amber-600 bg-amber-50 px-2 py-1 rounded text-xs">
                <ShoppingCart className="h-3 w-3 mr-1" />
                En lista de compras
              </div>
            )}
            
            {/* ✅ Información del ciclo si está abierto */}
            {product.lastOpenedAt && product.status !== 'out' && (
              <div className="mt-1 md:mt-2 flex items-center text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">
                <PackageOpen className="h-3 w-3 mr-1" />
                Ciclo: {formatDate(product.lastOpenedAt)}
              </div>
            )}
          </div>
        </div>

        {/* Menú de acciones para desktop */}
        <div className="hidden md:block relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="absolute top-0 right-0 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          
          {showActions && (
            <div className="absolute right-0 top-10 mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-10">
              <button
                onClick={() => {
                  if (onEdit) {
                    onEdit();
                  } else {
                    navigate(`/products?action=edit&id=${product.id}`);
                  }
                  setShowActions(false);
                }}
                className="flex items-center w-full px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
              >
                <Edit2 className="h-4 w-4 mr-3" />
                Editar producto
              </button>
              
              {canOpenProduct() && (
                <button
                  onClick={() => {
                    handleOpenProduct();
                    setShowActions(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-purple-600 hover:bg-purple-50 transition-colors text-sm"
                  disabled={opening}
                >
                  <PackageOpen className="h-4 w-4 mr-3" />
                  {opening ? 'Abriendo...' : 'Abrir producto'}
                </button>
              )}
              
              <button
                onClick={() => {
                  handleViewHistory();
                  setShowActions(false);
                }}
                className="flex items-center w-full px-4 py-2 text-blue-600 hover:bg-blue-50 transition-colors text-sm"
              >
                <History className="h-4 w-4 mr-3" />
                Ver historial
              </button>
              
              {product.status === 'out' && (
                <button
                  onClick={() => {
                    handleRestoreProduct();
                    setShowActions(false);
                  }}
                  className="flex items-center w-full px-4 py-2 text-green-600 hover:bg-green-50 transition-colors text-sm"
                  disabled={restoring}
                >
                  <RotateCcw className="h-4 w-4 mr-3" />
                  {restoring ? 'Restaurando...' : 'Restaurar producto'}
                </button>
              )}
              
              <div className="border-t border-gray-100 my-2"></div>
              
              <button
                onClick={() => {
                  setShowDeleteModal(true);
                  setShowActions(false);
                }}
                className="flex items-center w-full px-4 py-2 text-red-600 hover:bg-red-50 transition-colors text-sm"
              >
                <Trash2 className="h-4 w-4 mr-3" />
                Eliminar producto
              </button>
            </div>
          )}
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

export default ProductCard;