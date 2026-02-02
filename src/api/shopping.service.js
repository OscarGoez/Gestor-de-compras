// /api/shopping.service.js - VERSIÓN COMPLETA CORREGIDA
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

export const shoppingService = {
  // Agregar producto automáticamente cuando se agota
  async addFromProductDepletion(product, reason = 'out') {
    try {
      console.log('🛒 AGREGANDO/ACTUALIZANDO EN LISTA:', {
        producto: product.name,
        razon: reason,
        statusActual: product.status,
        productId: product.id
      });
      
      // Primero buscar si ya existe en la lista (no comprado)
      const q = query(
        collection(db, 'shoppingList'),
        where('householdId', '==', product.householdId),
        where('productId', '==', product.id),
        where('checked', '==', false)
      );
      
      const existingSnapshot = await getDocs(q);
      
      // Si ya existe, ACTUALIZAR en lugar de crear nuevo
      if (!existingSnapshot.empty) {
        console.log('ℹ️ Producto ya está en lista, actualizando...');
        
        const existingDoc = existingSnapshot.docs[0];
        const existingData = existingDoc.data();
        
        // Determinar nuevo estado basado en product.status
        const isNowOutOfStock = product.status === 'out';
        const wasOutOfStock = existingData.isOutOfStock || 
                             existingData.originalStatus === 'out' || 
                             existingData.reason === 'out';
        
        // Si el producto ahora está AGOTADO (pero antes solo estaba bajo stock)
        if (isNowOutOfStock && !wasOutOfStock) {
          console.log(`🔄 ACTUALIZANDO: ${product.name} de BAJO STOCK → AGOTADO`);
          
          await updateDoc(existingDoc.ref, {
            reason: 'out',
            originalStatus: 'out',
            isOutOfStock: true,
            priority: 'high', // Mayor prioridad cuando se agota
            updatedAt: serverTimestamp(),
            notes: 'Actualizado automáticamente al AGOTARSE'
          });
          
          return { 
            success: true, 
            action: 'updated',
            itemId: existingDoc.id,
            fromStatus: existingData.originalStatus,
            toStatus: 'out'
          };
        }
        
        // Si ya existe y no hay cambio de estado, solo retornar
        return { 
          success: true, 
          alreadyExists: true,
          currentStatus: existingData.originalStatus
        };
      }
      
      // Si no existe, CREAR nuevo item
      console.log('➕ Creando nuevo item en lista de compras');
      
      // Determinar prioridad y detalles según el estado
      let priority, notes;
      
      if (product.status === 'out') {
        priority = 'high';
        notes = 'Agregado automáticamente al AGOTARSE';
      } else if (product.status === 'low') {
        priority = 'medium';
        notes = 'Agregado automáticamente por BAJO STOCK';
      } else {
        priority = 'low';
        notes = 'Agregado automáticamente';
      }
      
      // Calcular cantidad sugerida
      let suggestedQuantity = product.quantityTotal || 1;
      if (product.status === 'low') {
        const current = Number(product.quantityCurrent) || 0;
        const total = Number(product.quantityTotal) || 1;
        const missingQuantity = Math.max(0, total - current);
        suggestedQuantity = Math.max(1, Math.ceil(missingQuantity));
      }
      
      const shoppingItem = {
        householdId: product.householdId,
        productId: product.id,
        productName: product.name || 'Producto sin nombre',
        addedAt: serverTimestamp(),
        reason: product.status === 'out' ? 'out' : 'low',
        checked: false,
        categoryId: product.categoryId || 'otros',
        unit: product.unit || 'units',
        quantity: suggestedQuantity,
        notes: notes,
        originalStatus: product.status,
        priority: priority,
        isOutOfStock: product.status === 'out',
        hasExpirationDate: !!product.expirationDate,
        originalExpirationDate: product.expirationDate || null,
        autoAdded: true
      };
      
      console.log('📝 Nuevo item de compra:', shoppingItem);
      
      const docRef = await addDoc(collection(db, 'shoppingList'), shoppingItem);
      
      console.log('✅ Producto agregado a lista de compras, ID:', docRef.id);
      return { 
        success: true, 
        action: 'created',
        itemId: docRef.id,
        itemData: shoppingItem
      };
      
    } catch (error) {
      console.error('❌ Error en addFromProductDepletion:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener lista de compras - VERSIÓN MEJORADA
  async getShoppingList(householdId, showOnlyUnchecked = true) {
    try {
      if (!householdId) {
        return { success: false, error: 'No hay householdId', data: [] };
      }
    
      console.log('🛒 Cargando lista de compras para:', householdId);
    
      const q = query(
        collection(db, 'shoppingList'),
        where('householdId', '==', householdId),
        orderBy('addedAt', 'desc')
      );
    
      const querySnapshot = await getDocs(q);
      const items = [];
    
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        // Si showOnlyUnchecked es true, solo mostrar no comprados
        if (showOnlyUnchecked && data.checked) {
          return;
        }
        
        // Procesar fecha de manera segura
        let addedAt = new Date();
        if (data.addedAt && typeof data.addedAt.toDate === 'function') {
          addedAt = data.addedAt.toDate();
        } else if (data.addedAt instanceof Date) {
          addedAt = data.addedAt;
        } else if (data.addedAt) {
          addedAt = new Date(data.addedAt);
        }
        
        // Procesar fecha de compra si existe
        let purchasedAt = null;
        if (data.purchasedAt && typeof data.purchasedAt.toDate === 'function') {
          purchasedAt = data.purchasedAt.toDate();
        }
      
        items.push({ 
          id: doc.id, 
          ...data,
          addedAt,
          purchasedAt
        });
      });
    
      // Ordenar por prioridad (alta primero) y luego por fecha
      items.sort((a, b) => {
        const priorityOrder = { high: 1, medium: 2, low: 3 };
        const priorityA = priorityOrder[a.priority] || 3;
        const priorityB = priorityOrder[b.priority] || 3;
      
        if (priorityA !== priorityB) {
          return priorityA - priorityB;
        }
      
        return (b.addedAt || 0) - (a.addedAt || 0);
      });
    
      return { 
        success: true, 
        data: items,
        count: items.length,
        stats: {
          total: querySnapshot.size,
          pending: items.length,
          purchased: querySnapshot.size - items.length
        }
      };
    
    } catch (error) {
      console.error('❌ Error obteniendo lista de compras:', error);
      return { 
        success: false, 
        error: error.message,
        data: [],
        count: 0,
        stats: {
          total: 0,
          pending: 0,
          purchased: 0
        }
      };
    }
  },

  async getShoppingStats(householdId) {
    try {
      if (!householdId) {
        return { success: false, error: 'No hay householdId' };
      }

      const q = query(
        collection(db, 'shoppingList'),
        where('householdId', '==', householdId)
      );

      const querySnapshot = await getDocs(q);

      let totalItems = 0;
      let pendingItems = 0;
      let highPriority = 0;
      let mediumPriority = 0;
      let lowPriority = 0;
      let outOfStockItems = 0;
      let lowStockItems = 0;

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        totalItems++;

        if (!data.checked) {
          pendingItems++;

          // Contar por prioridad
          switch(data.priority) {
            case 'high': highPriority++; break;
            case 'medium': mediumPriority++; break;
            case 'low': lowPriority++; break;
          }
          
          // Contar por tipo (agotado vs bajo stock)
          if (data.isOutOfStock || data.originalStatus === 'out') {
            outOfStockItems++;
          } else if (data.reason === 'low' || data.originalStatus === 'low') {
            lowStockItems++;
          }
        }
      });

      return {
        success: true,
        stats: {
          total: totalItems,
          pending: pendingItems,
          purchased: totalItems - pendingItems,
          highPriority,
          mediumPriority,
          lowPriority,
          outOfStockItems,
          lowStockItems,
          manualItems: pendingItems - outOfStockItems - lowStockItems
        }
      };
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      return { 
        success: false, 
        error: error.message,
        stats: {
          total: 0,
          pending: 0,
          purchased: 0,
          highPriority: 0,
          mediumPriority: 0,
          lowPriority: 0,
          outOfStockItems: 0,
          lowStockItems: 0,
          manualItems: 0
        }
      };
    }
  },

  // Marcar item como comprado - VERSIÓN MEJORADA CON MANEJO DE PRODUCTOS
  async markAsPurchased(itemId) {
    try {
      console.log('✅ Marcando como comprado:', itemId);
      
      let itemData = null;
      let productData = null;
      
      try {
        // Obtener el item de shoppingList
        const itemRef = doc(db, 'shoppingList', itemId);
        const itemDoc = await getDoc(itemRef);
        
        if (itemDoc.exists()) {
          itemData = { id: itemDoc.id, ...itemDoc.data() };
          console.log('📋 Datos del item obtenidos:', {
            nombre: itemData.productName,
            productId: itemData.productId,
            statusOriginal: itemData.originalStatus,
            razon: itemData.reason
          });
          
          // Si tiene productId, obtener datos del producto
          if (itemData.productId) {
            try {
              const productRef = doc(db, 'products', itemData.productId);
              const productDoc = await getDoc(productRef);
              if (productDoc.exists()) {
                productData = { id: productDoc.id, ...productDoc.data() };
                console.log('📦 Datos del producto obtenidos:', {
                  nombre: productData.name,
                  expirationDate: productData.expirationDate,
                  statusActual: productData.status
                });
              }
            } catch (productErr) {
              console.warn('⚠️ No se pudo obtener datos del producto:', productErr);
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ No se pudo obtener datos del item:', err);
      }
      
      // Marcar como comprado
      await updateDoc(doc(db, 'shoppingList', itemId), {
        checked: true,
        purchasedAt: serverTimestamp()
      });
      
      console.log('✅ Item marcado como comprado');
      
      // Devolver datos necesarios para actualizar el producto
      return { 
        success: true, 
        itemData,
        productData,
        hasProductId: !!itemData?.productId,
        message: 'Item marcado como comprado'
      };
    } catch (error) {
      console.error('❌ Error marcando como comprado:', error);
      return { success: false, error: error.message };
    }
  },

  // Eliminar item de lista
  async removeFromShoppingList(itemId) {
    try {
      await deleteDoc(doc(db, 'shoppingList', itemId));
      console.log('✅ Item eliminado de lista');
      return { success: true };
    } catch (error) {
      console.error('❌ Error eliminando de lista:', error);
      return { success: false, error: error.message };
    }
  },

  // Agregar item manualmente - CON BÚSQUEDA MEJORADA
  async addManualItem(householdId, productName, categoryId = 'otros', quantity = 1, unit = 'units') {
    try {
      if (!householdId || !productName.trim()) {
        return { success: false, error: 'Datos inválidos' };
      }
      
      console.log('➕ Agregando item manual:', productName);
      
      const docRef = await addDoc(collection(db, 'shoppingList'), {
        householdId,
        productName: productName.trim(),
        addedAt: serverTimestamp(),
        reason: 'manual',
        checked: false,
        categoryId,
        quantity: Number(quantity) || 1,
        unit: unit || 'units',
        priority: 'low',
        notes: 'Agregado manualmente',
        originalStatus: null, // No tiene status original
        isOutOfStock: false
      });
      
      const newItem = {
        id: docRef.id,
        householdId,
        productName: productName.trim(),
        addedAt: new Date(),
        reason: 'manual',
        checked: false,
        categoryId,
        quantity: Number(quantity) || 1,
        unit: unit || 'units',
        priority: 'low',
        notes: 'Agregado manualmente',
        originalStatus: null,
        isOutOfStock: false
      };
      
      console.log('✅ Item manual agregado, ID:', docRef.id);
      return { success: true, message: 'Producto agregado a la lista', item: newItem };
      
    } catch (error) {
      console.error('❌ Error agregando item manual:', error);
      return { success: false, error: error.message };
    }
  },

  // Buscar productos para agregar rápidamente
  async searchProductsForShopping(householdId, searchTerm) {
    try {
      if (!householdId) {
        return { success: false, error: 'No hay householdId' };
      }
      
      if (!searchTerm || searchTerm.trim().length < 2) {
        return { success: true, products: [] };
      }
      
      const term = searchTerm.toLowerCase().trim();
      
      // Obtener productos del household
      const productsQuery = query(
        collection(db, 'products'),
        where('householdId', '==', householdId)
      );
      
      const productsSnapshot = await getDocs(productsQuery);
      const products = [];
      
      productsSnapshot.forEach((doc) => {
        const product = doc.data();
        const productName = product.name?.toLowerCase() || '';
        
        if (productName.includes(term)) {
          products.push({
            id: doc.id,
            ...product,
            displayName: product.name,
            category: product.categoryId || 'otros',
            currentStatus: product.status
          });
        }
      });
      
      return { success: true, products };
    } catch (error) {
      console.error('❌ Error buscando productos:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener historial de compras
  async getPurchaseHistory(householdId, limit = 20) {
    try {
      const q = query(
        collection(db, 'shoppingList'),
        where('householdId', '==', householdId),
        where('checked', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      const history = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        let purchasedAt = new Date();
        if (data.purchasedAt && typeof data.purchasedAt.toDate === 'function') {
          purchasedAt = data.purchasedAt.toDate();
        }
        
        history.push({ 
          id: doc.id, 
          ...data,
          purchasedAt
        });
      });
      
      // Ordenar por fecha de compra (más reciente primero)
      history.sort((a, b) => b.purchasedAt - a.purchasedAt);
      
      return { success: true, history: history.slice(0, limit) };
    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      return { success: false, error: error.message };
    }
  },

  // ✅ NUEVA FUNCIÓN: Verificar y actualizar items de lista según estado de productos
  async syncShoppingListWithProducts(householdId) {
    try {
      console.log('🔄 Sincronizando lista de compras con estado de productos...');
      
      if (!householdId) {
        return { success: false, error: 'No hay householdId' };
      }
      
      // Obtener todos los items NO comprados
      const shoppingResult = await this.getShoppingList(householdId, true);
      if (!shoppingResult.success) {
        return shoppingResult;
      }
      
      const pendingItems = shoppingResult.data;
      let updatedItems = 0;
      let removedItems = 0;
      
      // Para cada item pendiente con productId
      for (const item of pendingItems) {
        if (item.productId) {
          try {
            // Obtener estado actual del producto
            const productRef = doc(db, 'products', item.productId);
            const productDoc = await getDoc(productRef);
            
            if (productDoc.exists()) {
              const product = productDoc.data();
              const currentStatus = product.status;
              
              // Si el producto ya no está "out" o "low", podría removerlo de la lista
              // O actualizar su información
              if (currentStatus !== 'out' && currentStatus !== 'low') {
                console.log(`🔄 Producto "${item.productName}" ya no está agotado/bajo stock`);
                
                // Opcional: Marcar como comprado automáticamente
                // await this.markAsPurchased(item.id);
                // O remover de la lista:
                // await this.removeFromShoppingList(item.id);
                // removedItems++;
              } else if (currentStatus !== item.originalStatus) {
                // Si el status cambió, actualizar el item
                console.log(`📝 Actualizando status de "${item.productName}": ${item.originalStatus} → ${currentStatus}`);
                
                await updateDoc(doc(db, 'shoppingList', item.id), {
                  originalStatus: currentStatus,
                  isOutOfStock: currentStatus === 'out',
                  updatedAt: serverTimestamp()
                });
                
                updatedItems++;
              }
            } else {
              // Producto eliminado, remover de lista
              console.log(`🗑️ Producto eliminado: "${item.productName}"`);
              await this.removeFromShoppingList(item.id);
              removedItems++;
            }
          } catch (error) {
            console.warn(`⚠️ Error procesando item "${item.productName}":`, error);
          }
        }
      }
      
      console.log(`✅ Sincronización completada: ${updatedItems} actualizados, ${removedItems} removidos`);
      return { 
        success: true, 
        updatedItems, 
        removedItems,
        message: `Lista sincronizada: ${updatedItems} actualizados, ${removedItems} removidos`
      };
      
    } catch (error) {
      console.error('❌ Error sincronizando lista:', error);
      return { success: false, error: error.message };
    }
  },

  // ✅ NUEVA FUNCIÓN: Obtener items por tipo (agotados, bajo stock, manuales)
  async getItemsByType(householdId, type = 'all') {
    try {
      if (!householdId) {
        return { success: false, error: 'No hay householdId' };
      }
      
      const result = await this.getShoppingList(householdId, true);
      if (!result.success) {
        return result;
      }
      
      let filteredItems = result.data;
      
      if (type === 'out') {
        filteredItems = filteredItems.filter(item => 
          item.isOutOfStock || item.originalStatus === 'out' || item.reason === 'out'
        );
      } else if (type === 'low') {
        filteredItems = filteredItems.filter(item => 
          !item.isOutOfStock && (item.originalStatus === 'low' || item.reason === 'low')
        );
      } else if (type === 'manual') {
        filteredItems = filteredItems.filter(item => item.reason === 'manual');
      }
      
      return {
        success: true,
        data: filteredItems,
        count: filteredItems.length,
        type: type
      };
    } catch (error) {
      console.error('❌ Error obteniendo items por tipo:', error);
      return { success: false, error: error.message };
    }
  }
};