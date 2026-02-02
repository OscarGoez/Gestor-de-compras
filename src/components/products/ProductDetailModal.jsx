import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, 
  Package, 
  Edit2, 
  Trash2,
  CheckCircle,
  AlertTriangle,
  TrendingDown,
  Calendar,
  ShoppingCart,
  Battery,
  Minus,
  PackageOpen,
  RotateCcw,
  Clock,
  Info 
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import ProductDeleteModal from './ProductDeleteModal';

const ProductDetailModal = ({ 
  product, 
  isOpen, 
  onClose, 
  onConsume, 
  onOpen, 
  onRestore,
  onDelete,
  onEdit 
}) => {
  const navigate = useNavigate();
  const [consuming, setConsuming] = useState(false);
  const [opening, setOpening] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  if (!product) return null;

  const getStatusInfo = (status) => {
    switch(status) {
      case 'out': return { 
        color: 'bg-red-100 text-red-800', 
        icon: AlertTriangle,
        label: 'Agotado'
      };
      case 'low': return { 
        color: 'bg-amber-100 text-amber-800', 
        icon: TrendingDown,
        label: 'Bajo stock'
      };
      default: return { 
        color: 'bg-green-100 text-green-800', 
        icon: CheckCircle,
        label: 'Disponible'
      };
    }
  };

  const statusInfo = getStatusInfo(product.status);
  const StatusIcon = statusInfo.icon;

  const percentage = product.quantityTotal > 0 
    ? Math.round((product.quantityCurrent / product.quantityTotal) * 100) 
    : 0;

  // ✅ FUNCIÓN CORREGIDA: Solo permite abrir si NUNCA se ha abierto
  const canOpenProduct = () => {
    // No se puede abrir si está agotado
    if (product.status === 'out') return false;

    // Solo se puede abrir si NUNCA se ha abierto
    return !product.lastOpenedAt;
  };

  // Formatear fecha
  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      if (isNaN(dateObj.getTime())) return 'Fecha inválida';
      
      return dateObj.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return 'Fecha inválida';
    }
  };

  // Manejar consumo de producto
  const handleConsume = async () => {
    setConsuming(true);
    try {
      await onConsume(product.id, 1);
    } finally {
      setConsuming(false);
    }
  };

  // Manejar apertura de producto
  const handleOpen = async () => {
    setOpening(true);
    try {
      await onOpen(product.id);
      onClose(); // Cerrar modal después de abrir
    } finally {
      setOpening(false);
    }
  };

  // Manejar restauración de producto
  const handleRestore = async () => {
    if (!window.confirm(`¿Restaurar "${product.name}" como recién comprado?`)) return;
    
    setRestoring(true);
    try {
      await onRestore(product.id);
      onClose();
    } finally {
      setRestoring(false);
    }
  };

  // ✅ FUNCIÓN MEJORADA PARA ELIMINAR - CON VALIDACIÓN
  const handleDeleteSuccess = (deletedProductId, productName) => {
    console.log('🔄 handleDeleteSuccess llamado con ID:', deletedProductId);
    
    if (typeof onDelete === 'function') {
      onDelete(deletedProductId);
    } else {
      console.error('❌ onDelete no es una función');
      setTimeout(() => {
        window.location.reload();
      }, 500);
    }
    
    setShowDeleteModal(false);
    onClose();
  };

  // ✅ FUNCIÓN PARA EDITAR - REDIRIGE A LA URL CON PARÁMETROS
  const handleEdit = () => {
    onClose();
    navigate(`/products?action=edit&id=${product.id}`);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={product.name}
        size="md"
      >
        <div className="space-y-6">
          {/* Encabezado */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="p-3 bg-primary-100 rounded-lg mr-4">
                <Package className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                  <StatusIcon className="inline-block h-4 w-4 mr-1" />
                  {statusInfo.label}
                </span>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Información básica */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Stock actual</p>
              <p className="text-xl font-bold">
                {product.quantityCurrent}/{product.quantityTotal} {product.unit}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Categoría</p>
              <p className="text-lg font-medium">{product.category || 'Sin categoría'}</p>
            </div>
            
            {product.expirationDate && (
              <div>
                <p className="text-sm text-gray-600">Vencimiento</p>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  <span>
                    {formatDate(product.expirationDate)}
                  </span>
                </div>
              </div>
            )}
            
            <div>
              <p className="text-sm text-gray-600">Última actualización</p>
              <div className="flex items-center">
                <Clock className="h-4 w-4 mr-2 text-gray-500" />
                <span>
                  {formatDate(product.updatedAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Barra de progreso */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Nivel de stock</span>
              <Battery className={`h-5 w-5 ${
                product.status === 'out' ? 'text-red-500' :
                product.status === 'low' ? 'text-amber-500' :
                'text-green-500'
              }`} />
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  product.status === 'out' ? 'bg-red-500' :
                  product.status === 'low' ? 'bg-gradient-to-r from-amber-400 to-amber-600' :
                  'bg-gradient-to-r from-green-400 to-green-600'
                }`}
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-1">
              <div className="text-xs text-gray-500">
                {percentage}% del stock total
              </div>
            </div>
          </div>

          {/* ✅ SECCIÓN DE ACCIONES PRINCIPALES CORREGIDA */}
          
          {/* Mensaje informativo para productos NUNCA abiertos */}
          {product.status !== 'out' && !product.lastOpenedAt && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Info className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-blue-800">Primer uso</span>
              </div>
              <p className="text-sm text-blue-700 mb-3">
                Para comenzar a trackear este producto, primero debes abrirlo.
              </p>
              <Button
                variant="primary"
                onClick={handleOpen}
                disabled={opening || !canOpenProduct()}
                className="w-full"
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
              </Button>
            </div>
          )}

          {/* Acciones para productos YA ABIERTOS */}
          {product.status !== 'out' && product.lastOpenedAt && (
            <Button
              variant="outline"
              onClick={handleConsume}
              disabled={consuming}
              className="w-full"
            >
              {consuming ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Consumiendo...
                </>
              ) : (
                <>
                  <Minus className="h-4 w-4 mr-2" />
                  Consumir
                </>
              )}
            </Button>
          )}

          {/* Acción para productos AGOTADOS */}
          {product.status === 'out' && (
            <Button
              variant="primary"
              onClick={handleRestore}
              disabled={restoring}
              className="w-full"
            >
              {restoring ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  Restaurando...
                </>
              ) : (
                <>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Restaurar y reabastecer
                </>
              )}
            </Button>
          )}

          {/* Acciones secundarias */}
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={handleEdit}
              className="flex-1"
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Editar
            </Button>
            
            <Button
              variant="danger"
              onClick={() => setShowDeleteModal(true)}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </Button>
          </div>

          {/* Info adicional */}
          <div className="text-sm text-gray-500 space-y-2 pt-4 border-t border-gray-200">
            {product.autoAddedToShopping && (
              <div className="flex items-center text-amber-600">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Este producto está en la lista de compras
              </div>
            )}
            
            {product.lastOpenedAt && product.status !== 'out' && (
              <div className="flex items-center text-blue-600">
                <PackageOpen className="h-4 w-4 mr-2" />
                Abierto el {formatDate(product.lastOpenedAt)}
              </div>
            )}
            
            {product.lastOpenedAt && !canOpenProduct() && (
              <div className="flex items-center text-gray-500">
                <Info className="h-4 w-4 mr-2" />
                Podrás volver a abrir después de 24 horas
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* ✅ ProductDeleteModal para confirmar eliminación */}
      <ProductDeleteModal
        product={product}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onDeleteSuccess={handleDeleteSuccess}
      />
    </>
  );
};

export default ProductDetailModal;