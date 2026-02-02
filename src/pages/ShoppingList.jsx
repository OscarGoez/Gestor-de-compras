// pages/ShoppingList.jsx - CORREGIDO
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Plus, 
  CheckCircle, 
  Trash2,
  Filter,
  Search,
  ArrowLeft,
  AlertTriangle,
  Package,
  Clock,
  Tag,
  BarChart3,
  ChevronRight,
  Sparkles,
  XCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import Header from '../components/layout/Header';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';
import { shoppingService } from '../api/shopping.service';
import { productsService } from '../api/products.service';
import ExpirationDateModal from '../components/products/ExpirationDateModal';

// IMPORTAR FIRESTORE
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../api/firebase'; // Asegúrate de que esta ruta sea correcta

const ShoppingList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { householdId, loading: householdLoading } = useHousehold();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [newItemName, setNewItemName] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [completedItems, setCompletedItems] = useState([]);
  const [showExpirationModal, setShowExpirationModal] = useState(false);
  const [currentItem, setCurrentItem] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    highPriority: 0,
    mediumPriority: 0,
    lowPriority: 0
  });

  const searchInputRef = useRef(null);

  // Cargar lista de compras
  const loadShoppingList = async () => {
    if (!householdId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      console.log('🛒 Cargando lista completa de compras...');
      
      // CAMBIAR: Usar true para solo items no comprados
      const result = await shoppingService.getShoppingList(householdId, true);
      
      console.log('📊 Resultado:', {
        success: result.success,
        itemsCount: result.data?.length
      });
      
      if (result.success) {
        const allItems = result.data || [];
        
        // Ya viene filtrado (showOnlyUnchecked = true)
        setItems(allItems);
        
        const highPriority = allItems.filter(item => item.priority === 'high').length;
        const mediumPriority = allItems.filter(item => item.priority === 'medium').length;
        const lowPriority = allItems.filter(item => item.priority === 'low').length;
        
        setStats({
          total: allItems.length,
          highPriority,
          mediumPriority,
          lowPriority
        });
        
        console.log('✅ Lista cargada:', allItems.length, 'items');
      } else {
        setError(result.error || 'Error al cargar la lista');
        setItems([]);
      }
    } catch (err) {
      console.error('❌ Error cargando lista:', err);
      setError(err.message || 'Error de conexión');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Marcar como comprado - CORREGIDO
  const handleMarkAsPurchased = async (item) => {
    try {
      console.log('🛒 Marcando como comprado:', item);

      // Guardar el item actual
      setCurrentItem(item);

      // Verificar si el producto tenía fecha de vencimiento
      if (item.productId) {
        try {
          const productResult = await productsService.getProductById(item.productId);
          if (productResult.success && productResult.product?.expirationDate) {
            // Mostrar modal en lugar de prompt
            setShowExpirationModal(true);
            return; // Salir aquí, continuaremos después de confirmar modal
          }
        } catch (error) {
          console.warn('⚠️ No se pudo verificar fecha del producto:', error);
        }
      }

      // Si no tiene fecha, continuar directamente
      await completePurchase(item, null);

    } catch (error) {
      console.error('❌ Error al preparar compra:', error);
      alert('Error: ' + error.message);
    }
  };

  const completePurchase = async (item, newExpirationDate) => {
    try {
      console.log('✅ Completando compra para:', item.productName);

      // Marcar como comprado en lista
      const result = await shoppingService.markAsPurchased(item.id);

      if (result.success) {
        // Si tiene productId, restaurar el producto
        if (result.hasProductId) {
          try {
            // Usar la función restoreProductWithExpiration si existe, sino la normal
            if (typeof productsService.restoreProductWithExpiration === 'function') {
              await productsService.restoreProductWithExpiration(
                result.itemData.productId, 
                newExpirationDate
              );
            } else {
              await productsService.restoreProduct(result.itemData.productId);
              // Si hay nueva fecha, actualizarla por separado
              if (newExpirationDate) {
                const productRef = doc(db, 'products', result.itemData.productId);
                await updateDoc(productRef, {
                  expirationDate: newExpirationDate,
                  updatedAt: serverTimestamp()
                });
              }
            }
          } catch (productError) {
            console.warn('⚠️ No se pudo restaurar producto:', productError);
            // Intentar con el método original
            await productsService.restoreProduct(result.itemData.productId);
          }
        }

        // Recargar lista
        await loadShoppingList();
        setShowExpirationModal(false);
        setCurrentItem(null);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Error completando compra:', error);
      alert('Error: ' + error.message);
    }
  };

  const handleExpirationConfirm = async (expirationDate) => {
    if (!currentItem) return;
    await completePurchase(currentItem, expirationDate);
  };

  // Eliminar item - CORREGIDO para usar el objeto completo
  const handleRemoveItem = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.productName}" de la lista?`)) return;
    
    try {
      const result = await shoppingService.removeFromShoppingList(item.id);
      
      if (result.success) {
        await loadShoppingList();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Error eliminando item:', error);
      alert('Error: ' + error.message);
    }
  };

  // Agregar item manualmente
  const handleAddItem = async (e) => {
    e?.preventDefault();
    if (!newItemName.trim()) return;
    
    setAddingItem(true);
    
    try {
      const result = await shoppingService.addManualItem(
        householdId,
        newItemName.trim(),
        'otros',
        1,
        'units'
      );
      
      if (result.success) {
        setNewItemName('');
        await loadShoppingList();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Error agregando item:', error);
      alert('Error: ' + error.message);
    } finally {
      setAddingItem(false);
    }
  };

  // Filtrar items
  const filteredItems = items.filter(item => {
    if (searchTerm && !item.productName?.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    if (filter !== 'all' && item.priority !== filter) {
      return false;
    }
    
    return true;
  });

  // Efecto para cargar datos
  useEffect(() => {
    if (householdId && !householdLoading) {
      loadShoppingList();
    }
  }, [householdId, householdLoading]);

  // Si está cargando
  if (loading || householdLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Lista de Compras" showBack={true} />
        <div className="px-4 py-8">
          <Loader fullScreen message="Cargando lista de compras..." />
        </div>
      </div>
    );
  }

  // Si no hay hogar
  if (!householdId && !householdLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Lista de Compras" showBack={true} />
        <div className="px-4 py-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Sin hogar configurado</h2>
            <p className="text-gray-600 mb-6">
              Necesitas crear o unirte a un hogar para usar la lista de compras.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/settings?tab=household')}
              className="py-3 w-full max-w-xs"
            >
              Configurar hogar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Si hay error
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Lista de Compras" showBack={true} />
        <div className="px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-6 w-6 text-red-600 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-red-900">Error cargando lista</h3>
                <p className="text-red-700 mt-1">{error}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={loadShoppingList}
                className="border-red-300 text-red-700"
              >
                Reintentar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                Volver al inicio
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <Header title="Lista de Compras" showBack={true} />
      
      {/* Modal de fecha de vencimiento - POSICIÓN CORRECTA */}
      <ExpirationDateModal
        isOpen={showExpirationModal}
        onClose={() => {
          setShowExpirationModal(false);
          setCurrentItem(null);
        }}
        productName={currentItem?.productName || ''}
        onConfirm={handleExpirationConfirm}
        initialDate={null}
      />

      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4 shadow-sm">
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Lista de Compras</h1>
              <p className="text-gray-600 text-sm">
                {stats.total === 0 
                  ? 'No hay productos en la lista' 
                  : `${stats.total} productos por comprar`}
              </p>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-10 py-3 text-base border border-gray-300 rounded-xl bg-white"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <XCircle className="h-5 w-5 text-gray-400" />
                </button>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Filtro principal (Todos) */}
              <div className="w-full sm:w-auto">
                <button
                  onClick={() => setFilter('all')}
                  className={`
                    w-full px-4 py-3 rounded-xl text-sm font-medium transition-all
                    flex items-center justify-between
                    ${filter === 'all' ? 
                      'bg-gray-800 text-white shadow-lg' : 
                      'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }
                  `}
                >
                  <span>Todos los productos</span>
                  <span className={`px-2 py-1 rounded-lg text-sm font-bold ${
                    filter === 'all' ? 'bg-white/20 text-white' : 'bg-gray-800 text-white'
                  }`}>
                    {stats.total}
                  </span>
                </button>
              </div>
                
              {/* Filtros específicos */}
              <div className="grid grid-cols-3 gap-2 w-full sm:w-auto sm:flex sm:gap-4">
                {[
                  { 
                    id: 'medium', 
                    label: 'Importantes', 
                    count: stats.mediumPriority, 
                    color: 'bg-amber-100 text-amber-800',
                    activeColor: 'bg-amber-500 text-white'
                  },
                  { 
                    id: 'high', 
                    label: 'Urgentes', 
                    count: stats.highPriority, 
                    color: 'bg-red-100 text-red-800',
                    activeColor: 'bg-red-500 text-white'
                  }
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setFilter(option.id)}
                    className={`
                      px-3 py-2 rounded-lg text-xs font-medium transition-colors
                      flex flex-col items-center justify-center
                      ${filter === option.id ? 
                        `${option.activeColor} shadow-sm` : 
                        `${option.color} hover:opacity-90`
                      }
                    `}
                  >
                    <span className="font-bold text-sm">{option.count}</span>
                    <span className="mt-0.5">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
              <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                {searchTerm || filter !== 'all' 
                  ? 'No hay resultados' 
                  : 'Lista de compras vacía'}
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                {searchTerm || filter !== 'all' 
                  ? 'Prueba otros términos de búsqueda' 
                  : 'Los productos se agregarán automáticamente cuando se agoten'}
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setFilter('all');
                  }}
                >
                  Limpiar filtros
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/products')}
                >
                  Ver productos
                </Button>
              </div>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div 
                key={item.id} 
                className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm"
              >
                <div className="flex items-start">
                  <div className={`w-1 h-14 rounded mr-3 mt-1 ${
                    item.priority === 'high' ? 'bg-red-500' :
                    item.priority === 'medium' ? 'bg-amber-500' :
                    'bg-blue-500'
                  }`}></div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-gray-900 text-base truncate pr-2">
                        {item.productName}
                      </h3>
                      <span className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-lg whitespace-nowrap flex-shrink-0">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                      {item.reason && (
                        <span className="inline-flex items-center">
                          {item.reason === 'out' ? '🔄 Agotado' : 
                           item.reason === 'low' ? '📉 Bajo stock' : 
                           '📝 Manual'}
                        </span>
                      )}
                      <span className="inline-flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {item.addedAt?.toLocaleDateString('es-ES', { 
                          day: 'numeric', 
                          month: 'short' 
                        })}
                      </span>
                    </div>
                    
                    {item.notes && (
                      <p className="text-gray-600 text-sm line-clamp-2">{item.notes}</p>
                    )}
                  </div>
                  
                  <div className="ml-3 flex flex-col gap-2">
                    <button
                      onClick={() => handleMarkAsPurchased(item)}
                      className="p-2.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 active:scale-95 transition-transform"
                      title="Marcar como comprado"
                      aria-label="Marcar como comprado"
                    >
                      <CheckCircle className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleRemoveItem(item)}
                      className="p-2.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 active:scale-95 transition-transform"
                      title="Eliminar de lista"
                      aria-label="Eliminar de lista"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="fixed bottom-4 left-4 right-4 z-10">
          <div className="bg-white rounded-2xl p-3 shadow-lg border border-gray-200 max-w-2xl mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Agregar producto..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddItem(e)}
                className="flex-1 px-4 py-3 bg-gray-50 rounded-xl border-0 text-base focus:ring-2 focus:ring-blue-500 focus:outline-none"
                disabled={addingItem}
              />
            </div>
          </div>
        </div>
        
        <div className="h-24"></div>
      </div>
    </div>
  );
};

export default ShoppingList;