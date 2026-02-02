// /hooks/useOffline.js - VERSIÓN MEJORADA
import { useState, useEffect, useCallback } from 'react';

export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  // Cargar cola desde localStorage al iniciar
  useEffect(() => {
    const savedQueue = localStorage.getItem('offlineQueue');
    if (savedQueue) {
      try {
        const parsedQueue = JSON.parse(savedQueue);
        setOfflineQueue(parsedQueue);
        console.log(`📦 Cola offline cargada: ${parsedQueue.length} operaciones pendientes`);
      } catch (error) {
        console.error('❌ Error cargando cola offline:', error);
        localStorage.removeItem('offlineQueue');
      }
    }
  }, []);

  // Guardar cola en localStorage cuando cambia
  useEffect(() => {
    if (offlineQueue.length > 0) {
      localStorage.setItem('offlineQueue', JSON.stringify(offlineQueue));
      console.log(`💾 Cola guardada: ${offlineQueue.length} operaciones`);
    }
  }, [offlineQueue]);

  // Detectar cambios en conexión
  useEffect(() => {
    const handleOnline = () => {
      console.log('✅ Conexión RESTAURADA');
      setIsOnline(true);
      
      // Notificar a otros componentes
      window.dispatchEvent(new CustomEvent('connection-restored'));
    };

    const handleOffline = () => {
      console.warn('⚠️ Sin conexión - Modo offline activado');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar conexión periódicamente
    const interval = setInterval(() => {
      if (navigator.onLine !== isOnline) {
        navigator.onLine ? handleOnline() : handleOffline();
      }
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline]);

  // Agregar operación a la cola offline
  const addToQueue = useCallback((operation) => {
    const operationWithId = {
      ...operation,
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    setOfflineQueue(prev => {
      const newQueue = [...prev, operationWithId];
      console.log('📝 Operación agregada a cola:', operation.type, `(Total: ${newQueue.length})`);
      return newQueue;
    });

    return operationWithId.id;
  }, []);

  // Sincronizar cola cuando hay conexión
  const syncQueue = useCallback(async () => {
    if (offlineQueue.length === 0 || !isOnline || isSyncing) {
      console.log('⏸️ Sincronización omitida:', {
        queueLength: offlineQueue.length,
        isOnline,
        isSyncing
      });
      return;
    }

    setIsSyncing(true);
    console.log('🔄 Iniciando sincronización de cola offline...');

    try {
      // Aquí procesarías cada operación con los servicios reales
      // Por ahora, simulamos una sincronización exitosa
      
      // Filtrar solo operaciones pendientes
      const pendingOps = offlineQueue.filter(op => op.status === 'pending');
      
      for (const op of pendingOps) {
        console.log(`📤 Sincronizando: ${op.type} - ${op.id}`);
        
        // Simular procesamiento
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Marcar como completada
        op.status = 'completed';
        op.syncedAt = new Date().toISOString();
      }

      // Limpiar operaciones completadas (mantener solo las pendientes o fallidas)
      const remainingOps = offlineQueue.filter(op => op.status !== 'completed');
      setOfflineQueue(remainingOps);
      
      if (remainingOps.length === 0) {
        localStorage.removeItem('offlineQueue');
      }

      setLastSync(new Date().toISOString());
      console.log('✅ Sincronización completada exitosamente');

    } catch (error) {
      console.error('❌ Error en sincronización:', error);
      
      // Marcar operaciones como fallidas
      setOfflineQueue(prev => prev.map(op => 
        op.status === 'pending' ? { ...op, status: 'failed', error: error.message } : op
      ));
      
    } finally {
      setIsSyncing(false);
    }
  }, [offlineQueue, isOnline, isSyncing]);

  // Sincronizar automáticamente cuando vuelve la conexión
  useEffect(() => {
    if (isOnline && offlineQueue.length > 0) {
      console.log('🔗 Conexión detectada, iniciando sincronización automática');
      const syncTimer = setTimeout(() => {
        syncQueue();
      }, 2000); // Esperar 2 segundos para estabilizar conexión
      
      return () => clearTimeout(syncTimer);
    }
  }, [isOnline, offlineQueue.length, syncQueue]);

  // Sincronizar manualmente
  const forceSync = useCallback(() => {
    if (isOnline && !isSyncing) {
      syncQueue();
    }
  }, [isOnline, isSyncing, syncQueue]);

  // Limpiar cola
  const clearQueue = useCallback(() => {
    console.log('🗑️ Limpiando cola offline');
    setOfflineQueue([]);
    localStorage.removeItem('offlineQueue');
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    offlineQueue,
    addToQueue,
    syncQueue: forceSync,
    clearQueue,
    isSyncing,
    queueLength: offlineQueue.filter(op => op.status === 'pending').length,
    lastSync,
    pendingOperations: offlineQueue.filter(op => op.status === 'pending')
  };
};