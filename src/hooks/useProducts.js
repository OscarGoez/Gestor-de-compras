// hooks/useProducts.js - VERSIÓN COMPLETA CORREGIDA
import { useState, useEffect, useCallback } from 'react';
import { productsService } from '../api/products.service';
import { useHousehold } from '../context/HouseholdContext';
import { shoppingService } from '../api/shopping.service';

export const useProducts = () => {
  const { householdId, householdData } = useHousehold();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const loadProducts = useCallback(async () => {
    if (!householdId) {
      console.log('⚠️ No hay householdId disponible');
      setProducts([]);
      setLoading(false);
      return;
    }

    console.log('🔄 Cargando productos para householdId:', householdId);
    setLoading(true);
    setError(null);

    try {
      const result = await productsService.getProductsByHousehold(householdId);
      console.log('📦 Resultado de productos:', result);
      
      if (result.success) {
        console.log(`✅ ${result.products?.length || 0} productos cargados`);
        
        // DEPURACIÓN: Mostrar productos en bajo stock
        const lowStockProducts = result.products.filter(p => p.status === 'low');
        console.log('📊 Productos en bajo stock encontrados:', lowStockProducts.length);
        lowStockProducts.forEach(p => {
          console.log(`   • ${p.name}: ${p.quantityCurrent}/${p.quantityTotal} ${p.unit}`);
        });
        
        setProducts(result.products || []);
        setRetryCount(0);
      } else {
        console.error('❌ Error cargando productos:', result.error);
        
        if (result.error.includes('índice') || result.error.includes('index')) {
          setError({
            type: 'index_error',
            message: result.error,
            showDemo: retryCount < 2
          });
        } else {
          setError({ type: 'general', message: result.error });
        }
        
        setProducts(retryCount === 0 ? getDemoProducts() : []);
        setRetryCount(prev => prev + 1);
      }
    } catch (err) {
      console.error('❌ Error inesperado cargando productos:', err);
      setError({ type: 'general', message: err.message });
      setProducts(retryCount === 0 ? getDemoProducts() : []);
      setRetryCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  }, [householdId, retryCount]);

  const createProduct = async (productData) => {
    if (!householdId) {
      return { success: false, error: 'No hay hogar seleccionado' };
    }

    console.log('➕ Creando producto:', productData);
    const result = await productsService.createProduct(productData, householdId);
    
    if (result.success && result.product) {
      console.log('✅ Producto creado, actualizando lista...');
      setProducts(prev => [result.product, ...prev]);
    } else {
      console.error('❌ Error creando producto:', result.error);
    }
    
    return result;
  };

  // ALIAS PARA addProduct (usa createProduct internamente)
  const addProduct = async (productData) => {
    console.log('📝 addProduct llamado con:', productData);
    return await createProduct(productData);
  };

  const updateProduct = async (productId, updates) => {
    console.log('✏️ Actualizando producto:', productId, updates);
    const result = await productsService.updateProduct(productId, updates);
    
    if (result.success) {
      console.log('✅ Producto actualizado, actualizando localmente...');
      setProducts(prev => prev.map(p => 
        p.id === productId 
          ? { ...p, ...updates, status: result.newStatus }
          : p
      ));
    }
    
    return result;
  };

  const deleteProduct = async (productId) => {
    console.log('🗑️ Eliminando producto:', productId);
    const result = await productsService.deleteProduct(productId);
    
    if (result.success) {
      setProducts(prev => prev.filter(p => p.id !== productId));
    }
    
    return result;
  };

  const consumeProduct = async (productId, amount = 1) => {
    console.log('🍽️ Consumiendo producto:', productId, amount);
    const result = await productsService.consumeProduct(productId, amount);
    
    if (result.success) {
      console.log('✅ Producto consumido, actualizando localmente...');
      
      // Actualizar el producto localmente
      setProducts(prev => prev.map(p => {
        if (p.id === productId) {
          const updatedProduct = {
            ...p,
            quantityCurrent: result.newQuantity,
            status: result.newStatus,
            updatedAt: new Date()
          };
          
          // Si se agotó, agregar a lista de compras
          if (result.newQuantity === 0 && p.quantityCurrent > 0) {
            console.log('📋 Producto agotado, intentando agregar a lista...');
            shoppingService.addFromProductDepletion(updatedProduct, 'out');
          }
          
          return updatedProduct;
        }
        return p;
      }));
    }
    
    return result;
  };

  const openProduct = async (productId) => {
    console.log('📦 Abriendo producto:', productId);
    const result = await productsService.openProduct(productId);
    
    if (result.success) {
      console.log('✅ Producto abierto, actualizando localmente...');
      setProducts(prev => prev.map(p => 
        p.id === productId 
          ? { ...p, lastOpenedAt: new Date(), updatedAt: new Date() }
          : p
      ));
    }
    
    return result;
  };

  // Función para forzar recálculo de status
  const forceRecalculate = async () => {
    console.log('🔄 Forzando recálculo de status...');
    const updatedProducts = [...products];
    
    // Recalcular status para cada producto
    updatedProducts.forEach(product => {
      const threshold = product.quantityTotal * (product.lowStockThreshold || 0.2);
      let newStatus = 'available';
      
      if (product.quantityCurrent <= 0) {
        newStatus = 'out';
      } else if (product.quantityCurrent <= threshold) {
        newStatus = 'low';
      }
      
      if (product.status !== newStatus) {
        console.log(`📝 Cambiando ${product.name}: ${product.status} → ${newStatus}`);
        product.status = newStatus;
      }
    });
    
    setProducts(updatedProducts);
    
    // Contar
    const lowCount = updatedProducts.filter(p => p.status === 'low').length;
    const outCount = updatedProducts.filter(p => p.status === 'out').length;
    
    console.log('📊 Resultado recálculo:', { lowCount, outCount });
    return { success: true, lowCount, outCount };
  };

  const restoreProduct = async (productId) => {
    console.log('🔄 Restaurando producto:', productId);
    const result = await productsService.restoreProduct(productId);
    
    if (result.success) {
      console.log('✅ Producto restaurado, actualizando localmente...');
      setProducts(prev => prev.map(p => 
        p.id === productId 
          ? { ...p, quantityCurrent: result.newQuantity, status: result.newStatus }
          : p
      ));
    }

    return result;
  };

  const checkLowStockProducts = useCallback(async () => {
    if (!householdId) {
      console.log('⚠️ No hay householdId para verificar bajo stock');
      return { success: false, error: 'No hay householdId' };
    }

    console.log('🔍 Verificando productos en bajo stock...');
    const result = await productsService.checkLowStockProducts(householdId);

    if (result.success) {
      console.log(`✅ ${result.addedCount} productos agregados a lista`);
      // Recargar productos para actualizar flags
      await loadProducts();
    }

    return result;
  }, [householdId, loadProducts]);

  const migrateProducts = useCallback(async () => {
  if (!householdId) {
    console.log('⚠️ No hay householdId para migrar productos');
    return { success: false, error: 'No hay householdId' };
  }

  console.log('🚀 Migrando productos existentes...');
  const result = await productsService.migrateExistingProducts(householdId);
  
  if (result.success) {
    console.log(`✅ ${result.updatedCount} productos migrados`);
    await loadProducts();
  }
  
  return result;
}, [householdId, loadProducts]);


  // Datos de demostración con productos en bajo stock
  const getDemoProducts = () => {
    console.log('🎭 Cargando productos de demostración');
    return [
      {
        id: 'demo-1',
        householdId: householdId || 'demo-household',
        name: 'Arroz',
        categoryId: 'alimentos',
        unit: 'kg',
        quantityTotal: 5,
        quantityCurrent: 0.8, // 16% - DEBE estar en bajo stock (umbral 20% = 1kg)
        lowStockThreshold: 0.2,
        status: 'low',
        expirationDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        lastOpenedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'demo-2',
        householdId: householdId || 'demo-household',
        name: 'Leche',
        categoryId: 'bebidas',
        unit: 'l',
        quantityTotal: 2,
        quantityCurrent: 0,
        lowStockThreshold: 0.2,
        status: 'out',
        expirationDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        lastOpenedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'demo-3',
        householdId: householdId || 'demo-household',
        name: 'Detergente',
        categoryId: 'limpieza',
        unit: 'ml',
        quantityTotal: 1000,
        quantityCurrent: 800, // 80% - NO debe estar en bajo stock
        lowStockThreshold: 0.2,
        status: 'available',
        expirationDate: null,
        createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        lastOpenedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        id: 'demo-4',
        householdId: householdId || 'demo-household',
        name: 'Jabón de manos',
        categoryId: 'aseo',
        unit: 'units',
        quantityTotal: 10,
        quantityCurrent: 1, // 10% - DEBE estar en bajo stock (umbral 20% = 2 unidades)
        lowStockThreshold: 0.2,
        status: 'low',
        expirationDate: null,
        createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        lastOpenedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      }
    ];
  };

  // Cargar productos cuando cambie el householdId
  useEffect(() => {
    if (householdId) {
      console.log('🏠 householdId disponible, cargando productos...');
      loadProducts();
    } else {
      console.log('⏳ Esperando householdId...');
      setProducts([]);
      setLoading(false);
    }
  }, [householdId, loadProducts]);

  return {
    products,
    loading,
    error,
    loadProducts,
    checkLowStockProducts,
    migrateProducts,
    createProduct,
    addProduct, 
    updateProduct,
    deleteProduct,
    consumeProduct,
    openProduct,
    restoreProduct,
    forceRecalculate,
    retryCount
  };
};