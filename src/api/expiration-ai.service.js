// src/api/expiration-ai.service.js
import aiService from './ai.service';

class ExpirationAIService {
  
  /**
   * Analizar productos próximos a vencer y dar recomendaciones
   */
  async analyzeExpiringProducts(products, consumptionHistory = []) {
    if (!products || products.length === 0) {
      return this.getEmptyResponse();
    }

    // Si no hay API key o estamos en modo mock, usar respuestas básicas
    if (aiService.useMock) {
      return this.getMockAdvice(products);
    }

    // Preparar datos para la IA
    const productsData = products.map(p => ({
      name: p.name,
      daysLeft: p.daysLeft,
      status: p.status,
      category: p.category,
      isOpen: !!p.lastOpenedAt,
      daysSinceOpened: p.lastOpenedAt ? this.getDaysSince(p.lastOpenedAt) : null,
      quantity: p.quantityCurrent
    }));

    const prompt = `Eres un asistente de hogar inteligente especializado en reducir desperdicio de alimentos. Analiza estos productos próximos a vencer:

PRODUCTOS A VENCER:
${JSON.stringify(productsData, null, 2)}

CONTEXTO DE CONSUMO (últimos registros):
${JSON.stringify(consumptionHistory.slice(0, 5), null, 2)}

INSTRUCCIONES:
1. Identifica los productos más críticos (menos de 3 días)
2. Sugiere recetas prácticas y simples que los combinen
3. Detecta patrones de desperdicio (categorías que más se vencen)
4. Da consejos para la próxima compra

REGLAS IMPORTANTES:
- Respuesta en ESPAÑOL
- Sé práctico y directo
- Máximo 3 recomendaciones por categoría
- Enfoque en soluciones realistas

RESPONDE EXACTAMENTE CON ESTE FORMATO JSON:
{
  "critical": [
    {
      "name": "nombre del producto",
      "recommendation": "recomendación específica para este producto"
    }
  ],
  "recipes": [
    "receta 1 que usa productos por vencer",
    "receta 2 que usa productos por vencer"
  ],
  "wastePatterns": [
    "patrón de desperdicio detectado 1",
    "patrón de desperdicio detectado 2"
  ],
  "shoppingAdvice": [
    "consejo para próxima compra 1",
    "consejo para próxima compra 2"
  ],
  "summary": "resumen breve de la situación"
}`;

    try {
      const response = await aiService.generateContent(prompt, {
        model: 'llama-3.1-8b-instant', // Usamos modelo más rápido para esto
        temperature: 0.3,
        maxTokens: 600
      });
      
      if (!response) {
        return this.getMockAdvice(products);
      }

      // Intentar extraer JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          ...parsed,
          isAI: true
        };
      }
      
