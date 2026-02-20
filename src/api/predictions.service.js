// src/api/predictions.service.js
import { collection, doc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import aiService from './ai.service';

class PredictionsService {
  
  /**
   * Analizar consumo de un producto específico
   */
  async analyzeProductConsumption(product, householdId) {
    try {
      if (!product || !product.id) return null;

      // 1. Obtener historial de consumo del producto
      const history = await this.getProductConsumptionHistory(product.id, householdId);
      
      // 2. Verificar si hay datos suficientes
      const hasMinData = history.totalLogs >= 3 || history.totalCycles >= 1;
      
      // 3. Calcular estadísticas básicas (siempre disponible)
      const stats = this.calculateBasicStats(history, product);
      
      // 4. Solo usar IA si hay datos suficientes Y no estamos en rate limit
      let aiInsights = null;
      if (hasMinData && !window.__RATE_LIMITED__) {
        try {
          aiInsights = await aiService.analyzeConsumption(product, history);
        } catch (error) {
          console.log('⚠️ Usando análisis básico por limitaciones de API');
        }
      }
      
      // 5. Generar predicción final
      const prediction = this.generatePrediction(product, stats, aiInsights, history);
      
      return {
        productId: product.id,
        productName: product.name,
        ...prediction,
        confidence: this.calculateConfidence(history, stats),
        dataQuality: this.getDataQuality(history),
        hasMinData,
        lastAnalyzed: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error en analyzeProductConsumption:', error);
      return null;
    }
  }

  /**
   * Obtener historial de consumo del producto
   */
  async getProductConsumptionHistory(productId, householdId, months = 2) {
    try {
      // Calcular fecha límite (últimos meses)
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - months);
      
      // Query simple sin orderBy compuesto para evitar índices
      const q = query(
        collection(db, 'consumptionLogs'),
        where('productId', '==', productId),
        where('householdId', '==', householdId)
      );
      
      const snapshot = await getDocs(q);
      
      const logs = [];
      const cycles = [];
      let totalConsumed = 0;
      let firstLogDate = null;
      let lastLogDate = null;
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate() || new Date();
        
        const log = {
          id: doc.id,
          ...data,
          createdAt
        };
        
        logs.push(log);
        
        // Actualizar fechas
        if (!firstLogDate || createdAt < firstLogDate) firstLogDate = createdAt;
        if (!lastLogDate || createdAt > lastLogDate) lastLogDate = createdAt;
        
        // Sumar consumos
        if (data.actionType === 'consume') {
          totalConsumed += Number(data.quantity) || 1;
        }
        
        // Detectar ciclos completos (purchase + consumos)
        if (data.actionType === 'purchase' || data.actionType === 'cycle_complete') {
          cycles.push({
            date: createdAt,
            quantity: Number(data.quantity) || 1,
            durationDays: data.durationDays || null
          });
        }
      });
      
      // Ordenar en memoria por fecha descendente
      logs.sort((a, b) => b.createdAt - a.createdAt);
      cycles.sort((a, b) => b.date - a.date);
      
      // Calcular días desde el primer registro
      const daysSinceFirst = firstLogDate 
        ? Math.max(1, Math.ceil((new Date() - firstLogDate) / (1000 * 60 * 60 * 24)))
        : 0;
      
      // Calcular tasa de consumo diario
      const dailyRate = daysSinceFirst > 0 
        ? parseFloat((totalConsumed / daysSinceFirst).toFixed(2))
        : 0;
      
      return {
        logs: logs.slice(0, 50), // Últimos 50 logs
        cycles: cycles.slice(0, 10), // Últimos 10 ciclos
        totalLogs: logs.length,
        totalCycles: cycles.length,
        totalConsumed,
        dailyRate,
        daysSinceFirst,
        firstLogDate,
        lastLogDate
      };
      
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      return {
        logs: [],
        cycles: [],
        totalLogs: 0,
        totalCycles: 0,
        totalConsumed: 0,
        dailyRate: 0,
        daysSinceFirst: 0
      };
    }
  }

  /**
   * Calcular estadísticas básicas del producto
   */
  calculateBasicStats(history, product) {
    const stats = {
      dailyConsumptionRate: history.dailyRate,
      estimatedDaysLeft: 0,
      estimatedFinishDate: null,
      recommendedPurchaseQuantity: 0,
      status: product.status,
      currentQuantity: product.quantityCurrent || 0,
      totalQuantity: product.quantityTotal || 0
    };
    
    // Estimar días restantes basado en tasa diaria
    if (stats.dailyConsumptionRate > 0 && product.quantityCurrent > 0) {
      stats.estimatedDaysLeft = Math.ceil(product.quantityCurrent / stats.dailyConsumptionRate);
      
      // Calcular fecha estimada de agotamiento
      const finishDate = new Date();
      finishDate.setDate(finishDate.getDate() + stats.estimatedDaysLeft);
      stats.estimatedFinishDate = finishDate.toISOString().split('T')[0];
    } else {
      // Si no hay tasa, estimar basado en estado
      if (product.status === 'out') {
        stats.estimatedDaysLeft = 0;
      } else if (product.status === 'low') {
        stats.estimatedDaysLeft = 3; // Estimación conservadora
      } else {
        stats.estimatedDaysLeft = 14; // Estimación por defecto
      }
    }
    
    // Recomendar cantidad para próxima compra
    if (stats.dailyConsumptionRate > 0) {
      // Recomendar para 14 días como base
      const baseDays = 14;
      stats.recommendedPurchaseQuantity = Math.ceil(stats.dailyConsumptionRate * baseDays);
    } else {
      // Si no hay datos, recomendar 1 unidad
      stats.recommendedPurchaseQuantity = 1;
    }
    
    return stats;
  }

  /**
   * Generar predicción final combinando estadísticas e IA
   */
  generatePrediction(product, stats, aiInsights, history) {
    const prediction = {
      ...stats,
      aiEnhanced: false,
      insights: []
    };
    
    // Agregar insights básicos SIEMPRE
    if (stats.estimatedDaysLeft <= 3) {
      prediction.insights.push('⚠️ Se agotará en los próximos días');
    } else if (stats.estimatedDaysLeft <= 7) {
      prediction.insights.push('📅 Queda para esta semana');
    } else if (stats.estimatedDaysLeft > 30) {
      prediction.insights.push('✅ Stock para más de un mes');
    }
    
    // Insights sobre datos limitados
    if (history.totalLogs < 5) {
      prediction.insights.push('📝 Registra más consumos para mejorar precision');
    }
    
    // Si hay insights de IA, enriquecer
    if (aiInsights && aiInsights.insights) {
      prediction.aiEnhanced = true;
      
      // Filtrar insights de IA para no duplicar
      const newInsights = aiInsights.insights.filter(
        insight => !prediction.insights.some(i => i.includes(insight.substring(0, 20)))
      );
      
      prediction.insights = [...prediction.insights, ...newInsights].slice(0, 3);
      
      // Usar valores de IA si son más precisos
      if (aiInsights.predictedDaysLeft) {
        prediction.estimatedDaysLeft = aiInsights.predictedDaysLeft;
      }
      if (aiInsights.recommendedPurchase) {
        prediction.recommendedPurchaseQuantity = aiInsights.recommendedPurchase;
      }
      if (aiInsights.consumptionRate) {
        prediction.dailyConsumptionRate = aiInsights.consumptionRate;
      }
    }
    
    // Sugerencia de compra
    if (product.status === 'low' || product.status === 'out') {
      prediction.insights.push(`🛒 Compra sugerida: ${prediction.recommendedPurchaseQuantity} ${product.unit}`);
    }
    
    return prediction;
  }

  /**
   * Calcular nivel de confianza de la predicción
   */
  calculateConfidence(history, stats) {
    let confidence = 0;
    let level = 'baja';
    
    // Basado en cantidad de datos
    if (history.totalLogs >= 20) confidence += 40;
    else if (history.totalLogs >= 10) confidence += 30;
    else if (history.totalLogs >= 5) confidence += 20;
    else confidence += 10;
    
    // Basado en ciclos completos
    if (history.totalCycles >= 3) confidence += 30;
    else if (history.totalCycles >= 1) confidence += 15;
    
    // Basado en tasa de consumo
    if (stats.dailyConsumptionRate > 0) confidence += 30;
    
    // Determinar nivel
    if (confidence >= 70) level = 'alta';
    else if (confidence >= 40) level = 'media';
    
    return level;
  }

  /**
   * Determinar calidad de los datos
   */
  getDataQuality(history) {
    if (history.totalCycles >= 3) return 'Alta - Múltiples ciclos completos';
    if (history.totalCycles >= 1) return 'Media - Con ciclos registrados';
    if (history.totalLogs >= 5) return 'Baja - Solo registros de consumo';
    return 'Muy baja - Datos insuficientes';
  }

  /**
   * Analizar múltiples productos (optimizado para rate limiting)
   */
  async analyzeHouseholdProducts(products, householdId, maxProducts = 8) {
    if (!products || !products.length) return [];
    
    const predictions = [];
    const startTime = Date.now();
    
    // 1. PRIORIZAR: Productos urgentes primero (low/out)
    const urgentProducts = products
      .filter(p => p.status === 'low' || p.status === 'out')
      .slice(0, 4);
    
    // 2. Productos con más historial (potencialmente más útiles)
    const productsWithHistory = products
      .filter(p => p.status === 'available')
      .sort((a, b) => {
        // Priorizar productos que han tenido consumos
        const aPriority = a.consumptionCount || 0;
        const bPriority = b.consumptionCount || 0;
        return bPriority - aPriority;
      })
      .slice(0, 4);
    
    // Combinar sin duplicados (usando Map)
    const productsToAnalyze = [...new Map(
      [...urgentProducts, ...productsWithHistory].map(p => [p.id, p])
    ).values()].slice(0, maxProducts);
    
    console.log(`🎯 Analizando ${productsToAnalyze.length} productos prioritarios`);
    
    // Analizar de forma secuencial con pausas
    for (let i = 0; i < productsToAnalyze.length; i++) {
      const product = productsToAnalyze[i];
      
      // Verificar tiempo total (no más de 15 segundos)
      if (Date.now() - startTime > 15000) {
        console.log('⏱️ Tiempo límite alcanzado, deteniendo análisis');
        break;
      }
      
      // Pausa entre análisis (500ms para respetar rate limits)
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      const history = await this.getProductConsumptionHistory(product.id, householdId);
      
      // Solo usar IA si hay datos suficientes
      let prediction;
      if (history.totalLogs >= 3 || history.totalCycles >= 1) {
        prediction = await this.analyzeProductConsumption(product, householdId);
      } else {
        // Para productos sin datos, usar predicción básica
        prediction = {
          productId: product.id,
          productName: product.name,
          estimatedDaysLeft: product.status === 'out' ? 0 : 
                            product.status === 'low' ? 3 : 14,
          dailyConsumptionRate: 0,
          recommendedPurchaseQuantity: 1,
          insights: ['📝 Registra consumos para obtener predicciones'],
          confidence: 'baja',
          dataQuality: 'Sin datos de consumo',
          hasMinData: false
        };
      }
      
      if (prediction) {
        predictions.push(prediction);
      }
    }
    
    // Ordenar por urgencia (menos días primero)
    return predictions.sort((a, b) => a.estimatedDaysLeft - b.estimatedDaysLeft);
  }

  /**
   * Detectar productos próximos a agotarse (por consumo o vencimiento)
   */
  getSoonToExpire(products, predictions, daysThreshold = 7) {
    const soonToExpire = [];
    const today = new Date();
    const threshold = new Date(today.getTime() + daysThreshold * 24 * 60 * 60 * 1000);
    
    // 1. Por predicciones de consumo
    predictions.forEach(pred => {
      if (pred.estimatedDaysLeft <= daysThreshold) {
        const product = products.find(p => p.id === pred.productId);
        if (product) {
          soonToExpire.push({
            ...product,
            prediction: pred,
            reason: 'consumption',
            daysLeft: pred.estimatedDaysLeft
          });
        }
      }
    });
    
    // 2. Por fecha de vencimiento
    products.forEach(product => {
      if (product.expirationDate) {
        try {
          const expDate = new Date(product.expirationDate);
          const daysLeft = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
          
          if (daysLeft <= daysThreshold) {
            // Evitar duplicados
            if (!soonToExpire.some(p => p.id === product.id)) {
              soonToExpire.push({
                ...product,
                reason: 'expiration',
                daysLeft,
                expirationDate: product.expirationDate
              });
            }
          }
        } catch (e) {
          // Ignorar fechas inválidas
        }
      }
    });
    
    // Ordenar por días restantes (más urgentes primero)
    return soonToExpire.sort((a, b) => a.daysLeft - b.daysLeft);
  }

  /**
   * Obtener estadísticas globales de predicciones
   */
  getPredictionStats(predictions, products) {
    const total = predictions.length;
    const highConfidence = predictions.filter(p => p.confidence === 'alta').length;
    const mediumConfidence = predictions.filter(p => p.confidence === 'media').length;
    const lowConfidence = predictions.filter(p => p.confidence === 'baja').length;
    
    const urgent = predictions.filter(p => p.estimatedDaysLeft <= 3).length;
    const warning = predictions.filter(p => p.estimatedDaysLeft > 3 && p.estimatedDaysLeft <= 7).length;
    
    const withData = predictions.filter(p => p.hasMinData).length;
    const withoutData = products.length - withData;
    
    return {
      total,
      highConfidence,
      mediumConfidence, 
      lowConfidence,
      urgent,
      warning,
      withData,
      withoutData,
      coverage: products.length > 0 ? Math.round((withData / products.length) * 100) : 0
    };
  }
}

// Exportar instancia única
const predictionsService = new PredictionsService();
export default predictionsService;