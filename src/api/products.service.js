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
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { validateField, firestoreValidations } from '../utils/validationRules';

// Función de cálculo de status - MUY IMPORTANTE
const calculateProductStatus = (quantityCurrent, quantityTotal, lowStockThreshold = 0.2) => {
  console.log('🧮 CALCULANDO STATUS:', {
    current: quantityCurrent,
    total: quantityTotal,
    threshold: lowStockThreshold,
    calculo: `${quantityCurrent} <= ${quantityTotal} * ${lowStockThreshold} ?`
  });
  
  if (quantityCurrent <= 0) {
    console.log('   → Resultado: OUT (cantidad = 0)');
    return 'out';
  }
  
  if (quantityTotal <= 0) {
    console.log('   → Resultado: AVAILABLE (total = 0)');
    return 'available';
  }
  
  const thresholdValue = quantityTotal * lowStockThreshold;
  const isLow = quantityCurrent <= thresholdValue;
  
  console.log('   → Resultado:', isLow ? 'LOW' : 'AVAILABLE', {
    valorUmbral: thresholdValue,
    condicion: `${quantityCurrent} <= ${thresholdValue} = ${isLow}`
  });
  
  return isLow ? 'low' : 'available';
};

export const productsService = {
  // Crear nuevo producto
  async createProduct(productData, householdId) {
  try {
    console.log('➕ CREANDO PRODUCTO:', productData);
    
    // ✅ 1. VALIDACIÓN DEL LADO DEL CLIENTE
    const validations = [
      validateField('product.name', productData.name),
      validateField('product.category', productData.category),
      validateField('product.unit', productData.unit),
      validateField('product.quantityTotal', productData.quantityTotal),
      validateField('product.quantityCurrent', productData.quantityCurrent, productData),
      firestoreValidations.validateLowStockThreshold(productData.lowStockThreshold)
    ];

    // Verificar todas las validaciones
    const validationErrors = validations.filter(v => !v.isValid);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: 'Por favor corrige los errores:',
        validationErrors: validationErrors.map(v => v.message)
      };
    }

    // ✅ 2. VALIDACIÓN ESPECÍFICA DE FECHA
    if (productData.expirationDate) {
      const dateValidation = firestoreValidations.validateExpirationDate(productData.expirationDate);
      if (!dateValidation.isValid) {
        return { success: false, error: dateValidation.message };
      }
    }

    // ✅ 3. CONVERSIONES NUMÉRICAS SEGURAS (mantener tu lógica existente)
    const quantityTotal = Number(productData.quantityTotal) || 0;
    const quantityCurrent = quantityTotal; // Al crear, igual al total
    
    // ✅ 4. UMBRAL MÍNIMO 20% (igual que ya tienes)
    let lowStockThreshold = 0.2; // POR DEFECTO 20%
    
    if (productData.lowStockThreshold !== undefined) {
      const userThreshold = Number(productData.lowStockThreshold);
      if (!isNaN(userThreshold) && userThreshold >= 0.1 && userThreshold <= 1) {
        lowStockThreshold = Math.max(0.2, userThreshold); // Mínimo 20%
      }
    }
    
    // ✅ 5. CALCULAR STATUS
    const status = calculateProductStatus(
      quantityCurrent,
      quantityTotal,
      lowStockThreshold
    );

    const productWithDefaults = {
      ...productData,
      householdId,
      quantityCurrent: quantityCurrent,
      quantityTotal: quantityTotal,
      lowStockThreshold: lowStockThreshold,
      status: status,
      autoAddedToShopping: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastOpenedAt: null,
      expirationDate: productData.expirationDate || null
    };

    console.log('📦 PRODUCTO VALIDADO:', {
      nombre: productWithDefaults.name,
      cantidadActual: productWithDefaults.quantityCurrent,
      cantidadTotal: productWithDefaults.quantityTotal,
      umbral: productWithDefaults.lowStockThreshold,
      status: productWithDefaults.status
    });
    
    const docRef = await addDoc(collection(db, 'products'), productWithDefaults);
    console.log('✅ Producto creado ID:', docRef.id);
    
    return { 
      success: true, 
      id: docRef.id, 
      product: { ...productWithDefaults, id: docRef.id, status } 
    };
  } catch (error) {
    console.error('❌ Error creando producto:', error);
    
    // ✅ 6. MANEJO DE ERRORES DE FIRESTORE ESPECÍFICOS
    const firestoreErrors = {
      'permission-denied': 'No tienes permiso para agregar productos en este hogar',
      'resource-exhausted': 'Límite de productos alcanzado. Intenta más tarde',
      'failed-precondition': 'Se necesita crear un índice en Firestore',
      'invalid-argument': 'Datos inválidos enviados a Firestore'
    };
    
    return {
      success: false,
      error: firestoreErrors[error.code] || 'Error al guardar el producto'
    };
  }
},

  // Obtener todos los productos de un hogar - CORREGIDO
 async getProductsByHousehold(householdId) {
  try {
    console.log('🔍 BUSCANDO PRODUCTOS householdId:', householdId);
    
    const q = query(
      collection(db, 'products'),
      where('householdId', '==', householdId)
    );
    
    const querySnapshot = await getDocs(q);
    const products = [];
    
    console.log(`📄 Encontrados: ${querySnapshot.size} productos`);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // CONVERSIONES SEGURAS
      const quantityTotal = Number(data.quantityTotal) || 0;
      const quantityCurrent = Number(data.quantityCurrent) || 0;
      
      // UMBRAL MÍNIMO 20%
      let lowStockThreshold = Number(data.lowStockThreshold) || 0.2;
      if (lowStockThreshold < 0.2) {
        console.log(`🔄 CORRIGIENDO UMBRAL: ${data.name || 'Producto'} ${lowStockThreshold} → 0.2`);
        lowStockThreshold = 0.2;
      }
      
      // CALCULAR STATUS
      const status = calculateProductStatus(
        quantityCurrent,
        quantityTotal,
        lowStockThreshold
      );
      
      // ✅ FUNCIÓN SEGURA PARA CONVERTIR TIMESTAMP/DATE
      const safeConvertDate = (dateField) => {
        if (!dateField) return null;
        
        // Si ya es Date, retornarlo
        if (dateField instanceof Date) {
          return dateField;
        }
        
        // Si tiene método toDate() (Timestamp de Firebase)
        if (typeof dateField.toDate === 'function') {
          return dateField.toDate();
        }
        
        // Si es string o número
        try {
          return new Date(dateField);
        } catch (error) {
          console.warn('⚠️ Error convirtiendo fecha:', dateField, error);
          return null;
        }
      };
      
      // INICIALIZAR autoAddedToShopping
      const autoAddedToShopping = data.autoAddedToShopping !== undefined 
        ? Boolean(data.autoAddedToShopping) 
        : false;
      
      // ✅ CONVERSIÓN SEGURA DE FECHAS
      const expirationDate = safeConvertDate(data.expirationDate);
      const lastOpenedAt = safeConvertDate(data.lastOpenedAt);
      const createdAt = safeConvertDate(data.createdAt);
      const updatedAt = safeConvertDate(data.updatedAt);
      
      const product = { 
        id: doc.id, 
        ...data,
        // VALORES NUMÉRICOS ASEGURADOS
        quantityTotal,
        quantityCurrent,
        lowStockThreshold, // Usar el umbral corregido
        status: status, // Usar el status calculado, NO el almacenado
        autoAddedToShopping: autoAddedToShopping,
        name: data.name || 'Sin nombre',
        categoryId: data.categoryId || 'otros',
        unit: data.unit || 'units',
        // ✅ FECHAS CONVERTIDAS DE MANERA SEGURA
        expirationDate,
        lastOpenedAt,
        createdAt: createdAt || new Date(),
        updatedAt: updatedAt || new Date()
      };
      
      // LOG DETALLADO PARA DEPURACIÓN
      console.log(`📝 PRODUCTO "${product.name}":`, {
        ID: product.id,
        Cantidad: `${product.quantityCurrent}/${product.quantityTotal} ${product.unit}`,
        Umbral: `${(product.lowStockThreshold * 100).toFixed(0)}%`,
        StatusAlmacenado: data.status || 'N/A',
        StatusCalculado: product.status,
        EsBajoStock: product.status === 'low',
        AutoAgregado: product.autoAddedToShopping,
        Porcentaje: quantityTotal > 0 ? `${((quantityCurrent / quantityTotal) * 100).toFixed(1)}%` : '0%',
        Expiración: expirationDate ? expirationDate.toISOString().split('T')[0] : 'N/A',
        TipoExpiración: data.expirationDate ? typeof data.expirationDate : 'null'
      });
      
      products.push(product);
    });
    
    // Ordenar por fecha de actualización
    products.sort((a, b) => {
      const dateA = a.updatedAt || new Date(0);
      const dateB = b.updatedAt || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    
    // ANÁLISIS FINAL
    const lowStockProducts = products.filter(p => p.status === 'low');
    const outCount = products.filter(p => p.status === 'out').length;
    const lowNotAdded = lowStockProducts.filter(p => !p.autoAddedToShopping).length;
    
    console.log('📊 RESUMEN FINAL:', {
      TotalProductos: products.length,
      BajoStock: lowStockProducts.length,
      BajoStockNoAgregados: lowNotAdded,
      Agotados: outCount,
      Disponibles: products.length - lowStockProducts.length - outCount
    });
    
    return { success: true, products };
    } catch (error) {
      console.error('❌ Error obteniendo productos:', error);
      
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        return { 
          success: false, 
          error: `Se necesita crear un índice en Firestore. ${error.message}` 
        };
      }
      
      return { success: false, error: error.message };
    }
  },

  // Obtener historial de consumo de un producto
  async getProductConsumptionHistory(productId) {
    try {
      console.log('📊 Obteniendo historial de consumo para:', productId);
      
      // Buscar logs de consumo para este producto
      const q = query(
        collection(db, 'consumptionLogs'),
        where('productId', '==', productId),
        orderBy('createdAt', 'desc'),
        limit(20)
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
      
      console.log(`✅ Encontrados ${logs.length} registros de consumo`);
      return { success: true, logs };
      
    } catch (error) {
      console.error('❌ Error obteniendo historial:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Registrar ciclo completo (abrir → terminar)
  async completeProductCycle(productId, notes = '') {
    try {
      console.log('🔄 Completando ciclo para producto:', productId);
      
      const productRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productRef);
      
      if (!productSnap.exists()) {
        return { success: false, error: 'Producto no encontrado' };
      }
      
      const product = productSnap.data();
      
      // Solo se puede completar ciclo si fue abierto
      if (!product.lastOpenedAt) {
        return { 
          success: false, 
          error: 'Este producto no fue abierto previamente' 
        };
      }
      
      // Calcular duración del ciclo
      const openedAt = product.lastOpenedAt.toDate 
        ? product.lastOpenedAt.toDate() 
        : new Date(product.lastOpenedAt);
      
      const finishedAt = new Date();
      const durationDays = Math.ceil((finishedAt - openedAt) / (1000 * 60 * 60 * 24));
      
      // Registrar log de ciclo completo
      const { consumptionService } = await import('./consumption.service.js');
      await consumptionService.logConsumption(
        productId,
        product.householdId,
        product.name,
        product.quantityTotal || 1,
        'cycle_complete',
        notes,
        openedAt,
        finishedAt
      );
      
      console.log(`✅ Ciclo completado: ${durationDays} días de duración`);
      return { 
        success: true, 
        durationDays,
        openedAt,
        finishedAt
      };
      
    } catch (error) {
      console.error('❌ Error completando ciclo:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener productos por estado
  async getProductsByStatus(householdId, status) {
    try {
      const q = query(
        collection(db, 'products'),
        where('householdId', '==', householdId),
        where('status', '==', status)
      );
      
      const querySnapshot = await getDocs(q);
      const products = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        products.push({ 
          id: doc.id, 
          ...data,
          expirationDate: data.expirationDate ? data.expirationDate.toDate() : null
        });
      });
      
      return { success: true, products };
    } catch (error) {
      console.error('❌ Error obteniendo productos por estado:', error);
      return { success: false, error: error.message };
    }
  },

  // Actualizar producto
  async updateProduct(productId, updates) {
    try {
      console.log('✏️ ACTUALIZANDO PRODUCTO:', productId, updates);

      // ✅ 1. OBTENER PRODUCTO ACTUAL
      const productRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        return { success: false, error: 'Producto no encontrado' };
      }

      const product = productSnap.data();

      // ✅ 2. VALIDAR ACTUALIZACIONES
      if (updates.name !== undefined) {
        const nameValidation = validateField('product.name', updates.name);
        if (!nameValidation.isValid) {
          return { success: false, error: nameValidation.message };
        }
      }

      if (updates.quantityCurrent !== undefined && updates.quantityTotal !== undefined) {
        const quantityValidation = firestoreValidations.validateQuantity(
          updates.quantityCurrent,
          updates.quantityTotal
        );
        if (!quantityValidation.isValid) {
          return { success: false, error: quantityValidation.message };
        }
      }

      if (updates.lowStockThreshold !== undefined) {
        const thresholdValidation = firestoreValidations.validateLowStockThreshold(updates.lowStockThreshold);
        if (!thresholdValidation.isValid) {
          return { success: false, error: thresholdValidation.message };
        }
      }

      if (updates.expirationDate) {
        const dateValidation = firestoreValidations.validateExpirationDate(updates.expirationDate);
        if (!dateValidation.isValid) {
          return { success: false, error: dateValidation.message };
        }
      }

      // ✅ 3. CONTINUAR CON TU LÓGICA EXISTENTE...
      const newQuantityCurrent = updates.quantityCurrent !== undefined 
        ? Number(updates.quantityCurrent) 
        : Number(product.quantityCurrent) || 0;

      const newQuantityTotal = updates.quantityTotal !== undefined 
        ? Number(updates.quantityTotal) 
        : Number(product.quantityTotal) || 0;

      let newLowStockThreshold = 0.2;
      if (updates.lowStockThreshold !== undefined) {
        const userThreshold = Number(updates.lowStockThreshold);
        if (!isNaN(userThreshold) && userThreshold >= 0.1) {
          newLowStockThreshold = Math.max(0.2, userThreshold);
        }
      } else {
        newLowStockThreshold = Math.max(0.2, Number(product.lowStockThreshold) || 0.2);
      }

      const newStatus = calculateProductStatus(
        newQuantityCurrent,
        newQuantityTotal,
        newLowStockThreshold
      );

      const updateData = {
        ...updates,
        status: newStatus,
        updatedAt: serverTimestamp()
      };

      // ✅ 4. ENVIAR A FIRESTORE
      await updateDoc(productRef, updateData);

      console.log('✅ Producto actualizado');
      return { success: true, newStatus, newQuantityCurrent };
    } catch (error) {
      console.error('❌ Error actualizando producto:', error);

      const firestoreErrors = {
        'permission-denied': 'No tienes permiso para modificar este producto',
        'not-found': 'El producto no existe',
        'failed-precondition': 'El producto fue modificado por otro usuario',
        'invalid-argument': 'Datos inválidos'
      };

      return {
        success: false,
        error: firestoreErrors[error.code] || 'Error al actualizar'
      };
    }
  },

  async updateShoppingListItemsByProductStatus(productId, newStatus) {
    try {
      console.log('🔄 Actualizando items de lista para producto:', productId, 'Status:', newStatus);

      // Buscar items no comprados de este producto
      const q = query(
        collection(db, 'shoppingList'),
        where('productId', '==', productId),
        where('checked', '==', false)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return { success: true, updated: 0, message: 'No hay items pendientes' };
      }

      let updatedCount = 0;

      for (const docSnap of snapshot.docs) {
        const item = docSnap.data();

        // Solo actualizar si el status cambió significativamente
        // (de bajo stock a agotado, o viceversa)
        const wasOutOfStock = item.isOutOfStock || item.originalStatus === 'out';
        const isNowOutOfStock = newStatus === 'out';

        if ((wasOutOfStock !== isNowOutOfStock) || (item.originalStatus !== newStatus)) {
          await updateDoc(docSnap.ref, {
            originalStatus: newStatus,
            isOutOfStock: isNowOutOfStock,
            reason: isNowOutOfStock ? 'out' : 'low',
            priority: isNowOutOfStock ? 'high' : 'medium',
            updatedAt: serverTimestamp(),
            notes: `Actualizado automáticamente: ${wasOutOfStock ? 'Agotado' : 'Bajo stock'} → ${isNowOutOfStock ? 'Agotado' : 'Bajo stock'}`
          });

          updatedCount++;
          console.log(`📝 Item ${docSnap.id} actualizado: ${item.originalStatus} → ${newStatus}`);
        }
      }

      console.log(`✅ ${updatedCount} items actualizados`);
      return { success: true, updated: updatedCount };
    } catch (error) {
      console.error('❌ Error actualizando items de lista:', error);
      return { success: false, error: error.message };
    }
  },

  // Eliminar producto
  async deleteProduct(productId) {
    try {
      console.log('🗑️ ELIMINANDO PRODUCTO:', productId);
      await deleteDoc(doc(db, 'products', productId));
      console.log('✅ Producto eliminado');
      return { success: true };
    } catch (error) {
      console.error('❌ Error eliminando producto:', error);
      return { success: false, error: error.message };
    }
  },


  async checkLowStockProducts(householdId) {
    try {
      console.log('🔍 Verificando productos en bajo stock para:', householdId);

      // Obtener productos con status 'low' que no estén ya en la lista
      const q = query(
        collection(db, 'products'),
        where('householdId', '==', householdId),
        where('status', '==', 'low')
      );

      const querySnapshot = await getDocs(q);
      let addedCount = 0;

      console.log(`📊 Encontrados ${querySnapshot.size} productos en bajo stock`);

      // Para cada producto en bajo stock
      for (const doc of querySnapshot.docs) {
        const product = { id: doc.id, ...doc.data() };

        // Verificar si ya está en la lista de compras
        const shoppingQuery = query(
          collection(db, 'shoppingList'),
          where('householdId', '==', householdId),
          where('productId', '==', product.id),
          where('checked', '==', false)
        );

        const existing = await getDocs(shoppingQuery);

        if (existing.empty) {
          // Agregar a lista de compras
          console.log(`➕ Agregando ${product.name} a lista de compras`);
          await shoppingService.addFromProductDepletion(product, 'low');
          addedCount++;
        }
      }

      return { 
        success: true, 
        addedCount,
        message: `${addedCount} productos agregados a lista de compras`
      };

    } catch (error) {
      console.error('❌ Error verificando bajo stock:', error);
      return { success: false, error: error.message };
    }
  },

  async getProductById(productId) {
    try {
      console.log('🔍 Obteniendo producto por ID:', productId);

      const productRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        return { success: false, error: 'Producto no encontrado' };
      }

      const data = productSnap.data();

      // CONVERSIONES SEGURAS
      const quantityTotal = Number(data.quantityTotal) || 0;
      const quantityCurrent = Number(data.quantityCurrent) || 0;
      let lowStockThreshold = Math.max(0.2, Number(data.lowStockThreshold) || 0.2);

      // CALCULAR STATUS
      const status = calculateProductStatus(
        quantityCurrent,
        quantityTotal,
        lowStockThreshold
      );

      const product = {
        id: productSnap.id,
        ...data,
        quantityTotal,
        quantityCurrent,
        lowStockThreshold,
        status,
        name: data.name || 'Sin nombre',
        categoryId: data.categoryId || 'otros',
        unit: data.unit || 'units',
        expirationDate: data.expirationDate ? data.expirationDate.toDate() : null,
        lastOpenedAt: data.lastOpenedAt ? data.lastOpenedAt.toDate() : null,
        createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
        updatedAt: data.updatedAt ? data.updatedAt.toDate() : new Date(),
        autoAddedToShopping: data.autoAddedToShopping !== undefined ? Boolean(data.autoAddedToShopping) : false
      };

      console.log('✅ Producto obtenido:', product.name);
      return { success: true, product };

    } catch (error) {
      console.error('❌ Error obteniendo producto:', error);
      return { success: false, error: error.message };
    }
  },

  

  // Consumir producto - 
  async consumeProduct(productId, amount = 1) {
    try {
      console.log('🍽️ CONSUMIENDO PRODUCTO:', productId, 'Cantidad:', amount);
    
      const productRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productRef);
    
      if (!productSnap.exists()) {
        return { success: false, error: 'Producto no encontrado' };
      }
    
      const product = productSnap.data();
      const quantityCurrent = Number(product.quantityCurrent) || 0;
      const quantityTotal = Number(product.quantityTotal) || 0;
      let lowStockThreshold = Math.max(0.2, Number(product.lowStockThreshold) || 0.2);
    
      const consumptionAmount = Number(amount) || 1;
      const newQuantity = Math.max(0, quantityCurrent - consumptionAmount);
    
      // Calcular nuevo status
      const newStatus = calculateProductStatus(
        newQuantity,
        quantityTotal,
        lowStockThreshold
      );
    
      console.log('📊 NUEVO STATUS:', newStatus, {
        current: newQuantity,
        total: quantityTotal,
        threshold: lowStockThreshold,
        statusAnterior: product.status
      });
    
      // Preparar actualizaciones
      const updates = {
        quantityCurrent: newQuantity,
        status: newStatus,
        updatedAt: serverTimestamp()
      };
    
      // Solo actualizar autoAddedToShopping si cambia de status
      if (newStatus === 'low' && product.status !== 'low') {
        updates.autoAddedToShopping = false; // Permitir que se agregue a lista
      }
    
      await updateDoc(productRef, updates);
    
      // ✅ SINCROIZACIÓN CRÍTICA: Si el producto pasó de "bajo stock" a "agotado"
      if (product.status === 'low' && newStatus === 'out') {
        console.log('🔄 PRODUCTO PASÓ DE BAJO STOCK A AGOTADO - Actualizando lista de compras');

        try {
          // Buscar el item en lista de compras
          const shoppingQuery = query(
            collection(db, 'shoppingList'),
            where('householdId', '==', product.householdId),
            where('productId', '==', productId),
            where('checked', '==', false)
          );

          const shoppingSnapshot = await getDocs(shoppingQuery);

          if (!shoppingSnapshot.empty) {
            const itemDoc = shoppingSnapshot.docs[0];
            console.log(`📝 Actualizando item en lista: ${itemDoc.id} de "bajo stock" → "agotado"`);

            await updateDoc(itemDoc.ref, {
              reason: 'out',
              originalStatus: 'out',
              isOutOfStock: true,
              priority: 'high',
              updatedAt: serverTimestamp(),
              notes: 'Actualizado automáticamente: Bajo stock → Agotado'
            });

            console.log('✅ Item de lista actualizado a "agotado"');
          }
        } catch (syncError) {
          console.warn('⚠️ Error sincronizando con lista de compras:', syncError);
        }
      }
    
      // Registrar consumo
      try {
        const { consumptionService } = await import('./consumption.service.js');
        await consumptionService.logConsumption(
          productId,
          product.householdId,
          product.name,
          consumptionAmount,
          'consume'
        );
      } catch (logError) {
        console.warn('⚠️ No se pudo registrar log de consumo:', logError);
      }
    
      // Agregar a lista de compras SI:
      // 1. Se AGOTÓ (out) → Agregar inmediatamente
      // 2. Está en BAJO STOCK (low) → Solo si no fue agregado antes
      if (newStatus === 'out') {
        console.log('🛒 AGREGANDO A LISTA DE COMPRAS - Producto AGOTADO');

        try {
          const { shoppingService } = await import('./shopping.service.js');
          const addResult = await shoppingService.addFromProductDepletion({
            id: productId,
            ...product,
            status: newStatus
          }, 'out');
        
          if (addResult.success && !addResult.alreadyExists) {
            console.log('✅ Agotado → Agregado a lista de compras');
          }
        } catch (shoppingError) {
          console.warn('⚠️ Error agregando producto agotado:', shoppingError);
        }
      } 
      else if (newStatus === 'low' && product.status !== 'low') {
        console.log('🛒 AGREGANDO A LISTA DE COMPRAS - Producto BAJO STOCK');

        try {
          const { shoppingService } = await import('./shopping.service.js');
          const addResult = await shoppingService.addFromProductDepletion({
            id: productId,
            ...product,
            status: newStatus,
            quantityCurrent: newQuantity
          }, 'low');
        
          if (addResult.success && !addResult.alreadyExists) {
            // Marcar como agregado automáticamente
            await updateDoc(productRef, {
              autoAddedToShopping: true,
              updatedAt: serverTimestamp()
            });
            console.log('✅ Bajo stock → Agregado a lista de compras');
          } else if (addResult.alreadyExists) {
            // Si ya estaba, marcar igualmente
            await updateDoc(productRef, {
              autoAddedToShopping: true,
              updatedAt: serverTimestamp()
            });
            console.log('ℹ️ Bajo stock → Ya estaba en lista');
          }
        } catch (shoppingError) {
          console.warn('⚠️ Error agregando producto bajo stock:', shoppingError);
        }
      }
    
      return { 
        success: true, 
        newQuantity,
        newStatus,
        productId,
        statusChanged: product.status !== newStatus
      };
    } catch (error) {
      console.error('❌ Error consumiendo producto:', error);
      return { success: false, error: error.message };
    }
  },

  // Función para sincronizar manualmente productos con lista de compras
  async syncProductWithShoppingList(productId) {
    try {
      console.log('🔄 Sincronizando producto con lista de compras:', productId);

      const productRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        return { success: false, error: 'Producto no encontrado' };
      }

      const product = productSnap.data();
      const currentStatus = product.status;

      console.log(`📊 Estado actual del producto "${product.name}":`, currentStatus);

      // Buscar items no comprados de este producto
      const shoppingQuery = query(
        collection(db, 'shoppingList'),
        where('productId', '==', productId),
        where('checked', '==', false)
      );

      const shoppingSnapshot = await getDocs(shoppingQuery);

      if (shoppingSnapshot.empty) {
        console.log('ℹ️ Producto no está en lista de compras');
        return { success: true, message: 'Producto no está en lista' };
      }

      let updatedCount = 0;

      for (const docSnap of shoppingSnapshot.docs) {
        const item = docSnap.data();
        const itemId = docSnap.id;

        console.log(`📝 Analizando item: ${itemId}`, {
          estadoActualItem: item.originalStatus,
          estadoActualProducto: currentStatus,
          razon: item.reason,
          esAgotado: item.isOutOfStock
        });

        // Verificar si necesita actualización
        const needsUpdate = (
          item.originalStatus !== currentStatus || 
          (currentStatus === 'out' && !item.isOutOfStock) ||
          (currentStatus === 'low' && item.isOutOfStock)
        );

        if (needsUpdate) {
          console.log(`🔄 Actualizando item ${itemId}: ${item.originalStatus} → ${currentStatus}`);

          const updateData = {
            originalStatus: currentStatus,
            isOutOfStock: currentStatus === 'out',
            reason: currentStatus === 'out' ? 'out' : 'low',
            priority: currentStatus === 'out' ? 'high' : 'medium',
            updatedAt: serverTimestamp()
          };

          if (currentStatus === 'out' && item.originalStatus === 'low') {
            updateData.notes = 'Actualizado automáticamente: Bajo stock → Agotado';
          } else if (currentStatus === 'low' && item.originalStatus === 'out') {
            updateData.notes = 'Actualizado automáticamente: Agotado → Bajo stock';
          }

          await updateDoc(docSnap.ref, updateData);
          updatedCount++;

          console.log(`✅ Item actualizado:`, updateData);
        }
      }

      console.log(`🎯 ${updatedCount} items actualizados de ${shoppingSnapshot.size}`);
      return { 
        success: true, 
        updated: updatedCount,
        total: shoppingSnapshot.size 
      };

    } catch (error) {
      console.error('❌ Error sincronizando producto:', error);
      return { success: false, error: error.message };
    }
  },

  // Función para sincronizar TODOS los productos del hogar
  async syncAllProductsWithShoppingList(householdId) {
    try {
      console.log('🔄 Sincronizando TODOS los productos del hogar:', householdId);
      
      const result = await this.getProductsByHousehold(householdId);
      if (!result.success) {
        return result;
      }
      
      const products = result.products;
      let totalUpdated = 0;
      let processed = 0;
      
      for (const product of products) {
        console.log(`🔍 Procesando: ${product.name} (${product.status})`);
        
        const syncResult = await this.syncProductWithShoppingList(product.id);
        if (syncResult.success && syncResult.updated > 0) {
          totalUpdated += syncResult.updated;
        }
        
        processed++;
      }
      
      console.log(`✅ Sincronización completa: ${processed} productos procesados, ${totalUpdated} items actualizados`);
      return { 
        success: true, 
        productsProcessed: processed,
        itemsUpdated: totalUpdated
      };
      
    } catch (error) {
      console.error('❌ Error sincronizando todos los productos:', error);
      return { success: false, error: error.message };
    }
  },

  
  // REEMPLAZAR la función checkLowStockProducts con esta versión simplificada:
  async checkLowStockProducts(householdId) {
    try {
      console.log('🔍 VERIFICANDO PRODUCTOS EN BAJO STOCK PENDIENTES...');
    
      // Solo obtener productos que están en bajo stock y NO han sido agregados
      const q = query(
        collection(db, 'products'),
        where('householdId', '==', householdId),
        where('status', '==', 'low'),
        where('autoAddedToShopping', '==', false)
      );
    
      const querySnapshot = await getDocs(q);
      const lowStockProducts = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        lowStockProducts.push({ 
          id: doc.id, 
          ...data,
          quantityCurrent: Number(data.quantityCurrent) || 0,
          quantityTotal: Number(data.quantityTotal) || 1
        });
      });
    
      console.log(`📊 ${lowStockProducts.length} productos en bajo stock pendientes`);
    
      let addedCount = 0;
      
      for (const product of lowStockProducts) {
        console.log(`🛒 Procesando: ${product.name || 'Producto sin nombre'}`);
        
        try {
          const { shoppingService } = await import('./shopping.service.js');
          const addResult = await shoppingService.addFromProductDepletion(product, 'low');
          
          if (addResult.success) {
            // Actualizar el producto como agregado
            const productRef = doc(db, 'products', product.id);
            await updateDoc(productRef, {
              autoAddedToShopping: true,
              updatedAt: serverTimestamp()
            });
            
            addedCount++;
            console.log(`✅ "${product.name}" agregado a lista de compras`);
          }
        } catch (error) {
          console.error(`❌ Error procesando "${product.name}":`, error);
        }
      }
    
      console.log(`🎯 ${addedCount} productos agregados de ${lowStockProducts.length} pendientes`);
      
      return { 
        success: true, 
        addedCount,
        totalPendientes: lowStockProducts.length
      };
    } catch (error) {
      console.error('❌ Error verificando bajo stock:', error);
      return { success: false, error: error.message };
    }
  },
  
  async migrateExistingProducts(householdId) {
  try {
    console.log('🚀 MIGRANDO PRODUCTOS EXISTENTES...');
    
    const result = await this.getProductsByHousehold(householdId);
    if (!result.success) {
      return result;
    }
    
    const products = result.products;
    let updatedCount = 0;
    
    for (const product of products) {
      const productRef = doc(db, 'products', product.id);
      const productSnap = await getDoc(productRef);
      
      if (productSnap.exists()) {
        const data = productSnap.data();
        
        // Si no tiene autoAddedToShopping, agregarlo
        if (data.autoAddedToShopping === undefined) {
          await updateDoc(productRef, {
            autoAddedToShopping: false,
            updatedAt: serverTimestamp()
          });
          
          updatedCount++;
          console.log(`✅ ${product.name} actualizado con autoAddedToShopping: false`);
        }
      }
    }
    
    console.log(`✅ ${updatedCount} productos migrados`);
    return { success: true, updatedCount };
  } catch (error) {
    console.error('❌ Error migrando productos:', error);
    return { success: false, error: error.message };
  }
},
  // Marcar producto como abierto
  async openProduct(productId) {
    try {
      console.log('📦 ABIENDO PRODUCTO:', productId);
      
      const productRef = doc(db, 'products', productId);
      await updateDoc(productRef, {
        lastOpenedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Producto abierto');
      return { success: true };
    } catch (error) {
      console.error('❌ Error abriendo producto:', error);
      return { success: false, error: error.message };
    }
  },

  // Función para forzar recálculo de todos los status
  async recalculateAllStatuses(householdId) {
    try {
      console.log('🔄 RECALCULANDO TODOS LOS STATUS...');
      
      const result = await this.getProductsByHousehold(householdId);
      if (!result.success) {
        return result;
      }
      
      const products = result.products;
      let updated = 0;
      
      for (const product of products) {
        const productRef = doc(db, 'products', product.id);
        
        // Recalcular con umbral mínimo 20%
        let lowStockThreshold = Math.max(0.2, Number(product.lowStockThreshold) || 0.2);
        const calculatedStatus = calculateProductStatus(
          product.quantityCurrent,
          product.quantityTotal,
          lowStockThreshold
        );
        
        // Si el status calculado es diferente al almacenado, actualizar
        const storedStatus = product.status;
        if (storedStatus !== calculatedStatus || lowStockThreshold !== Number(product.lowStockThreshold)) {
          await updateDoc(productRef, {
            status: calculatedStatus,
            lowStockThreshold: lowStockThreshold,
            updatedAt: serverTimestamp()
          });
          
          updated++;
          console.log(`📝 Actualizado: ${product.name}`, {
            statusViejo: storedStatus,
            statusNuevo: calculatedStatus,
            umbralViejo: product.lowStockThreshold,
            umbralNuevo: lowStockThreshold
          });
        }
      }
      
      console.log(`✅ ${updated} productos actualizados`);
      return { success: true, updated };
    } catch (error) {
      console.error('❌ Error recalculando status:', error);
      return { success: false, error: error.message };
    }
  },

  async restoreProduct(productId) {
    try {
      console.log('🔄 RESTAURANDO PRODUCTO (como recién comprado):', productId);

      const productRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        return { success: false, error: 'Producto no encontrado' };
      }

      const product = productSnap.data();
      const quantityTotal = Number(product.quantityTotal) || 1;
      const lowStockThreshold = Math.max(0.2, Number(product.lowStockThreshold) || 0.2);
      const status = 'available'; // Siempre disponible al restaurar

      // Calcular nueva fecha de vencimiento (30 días por defecto)
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30); // 30 días por defecto

      // Actualizar el producto como recién comprado
      await updateDoc(productRef, {
        quantityCurrent: quantityTotal,
        status: status,
        lastOpenedAt: null, // Resetear - no abierto
        purchasedAt: serverTimestamp(), // Nueva fecha de "compra"
        expirationDate: expirationDate, // Nueva fecha de vencimiento
        updatedAt: serverTimestamp(),
        autoAddedToShopping: false // Resetear flag
      });

      console.log('✅ Producto restaurado como recién comprado:', {
        id: productId,
        name: product.name,
        newQuantity: quantityTotal,
        newExpiration: expirationDate.toISOString().split('T')[0]
      });

      // Registrar en logs de consumo (acción: restore/purchase)
      try {
        const { consumptionService } = await import('./consumption.service.js');
        await consumptionService.logConsumption(
          productId,
          product.householdId,
          product.name,
          quantityTotal,
          'purchase' // Cambiado de 'restore' a 'purchase'
        );
      } catch (logError) {
        console.warn('⚠️ No se pudo registrar log de compra:', logError);
      }

      return { 
        success: true, 
        newQuantity: quantityTotal, 
        newStatus: status,
        newExpirationDate: expirationDate
      };
    } catch (error) {
      console.error('❌ Error restaurando producto:', error);
      return { success: false, error: error.message };
    }
  },

  async restoreProductWithExpiration(productId, newExpirationDate = null) {
    try {
      console.log('🔄 RESTAURANDO PRODUCTO CON FECHA:', {
        productId,
        newExpirationDate
      });

      const productRef = doc(db, 'products', productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        return { success: false, error: 'Producto no encontrado' };
      }

      const product = productSnap.data();
      const quantityTotal = Number(product.quantityTotal) || 1;
      const lowStockThreshold = Math.max(0.2, Number(product.lowStockThreshold) || 0.2);
      const status = 'available';

      // Preparar fecha de vencimiento
      let expirationDateToSet = newExpirationDate;

      // Si no se proporciona fecha pero el producto tenía fecha original,
      // usar 30 días por defecto
      if (!expirationDateToSet && product.expirationDate) {
        expirationDateToSet = new Date();
        expirationDateToSet.setDate(expirationDateToSet.getDate() + 30);
      }

      // Actualizar producto
      const updateData = {
        quantityCurrent: quantityTotal,
        status: status,
        lastOpenedAt: null,
        purchasedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        autoAddedToShopping: false
      };

      // Solo agregar expirationDate si existe
      if (expirationDateToSet) {
        updateData.expirationDate = expirationDateToSet;
      } else {
        // Si no hay fecha, mantener null
        updateData.expirationDate = null;
      }

      await updateDoc(productRef, updateData);

      console.log('✅ Producto restaurado:', {
        id: productId,
        name: product.name,
        newQuantity: quantityTotal,
        newExpiration: expirationDateToSet ? expirationDateToSet.toISOString().split('T')[0] : 'Ninguna'
      });

      // Registrar log
      try {
        const { consumptionService } = await import('./consumption.service.js');
        await consumptionService.logConsumption(
          productId,
          product.householdId,
          product.name,
          quantityTotal,
          'purchase'
        );
      } catch (logError) {
        console.warn('⚠️ No se pudo registrar log de compra:', logError);
      }

      return { 
        success: true, 
        newQuantity: quantityTotal, 
        newStatus: status,
        newExpirationDate: expirationDateToSet
      };
    } catch (error) {
      console.error('❌ Error restaurando producto con fecha:', error);
      return { success: false, error: error.message };
    }
  },
};