      return this.getMockAdvice(products);
      
    } catch (error) {
      console.error('Error en análisis de vencimientos:', error);
      return this.getMockAdvice(products);
    }
  }

  /**
   * Analizar un producto específico que vence pronto
   */
  async analyzeSingleProduct(product) {
    if (!product) return null;

    const prompt = `Dame consejos prácticos para este producto que está por vencer:
    
    Producto: ${product.name}
    Días restantes: ${product.daysLeft}
    Cantidad: ${product.quantityCurrent} ${product.unit}
    Categoría: ${product.category}
    
    Responde en JSON con:
    {
      "useBy": "fecha sugerida de uso",
      "storageTip": "consejo de almacenamiento",
      "recipeIdea": "idea de receta simple",
      "canFreeze": boolean
    }`;

    try {
      const response = await aiService.generateContent(prompt);
      const jsonMatch = response?.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : this.getSingleProductMock(product);
    } catch {
      return this.getSingleProductMock(product);
    }
  }

  /**
   * Sugerir recetas con múltiples productos por vencer
   */
  async suggestCombinedRecipes(products) {
    const productNames = products.map(p => p.name).join(', ');
    
    const prompt = `Sugiere 2 recetas que usen estos ingredientes que están por vencer: ${productNames}
    
    Responde en JSON con:
    {
      "recipes": [
        {
          "name": "nombre de la receta",
          "ingredients": ["ingrediente 1", "ingrediente 2"],
          "time": "tiempo estimado",
          "difficulty": "fácil/media"
        }
      ]
    }`;

    try {
      const response = await aiService.generateContent(prompt);
      const jsonMatch = response?.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { recipes: [] };
    } catch {
      return { recipes: [] };
    }
  }

  /**
   * Calcular días desde apertura
   */
  getDaysSince(date) {
    if (!date) return null;
    const diff = new Date() - new Date(date);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Respuesta vacía
   */
  getEmptyResponse() {
    return {
      critical: [],
      recipes: [],
      wastePatterns: [],
      shoppingAdvice: [],
      summary: "No hay productos próximos a vencer.",
      isMock: true
    };
  }

  /**
   * Mock para cuando no hay IA
   */
  getMockAdvice(products) {
    const critical = products.filter(p => p.daysLeft <= 3);
    const week = products.filter(p => p.daysLeft <= 7);
    
    // Generar recetas según categorías
    const categories = [...new Set(products.map(p => p.category))];
    const recipes = [];
    
    if (categories.includes('Alimentos') || categories.includes('Verduras')) {
      recipes.push("🍳 Salteado de verduras: Usa todas las verduras próximas a vencer en un salteado con huevo");
    }
    if (categories.includes('Lácteos')) {
      recipes.push("🥘 Tortilla de verduras con queso: Perfecta para usar lácteos y verduras");
    }
    if (categories.includes('Frutas')) {
      recipes.push("🍌 Batido de frutas: Licúa las frutas maduras con leche o yogur");
    }
    
    return {
      critical: critical.map(p => ({
        name: p.name,
        recommendation: `Úsalo hoy o mañana. ${
          p.category === 'Verduras' ? 'Puedes saltearlo o congelarlo.' :
          p.category === 'Lácteos' ? 'Revisa si aún está bueno por olor.' :
          p.category === 'Carnes' ? 'Cocínalo hoy o congélalo.' :
          'Considera usarlo pronto.'
        }`
      })),
      recipes: recipes.length > 0 ? recipes : [
        "🍳 Revuelto de ingredientes: Usa todos los productos por vencer en un revuelto",
        "🥗 Ensalada combinada: Mezcla vegetales y otros ingredientes frescos"
      ],
      wastePatterns: week.length > 3 ? [
        `Compras en exceso: ${week.length} productos por vencer esta semana`,
        `Categoría más crítica: ${this.getMostCriticalCategory(products)}`
      ] : [
        "Buen manejo de fechas, sigue así",
        "Revisa siempre las fechas antes de comprar"
      ],
      shoppingAdvice: [
        week.length > 3 ? "Compra menos cantidad, con más frecuencia" : "Mantén el ritmo actual de compras",
        "Planifica menús alrededor de productos próximos a vencer",
        "Usa la regla PEPS (Primero en Entrar, Primero en Salir)"
      ],
      summary: `${critical.length} producto${critical.length !== 1 ? 's' : ''} crítico${critical.length !== 1 ? 's' : ''}. ${week.length - critical.length} más por vencer esta semana.`,
      isMock: true
    };
  }

  /**
   * Mock para producto individual
   */
  getSingleProductMock(product) {
    const tips = {
      'Lácteos': {
        useBy: 'próximos 2-3 días',
        storageTip: 'Mantén refrigerado, revisa olor antes de usar',
        recipeIdea: 'Batido, tortilla, o salsa blanca',
        canFreeze: product.name.includes('leche') || product.name.includes('queso')
      },
      'Verduras': {
        useBy: 'próximos 1-2 días',
        storageTip: 'Guarda en el cajón de verduras, no laves hasta usar',
        recipeIdea: 'Salteado, sopa, o tortilla',
        canFreeze: !product.name.includes('lechuga') && !product.name.includes('tomate')
      },
      'Frutas': {
        useBy: 'próximos 1-2 días',
        storageTip: 'Maduras a temperatura ambiente, luego refrigera',
        recipeIdea: 'Batido, compota, o ensalada de frutas',
        canFreeze: true
      }
    };

    const categoryTip = tips[product.category] || {
      useBy: 'próximos días',
      storageTip: 'Revisa el estado antes de usar',
      recipeIdea: 'Incorpora en tus comidas principales',
      canFreeze: false
    };

    return {
      useBy: categoryTip.useBy,
      storageTip: categoryTip.storageTip,
      recipeIdea: categoryTip.recipeIdea,
      canFreeze: categoryTip.canFreeze
    };
  }

  /**
   * Obtener categoría más crítica
   */
  getMostCriticalCategory(products) {
    const categoryCount = {};
    products.forEach(p => {
      categoryCount[p.category] = (categoryCount[p.category] || 0) + 1;
    });
    
    let maxCategory = '';
    let maxCount = 0;
    
    for (const [cat, count] of Object.entries(categoryCount)) {
      if (count > maxCount) {
        maxCount = count;
        maxCategory = cat;
      }
    }
    
    return maxCategory || 'varias categorías';
  }
}

// Exportar una instancia única
const expirationAIService = new ExpirationAIService();
export default expirationAIService;