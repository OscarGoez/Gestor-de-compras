import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

export const consumptionService = {
  // Registrar consumo (versión mejorada)
  async logConsumption(
    productId, 
    householdId, 
    productName, 
    quantity, 
    actionType = 'consume',
    notes = '',
    openedAt = null,
    finishedAt = null
  ) {
    try {
      console.log('📝 Registrando consumo:', {
        productId,
        productName,
        actionType,
        quantity
      });

      const logData = {
        productId,
        householdId,
        productName,
        quantity: Number(quantity) || 1,
        actionType,
        notes,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Si es un ciclo completo, agregar fechas de apertura y cierre
      if (actionType === 'cycle_complete' || actionType === 'purchase') {
        logData.openedAt = openedAt || serverTimestamp();
        logData.finishedAt = finishedAt || serverTimestamp();
        
        // Calcular duración si tenemos ambas fechas
        if (openedAt && finishedAt) {
          const durationMs = finishedAt.getTime() - openedAt.getTime();
          logData.durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));
        }
      }

      // Si es apertura de producto
      if (actionType === 'open') {
        logData.openedAt = serverTimestamp();
      }

      await addDoc(collection(db, 'consumptionLogs'), logData);
      
      console.log('✅ Log de consumo registrado');
      return { success: true };
    } catch (error) {
      console.error('❌ Error registrando consumo:', error);
      return { success: false, error: error.message };
    }
  },

  // ✅ NUEVA: Obtener estadísticas REALES de consumo
  async getConsumptionStats(householdId) {
    try {
      if (!householdId) {
        return { 
          success: false, 
          error: 'No hay householdId',
          isDemo: false 
        };
      }

      console.log('📊 Obteniendo estadísticas SIMPLIFICADAS de consumo...');

      // ✅ CONSULTA SIMPLIFICADA - Sin filtros múltiples que requieran índice compuesto
      // 1. Primero obtener TODOS los logs del household
      const allLogsQuery = query(
        collection(db, 'consumptionLogs'),
        where('householdId', '==', householdId)
      );

      const querySnapshot = await getDocs(allLogsQuery);

      // Variables para estadísticas
      let totalLogs = 0;
      let completedCycles = [];
      let totalDuration = 0;
      let cycleCount = 0;
      const allLogs = [];

      querySnapshot.forEach((doc) => {
        totalLogs++;
        const data = doc.data();

        const logEntry = {
          id: doc.id,
          ...data,
          openedAt: data.openedAt?.toDate() || null,
          finishedAt: data.finishedAt?.toDate() || null,
          createdAt: data.createdAt?.toDate() || new Date()
        };

        allLogs.push(logEntry);

        // ✅ FILTRAR EN MEMORIA (no en Firestore) para evitar índices
        // Buscar ciclos completados
        if (
          (data.actionType === 'cycle_complete' || data.actionType === 'purchase') &&
          data.durationDays &&
          data.durationDays > 0
        ) {
          completedCycles.push(logEntry);
          totalDuration += Number(data.durationDays);
          cycleCount++;
        }
      });

      // Ordenar ciclos por fecha más reciente (en memoria)
      completedCycles.sort((a, b) => {
        const dateA = a.finishedAt || a.createdAt;
        const dateB = b.finishedAt || b.createdAt;
        return dateB - dateA;
      });

      // Calcular duración promedio
      const avgDuration = cycleCount > 0 
        ? parseFloat((totalDuration / cycleCount).toFixed(1))
        : 0;

      console.log('📈 Estadísticas obtenidas:', {
        logsTotales: totalLogs,
        ciclosCompletos: cycleCount,
        duracionPromedio: avgDuration
      });

      return {
        success: true,
        stats: {
          totalLogs,
          avgDuration,
          totalCycles: cycleCount,
          recentCycles: completedCycles.slice(0, 10), // Últimos 10 ciclos
          cyclesData: completedCycles
        },
        isDemo: false
      };

    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);

      // Si es error de índice o conexión, usar datos demo
      if (error.code === 'failed-precondition' || error.code === 'unavailable') {
        console.log('⚠️ Usando datos de demostración por falta de índice o conexión');
        return {
          success: true,
          stats: getDemoConsumptionStats(),
          isDemo: true
        };
      }

      return {
        success: false,
        error: error.message,
        isDemo: false
      };
    }
  },


  // Obtener historial de un producto específico
  async getProductHistory(productId, limitCount = 20) {
    try {
      const q = query(
        collection(db, 'consumptionLogs'),
        where('productId', '==', productId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(q);
      const logs = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        logs.push({
          id: doc.id,
          ...data,
          openedAt: data.openedAt?.toDate() || null,
          finishedAt: data.finishedAt?.toDate() || null,
          createdAt: data.createdAt?.toDate() || new Date()
        });
      });

      return { success: true, logs };
    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener productos más consumidos
  async getMostConsumedProducts(householdId, limitCount = 10) {
    try {
      // ✅ CONSULTA SIMPLIFICADA
      const q = query(
        collection(db, 'consumptionLogs'),
        where('householdId', '==', householdId)
      );
    
      const querySnapshot = await getDocs(q);
      
      // Contar en memoria
      const productCounts = {};
      const productDetails = {};
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const productId = data.productId;
        
        if (productId) {
          productCounts[productId] = (productCounts[productId] || 0) + 1;
          
          if (!productDetails[productId]) {
            productDetails[productId] = {
              name: data.productName || 'Producto sin nombre',
              lastConsumed: data.createdAt?.toDate() || new Date(),
              totalQuantity: 0
            };
          }
          
          productDetails[productId].totalQuantity += (Number(data.quantity) || 1);
        }
      });
      
      // Convertir a array y ordenar en memoria
      const mostConsumed = Object.entries(productCounts)
        .map(([productId, count]) => ({
          productId,
          name: productDetails[productId]?.name || 'Producto',
          consumptionCount: count,
          totalQuantity: productDetails[productId]?.totalQuantity || 0,
          lastConsumed: productDetails[productId]?.lastConsumed || new Date()
        }))
        .sort((a, b) => b.consumptionCount - a.consumptionCount)
        .slice(0, limitCount);
      
      return { success: true, products: mostConsumed };
      
    } catch (error) {
      console.error('❌ Error obteniendo productos más consumidos:', error);
      
      // En caso de error, retornar array vacío
      return { 
        success: true, 
        products: [],
        isDemo: error.code === 'failed-precondition' || error.code === 'unavailable'
      };
    }
  }
};

// Función para datos demo (fallback)
function getDemoConsumptionStats() {
  const today = new Date();
  const lastMonth = new Date(today);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  
  return {
    totalLogs: 24,
    avgDuration: 14.3,
    totalCycles: 8,
    recentCycles: [
      {
        productId: 'demo-arroz',
        productName: 'Arroz',
        durationDays: 30,
        openedAt: new Date(today.getTime() - 35 * 24 * 60 * 60 * 1000),
        finishedAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
        actionType: 'cycle_complete',
        quantity: 5
      },
      {
        productId: 'demo-leche',
        productName: 'Leche',
        durationDays: 7,
        openedAt: new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000),
        finishedAt: new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000),
        actionType: 'cycle_complete',
        quantity: 2
      },
      {
        productId: 'demo-aceite',
        productName: 'Aceite de Oliva',
        durationDays: 45,
        openedAt: new Date(today.getTime() - 50 * 24 * 60 * 60 * 1000),
        finishedAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
        actionType: 'cycle_complete',
        quantity: 1
      }
    ],
    cyclesData: []
  };
}