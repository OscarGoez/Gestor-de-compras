// src/api/recipes-ai.service.js - VERSIÓN COMPLETA Y CORREGIDA
import aiService from './ai.service';
import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, orderBy, limit, deleteDoc, doc, updateDoc } from 'firebase/firestore';

class RecipesAIService {
  
  /**
   * REPARADOR DE JSON - VERSIÓN DEFINITIVA
   */
  repairJSON(jsonString) {
    if (!jsonString) return null;
    
    try {
      // Intentar parsear directamente
      return JSON.parse(jsonString);
    } catch (e) {
      console.log('🔧 Usando reparador simple...');
      
      try {
        // PASO 1: Eliminar todo lo que no sea el JSON puro
        // Buscar el primer { y la última }
        const firstBrace = jsonString.indexOf('{');
        const lastBrace = jsonString.lastIndexOf('}');
        
        if (firstBrace === -1 || lastBrace === -1) {
          throw new Error('No se encontraron llaves');
        }
        
        let cleanJson = jsonString.substring(firstBrace, lastBrace + 1);
        
        // PASO 2: Eliminar saltos de línea y espacios extras
        cleanJson = cleanJson.replace(/\n/g, ' ');
        cleanJson = cleanJson.replace(/\r/g, ' ');
        cleanJson = cleanJson.replace(/\t/g, ' ');
        cleanJson = cleanJson.replace(/\s+/g, ' ');
        
        // PASO 3: Corregir problema de "id": "receta_1", (todo bien)
        // PASO 4: Asegurar que las comillas estén bien
        cleanJson = cleanJson.replace(/'/g, '"');
        
        // PASO 5: Eliminar comas antes de ] y }
        cleanJson = cleanJson.replace(/,(\s*[}\]])/g, '$1');
        
        // PASO 6: Intentar parsear
        try {
          const parsed = JSON.parse(cleanJson);
          console.log('✅ JSON reparado con método simple');
          return parsed;
        } catch (parseError) {
          console.log('⚠️ Método simple falló, extrayendo recetas una por una...');
          
          // PASO 7: Extraer recetas individualmente con regex más permisivo
          const recipeRegex = /\{\s*"id"\s*:\s*"[^"]*"\s*,\s*"name"\s*:\s*"[^"]*"[^{]*?\}/g;
          const matches = cleanJson.match(recipeRegex);
          
          if (matches && matches.length > 0) {
            console.log(`📦 Encontradas ${matches.length} recetas`);
            
            const recipes = [];
            for (const match of matches) {
              try {
                // Limpiar cada receta individual
                let recipeStr = match
                  .replace(/\s+/g, ' ')
                  .replace(/'/g, '"')
                  .replace(/,(\s*[}\]])/g, '$1');
                
                const recipe = JSON.parse(recipeStr);
                recipes.push(recipe);
              } catch (recipeError) {
                console.log('⚠️ Una receta no se pudo parsear');
              }
            }
            
            if (recipes.length > 0) {
              console.log(`✅ ${recipes.length} recetas extraídas`);
              return { recipes };
            }
          }
          
          throw new Error('No se pudo reparar');
        }
      } catch (repairError) {
        console.error('❌ Reparación falló');
        console.log('Primeros 300 chars:', jsonString.substring(0, 300));
        return null;
      }
    }
  }

  /**
   * Generar recetas basadas en productos disponibles del usuario
   */
  async generateRecipes(userId, availableProducts, expiringProducts = [], options = {}) {
    const {
      cuisine = 'cualquier',
      maxTime = 60,
      difficulty = 'cualquier',
      count = 6
    } = options;

    if (!userId) {
      console.warn('⚠️ No hay userId, usando modo anónimo');
    }

    if (!availableProducts || availableProducts.length === 0) {
      return this.getMockRecipes([], []);
    }

    // Verificar si estamos en modo mock por rate limiting
    if (aiService.useMock) {
      console.log('🎭 Usando modo mock para recetas (rate limiting)');
      return this.getMockRecipes(availableProducts, expiringProducts);
    }

    // Preparar lista de ingredientes
    const ingredients = availableProducts
      .slice(0, 15)
      .map(p => `${p.name} (${p.quantityCurrent || 1} ${p.unit || 'unidad'})`)
      .join(', ');

    const expiringList = expiringProducts
      .slice(0, 5)
      .map(p => p.name)
      .join(', ');

    const prompt = `Eres un chef experto en cocina hogareña. Genera recetas creativas usando estos ingredientes disponibles:

INGREDIENTES DISPONIBLES:
${ingredients}

${expiringList ? `PRODUCTOS QUE VENCEN PRONTO (prioriza estos): ${expiringList}` : ''}

PREFERENCIAS GENERALES:
- Tipo de cocina: ${cuisine}
- Tiempo máximo: ${maxTime} minutos
- Dificultad: ${difficulty}
- Cantidad de recetas: ${Math.min(count, 4)} (máximo 4)

REGLAS IMPORTANTES:
1. Prioriza productos que vencen pronto
2. Máximo 2 ingredientes externos por receta
3. Instrucciones claras y concisas (máximo 4 pasos)
4. Tiempo realista de preparación

RESPONDE EXACTAMENTE CON ESTE FORMATO JSON, SIN TEXTO ADICIONAL:
{
  "recipes": [
    {
      "id": "receta_1",
      "name": "Nombre de la receta",
      "description": "Breve descripción",
      "ingredients": [
        {"name": "ingrediente", "quantity": "cantidad", "available": true}
      ],
      "steps": ["paso 1", "paso 2", "paso 3"],
      "time": 30,
      "difficulty": "fácil",
      "usesExpiring": false,
      "missingIngredients": [],
      "tips": "Consejo adicional"
    }
  ]
}`;

    try {
      const response = await aiService.generateContent(prompt, {
        model: 'llama-3.1-8b-instant',
        temperature: 0.7,
        maxTokens: 1000
      });

      if (!response) {
        console.log('⚠️ No hubo respuesta de IA, usando mock');
        return this.getMockRecipes(availableProducts, expiringProducts);
      }

      // Intentar extraer JSON - BÚSQUEDA MEJORADA
      console.log('🔍 Buscando JSON en la respuesta...');
      
      // Buscar el primer { y la última }
      const firstBrace = response.indexOf('{');
      const lastBrace = response.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const possibleJson = response.substring(firstBrace, lastBrace + 1);
        console.log('📦 JSON extraído, longitud:', possibleJson.length);
        
        const parsed = this.repairJSON(possibleJson);
        
        if (parsed && parsed.recipes && parsed.recipes.length > 0) {
          console.log('✅ Recetas generadas:', parsed.recipes.length);
          return {
            ...parsed,
            timestamp: new Date().toISOString(),
            isMock: false
          };
        }
      }

      console.warn('⚠️ Usando recetas mock por error de JSON');
      return this.getMockRecipes(availableProducts, expiringProducts);

    } catch (error) {
      console.error('Error generando recetas:', error);
      return this.getMockRecipes(availableProducts, expiringProducts);
    }
  }

  /**
   * Guardar receta como favorita del usuario
   */
  async saveFavoriteRecipe(userId, recipe) {
    if (!userId || !recipe) {
      return { success: false, error: 'Faltan datos' };
    }

    try {
      const favoriteData = {
        userId,
        recipeId: recipe.id,
        recipeName: recipe.name,
        recipeData: recipe,
        savedAt: new Date().toISOString(),
        category: recipe.category || 'general'
      };
      
      const docRef = await addDoc(collection(db, 'userFavorites'), favoriteData);
      console.log('✅ Receta guardada para usuario:', userId, 'ID:', docRef.id);
      
      return { success: true, id: docRef.id, data: favoriteData };
    } catch (error) {
      console.error('Error guardando favorita:', error);
      return { success: false, error: error.message };
    }
  }

  async saveGeneratedRecipes(userId, recipes, searchCriteria) {
    if (!userId || !recipes) return;
    
    try {
      const batch = [];
      const now = new Date().toISOString();

      for (const recipe of recipes) {
        const recipeData = {
          userId,
          recipeId: recipe.id,
          recipeName: recipe.name,
          recipeData: recipe,
          searchCriteria, // { cuisine, maxTime, difficulty }
          generatedAt: now,
          usedCount: 0,
          lastUsed: null
        };

        batch.push(addDoc(collection(db, 'generatedRecipes'), recipeData));
      }

      await Promise.all(batch);
      console.log(`✅ ${recipes.length} recetas guardadas en historial`);
    } catch (error) {
      console.error('Error guardando recetas:', error);
    }
  }

  async saveRecipe(userId, recipe) {
    if (!userId || !recipe) return { success: false };

    try {
      const recipeData = {
        userId,
        recipeId: recipe.id,
        recipeName: recipe.name,
        recipeData: recipe, // Guardamos la receta COMPLETA
        savedAt: new Date().toISOString(),
        notes: "", // Para que el usuario agregue notas
        cookedCount: 0,
        lastCooked: null,
        tags: [] // Para categorizar: "favorita", "rápida", "económica"
      };

      // Evitar duplicados (si ya existe, actualizar)
      const q = query(
        collection(db, 'savedRecipes'),
        where('userId', '==', userId),
        where('recipeId', '==', recipe.id)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        await addDoc(collection(db, 'savedRecipes'), recipeData);
        console.log('✅ Receta guardada:', recipe.name);
      } else {
        // Ya existe, actualizar fecha
        await updateDoc(snapshot.docs[0].ref, {
          savedAt: new Date().toISOString()
        });
        console.log('✅ Receta actualizada:', recipe.name);
      }

      return { success: true };
    } catch (error) {
      console.error('Error guardando receta:', error);
      return { success: false };
    }
  }

  async logRecipeInteraction(userId, recipeId, action) {
    // action: 'view', 'cook', 'share', 'save_ingredients'
    
    try {
      await addDoc(collection(db, 'recipeInteractions'), {
        userId,
        recipeId,
        action,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error registrando interacción:', error);
    }
  }

  /**
   * Eliminar receta de favoritos
   */
  async removeFavoriteRecipe(userId, recipeId) {
    if (!userId || !recipeId) {
      return { success: false };
    }

    try {
      const q = query(
        collection(db, 'userFavorites'), 
        where('userId', '==', userId),
        where('recipeId', '==', recipeId)
      );
      
      const snapshot = await getDocs(q);
      
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      console.log('✅ Receta eliminada de favoritos:', recipeId);
      return { success: true };
    } catch (error) {
      console.error('Error eliminando favorita:', error);
      return { success: false };
    }
  }

  /**
   * Obtener recetas favoritas del usuario
   */
  async getUserFavorites(userId) {
    if (!userId) return [];

    try {
      const q = query(
        collection(db, 'userFavorites'), 
        where('userId', '==', userId),
        orderBy('savedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      
      const favorites = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log(`✅ ${favorites.length} favoritos cargados para usuario:`, userId);
      return favorites;
      
    } catch (error) {
      console.error('Error obteniendo favoritas:', error);
      
      if (error.code === 'failed-precondition') {
        console.log('📝 Necesitas crear un índice compuesto en Firestore');
      }
      
      return [];
    }
  }

  /**
   * Registrar que el usuario cocinó una receta
   */
  async logCookedRecipe(userId, recipe, rating = null, notes = '') {
    if (!userId || !recipe) return;

    try {
      const cookData = {
        userId,
        recipeId: recipe.id,
        recipeName: recipe.name,
        recipeData: recipe, // Guardamos copia por si la receta cambia
        cookedAt: new Date().toISOString(),
        rating, // 1-5 estrellas
        notes, // "quedó rico", "le faltó sal", etc.
        withIngredients: recipe.ingredients.map(i => i.name) // Qué usaste
      };

      await addDoc(collection(db, 'cookedRecipes'), cookData);

      // Actualizar contador en savedRecipes si existe
      const q = query(
        collection(db, 'savedRecipes'),
        where('userId', '==', userId),
        where('recipeId', '==', recipe.id)
      );

      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const docRef = snapshot.docs[0].ref;
        const currentData = snapshot.docs[0].data();
        await updateDoc(docRef, {
          cookedCount: (currentData.cookedCount || 0) + 1,
          lastCooked: new Date().toISOString()
        });
      }

      console.log('✅ Receta marcada como cocinada:', recipe.name);
    } catch (error) {
      console.error('Error registrando cocina:', error);
    }
  }



  /**
   * Obtener historial de recetas cocinadas por el usuario
   */
  async getCookingHistory(userId, limitCount = 10) {
    if (!userId) return [];

    try {
      const q = query(
        collection(db, 'cookingHistory'), 
        where('userId', '==', userId),
        orderBy('cookedAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
    } catch (error) {
      console.error('Error obteniendo historial:', error);
      return [];
    }
  }

  /**
   * Guardar preferencias del usuario
   */
  async saveUserPreferences(userId, preferences) {
    if (!userId) return { success: false };

    try {
      const prefData = {
        userId,
        ...preferences,
        updatedAt: new Date().toISOString()
      };
      
      const q = query(collection(db, 'userPreferences'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        await addDoc(collection(db, 'userPreferences'), prefData);
      } else {
        await updateDoc(snapshot.docs[0].ref, prefData);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Error guardando preferencias:', error);
      return { success: false };
    }
  }

    /**
   * Guardar receta en la colección del usuario
   */
  async saveUserRecipe(userId, recipe) {
    if (!userId || !recipe) return { success: false };

    try {
      const recipeData = {
        userId,
        recipeId: recipe.id,
        recipeName: recipe.name,
        recipeData: recipe,
        savedAt: new Date().toISOString(),
        cookedCount: 0,
        lastCooked: null,
        rating: null
      };

      // Evitar duplicados
      const q = query(
        collection(db, 'userRecipes'),
        where('userId', '==', userId),
        where('recipeId', '==', recipe.id)
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        await addDoc(collection(db, 'userRecipes'), recipeData);
      } else {
        await updateDoc(snapshot.docs[0].ref, {
          savedAt: new Date().toISOString()
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error guardando receta:', error);
      return { success: false };
    }
  }

  /**
   * Obtener preferencias del usuario
   */
  async getUserPreferences(userId) {
    if (!userId) return null;

    try {
      const q = query(collection(db, 'userPreferences'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        return snapshot.docs[0].data();
      }
      
      return null;
    } catch (error) {
      console.error('Error obteniendo preferencias:', error);
      return null;
    }
  }

  /**
   * Registrar generación de recetas para analytics
   */
  async logGeneration(userId, count) {
    if (!userId) return;

    try {
      await addDoc(collection(db, 'recipeGenerations'), {
        userId,
        count,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      // No crítico, solo para analytics
    }
  }

  /**
   * Sugerir receta sorpresa
   */
  async surpriseMe(userId, availableProducts) {
    const randomProducts = availableProducts
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);
    
    const result = await this.generateRecipes(userId, randomProducts, [], { 
      count: 1,
      cuisine: 'cualquier',
      maxTime: 45
    });
    
    return {
      ...result,
      isSurprise: true
    };
  }

  /**
   * Recetas mock para fallback (mejorado con más recetas)
   */
  getMockRecipes(availableProducts = [], expiringProducts = []) {
    const expiringNames = expiringProducts.map(p => p.name?.toLowerCase() || '');
    
    const isAvailable = (productName) => {
      return availableProducts.some(p => 
        p.name?.toLowerCase().includes(productName.toLowerCase())
      );
    };
    
    const baseRecipes = [
      {
        id: `receta_mock_${Date.now()}_1`,
        name: 'Tortilla de patatas',
        description: 'Clásica tortilla española, perfecta para cualquier ocasión',
        ingredients: [
          { name: 'Huevos', quantity: '4 unidades', available: isAvailable('huevo') },
          { name: 'Patatas', quantity: '3 medianas', available: isAvailable('papa') || isAvailable('patata') },
          { name: 'Cebolla', quantity: '1 unidad', available: isAvailable('cebolla') },
          { name: 'Aceite', quantity: 'al gusto', available: isAvailable('aceite') }
        ],
        steps: [
          'Pela y corta las patatas en rodajas finas',
          'FrÍe las patatas en aceite hasta que estén tiernas',
          'Bate los huevos y mezcla con las patatas',
          'Cuaja la tortilla por ambos lados'
        ],
        time: 30,
        difficulty: 'media',
        usesExpiring: expiringNames.some(name => name?.includes('huevo')),
        tips: 'Para una tortilla jugosa, retírala cuando aún esté líquida por dentro'
      },
      {
        id: `receta_mock_${Date.now()}_2`,
        name: 'Ensalada mixta',
        description: 'Fresca y rápida, ideal para el verano',
        ingredients: [
          { name: 'Lechuga', quantity: '1 unidad', available: isAvailable('lechuga') },
          { name: 'Tomates', quantity: '2 unidades', available: isAvailable('tomate') },
          { name: 'Cebolla', quantity: '1/2 unidad', available: isAvailable('cebolla') },
          { name: 'Atún', quantity: '1 lata', available: isAvailable('atún') || isAvailable('atun') }
        ],
        steps: [
          'Lava y corta la lechuga, tomates y cebolla',
          'Mezcla en un bol',
          'Añade el atún escurrido',
          'Aliña con aceite, vinagre y sal'
        ],
        time: 10,
        difficulty: 'fácil',
        usesExpiring: expiringNames.some(name => 
          ['lechuga', 'tomate'].some(v => name?.includes(v))
        ),
        tips: 'Añade aceitunas o maíz si tienes'
      },
      {
        id: `receta_mock_${Date.now()}_3`,
        name: 'Arroz con pollo',
        description: 'Plato completo y reconfortante',
        ingredients: [
          { name: 'Arroz', quantity: '2 tazas', available: isAvailable('arroz') },
          { name: 'Pollo', quantity: '500g', available: isAvailable('pollo') },
          { name: 'Pimiento', quantity: '1 unidad', available: isAvailable('pimiento') },
          { name: 'Cebolla', quantity: '1 unidad', available: isAvailable('cebolla') }
        ],
        steps: [
          'Dora el pollo en una olla',
          'Añade la cebolla y pimiento picados',
          'Agrega el arroz y rehoga un minuto',
          'Vierte agua y cocina 20 minutos'
        ],
        time: 45,
        difficulty: 'media',
        usesExpiring: expiringNames.some(name => name?.includes('pollo')),
        tips: 'Puedes usar caldo de pollo para más sabor'
      }
    ];

    const recipes = baseRecipes.map(recipe => ({
      ...recipe,
      missingIngredients: recipe.ingredients
        .filter(ing => !ing.available)
        .map(ing => ing.name)
    }));

    return {
      recipes,
      timestamp: new Date().toISOString(),
      isMock: true
    };
  }
}

// Exportar una instancia única
const recipesAIService = new RecipesAIService();
export default recipesAIService;