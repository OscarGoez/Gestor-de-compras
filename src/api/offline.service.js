// /api/offline.service.js
class OfflineService {
  constructor() {
    this.queue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
    this.isSyncing = false;
  }

  addOperation(type, data) {
    const operation = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      type,
      data,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    this.queue.push(operation);
    this.saveQueue();
    console.log('📝 Operación agregada a cola offline:', operation);

    // Intentar sincronizar si hay conexión
    if (navigator.onLine) {
      this.syncQueue();
    }

    return operation.id;
  }

  async syncQueue() {
    if (this.isSyncing || this.queue.length === 0 || !navigator.onLine) {
      return;
    }

    this.isSyncing = true;
    console.log(`🔄 Sincronizando ${this.queue.length} operaciones...`);

    try {
      // Procesar cada operación en orden
      for (let i = 0; i < this.queue.length; i++) {
        const op = this.queue[i];
        
        try {
          switch (op.type) {
            case 'createProduct':
              await this.syncCreateProduct(op.data);
              break;
            case 'updateProduct':
              await this.syncUpdateProduct(op.data);
              break;
            case 'deleteProduct':
              await this.syncDeleteProduct(op.data);
              break;
            case 'consumeProduct':
              await this.syncConsumeProduct(op.data);
              break;
          }
          
          op.status = 'completed';
          console.log(`✅ Operación ${op.id} completada`);
        } catch (error) {
          console.error(`❌ Error en operación ${op.id}:`, error);
          op.status = 'failed';
          op.error = error.message;
        }
      }

      // Eliminar operaciones completadas
      this.queue = this.queue.filter(op => op.status === 'pending' || op.status === 'failed');
      this.saveQueue();

    } finally {
      this.isSyncing = false;
    }
  }

  async syncCreateProduct(data) {
    // Aquí llamarías al servicio real de productos
    console.log('Sincronizando creación de producto:', data);
    // Ejemplo: await productsService.createProduct(data.product, data.householdId);
  }

  // Métodos similares para updateProduct, deleteProduct, etc...

  saveQueue() {
    localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
  }

  getQueue() {
    return [...this.queue];
  }

  clearQueue() {
    this.queue = [];
    this.saveQueue();
  }
}

export const offlineService = new OfflineService();