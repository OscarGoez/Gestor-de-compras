import React, { useState } from 'react';
import { X, AlertTriangle, Package, Trash2, CheckCircle } from 'lucide-react';
import Button from '../common/Button';
import Loader from '../common/Loader';

const ProductDeleteModal = ({ product, isOpen, onClose, onDeleteSuccess }) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !product) return null;

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      // Importar dinámicamente para evitar problemas de dependencia circular
      const { productsService } = await import('../../api/products.service.js');
      
      console.log('🟡 Intentando eliminar producto ID:', product.id);
      const result = await productsService.deleteProduct(product.id);
      
      if (result.success) {
        console.log('🟢 Producto eliminado exitosamente:', product.id);
        setSuccess(true);
        
        // Esperar un momento para mostrar mensaje de éxito
        setTimeout(() => {
          console.log('🟡 Llamando a onDeleteSuccess con:', product.id);
          onDeleteSuccess?.(product.id, result.productName || product.name);
          onClose();
        }, 1500);
      } else {
        console.error('🔴 Error en API:', result.error);
        setError(result.error || 'Error al eliminar el producto');
      }
    } catch (err) {
      console.error('❌ Error en handleDelete:', err);
      setError(err.message || 'Error inesperado');
    } finally {
      setDeleting(false);
    }
  };

  const getStatusInfo = (status) => {
    switch(status) {
      case 'out': return { 
        color: 'bg-red-100 text-red-800', 
        label: 'Agotado',
        icon: AlertTriangle
      };
      case 'low': return { 
        color: 'bg-amber-100 text-amber-800', 
        label: 'Bajo stock',
        icon: AlertTriangle
      };
      default: return { 
        color: 'bg-green-100 text-green-800', 
        label: 'Disponible',
        icon: CheckCircle
      };
    }
  };

  const statusInfo = getStatusInfo(product.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Fondo oscuro */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
      
      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          
          {/* Header */}
          <div className="bg-white px-6 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg mr-3">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">Eliminar producto</h3>
                  <p className="text-gray-600 text-sm">Esta acción no se puede deshacer</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={deleting}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Contenido */}
          <div className="px-6 py-4">
            {success ? (
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">¡Producto eliminado!</h4>
                <p className="text-gray-600">
                  "{product.name}" ha sido eliminado correctamente.
                </p>
              </div>
            ) : (
              <>
                {/* Información del producto */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex items-start">
                    <div className="p-2 bg-primary-100 rounded-lg mr-4">
                      <Package className="h-6 w-6 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">{product.name}</h4>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          <StatusIcon className="inline-block h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </span>
                        <span className="text-sm text-gray-600">
                          {product.quantityCurrent || 0}/{product.quantityTotal || 0} {product.unit}
                        </span>
                      </div>
                      {product.category && (
                        <div className="text-xs text-gray-500 mt-2">
                          Categoría: {product.category}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Advertencia */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-semibold text-red-900 mb-1">Advertencia</h5>
                      <ul className="text-sm text-red-700 space-y-1">
                        <li>• El producto se eliminará permanentemente</li>
                        <li>• También se eliminará de la lista de compras</li>
                        <li>• Se perderá el historial de consumo</li>
                        <li>• Esta acción no se puede deshacer</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
                      <span className="text-red-700">{error}</span>
                    </div>
                  </div>
                )}

                {/* Acciones */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 py-3 rounded-xl"
                    disabled={deleting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="danger"
                    onClick={handleDelete}
                    className="flex-1 py-3 rounded-xl"
                    disabled={deleting}
                  >
                    {deleting ? (
                      <>
                        <Loader size="sm" className="mr-2" />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-5 w-5 mr-2" />
                        Sí, eliminar producto
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDeleteModal;