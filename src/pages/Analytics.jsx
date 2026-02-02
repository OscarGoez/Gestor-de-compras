// pages/Analytics.jsx
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
  Users
} from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useHousehold } from '../context/HouseholdContext';
import { consumptionService } from '../api/consumption.service';
import { formatDate, getDaysDifference } from '../utils/date.utils';
import Header from '../components/layout/Header';
import Loader from '../components/common/Loader';

const Analytics = () => {
  const { products, loading: productsLoading } = useProducts();
  const { householdId, householdData } = useHousehold();
  const navigate = useNavigate();
  
  const [consumptionStats, setConsumptionStats] = useState(null);
  const [mostConsumed, setMostConsumed] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

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

        const consumedResult = await consumptionService.getMostConsumedProducts(householdId, 5);
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

  // Calcular métricas del inventario
  const inventoryMetrics = useMemo(() => {
    if (!products.length) return null;

    const totalProducts = products.length;
    const availableProducts = products.filter(p => p.status === 'available').length;
    const lowStockProducts = products.filter(p => p.status === 'low').length;
    const outOfStockProducts = products.filter(p => p.status === 'out').length;
    
    // Productos con fecha de vencimiento
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

    // Score de salud del inventario (0-100%)
    let healthScore = 100;
    
    // Penalizar productos agotados
    healthScore -= (outOfStockProducts / totalProducts) * 40;
    
    // Penalizar productos próximos a vencer
    healthScore -= (expiringSoon / totalProducts) * 30;
    
    // Penalizar productos vencidos
    healthScore -= (expiredProducts / totalProducts) * 50;
    
    // Asegurar que no sea negativo
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    // Eficiencia de uso
    const openedProducts = products.filter(p => p.lastOpenedAt).length;
    const currentlyInUse = products.filter(p => 
      p.lastOpenedAt && p.quantityCurrent < p.quantityTotal
    ).length;
    
    const usageEfficiency = openedProducts > 0 
      ? Math.round((currentlyInUse / openedProducts) * 100)
      : 0;

    // Tasa de reposición
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

  // Detectar patrones de consumo - VERSIÓN MEJORADA
  const consumptionPatterns = useMemo(() => {
    const patterns = [];
    
    // Si no hay datos de consumo, usar datos de los productos
    if (!consumptionStats?.recentCycles || consumptionStats.recentCycles.length === 0) {
      // Patrón 1: Productos abiertos pero no terminados
      const openedButNotFinished = products
        .filter(p => p.lastOpenedAt && p.quantityCurrent > 0 && p.quantityCurrent < p.quantityTotal)
        .slice(0, 3);
      
      if (openedButNotFinished.length > 0) {
        patterns.push({
          type: 'in_progress',
          title: 'En progreso',
          description: 'Productos abiertos siendo utilizados',
          icon: RefreshCw,
          color: 'blue',
          items: openedButNotFinished.map(product => ({
            name: product.name,
            progress: `${Math.round((product.quantityCurrent / product.quantityTotal) * 100)}% usado`,
            status: 'Activo'
          }))
        });
      }

      // Patrón 2: Productos que se consumen rápido (bajo stock reciente)
      const recentlyConsumed = products
        .filter(p => {
          if (!p.updatedAt) return false;
          const daysSinceUpdate = getDaysDifference(p.updatedAt, new Date());
          return daysSinceUpdate <= 3 && p.status === 'low';
        })
        .slice(0, 3);
      
      if (recentlyConsumed.length > 0) {
        patterns.push({
          type: 'fast_consumption',
          title: 'Consumo Rápido',
          description: 'Productos que bajaron de stock recientemente',
          icon: Zap,
          color: 'amber',
          items: recentlyConsumed.map(product => ({
            name: product.name,
            status: `Queda ${product.quantityCurrent} ${product.unit}`,
            updated: 'Recientemente'
          }))
        });
      }

      // Patrón 3: Productos estables (disponibles por mucho tiempo)
      const stableProducts = products
        .filter(p => {
          if (!p.updatedAt) return false;
          const daysSinceUpdate = getDaysDifference(p.updatedAt, new Date());
          return daysSinceUpdate > 30 && p.status === 'available';
        })
        .slice(0, 3);
      
      if (stableProducts.length > 0) {
        patterns.push({
          type: 'stable',
          title: 'Consumo Estable',
          description: 'Productos que duran más de un mes',
          icon: CheckCircle,
          color: 'green',
          items: stableProducts.map(product => ({
            name: product.name,
            duration: `+${getDaysDifference(product.updatedAt, new Date())} días`,
            status: 'Estable'
          }))
        });
      }
      
      return patterns;
    }

    // Si HAY datos de consumo, usar la lógica original mejorada
    const recentCycles = consumptionStats.recentCycles || [];
    
    // Patrón 1: Productos de rápido consumo (≤7 días)
    const fastConsumption = recentCycles
      .filter(cycle => cycle.durationDays && cycle.durationDays <= 7)
      .slice(0, 3);
    
    if (fastConsumption.length > 0) {
      patterns.push({
        type: 'fast_consumption',
        title: 'Consumo Rápido',
        description: 'Se consumen en menos de una semana',
        icon: Zap,
        color: 'amber',
        items: fastConsumption.map(cycle => ({
          name: cycle.productName || 'Producto',
          duration: `${cycle.durationDays} días`,
          frequency: 'Alta',
          lastUsed: cycle.finishedAt ? formatDate(cycle.finishedAt) : 'N/A'
        }))
      });
    }

    // Patrón 2: Productos de consumo medio (8-30 días)
    const mediumConsumption = recentCycles
      .filter(cycle => cycle.durationDays && cycle.durationDays > 7 && cycle.durationDays <= 30)
      .slice(0, 3);
    
    if (mediumConsumption.length > 0) {
      patterns.push({
        type: 'medium_consumption',
        title: 'Consumo Regular',
        description: 'Se consumen en 1-4 semanas',
        icon: Clock,
        color: 'blue',
        items: mediumConsumption.map(cycle => ({
          name: cycle.productName || 'Producto',
          duration: `${cycle.durationDays} días`,
          frequency: 'Media',
          lastUsed: cycle.finishedAt ? formatDate(cycle.finishedAt) : 'N/A'
        }))
      });
    }

    // Patrón 3: Productos de lento consumo (>30 días)
    const slowConsumption = recentCycles
      .filter(cycle => cycle.durationDays && cycle.durationDays > 30)
      .slice(0, 3);
    
    if (slowConsumption.length > 0) {
      patterns.push({
        type: 'slow_consumption',
        title: 'Consumo Lento',
        description: 'Duran más de un mes',
        icon: Calendar,
        color: 'green',
        items: slowConsumption.map(cycle => ({
          name: cycle.productName || 'Producto',
          duration: `${cycle.durationDays} días`,
          frequency: 'Baja',
          lastUsed: cycle.finishedAt ? formatDate(cycle.finishedAt) : 'N/A'
        }))
      });
    }

    // Patrón 4: Productos frecuentemente consumidos
    if (mostConsumed.length > 0) {
      const frequentlyConsumed = mostConsumed.slice(0, 3);
      patterns.push({
        type: 'frequent',
        title: 'Más Consumidos',
        description: 'Productos con mayor frecuencia de uso',
        icon: TrendingUp,
        color: 'purple',
        items: frequentlyConsumed.map(item => ({
          name: item.name || 'Producto',
          count: `${item.consumptionCount} veces`,
          quantity: `${item.totalQuantity} unidades`
        }))
      });
    }

    return patterns;
  }, [consumptionStats, products, mostConsumed]);

  // KPI Cards principales - SIN BOTONES, solo información
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
      title: 'Tasa de Reposición',
      value: inventoryMetrics?.restockingRate ? `${inventoryMetrics.restockingRate}%` : 'N/A',
      description: 'Productos reabastecidos recientemente',
      icon: RefreshCw,
      color: inventoryMetrics?.restockingRate >= 30 ? 'green' : 
             inventoryMetrics?.restockingRate >= 10 ? 'amber' : 'red',
      trend: 'up',
    },
    {
      title: 'Duración Promedio',
      value: consumptionStats?.avgDuration ? `${consumptionStats.avgDuration} días` : 'N/A',
      description: 'Tiempo promedio por producto',
      icon: Clock,
      color: 'blue',
      trend: 'neutral',
    }
  ];

  // Insights accionables con tipos correctos para los botones
  const actionableInsights = [
    ...(inventoryMetrics?.lowStockProducts > 0 ? [{
      type: 'warning',
      title: 'Productos en bajo stock',
      message: `${inventoryMetrics.lowStockProducts} productos necesitan atención`,
      icon: AlertTriangle
    }] : []),
    ...(inventoryMetrics?.expiringSoon > 0 ? [{
      type: 'urgent',
      title: 'Productos próximos a vencer',
      message: `${inventoryMetrics.expiringSoon} productos vencen esta semana`,
      icon: Calendar
    }] : []),
    ...(inventoryMetrics?.outOfStockProducts > 0 ? [{
      type: 'critical',
      title: 'Productos agotados',
      message: `${inventoryMetrics.outOfStockProducts} productos están agotados`,
      icon: ShoppingCart
    }] : []),
  ];

  // Loading state
  if (productsLoading || statsLoading) {
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
        {/* Resumen ejecutivo */}
        <div className="mb-8">
          

          {/* Banner de resumen */}
          <div className="bg-gradient-to-r from-primary-50 to-blue-50 border border-primary-200 rounded-xl p-6 mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Resumen ejecutivo del inventario
                </h2>
                <p className="text-gray-700">
                  Tu inventario tiene <span className="font-semibold">{inventoryMetrics?.totalProducts || 0} productos</span> con una salud general del{' '}
                  <span className={`font-bold ${
                    inventoryMetrics?.healthScore >= 70 ? 'text-green-600' :
                    inventoryMetrics?.healthScore >= 40 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {inventoryMetrics?.healthScore || 0}%
                  </span>
                  {inventoryMetrics?.expiringSoon > 0 && (
                    <span className="ml-2 text-amber-700">
                      • {inventoryMetrics.expiringSoon} vencen pronto
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards - Solo información */}
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
                {card.trend && (
                  <div className={`flex items-center ${card.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                    {card.trend === 'up' ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : card.trend === 'down' ? (
                      <ArrowDownRight className="h-4 w-4" />
                    ) : null}
                  </div>
                )}
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{card.value}</h3>
              <p className="text-sm font-medium text-gray-900 mb-1">{card.title}</p>
              <p className="text-xs text-gray-500">{card.description}</p>
            </div>
          ))}
        </div>

        {/* Insights y alertas con botones estratégicos */}
        {actionableInsights.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Atención Requerida</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {actionableInsights.map((insight, index) => (
                <div 
                  key={index}
                  className={`rounded-xl border p-4 ${
                    insight.type === 'critical' ? 'border-red-200 bg-red-50' :
                    insight.type === 'urgent' ? 'border-amber-200 bg-amber-50' :
                    'border-yellow-200 bg-yellow-50'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${
                      insight.type === 'critical' ? 'bg-red-100' :
                      insight.type === 'urgent' ? 'bg-amber-100' :
                      'bg-yellow-100'
                    }`}>
                      <insight.icon className={`h-4 w-4 ${
                        insight.type === 'critical' ? 'text-red-600' :
                        insight.type === 'urgent' ? 'text-amber-600' :
                        'text-yellow-600'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{insight.title}</h3>
                      <p className="text-sm text-gray-700 mt-1">{insight.message}</p>
                    </div>
                  </div>
                  
                  {/* Botones de acción según el tipo de insight */}
                  {insight.type === 'warning' && (
                    <button
                      onClick={() => navigate('/products?status=low')}
                      className="w-full px-3 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Ver productos en bajo stock
                    </button>
                  )}
                  
                  {insight.type === 'urgent' && (
                    <button
                      onClick={() => navigate('/expiring')}
                      className="w-full px-3 py-2 text-sm font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors flex items-center justify-center"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Ver próximos a vencer
                    </button>
                  )}
                  
                  {insight.type === 'critical' && (
                    <button
                      onClick={() => navigate('/shopping-list')}
                      className="w-full px-3 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Ir a lista de compras
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Métricas detalladas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Distribución del inventario */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Distribución del Inventario</h2>
              <span className="text-sm text-gray-500">{inventoryMetrics?.totalProducts || 0} productos</span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg border border-green-200 bg-green-50">
                <div className="text-2xl font-bold text-green-700">{inventoryMetrics?.availableProducts || 0}</div>
                <div className="text-sm text-green-600 font-medium">Disponibles</div>
                <div className="text-xs text-green-500 mt-1">
                  {inventoryMetrics?.totalProducts ? 
                    Math.round((inventoryMetrics.availableProducts / inventoryMetrics.totalProducts) * 100) : 0}%
                </div>
              </div>
              
              <div className="text-center p-4 rounded-lg border border-amber-200 bg-amber-50">
                <div className="text-2xl font-bold text-amber-700">{inventoryMetrics?.lowStockProducts || 0}</div>
                <div className="text-sm text-amber-600 font-medium">Bajo stock</div>
                <div className="text-xs text-amber-500 mt-1">
                  {inventoryMetrics?.totalProducts ? 
                    Math.round((inventoryMetrics.lowStockProducts / inventoryMetrics.totalProducts) * 100) : 0}%
                </div>
              </div>
              
              <div className="text-center p-4 rounded-lg border border-red-200 bg-red-50">
                <div className="text-2xl font-bold text-red-700">{inventoryMetrics?.outOfStockProducts || 0}</div>
                <div className="text-sm text-red-600 font-medium">Agotados</div>
                <div className="text-xs text-red-500 mt-1">
                  {inventoryMetrics?.totalProducts ? 
                    Math.round((inventoryMetrics.outOfStockProducts / inventoryMetrics.totalProducts) * 100) : 0}%
                </div>
              </div>
              
              <div className="text-center p-4 rounded-lg border border-blue-200 bg-blue-50">
                <div className="text-2xl font-bold text-blue-700">{inventoryMetrics?.productsWithExpiration || 0}</div>
                <div className="text-sm text-blue-600 font-medium">Con fecha</div>
                <div className="text-xs text-blue-500 mt-1">
                  {inventoryMetrics?.totalProducts ? 
                    Math.round((inventoryMetrics.productsWithExpiration / inventoryMetrics.totalProducts) * 100) : 0}%
                </div>
              </div>
            </div>
            
            {/* Barra de progreso de salud */}
            <div className="mt-8">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Score de salud del inventario</span>
                <span className="text-sm font-bold text-gray-900">{inventoryMetrics?.healthScore || 0}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    inventoryMetrics?.healthScore >= 70 ? 'bg-green-500' :
                    inventoryMetrics?.healthScore >= 40 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${inventoryMetrics?.healthScore || 0}%` }}
                ></div>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">Crítico</span>
                <span className="text-xs text-gray-500">Excelente</span>
              </div>
            </div>
          </div>

          {/* Patrones de consumo detectados - VERSIÓN MEJORADA */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Patrones de Consumo</h2>
              <BarChart3 className="h-5 w-5 text-primary-600" />
            </div>
            
            {consumptionPatterns.length > 0 ? (
              <div className="space-y-4">
                {consumptionPatterns.map((pattern, index) => (
                  <div 
                    key={index} 
                    className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div className={`p-1.5 rounded-md ${
                        pattern.color === 'green' ? 'bg-green-50' :
                        pattern.color === 'amber' ? 'bg-amber-50' :
                        pattern.color === 'blue' ? 'bg-blue-50' :
                        pattern.color === 'purple' ? 'bg-purple-50' : 'bg-gray-50'
                      }`}>
                        <pattern.icon className={`h-3.5 w-3.5 ${
                          pattern.color === 'green' ? 'text-green-600' :
                          pattern.color === 'amber' ? 'text-amber-600' :
                          pattern.color === 'blue' ? 'text-blue-600' :
                          pattern.color === 'purple' ? 'text-purple-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h3 className="font-medium text-gray-900 text-sm">{pattern.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            pattern.color === 'green' ? 'bg-green-100 text-green-800' :
                            pattern.color === 'amber' ? 'bg-amber-100 text-amber-800' :
                            pattern.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                            pattern.color === 'purple' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {pattern.items.length} items
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{pattern.description}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mt-2">
                      {pattern.items.map((item, itemIndex) => (
                        <div 
                          key={itemIndex} 
                          className="flex justify-between items-center text-xs p-1.5 rounded"
                        >
                          <div className="flex-1 truncate pr-2">
                            <span className="font-medium text-gray-700">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-500 font-medium">{item.duration || item.progress || item.count || item.status}</span>
                            {item.lastUsed && (
                              <div className="text-xs text-gray-400">{item.lastUsed}</div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-gray-900 mb-1">Sin patrones detectados</h3>
                <p className="text-xs text-gray-500">
                  {products.length === 0 
                    ? 'Agrega productos para comenzar a analizar'
                    : 'Registra consumos para detectar patrones de uso'}
                </p>
              </div>
            )}
            
            {/* Estadísticas de consumo */}
            {consumptionStats && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">
                      {consumptionStats.totalCycles || 0}
                    </div>
                    <div className="text-xs text-gray-500">Ciclos completos</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">
                      {consumptionStats.avgDuration || 0}
                    </div>
                    <div className="text-xs text-gray-500">Días promedio</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-900">
                      {consumptionStats.totalLogs || 0}
                    </div>
                    <div className="text-xs text-gray-500">Registros totales</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Productos más consumidos */}
        {mostConsumed.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Productos Más Consumidos</h2>
              <span className="text-sm text-gray-500">Últimos {timeRange}</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Veces consumido
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantidad total
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Último consumo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {mostConsumed.map((item) => (
                    <tr key={item.productId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center mr-3">
                            <Package className="h-4 w-4 text-primary-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {item.name || 'Producto'}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="h-2 bg-primary-200 rounded-full flex-1 mr-2">
                            <div 
                              className="h-full bg-primary-600 rounded-full"
                              style={{ 
                                width: `${Math.min(100, (item.consumptionCount / (mostConsumed[0]?.consumptionCount || 1)) * 100)}%` 
                              }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {item.consumptionCount}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {item.totalQuantity} unidades
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {item.lastConsumed ? formatDate(item.lastConsumed) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Eficiencia de uso - Simplificada */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Eficiencia de Uso</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Uso de productos abiertos</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-700">Productos abiertos</span>
                    <span className="text-sm font-medium text-gray-900">
                      {inventoryMetrics?.openedProducts || 0}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-full bg-primary-600 rounded-full"
                      style={{ 
                        width: `${Math.min(100, ((inventoryMetrics?.openedProducts || 0) / (inventoryMetrics?.totalProducts || 1)) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-700">En uso activo</span>
                    <span className="text-sm font-medium text-gray-900">
                      {inventoryMetrics?.currentlyInUse || 0}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full">
                    <div 
                      className="h-full bg-green-600 rounded-full"
                      style={{ 
                        width: `${inventoryMetrics?.usageEfficiency || 0}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Recomendaciones</h3>
              <ul className="space-y-2">
                {inventoryMetrics?.usageEfficiency < 60 && (
                  <li className="flex items-start text-sm">
                    <div className="h-2 w-2 bg-amber-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></div>
                    <span className="text-gray-700">
                      Intenta terminar productos abiertos antes de abrir nuevos
                    </span>
                  </li>
                )}
                {inventoryMetrics?.lowStockProducts > 0 && (
                  <li className="flex items-start text-sm">
                    <div className="h-2 w-2 bg-red-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></div>
                    <span className="text-gray-700">
                      Planifica compras para {inventoryMetrics.lowStockProducts} productos en bajo stock
                    </span>
                  </li>
                )}
                {inventoryMetrics?.expiringSoon > 0 && (
                  <li className="flex items-start text-sm">
                    <div className="h-2 w-2 bg-amber-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></div>
                    <span className="text-gray-700">
                      Usa primero {inventoryMetrics.expiringSoon} productos que vencen pronto
                    </span>
                  </li>
                )}
                {consumptionStats?.avgDuration > 0 && (
                  <li className="flex items-start text-sm">
                    <div className="h-2 w-2 bg-blue-500 rounded-full mt-1.5 mr-2 flex-shrink-0"></div>
                    <span className="text-gray-700">
                      Duración promedio: {consumptionStats.avgDuration} días por producto
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Acciones rápidas móviles - Simplificadas */}
        <div className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="flex justify-between items-center max-w-7xl mx-auto">
            <button
              onClick={() => navigate('/')}
              className="flex flex-col items-center text-primary-600"
            >
              <Home className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Inicio</span>
            </button>
            
            <button
              onClick={() => navigate('/products')}
              className="flex flex-col items-center text-green-600"
            >
              <Package className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Productos</span>
            </button>
            
            <button
              onClick={() => navigate('/expiring')}
              className="flex flex-col items-center text-amber-600"
            >
              <Calendar className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Vencen</span>
            </button>
            
            <button
              onClick={() => navigate('/shopping-list')}
              className="flex flex-col items-center text-blue-600"
            >
              <ShoppingCart className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">Compras</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Analytics;