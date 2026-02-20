// src/hooks/usePredictions.js
import { useState, useEffect, useCallback, useRef } from 'react';
import predictionsService from '../api/predictions.service';

export const usePredictions = (products, householdId, options = {}) => {
  const {
    minConfidence = 'baja',      // 'baja', 'media', 'alta'
    onlyUrgent = false,           // Solo productos urgentes
    limit = 8,                    // Máximo productos a analizar
    autoRefresh = true,           // Actualizar automáticamente
    refreshInterval = 300000,     // 5 minutos
    priorityMode = true           // Modo prioritario (menos llamadas API)
  } = options;

  const [predictions, setPredictions] = useState([]);
  const [dashboardPredictions, setDashboardPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [soonToExpire, setSoonToExpire] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
    urgent: 0,
    warning: 0,
    withData: 0,
    withoutData: 0,
    coverage: 0
  });
  
  // Control de rate limiting
  const [rateLimited, setRateLimited] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const abortControllerRef = useRef(null);
  const analysisTimeoutRef = useRef(null);

  // Función principal de análisis
  const analyzeProducts = useCallback(async (isRetry = false) => {
    // Cancelar análisis anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Crear nuevo abort controller
    abortControllerRef.current = new AbortController();

    if (!products || !products.length || !householdId) {
      setLoading(false);
      return;
    }

    // Si estamos rate limited y no es un reintento, no hacer nada
    if (rateLimited && !isRetry) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let results;
      
      // Si estamos en modo prioritario y rate limited, usar análisis básico
      if (priorityMode && (rateLimited || retryCount > 2)) {
        console.log('📊 Usando modo prioritario (análisis básico)');
        results = products
          .filter(p => p.status === 'low' || p.status === 'out')
          .slice(0, 5)
          .map(p => ({
            productId: p.id,
            productName: p.name,
            estimatedDaysLeft: p.status === 'out' ? 0 : 3,
            dailyConsumptionRate: 0,
            recommendedPurchaseQuantity: 1,
            insights: ['📊 Modo prioritario activado'],
            confidence: 'baja',
            dataQuality: 'Análisis básico',
            hasMinData: false,
            isBasicAnalysis: true
          }));
      } else {
        // Análisis normal con timeout
        const timeoutPromise = new Promise((_, reject) => {
          analysisTimeoutRef.current = setTimeout(() => {
            reject(new Error('timeout'));
          }, 15000); // 15 segundos máximo
        });
        
        const analysisPromise = predictionsService.analyzeHouseholdProducts(
          products, 
          householdId, 
          limit
        );
        
        results = await Promise.race([analysisPromise, timeoutPromise]);
        clearTimeout(analysisTimeoutRef.current);
      }
      
      // Calcular productos próximos a agotarse
      const expiring = predictionsService.getSoonToExpire(products, results, 7);
      
      // Calcular estadísticas
      const predictionStats = predictionsService.getPredictionStats(results, products);
      
      // Filtrar para dashboard (solo relevantes)
      const dashboardRelevant = results.filter(pred => {
        // Verificar si el producto existe
        const product = products.find(p => p.id === pred.productId);
        if (!product) return false;
        
        const isUrgent = expiring.some(e => e.id === pred.productId);
        const hasGoodConfidence = pred.confidence === 'media' || pred.confidence === 'alta';
        const isCritical = product.status === 'low' || product.status === 'out';
        const hasInsights = pred.insights && pred.insights.length > 0;
        
        // En modo prioritario, mostrar menos
        if (priorityMode) {
          return isUrgent || isCritical;
        }
        
        return isUrgent || hasGoodConfidence || isCritical || hasInsights;
      });
      
      setPredictions(results);
      setDashboardPredictions(dashboardRelevant.slice(0, 3));
      setSoonToExpire(expiring);
      setStats(predictionStats);
      setLastUpdated(new Date());
      setRateLimited(false);
      setRetryCount(0);
      
    } catch (err) {
      console.error('Error en usePredictions:', err);
      
      // Manejar diferentes tipos de error
      if (err.message === 'timeout' || err.name === 'AbortError') {
        setError('El análisis tomó demasiado tiempo');
      } else if (err.status === 429 || err.message?.includes('429')) {
        setRateLimited(true);
        setRetryCount(prev => prev + 1);
        setError('Límite de API alcanzado. Usando modo ahorro.');
        
        // Usar análisis de emergencia
        const emergencyPredictions = products
          .filter(p => p.status === 'low' || p.status === 'out')
          .slice(0, 3)
          .map(p => ({
            productId: p.id,
            productName: p.name,
            estimatedDaysLeft: p.status === 'out' ? 0 : 3,
            dailyConsumptionRate: 0,
            recommendedPurchaseQuantity: 1,
            insights: ['⚠️ Modo ahorro de API activado'],
            confidence: 'baja',
            dataQuality: 'Análisis de emergencia',
            hasMinData: false,
            isEmergency: true
          }));
        
        setPredictions(emergencyPredictions);
        setDashboardPredictions(emergencyPredictions);
        
        // Calcular productos urgentes básicos
        const urgentBasic = products
          .filter(p => p.status === 'low' || p.status === 'out')
          .map(p => ({
            ...p,
            reason: p.status === 'out' ? 'consumption' : 'low',
            daysLeft: p.status === 'out' ? 0 : 3
          }));
        
        setSoonToExpire(urgentBasic);
        
      } else {
        setError('No se pudieron generar predicciones');
      }
    } finally {
      setLoading(false);
    }
  }, [products, householdId, limit, priorityMode, rateLimited, retryCount]);

  // Efecto principal
  useEffect(() => {
    if (autoRefresh) {
      analyzeProducts();
    }
    
    // Cleanup
    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [analyzeProducts, autoRefresh]);

  // Refresh automático cada cierto tiempo
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;
    
    const intervalId = setInterval(() => {
      analyzeProducts();
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [analyzeProducts, autoRefresh, refreshInterval]);

  // Reintentar cuando se recupere de rate limit
  useEffect(() => {
    if (rateLimited && retryCount < 3) {
      const retryTimer = setTimeout(() => {
        console.log(`🔄 Reintentando análisis (intento ${retryCount + 1}/3)`);
        analyzeProducts(true);
      }, 60000 * (retryCount + 1)); // 1 min, 2 min, 3 min
      
      return () => clearTimeout(retryTimer);
    }
  }, [rateLimited, retryCount, analyzeProducts]);

  // Obtener predicción de un producto específico
  const getProductPrediction = useCallback((productId) => {
    return predictions.find(p => p.productId === productId) || null;
  }, [predictions]);

  // Obtener productos urgentes por categoría
  const getUrgentByCategory = useCallback((category) => {
    return soonToExpire.filter(item => item.category === category);
  }, [soonToExpire]);

  // Forzar recálculo
  const refresh = useCallback(async () => {
    setRetryCount(0);
    setRateLimited(false);
    await analyzeProducts(true);
  }, [analyzeProducts]);

  // Resetear estado
  const reset = useCallback(() => {
    setPredictions([]);
    setDashboardPredictions([]);
    setSoonToExpire([]);
    setError(null);
    setRateLimited(false);
    setRetryCount(0);
  }, []);

  return {
    // Datos
    predictions,
    dashboardPredictions,
    soonToExpire,
    stats,
    
    // Estados
    loading,
    error,
    lastUpdated,
    rateLimited,
    retryCount,
    
    // Utilidades
    getProductPrediction,
    getUrgentByCategory,
    refresh,
    reset,
    
    // Métricas calculadas
    hasUrgent: soonToExpire.length > 0,
    urgentCount: soonToExpire.length,
    hasGoodData: stats.withData > 0,
    coveragePercentage: stats.coverage
  };
};

export default usePredictions;