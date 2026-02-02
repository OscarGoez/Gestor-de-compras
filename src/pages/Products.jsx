import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle,
  RefreshCw,
  Battery,
  BatteryLow,
  BatteryMedium,
  BatteryFull,
  TrendingUp,
  TrendingDown,
  Calendar,
  LayoutGrid, 
  LayoutList,
  SortAsc,
  SortDesc,
  X,
  PackageOpen,
  Filter as FilterIcon 
} from 'lucide-react';
import { useHousehold } from '../context/HouseholdContext';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/products/ProductCard';
import ProductListItem from '../components/products/ProductListItem';
import ProductDetailModal from '../components/products/ProductDetailModal';
import Header from '../components/layout/Header';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import ProductForm from '../components/products/ProductForm';
import Loader from '../components/common/Loader';
import { productsService } from '../api/products.service';

const Products = () => {
  const { user } = useAuth();
  const { householdId, loading: householdLoading } = useHousehold();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  
  // Nuevos estados para vista mejorada
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [sortBy, setSortBy] = useState('updated'); // 'name', 'quantity', 'expiration', 'status', 'updated'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

  // Obtener acción y producto ID de la URL
  const action = searchParams.get('action');
  const productId = searchParams.get('id');

  // Cargar productos
  const loadProducts = async () => {
    if (!householdId) {
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('📥 Cargando productos para household:', householdId);
      const result = await productsService.getProductsByHousehold(householdId);
      
      if (result.success) {
        setProducts(result.products || []);
        setLastUpdate(new Date());
        console.log('✅ Productos cargados:', result.products?.length || 0);
      } else {
        setError(result.error || 'Error al cargar productos');
        setProducts([]);
      }
    } catch (err) {
      console.error('❌ Error cargando productos:', err);
      setError(err.message || 'Error de conexión');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // Cargar producto específico para edición
  const loadProductForEdit = async (id) => {
    if (!id || !householdId) return;
    
    setLoading(true);
    try {
      // Buscar el producto en la lista cargada primero
      const existingProduct = products.find(p => p.id === id);
      if (existingProduct) {
        setSelectedProduct(existingProduct);
        setLoading(false);
        return;
      }
      
      // Si no está en la lista, cargarlo individualmente
      console.log('📥 Cargando producto para edición:', id);
      const result = await productsService.getProductsByHousehold(householdId);
      
      if (result.success) {
        const productToEdit = result.products.find(p => p.id === id);
        if (productToEdit) {
          setSelectedProduct(productToEdit);
        } else {
          setError('Producto no encontrado');
          setSearchParams({});
        }
      }
    } catch (err) {
      console.error('❌ Error cargando producto para edición:', err);
      setError('Error al cargar el producto: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Efecto para cargar datos
  useEffect(() => {
    if (user && householdId && !householdLoading) {
      loadProducts();
    } else if (!householdLoading && !householdId) {
      setLoading(false);
      setProducts([]);
    }
  }, [user, householdId, householdLoading]);

  // Efecto para manejar parámetros de URL
  useEffect(() => {
    if (productId && action === 'edit') {
      loadProductForEdit(productId);
    } else if (action === 'add') {
      setSelectedProduct(null);
    } else if (productId && action === 'restock') {
      // Nueva acción: reabastecimiento
      loadProductForEdit(productId);
    } else {
      setSelectedProduct(null);
    }
  }, [productId, action, householdId]);

  // Manejar cierre de modal
  const handleCloseModal = () => {
    setSearchParams({});
    setSelectedProduct(null);
    loadProducts();
  };

  // Función para crear producto
  const handleCreateProduct = async (productData) => {
    if (!householdId) {
      setError('No hay hogar seleccionado');
      return;
    }

    setActionLoading(true);
    try {
      const result = await productsService.createProduct(productData, householdId);
      
      if (result.success) {
        handleCloseModal();
        return { success: true, product: result.product };
      } else {
        throw new Error(result.error || 'Error al crear producto');
      }
    } catch (err) {
      console.error('❌ Error creando producto:', err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // Función para actualizar producto
  const handleUpdateProduct = async (productId, updates) => {
    setActionLoading(true);
    try {
      const result = await productsService.updateProduct(productId, updates);
      
      if (result.success) {
        handleCloseModal();
        return { success: true };
      } else {
        throw new Error(result.error || 'Error al actualizar producto');
      }
    } catch (err) {
      console.error('❌ Error actualizando producto:', err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // Función para eliminar producto
  const handleDeleteProduct = async (productId) => {
    if (null) {
      return;
    }

    setActionLoading(true);
    try {
      const result = await productsService.deleteProduct(productId);
      
      if (result.success) {
        setProducts(prev => prev.filter(p => p.id !== productId));
        console.log('✅ Producto eliminado:', productId);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (err) {
      console.error('❌ Error eliminando producto:', err);
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Función para consumir producto
  const handleConsumeProduct = async (productId, amount = 1) => {
    setActionLoading(true);
    try {
      const result = await productsService.consumeProduct(productId, amount);
      
      if (result.success) {
        setProducts(prev => prev.map(p => 
          p.id === productId 
            ? { ...p, quantityCurrent: result.newQuantity, status: result.newStatus }
            : p
        ));
        console.log('✅ Producto consumido:', productId);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (err) {
      console.error('❌ Error consumiendo producto:', err);
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Función para abrir producto
  const handleOpenProduct = async (productId) => {
    setActionLoading(true);
    try {
      const result = await productsService.openProduct(productId);
      
      if (result.success) {
        await loadProducts();
      } else {
        alert('Error: ' + result.error);
      }
    } catch (err) {
      console.error('❌ Error abriendo producto:', err);
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Función para restaurar producto
  const handleRestoreProduct = async (productId) => {
    if (!window.confirm('¿Restaurar este producto como recién comprado?')) {
      return;
    }

    setActionLoading(true);
    try {
      const result = await productsService.restoreProduct(productId);
      
      if (result.success) {
        setProducts(prev => prev.map(p => 
          p.id === productId 
            ? { 
                ...p, 
                quantityCurrent: result.newQuantity, 
                status: result.newStatus,
                expirationDate: result.newExpirationDate
              }
            : p
        ));
        console.log('✅ Producto restaurado:', productId);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (err) {
      console.error('❌ Error restaurando producto:', err);
      alert('Error: ' + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Función para abrir edición desde botón
  const handleEditProduct = (product) => {
      setSearchParams({ action: 'edit', id: product.id });
    };
  
    // Función para reabastecer producto
  const handleRestockProduct = async (productId, updates) => {
    setActionLoading(true);
    try {
      // Primero actualizar el producto
      const result = await productsService.updateProduct(productId, updates);
      
      if (result.success) {
        // Luego registrar el reabastecimiento en el historial
        try {
          await consumptionService.logProductRestock(productId, {
            quantity: updates.quantityCurrent,
            previousQuantity: 0, // Estaba agotado
            expirationDate: updates.expirationDate
          });
        } catch (logError) {
          console.warn('⚠️ No se pudo registrar en historial:', logError);
        }
        
        handleCloseModal();
        return { success: true };
      } else {
        throw new Error(result.error || 'Error al reabastecer producto');
      }
    } catch (err) {
      console.error('❌ Error reabasteciendo producto:', err);
      throw err;
    } finally {
      setActionLoading(false);
    }
  };

  // Función para ordenar productos
  const sortProducts = (products) => {
    return [...products].sort((a, b) => {
      let comparison = 0;
      
      switch(sortBy) {
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'quantity':
          const percentA = a.quantityTotal > 0 ? (a.quantityCurrent / a.quantityTotal) : 0;
          const percentB = b.quantityTotal > 0 ? (b.quantityCurrent / b.quantityTotal) : 0;
          comparison = percentA - percentB;
          break;
        case 'expiration':
          const dateA = a.expirationDate ? new Date(a.expirationDate) : new Date('9999-12-31');
          const dateB = b.expirationDate ? new Date(b.expirationDate) : new Date('9999-12-31');
          comparison = dateA - dateB;
          break;
        case 'status':
          const statusOrder = { 'out': 0, 'low': 1, 'available': 2 };
          comparison = statusOrder[a.status] - statusOrder[b.status];
          break;
        case 'updated':
        default:
          const updatedA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
          const updatedB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
          comparison = updatedB - updatedA;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  // Filtrar y ordenar productos
  const filteredAndSortedProducts = sortProducts(
    products.filter(product => {
      // Filtro por búsqueda
      if (searchTerm && !product.name?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filtro por estado
      if (filter !== 'all') {
        if (filter === 'opened') {
          if (!product.lastOpenedAt || product.status === 'out') return false;
        } else if (filter === 'expiring') {
          if (!product.expirationDate) return false;
          
          try {
            const expDate = product.expirationDate.toDate 
              ? product.expirationDate.toDate() 
              : new Date(product.expirationDate);
            const today = new Date();
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            
            if (expDate < today || expDate > nextWeek) return false;
          } catch {
            return false;
          }
        } else if (filter !== product.status) {
          return false;
        }
      }
      
      return true;
    })
  );

  // Estadísticas
  const stats = {
    total: products.length,
    available: products.filter(p => p.status === 'available').length,
    low: products.filter(p => p.status === 'low').length,
    out: products.filter(p => p.status === 'out').length,
    opened: products.filter(p => p.lastOpenedAt && p.status !== 'out').length,
    expiring: products.filter(p => {
      if (!p.expirationDate) return false;
      try {
        const expDate = p.expirationDate.toDate ? p.expirationDate.toDate() : new Date(p.expirationDate);
        const today = new Date();
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        return expDate >= today && expDate <= nextWeek;
      } catch {
        return false;
      }
    }).length
  };

  // Estado de carga combinado
  const isLoading = householdLoading || loading;

  // ========== RENDERIZADO ==========

  if (isLoading && !action) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <Header title="Productos" showBack={true} />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Loader fullScreen message="Cargando inventario..." />
        </div>
      </div>
    );
  }

  // Sin hogar
  if (!householdId && !householdLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <Header title="Productos" showBack={true} />
        <main className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Sin hogar configurado</h2>
            <p className="text-gray-600 mb-6">
              Para gestionar productos, necesitas crear o unirte a un hogar.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/settings?tab=household')}
              className="py-3 px-6"
            >
              Configurar mi hogar
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <Header title="Productos" showBack={true} />
      
      <main className="main-content-with-bottomnav max-w-7xl mx-auto px-4 py-6">
        {/* Mensaje de error */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
              <div className="flex-1">
                <p className="text-red-700">{error}</p>
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={loadProducts}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Reintentar
                  </button>
                  <button
                    onClick={() => navigate('/products')}
                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                  >
                    Recargar página
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Encabezado con búsqueda y acciones */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm text-gray-600">
                  {products.length} productos
                </span>
                {lastUpdate && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span className="text-xs text-gray-500">
                      Actualizado: {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </>
                )}
                {actionLoading && (
                  <span className="text-xs text-amber-600 animate-pulse">
                    <RefreshCw className="h-3 w-3 inline-block mr-1 animate-spin" />
                    Procesando...
                  </span>
                )}
              </div>
            </div>
              
            {/* CONTROLES PRINCIPALES - REORGANIZADO */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Controles de vista y orden - MEJOR DISEÑO */}
              <div className="flex items-center justify-between sm:justify-start gap-2">
                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  {/* Toggle vista grid/lista */}
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
                    title="Vista de tarjetas"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-600 hover:text-gray-900'}`}
                    title="Vista de lista"
                  >
                    <LayoutList className="h-4 w-4" />
                  </button>
                </div>

                {/* Ordenamiento con dropdown mejorado */}
                <div className="relative">
                  <div className="flex items-center bg-gray-100 rounded-lg">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-transparent py-2 pl-3 pr-8 text-sm border-0 focus:ring-0 focus:outline-none appearance-none"
                    >
                      <option value="updated">Más reciente</option>
                      <option value="name">Nombre</option>
                      <option value="quantity">Cantidad</option>
                      <option value="expiration">Vencimiento</option>
                      <option value="status">Estado</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-2 py-2 text-gray-600 hover:text-gray-900"
                      title={`Ordenar ${sortOrder === 'asc' ? 'descendente' : 'ascendente'}`}
                    >
                      {sortOrder === 'asc' ? (
                        <SortAsc className="h-4 w-4" />
                      ) : (
                        <SortDesc className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
                    
              {/* Botones de acción */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={loadProducts}
                  disabled={actionLoading}
                  className="flex-1 sm:flex-none"
                >
                  <RefreshCw className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Actualizar</span>
                </Button>
                <Button
                  variant="primary"
                  onClick={() => setSearchParams({ action: 'add' })}
                  disabled={actionLoading}
                  className="flex-1 sm:flex-none"
                >
                  <Plus className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Agregar</span>
                  <span className="sm:hidden"></span>
                </Button>
              </div>
            </div>
          </div>
  
  

          
          {/* Búsqueda y filtros */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar productos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                  filter === 'all' 
                    ? 'bg-primary-100 text-primary-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FilterIcon className="h-4 w-4 mr-2" />
                Todos ({stats.total})
              </button>
              <button
                onClick={() => setFilter('available')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                  filter === 'available' 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <BatteryFull className="h-4 w-4 mr-2" />
                Disponibles ({stats.available})
              </button>
              <button
                onClick={() => setFilter('low')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                  filter === 'low' 
                    ? 'bg-amber-100 text-amber-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <BatteryLow className="h-4 w-4 mr-2" />
                Bajo stock ({stats.low})
              </button>
              <button
                onClick={() => setFilter('out')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                  filter === 'out' 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Battery className="h-4 w-4 mr-2" />
                Agotados ({stats.out})
              </button>
              
              {/* NUEVOS FILTROS ESPECIALES */}
              <button
                onClick={() => setFilter('opened')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                  filter === 'opened' 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <PackageOpen className="h-4 w-4 mr-2" />
                Abiertos ({stats.opened})
              </button>
              
              <button
                onClick={() => setFilter('expiring')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                  filter === 'expiring' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Por vencer ({stats.expiring})
              </button>
            </div>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        {products.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center mb-2">
                <Package className="h-5 w-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">Total</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center mb-2">
                <TrendingUp className="h-5 w-5 text-green-400 mr-2" />
                <span className="text-sm text-gray-600">Disponibles</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.available}</p>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center mb-2">
                <TrendingDown className="h-5 w-5 text-amber-400 mr-2" />
                <span className="text-sm text-gray-600">Bajo stock</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">{stats.low}</p>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center mb-2">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-sm text-gray-600">Agotados</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.out}</p>
            </div>
          </div>
        )}

        {/* Lista de productos */}
        {filteredAndSortedProducts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-3">
              {searchTerm || filter !== 'all' ? 'No hay resultados' : 'Inventario vacío'}
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {searchTerm || filter !== 'all' 
                ? 'No se encontraron productos con esos filtros. Intenta cambiar los criterios.'
                : 'Comienza agregando productos a tu inventario para llevar un control de lo que tienes en casa.'
              }
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {(searchTerm || filter !== 'all') && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setFilter('all');
                  }}
                >
                  Limpiar filtros
                </Button>
              )}
              <Button
                variant="primary"
                onClick={() => setSearchParams({ action: 'add' })}
                disabled={actionLoading}
              >
                <Plus className="h-5 w-5 mr-2" />
                Agregar primer producto
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Mostrando <span className="font-medium">{filteredAndSortedProducts.length}</span> de{' '}
                <span className="font-medium">{products.length}</span> productos
                {searchTerm && ` para "${searchTerm}"`}
              </p>
              <div className="text-sm text-gray-500">
                Ordenado por: {
                  sortBy === 'name' ? 'Nombre' :
                  sortBy === 'quantity' ? 'Cantidad' :
                  sortBy === 'expiration' ? 'Vencimiento' :
                  sortBy === 'status' ? 'Estado' :
                  'Más reciente'
                } ({sortOrder === 'asc' ? 'A→Z' : 'Z→A'})
              </div>
            </div>
            
            {/* VISTA CONDICIONAL: Grid o Lista */}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAndSortedProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onUpdate={loadProducts}
                    onDelete={handleDeleteProduct}
                    onConsume={handleConsumeProduct}
                    onOpen={handleOpenProduct}
                    onRestore={handleRestoreProduct}
                    onEdit={() => handleEditProduct(product)}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                {filteredAndSortedProducts.map((product) => (
                  <ProductListItem
                    key={product.id}
                    product={product}
                    onConsume={handleConsumeProduct}
                    onOpen={handleOpenProduct}
                    onRestore={handleRestoreProduct}
                    onViewDetails={() => {
                      setSelectedProduct(product);
                      setShowDetailModal(true);
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Botón flotante ajustado */}
      <button className="floating-action-button" onClick={() => setSearchParams({ action: 'add' })}>
        <Plus className="h-6 w-6" />
      </button>


      {/* Modal para agregar/editar producto - CONTROLADO POR URL */}
      <Modal
        isOpen={!!action} // Se abre cuando hay una acción en la URL
        onClose={handleCloseModal}
        title={
          action === 'restock' ? `Reabastecer "${selectedProduct?.name}"` :
          action === 'edit' ? `Editar "${selectedProduct?.name}"` : 'Agregar nuevo producto' 
        }
        size="lg"
      >
        {(action === 'add' || (action === 'edit' && selectedProduct) || (action === 'restock' && selectedProduct)) ? (
          <ProductForm
            product={action === 'edit' ? selectedProduct : null}
            onSubmit={(data) => {
              if (action === 'add') {
                return handleCreateProduct(data);
              } else if (action === 'edit' && selectedProduct) {
                return handleUpdateProduct(selectedProduct.id, data);
              }
                else if (action === 'restock' && selectedProduct) {
                  return handleUpdateProduct(selectedProduct.id, data);
              }
            }}
            onClose={handleCloseModal}
            isLoading={actionLoading}
            isEditMode={action === 'edit'}
            isRestock={action === 'restock'}
          />
        ) : action === 'edit' || action === 'restock' ? (
          <div className="text-center py-8">
            <Loader message="Cargando producto..." />
          </div>
        ) : null}
        
        {/* Botón de cerrar */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            onClick={handleCloseModal}
            className="w-full"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
        </div>
      </Modal>

      {/* Modal de detalles de producto (para vista lista) */}
      <ProductDetailModal
        product={selectedProduct}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedProduct(null);
        }}
        onConsume={handleConsumeProduct}
        onOpen={handleOpenProduct}
        onRestore={handleRestoreProduct}
        onDelete={handleDeleteProduct}
        onEdit={() => {
          if (selectedProduct) {
            handleEditProduct(selectedProduct);
            setShowDetailModal(false);
          }
        }}
      />
    </div>
  );
};

export default Products;