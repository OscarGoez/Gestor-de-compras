// pages/Dashboard.jsx - VERSIÓN MEJORADA PARA FAMILIAS
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Plus,
  AlertTriangle,
  RefreshCw,
  Home,
  Users,
  Clock,
  CheckCircle,
  User,
  Calendar,
  Filter,
  ChevronRight,
  ShoppingBag,
  Battery,
  PackageOpen,
  PackageCheck,
  PackageX,
  Bell,
  Zap,
  Info,
  ArrowRight,
  Check,
  TrendingDown,
  Smile,
  Frown,
  Meh
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { useProducts } from '../hooks/useProducts';
import Header from '../components/layout/Header';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';
import { productsService } from '../api/products.service';
import { shoppingService } from '../api/shopping.service';

// Componente auxiliar para estado del inventario (NUEVO)
const InventoryStatus = ({ status, total, low, out, shopping }) => {
  let statusData = {
    icon: Smile,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
    title: '¡Todo en orden!',
    message: 'El inventario está bien gestionado',
    level: 'alto'
  };

  if (out > 2 || shopping > 5) {
    statusData = {
      icon: Frown,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
      title: '¡Necesita atención!',
      message: 'Varios productos están agotados',
      level: 'bajo'
    };
  } else if (low > 3 || shopping > 0) {
    statusData = {
      icon: Meh,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      title: 'Revisar pronto',
      message: 'Algunos productos están bajos',
      level: 'medio'
    };
  }

  const StatusIcon = statusData.icon;

  return (
    <div className={`${statusData.bg} ${statusData.border} border-2 rounded-2xl p-5`}>
      <div className="flex items-center mb-4">
        <div className={`p-3 rounded-xl ${statusData.bg.replace('bg-', 'bg-opacity-20')} mr-4`}>
          <StatusIcon className={`h-8 w-8 ${statusData.color}`} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">{statusData.title}</h3>
          <p className="text-gray-600">{statusData.message}</p>
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900">{total}</div>
          <div className="text-sm text-gray-600">Productos</div>
        </div>
        
        <div className="flex items-center">
          <div className="text-center mx-4">
            <div className={`text-2xl font-bold ${low > 0 ? 'text-amber-600' : 'text-gray-700'}`}>{low}</div>
            <div className="text-xs text-gray-600">Bajos</div>
          </div>
          
          <div className="text-center mx-4">
            <div className={`text-2xl font-bold ${out > 0 ? 'text-red-600' : 'text-gray-700'}`}>{out}</div>
            <div className="text-xs text-gray-600">Agotados</div>
          </div>
          
          <div className="text-center ml-4">
            <div className={`text-2xl font-bold ${shopping > 0 ? 'text-blue-600' : 'text-gray-700'}`}>{shopping}</div>
            <div className="text-xs text-gray-600">Por comprar</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente simplificado para acción rápida
const QuickActionCard = ({ icon: Icon, title, description, color, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`w-full p-4 rounded-xl border transition-all duration-200 text-left group hover:scale-[1.02] active:scale-[0.98] ${color.bg} ${color.border} hover:shadow-md`}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${color.iconBg} mr-4`}>
          <Icon className={`h-6 w-6 ${color.icon}`} />
        </div>
        <div>
          <h4 className="font-bold text-gray-900 text-lg">{title}</h4>
          <p className="text-gray-600 text-sm">{description}</p>
        </div>
      </div>
      
      <div className="flex items-center">
        {badge && (
          <span className={`px-2 py-1 rounded-full text-xs font-bold mr-3 ${badge.color}`}>
            {badge.text}
          </span>
        )}
        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
      </div>
    </div>
  </button>
);

// Componente para producto urgente
const UrgentProduct = ({ product, reason }) => {
  const getReasonIcon = () => {
    switch(reason) {
      case 'out': return { icon: PackageX, color: 'text-red-600', bg: 'bg-red-100' };
      case 'low': return { icon: TrendingDown, color: 'text-amber-600', bg: 'bg-amber-100' };
      case 'expiring': return { icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-100' };
      default: return { icon: AlertTriangle, color: 'text-gray-600', bg: 'bg-gray-100' };
    }
  };

  const reasonInfo = getReasonIcon();
  const ReasonIcon = reasonInfo.icon;

  return (
    <div className="flex items-center p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
      <div className={`p-2 rounded-lg ${reasonInfo.bg} mr-3`}>
        <ReasonIcon className={`h-5 w-5 ${reasonInfo.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 truncate">{product.name}</h4>
        <p className="text-sm text-gray-600">
          {reason === 'out' ? 'Se agotó' : 
           reason === 'low' ? 'Queda poco' : 
           'Vence pronto'}
        </p>
      </div>
      <ChevronRight className="h-5 w-5 text-gray-400 ml-2" />
    </div>
  );
};

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { 
    household, 
    householdId, 
    loading: householdLoading, 
    members = [], 
    error: householdError,
    reloadHousehold
  } = useHousehold();
  
  const { 
    products, 
    loading: productsLoading, 
    error: productsError,
    refreshProducts
  } = useProducts();
  
  const safeMembers = Array.isArray(members) ? members : [];
  
  const [stats, setStats] = useState({
    totalProducts: 0,
    lowStock: 0,
    outOfStock: 0,
    available: 0,
    shoppingItems: 0,
    expiringSoon: 0,
    urgentProducts: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [showWelcome, setShowWelcome] = useState(!localStorage.getItem('dashboard_welcome_shown'));

  // Cargar datos del dashboard
  const loadDashboardData = useCallback(async () => {
    if (!user || !householdId) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    try {
      // 1. Cargar productos
      let productsList = products;
      if (products.length === 0) {
        const productsResult = await productsService.getProductsByHousehold(householdId);
        if (productsResult.success) {
          productsList = productsResult.data || [];
        }
      }
      
      // 2. Cargar lista de compras
      let shoppingItemsCount = 0;
      try {
        const shoppingResult = await shoppingService.getShoppingList(householdId);
        if (shoppingResult?.success && Array.isArray(shoppingResult.data)) {
          shoppingItemsCount = shoppingResult.data.length;
        }
      } catch (shoppingError) {
        console.warn('Error lista compras:', shoppingError);
      }
      
      // 3. Calcular estadísticas simplificadas
      const totalProducts = productsList.length;
      const lowStock = productsList.filter(p => p.status === 'low').length;
      const outOfStock = productsList.filter(p => p.status === 'out').length;
      const available = productsList.filter(p => p.status === 'available').length;
      
      // Productos que expiran pronto
      const today = new Date();
      const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const expiringSoon = productsList.filter(p => {
        if (!p.expirationDate) return false;
        try {
          const expDate = p.expirationDate.toDate ? 
            p.expirationDate.toDate() : 
            new Date(p.expirationDate);
          return expDate >= today && expDate <= nextWeek;
        } catch {
          return false;
        }
      }).length;
      
      // Productos urgentes (los que necesitan atención inmediata)
      const urgentProducts = [];
      
      // Agotados (más urgente)
      productsList
        .filter(p => p.status === 'out')
        .slice(0, 3)
        .forEach(p => urgentProducts.push({ ...p, reason: 'out' }));
      
      // Bajo stock
      if (urgentProducts.length < 3) {
        productsList
          .filter(p => p.status === 'low')
          .slice(0, 3 - urgentProducts.length)
          .forEach(p => urgentProducts.push({ ...p, reason: 'low' }));
      }
      
      // Por vencer
      if (urgentProducts.length < 3) {
        productsList
          .filter(p => {
            if (!p.expirationDate) return false;
            try {
              const expDate = p.expirationDate.toDate ? 
                p.expirationDate.toDate() : 
                new Date(p.expirationDate);
              return expDate >= today && expDate <= nextWeek;
            } catch {
              return false;
            }
          })
          .slice(0, 3 - urgentProducts.length)
          .forEach(p => urgentProducts.push({ ...p, reason: 'expiring' }));
      }
      
      setStats({
        totalProducts,
        lowStock,
        outOfStock,
        available,
        shoppingItems: shoppingItemsCount,
        expiringSoon,
        urgentProducts
      });
      
      setLastUpdated(new Date());
      setError(null);
      
    } catch (err) {
      console.error('Error en dashboard:', err);
      setError('No se pudieron cargar los datos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [user, householdId, products]);

  // Forzar recarga
  const handleRefresh = async () => {
    if (householdId) {
      await refreshProducts();
    }
    await loadDashboardData();
  };

  // Efecto principal
  useEffect(() => {
    if (!user) return;
    
    if (householdLoading) return;
    
    const timer = setTimeout(() => {
      loadDashboardData();
    }, 200);
    
    return () => clearTimeout(timer);
  }, [user, householdId, householdLoading, loadDashboardData]);

  // Cerrar mensaje de bienvenida
  const closeWelcome = () => {
    setShowWelcome(false);
    localStorage.setItem('dashboard_welcome_shown', 'true');
  };

  // ========== RENDERIZADO ==========

  // 1. Cargando
  if (loading || householdLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Inicio" showBack={false} />
        <div className="max-w-6xl mx-auto px-4 py-8">
          <Loader 
            fullScreen 
            message="Cargando tu hogar..." 
          />
        </div>
      </div>
    );
  }

  // 2. Usuario sin hogar
  if (!householdId && !householdLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Inicio" showBack={false} />
        
        <main className="max-w-md mx-auto px-4 py-12">
          <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-100 rounded-2xl mb-6">
              <Home className="h-10 w-10 text-primary-600" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-3">
              ¡Hola{userData?.name ? `, ${userData.name}` : ''}!
            </h1>
            
            <p className="text-gray-600 mb-8">
              Empieza creando un hogar para organizar los productos con tu familia.
            </p>
            
            <Button
              variant="primary"
              size="xl"
              onClick={() => navigate('/settings?tab=household')}
              className="w-full py-4 rounded-xl"
            >
              <Home className="h-5 w-5 mr-2" />
              Crear mi hogar
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // 3. Error
  if (error || householdError) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Inicio" showBack={false} />
        
        <main className="max-w-md mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            
            <h2 className="text-lg font-bold text-gray-900 mb-3">Algo salió mal</h2>
            <p className="text-gray-600 mb-6">
              {error || householdError}
            </p>
            
            <Button
              variant="primary"
              onClick={handleRefresh}
              className="w-full py-3 rounded-xl"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Intentar de nuevo
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // 4. DASHBOARD PRINCIPAL (SIMPLIFICADO)
  return (
    <div className="min-h-screen bg-gray-50 pb-24 md:pb-8">
      <Header title="Inicio" showBack={false} />
      
      <main className="max-w-6xl mx-auto px-4 py-4">
        {/* Mensaje de bienvenida (solo primera vez) */}
        {showWelcome && (
          <div className="mb-6 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-start">
                <div className="p-2 bg-blue-100 rounded-lg mr-4">
                  <Smile className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">¡Bienvenido a tu hogar digital!</h3>
                  <p className="text-gray-700">
                    Aquí puedes ver qué productos tienes, cuáles faltan y qué necesitas comprar. 
                    Todo en un solo lugar para toda la familia.
                  </p>
                </div>
              </div>
              <button
                onClick={closeWelcome}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Encabezado simple */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{household?.name || 'Mi Hogar'}</h1>
              <div className="flex items-center mt-1">
                <Users className="h-4 w-4 text-gray-400 mr-2" />
                <span className="text-gray-600">
                  {safeMembers.length} {safeMembers.length === 1 ? 'miembro' : 'miembros'} en la familia
                </span>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title="Actualizar"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/products?action=add')}
                className="rounded-xl"
              >
                <Plus className="h-4 w-4 mr-1" />
                Agregar
              </Button>
            </div>
          </div>
        </div>

        {/* SEECCIÓN 1: Estado del inventario */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Package className="h-5 w-5 text-primary-600 mr-2" />
            Estado de tu despensa
          </h2>
          
          <InventoryStatus 
            status="good"
            total={stats.totalProducts}
            low={stats.lowStock}
            out={stats.outOfStock}
            shopping={stats.shoppingItems}
          />
        </div>

        {/* SEECCIÓN 2: Acciones principales */}
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Zap className="h-5 w-5 text-amber-500 mr-2" />
            Acciones rápidas
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <QuickActionCard
              icon={Plus}
              title="Agregar producto"
              description="Registra algo nuevo en la casa"
              color={{
                bg: 'bg-white',
                border: 'border-blue-200',
                iconBg: 'bg-blue-100',
                icon: 'text-blue-600'
              }}
              onClick={() => navigate('/products?action=add')}
            />
            
            <QuickActionCard
              icon={ShoppingCart}
              title="Ir de compras"
              description="Ver lista de compras"
              color={{
                bg: 'bg-white',
                border: stats.shoppingItems > 0 ? 'border-red-200' : 'border-gray-200',
                iconBg: stats.shoppingItems > 0 ? 'bg-red-100' : 'bg-gray-100',
                icon: stats.shoppingItems > 0 ? 'text-red-600' : 'text-gray-600'
              }}
              badge={stats.shoppingItems > 0 ? {
                text: `${stats.shoppingItems}`,
                color: 'bg-red-100 text-red-700'
              } : null}
              onClick={() => navigate('/shopping-list')}
            />
            
            <QuickActionCard
              icon={Package}
              title="Ver productos"
              description="Todos los productos en casa"
              color={{
                bg: 'bg-white',
                border: 'border-green-200',
                iconBg: 'bg-green-100',
                icon: 'text-green-600'
              }}
              onClick={() => navigate('/products')}
            />
            
            <QuickActionCard
              icon={BarChart3}
              title="Ver estadísticas"
              description="Cómo usamos los productos"
              color={{
                bg: 'bg-white',
                border: 'border-purple-200',
                iconBg: 'bg-purple-100',
                icon: 'text-purple-600'
              }}
              onClick={() => navigate('/analytics')}
            />
          </div>
        </div>

        {/* SEECCIÓN 3: Productos que necesitan atención */}
        {stats.urgentProducts.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 flex items-center">
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
                Productos que necesitan atención
              </h2>
              <span className="text-sm text-red-600 font-medium">
                {stats.urgentProducts.length} para revisar
              </span>
            </div>
            
            <div className="space-y-3">
              {stats.urgentProducts.map((product, index) => (
                <UrgentProduct 
                  key={product.id || index} 
                  product={product}
                  reason={product.reason}
                />
              ))}
              
              <button
                onClick={() => navigate('/products')}
                className="w-full py-3 text-primary-600 hover:text-primary-700 font-medium flex items-center justify-center"
              >
                Ver todos los productos
                <ArrowRight className="h-4 w-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* SEECCIÓN 4: Consejos para hoy */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-200 p-5">
            <div className="flex items-center mb-4">
              <Info className="h-6 w-6 text-blue-600 mr-3" />
              <h3 className="text-lg font-bold text-gray-900">Consejo para hoy</h3>
            </div>
            
            <div className="space-y-4">
              {stats.shoppingItems > 0 ? (
                <div className="flex items-start">
                  <div className="p-1 bg-blue-100 rounded mr-3 mt-0.5">
                    <Check className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Tienes {stats.shoppingItems} productos por comprar
                    </p>
                    <p className="text-gray-700 text-sm mt-1">
                      Revisa la lista de compras antes de ir al supermercado
                    </p>
                  </div>
                </div>
              ) : stats.lowStock > 0 ? (
                <div className="flex items-start">
                  <div className="p-1 bg-amber-100 rounded mr-3 mt-0.5">
                    <Check className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {stats.lowStock} productos están bajos de stock
                    </p>
                    <p className="text-gray-700 text-sm mt-1">
                      Considera agregarlos a la lista de compras pronto
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start">
                  <div className="p-1 bg-green-100 rounded mr-3 mt-0.5">
                    <Check className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">¡Todo está en orden!</p>
                    <p className="text-gray-700 text-sm mt-1">
                      Tu despensa está bien gestionada. Sigue registrando los productos que uses.
                    </p>
                  </div>
                </div>
              )}
              
              {stats.expiringSoon > 0 && (
                <div className="flex items-start">
                  <div className="p-1 bg-purple-100 rounded mr-3 mt-0.5">
                    <Calendar className="h-4 w-4 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {stats.expiringSoon} productos vencen esta semana
                    </p>
                    <p className="text-gray-700 text-sm mt-1">
                      Úsalos pronto para evitar desperdicios
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SEECCIÓN 5: Información simple del hogar */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center mb-4">
            <Home className="h-6 w-6 text-gray-600 mr-3" />
            <h3 className="text-lg font-bold text-gray-900">Tu hogar</h3>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Miembros en la familia</span>
              <span className="font-medium text-gray-900">{safeMembers.length}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Productos registrados</span>
              <span className="font-medium text-gray-900">{stats.totalProducts}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Actualizado</span>
              <span className="text-sm text-gray-600">
                {lastUpdated ? 
                  `Hoy ${lastUpdated.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 
                  'Hoy'}
              </span>
            </div>
          </div>
          
          <button
            onClick={() => navigate('/settings')}
            className="w-full mt-6 py-3 border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl font-medium flex items-center justify-center"
          >
            <Users className="h-4 w-4 mr-2" />
            Gestionar hogar
          </button>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;