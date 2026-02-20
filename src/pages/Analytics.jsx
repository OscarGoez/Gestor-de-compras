// pages/Analytics.jsx (VERSIÓN MEJORADA)
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  Package, 
  Clock, 
  BarChart3, 
  RefreshCw,
  Activity,
  Zap,
  Shield,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ShoppingCart,
  CheckCircle,
  Home,
  Users,
  Filter,
  ChevronDown,
  Info,
  Brain,
  Target,
  Gauge,
  PieChart,
  ListChecks
} from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useHousehold } from '../context/HouseholdContext';
import { usePredictions } from '../hooks/usePredictions';
import { consumptionService } from '../api/consumption.service';
import { formatDate, getDaysDifference } from '../utils/date.utils';
import Header from '../components/layout/Header';
import Loader from '../components/common/Loader';
import ProductPredictionCard from '../components/analytics/ProductPredictionCard';

const Analytics = () => {
  const { products, loading: productsLoading } = useProducts();
  const { householdId, householdData } = useHousehold();
  const navigate = useNavigate();
  
  const [consumptionStats, setConsumptionStats] = useState(null);
  const [mostConsumed, setMostConsumed] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showLowData, setShowLowData] = useState(true); // Mostrar productos con pocos datos

  // 🔥 NUEVO: Usar nuestro hook de predicciones
  const { 
    predictions, 
    soonToExpire,
    loading: predictionsLoading 
  } = usePredictions(products, householdId, {
    minConfidence: 'baja', // En analytics queremos ver todo
    limit: 50
  });

  // Cargar estadísticas de consumo
  useEffect(() => {
    const loadStats = async () => {
      if (!householdId) return;
      
      setStatsLoading(true);
      try {
        const statsResult = await consumptionService.getConsumptionStats(householdId);
        if (statsResult.success) {
          setConsumptionStats(statsResult.stats);
        }

        const consumedResult = await consumptionService.getMostConsumedProducts(householdId, 10);
        if (consumedResult.success) {
          setMostConsumed(consumedResult.products);
        }
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [householdId, timeRange]);

  // Calcular métricas del inventario (tu código existente se mantiene igual)
  const inventoryMetrics = useMemo(() => {
    if (!products.length) return null;

    const totalProducts = products.length;
    const availableProducts = products.filter(p => p.status === 'available').length;
    const lowStockProducts = products.filter(p => p.status === 'low').length;
    const outOfStockProducts = products.filter(p => p.status === 'out').length;
    
    const productsWithExpiration = products.filter(p => p.expirationDate);
    const expiringSoon = productsWithExpiration.filter(p => {
      if (!p.expirationDate) return false;
      const daysLeft = getDaysDifference(new Date(), p.expirationDate);
      return daysLeft <= 7 && daysLeft >= 0;
    }).length;
    const expiredProducts = productsWithExpiration.filter(p => {
      if (!p.expirationDate) return false;
      return getDaysDifference(new Date(), p.expirationDate) < 0;
    }).length;

    let healthScore = 100;
    healthScore -= (outOfStockProducts / totalProducts) * 40;
    healthScore -= (expiringSoon / totalProducts) * 30;
    healthScore -= (expiredProducts / totalProducts) * 50;
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    const openedProducts = products.filter(p => p.lastOpenedAt).length;
    const currentlyInUse = products.filter(p => 
      p.lastOpenedAt && p.quantityCurrent < p.quantityTotal
    ).length;
    
    const usageEfficiency = openedProducts > 0 
      ? Math.round((currentlyInUse / openedProducts) * 100)
      : 0;

    const recentlyRestocked = products.filter(p => {
      if (!p.updatedAt) return false;
      const daysSinceUpdate = getDaysDifference(p.updatedAt, new Date());
      return daysSinceUpdate <= 7 && p.quantityCurrent > p.quantityTotal * 0.5;
    }).length;
    
    const restockingRate = totalProducts > 0
      ? Math.round((recentlyRestocked / totalProducts) * 100)
      : 0;

    return {
      totalProducts,
      availableProducts,
      lowStockProducts,
      outOfStockProducts,
      productsWithExpiration: productsWithExpiration.length,
      expiringSoon,
      expiredProducts,
      healthScore,
      usageEfficiency,
      restockingRate,
      openedProducts,
      currentlyInUse
    };
  }, [products]);

  // 🔥 NUEVO: Categorías únicas para filtro
  const categories = useMemo(() => {
    const cats = ['all', ...new Set(products.map(p => p.category))];
    return cats;
  }, [products]);

  // 🔥 NUEVO: Predicciones filtradas por categoría
  const filteredPredictions = useMemo(() => {
    let filtered = predictions;
    
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(pred => {
        const product = products.find(p => p.id === pred.productId);
        return product?.category === selectedCategory;
      });
    }
    
    if (!showLowData) {
      filtered = filtered.filter(pred => 
        pred.confidence === 'alta' || pred.confidence === 'media'
      );
    }
    
    return filtered;
  }, [predictions, selectedCategory, showLowData, products]);

  // 🔥 NUEVO: Estadísticas de predicciones
  const predictionStats = useMemo(() => {
    const total = predictions.length;
    const highConfidence = predictions.filter(p => p.confidence === 'alta').length;
    const mediumConfidence = predictions.filter(p => p.confidence === 'media').length;
    const lowConfidence = predictions.filter(p => p.confidence === 'baja').length;
    
    const urgentCount = soonToExpire.length;
    
    return {
      total,
      highConfidence,
      mediumConfidence,
      lowConfidence,
      urgentCount,
      hasGoodData: highConfidence + mediumConfidence
    };
  }, [predictions, soonToExpire]);

  // Tus KPIs existentes (se mantienen igual)
  const kpiCards = [
    {
      title: 'Salud del Inventario',
      value: inventoryMetrics?.healthScore ? `${inventoryMetrics.healthScore}%` : 'N/A',
      description: 'Estado general del inventario',
      icon: Activity,
      color: inventoryMetrics?.healthScore >= 70 ? 'green' : 
             inventoryMetrics?.healthScore >= 40 ? 'amber' : 'red',
      trend: inventoryMetrics?.healthScore >= 70 ? 'up' : 'down',
    },
    {
      title: 'Eficiencia de Uso',
      value: inventoryMetrics?.usageEfficiency ? `${inventoryMetrics.usageEfficiency}%` : 'N/A',
      description: 'Productos abiertos en uso',
      icon: TrendingUp,
      color: inventoryMetrics?.usageEfficiency >= 60 ? 'green' : 
             inventoryMetrics?.usageEfficiency >= 30 ? 'amber' : 'red',
      trend: 'neutral',
    },
    {
      title: 'Predicciones',
      value: predictionStats.hasGoodData || '0',
      description: `${predictionStats.urgentCount} productos urgentes`,
      icon: Brain,
      color: predictionStats.urgentCount > 0 ? 'amber' : 'blue',
      trend: 'neutral',
    },
    {
      title: 'Datos de Consumo',
      value: consumptionStats?.totalLogs || 0,
      description: `${predictionStats.highConfidence} con alta confianza`,
      icon: BarChart3,
      color: 'blue',
      trend: 'neutral',
    }
  ];

  // Loading state
  if (productsLoading || statsLoading || predictionsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Analytics" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Loader message="Analizando datos del inventario..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Analytics" />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8">
        {/* Banner de resumen (mejorado) */}
        <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-xl p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Análisis Inteligente de Consumo
              </h2>
              <p className="text-gray-700">
                {predictionStats.total} productos analizados •{' '}
                <span className="font-medium text-primary-600">
                  {predictionStats.hasGoodData} con datos suficientes
                </span>
                {predictionStats.urgentCount > 0 && (
                  <span className="ml-2 text-amber-600 font-medium">
                    • {predictionStats.urgentCount} urgentes
                  </span>
                )}
              </p>
            </div>
            
            {/* Selector de rango de tiempo */}
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value="7d">Últimos 7 días</option>
              <option value="30d">Últimos 30 días</option>
              <option value="90d">Últimos 3 meses</option>
              <option value="all">Todo el historial</option>
            </select>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {kpiCards.map((card, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border p-5 transition-shadow duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-2 rounded-lg ${
                  card.color === 'green' ? 'bg-green-50' :
                  card.color === 'amber' ? 'bg-amber-50' :
                  card.color === 'red' ? 'bg-red-50' : 'bg-blue-50'
                }`}>
                  <card.icon className={`h-5 w-5 ${
                    card.color === 'green' ? 'text-green-600' :
                    card.color === 'amber' ? 'text-amber-600' :
                    card.color === 'red' ? 'text-red-600' : 'text-blue-600'
                  }`} />
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{card.value}</h3>
              <p className="text-sm font-medium text-gray-900 mb-1">{card.title}</p>
              <p className="text-xs text-gray-500">{card.description}</p>
            </div>
          ))}
        </div>

        {/* 🔥 NUEVA SECCIÓN: Productos próximos a agotarse */}
        {soonToExpire.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <AlertTriangle className="h-5 w-5 text-amber-500 mr-2" />
                Próximos a agotarse
              </h2>
              <span className="text-sm text-amber-600 font-medium">
                {soonToExpire.length} productos
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {soonToExpire.slice(0, 6).map(item => {
                const product = products.find(p => p.id === item.id);
                const prediction = predictions.find(p => p.productId === item.id);
                if (!product) return null;
                
                return (
                  <ProductPredictionCard
                    key={item.id}
                    prediction={prediction || { estimatedDaysLeft: 3, confidence: 'media' }}
                    product={product}
                    onClick={() => navigate(`/products?id=${product.id}`)}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* 🔥 NUEVA SECCIÓN: Filtros y análisis detallado */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === 'all' ? 'Todas las categorías' : cat}
                </option>
              ))}
            </select>
            
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={showLowData}
                onChange={(e) => setShowLowData(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              Mostrar productos con pocos datos
            </label>
          </div>
          
          <div className="text-sm text-gray-500">
            Mostrando {filteredPredictions.length} de {predictions.length} productos
          </div>
        </div>

        {/* 🔥 NUEVA SECCIÓN: Grid de predicciones detalladas */}
        {filteredPredictions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {filteredPredictions.map(pred => {
              const product = products.find(p => p.id === pred.productId);
              if (!product) return null;
              
              return (
                <ProductPredictionCard
                  key={pred.productId}
                  prediction={pred}
                  product={product}
                  onClick={() => navigate(`/products?id=${product.id}`)}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200 mb-8">
            <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-900 mb-1">
              No hay predicciones para mostrar
            </h3>
            <p className="text-xs text-gray-500">
              {selectedCategory !== 'all' 
                ? 'Prueba con otra categoría o desactiva los filtros'
                : 'Registra más consumos para generar predicciones'}
            </p>
          </div>
        )}

        {/* SECCIONES EXISTENTES (se mantienen igual) */}
        {/* Distribución del inventario */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* ... tu código existente de distribución ... */}
        </div>

        {/* Productos más consumidos */}
        {mostConsumed.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              Top Productos Más Consumidos
            </h2>
            
            <div className="space-y-4">
              {mostConsumed.slice(0, 5).map((item, index) => {
                const product = products.find(p => p.id === item.productId);
                const prediction = predictions.find(p => p.productId === item.productId);
                
                return (
                  <div key={item.productId} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center min-w-0">
                      <span className="text-lg font-medium text-gray-400 w-8">{index + 1}</span>
                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                        <Package className="h-4 w-4 text-primary-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.consumptionCount} consumos • {item.totalQuantity} unidades
                        </p>
                      </div>
                    </div>
                    
                    {prediction && (
                      <div className="text-right">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          prediction.confidence === 'alta' ? 'bg-green-100 text-green-800' :
                          prediction.confidence === 'media' ? 'bg-amber-100 text-amber-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {prediction.estimatedDaysLeft ? `${prediction.estimatedDaysLeft} días` : 'Sin datos'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Eficiencia de uso (se mantiene igual) */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          {/* ... tu código existente ... */}
        </div>

        {/* Acciones rápidas móviles */}
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 p-4 shadow-lg">
          {/* ... tu código existente ... */}
        </div>
      </main>
    </div>
  );
};

export default Analytics;