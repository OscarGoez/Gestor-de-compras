// src/api/ai.service.js - VERSIÓN COMPLETA PARA GROQ
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

class AIService {
  constructor() {
    this.apiKey = GROQ_API_KEY;
    this.useMock = !this.apiKey;   
    this.requestQueue = [];
    this.isProcessing = false;
    this.lastRequestTime = 0;
    this.minRequestInterval = 1000; 
    this.dailyRequestCount = 0;
    this.maxDailyRequests = 100; 
    this.cache = new Map();
    this.cacheTTL = 30 * 60 * 1000;
    
    if (!this.apiKey) {
      console.error('❌ No hay API key de Groq configurada en .env.local');
      console.log('📝 Agrega: VITE_GROQ_API_KEY=gsk_tu_key_aqui');
    } else {
      console.log('✅ API key de Groq configurada correctamente');
    }
  }

  /**
   * Función principal para generar contenido con Groq
   */
  async generateContent(prompt, options = {}) {
    if (this.useMock) {
      return this.getMockResponse(prompt);
    }

    const model = options.model || 'llama-3.1-8b-instant'; // Usamos el modelo 8b por defecto (más rápido)
    
    try {
      console.log(`📡 Llamando a Groq con modelo: ${model}`);
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: 'Eres un asistente útil que responde en formato JSON cuando se solicita.' },
            { role: 'user', content: prompt }
          ],
          temperature: options.temperature || 0.1,
          max_tokens: options.maxTokens || 500
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Error de Groq:', error);
        
        // Si hay error, activar modo mock
        if (response.status === 401) {
          console.error('🔑 API key inválida');
          this.useMock = true;
        }
        return this.getMockResponse(prompt);
      }

      const data = await response.json();
      console.log('✅ Respuesta de Groq recibida');
      
      return data.choices[0].message.content;
      
    } catch (error) {
      console.error('❌ Error en generateContent:', error);
      return this.getMockResponse(prompt);
    }
  }

  /**
   * Parsear producto desde texto
   */
  async parseProductFromText(text) {
    if (!text || text.trim() === '') return null;
    
    const prompt = `Extrae la información del producto de este texto: "${text}".
    
    IMPORTANTE: Responde SOLO con un objeto JSON válido, sin texto adicional.
    
    El objeto debe tener estos campos exactos:
    {
      "name": "string",
      "quantity": number,
      "unit": "units" | "grams" | "ml",
      "category": "Alimentos" | "Bebidas" | "Limpieza" | "Aseo Personal" | "Farmacia" | "Otros",
      "expirationDate": null | "YYYY-MM-DD"
    }
    
    REGLAS PARA UNIT:
    - Usa "ml" para líquidos
    - Usa "g" para sólidos
    - Usa "unidades" para artículos contables
    
    Ejemplo correcto:
    {"name": "Leche", "quantity": 2, "unit": "ml", "category": "Alimentos", "expirationDate": null}`;
    
    try {
      const response = await this.generateContent(prompt, { 
        model: 'llama-3.1-8b-instant',
        temperature: 0.1 
      });
      
      if (!response) return null;
    
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        // No uses repairJSON aquí porque no está definido en este ámbito
        // Mejor usar try-catch simple
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('✅ Producto parseado:', parsed);
          return parsed;
        } catch (e) {
          console.log('⚠️ Error parseando, usando fallback');
          return this.fallbackParseProduct(text);
        }
      }
      
    } catch (error) {
      console.error('❌ Error parseando producto:', error);
    }
    
    return this.fallbackParseProduct(text);
  }
  
    /**
     * Mock mejorado para fallback (tu parser local)
     */
    fallbackParseProduct(text) {
      console.log('🎭 Usando fallback local para:', text);
      
      // Tu parser local existente que ya funciona
      const result = {
        name: '',
        quantity: 1,
        unit: 'units',
        category: 'Otros',
        expirationDate: string | null
      };
      
      // Aquí puedes poner tu lógica de parsing local que ya funciona
      // Por ahora, un parser básico
      const words = text.toLowerCase().split(' ');
      
      // Detectar cantidad
      const numberMatch = text.match(/(\d+)/);
      if (numberMatch) {
        result.quantity = parseInt(numberMatch[1]);
      }
      
      // Detectar unidad
      if (text.includes('litro') || text.includes('litros') || text.includes('l')) {
        result.unit = 'ml';
      } else if (text.includes('kilo') || text.includes('kilos') || text.includes('kg')) {
        result.unit = 'grams';
      }
      
      // Detectar categoría básica
      if (text.includes('jabón') || text.includes('shampoo') || text.includes('pasta')) {
        result.category = 'Aseo Personal';
      } else if (text.includes('leche') || text.includes('arroz') || text.includes('pollo')) {
        result.category = 'Alimentos';
      } else if (text.includes('cloro') || text.includes('detergente')) {
        result.category = 'Limpieza';
      }
      
      // Nombre (remover números)
      result.name = text.replace(/\d+/g, '').trim();
      result.name = result.name.charAt(0).toUpperCase() + result.name.slice(1);
      
      return result;
    }
  
    /**
     * Análisis de consumo con IA
     */
    async analyzeConsumption(product, history) {
    if (this.useMock) {
      return this.mockConsumptionAnalysis(product, history);
    }
  
    const prompt = `Eres un analista de consumo para inventario del hogar. Analiza este producto:
  
  PRODUCTO:
  ${JSON.stringify({
    name: product.name,
    category: product.category,
    quantityCurrent: product.quantityCurrent,
    quantityTotal: product.quantityTotal,
    unit: product.unit,
    status: product.status
  }, null, 2)}
  
  HISTORIAL DE CONSUMO (${history.totalLogs} registros, ${history.totalCycles} ciclos completos):
  - Consumo total: ${history.totalConsumed} ${product.unit}
  - Tasa diaria actual: ${history.dailyRate.toFixed(2)} ${product.unit}/día
  - Días desde primer registro: ${history.daysSinceFirst}
  - Ciclos recientes: ${JSON.stringify(history.cycles.slice(0, 3))}
  
  INSTRUCCIONES:
  1. Analiza el patrón de consumo
  2. Predice cuándo se agotará
  3. Recomienda cantidad para próxima compra
  4. Genera insights útiles
  
  IMPORTANTE: Responde SOLO con un objeto JSON válido, sin texto adicional.
  
  RESPUESTA JSON:
  {
    "predictedDaysLeft": number,      // Días estimados hasta agotarse (basado en consumo)
    "consumptionRate": number,         // Tasa de consumo diario (unidades/día)
    "recommendedPurchase": number,     // Cantidad recomendada para próxima compra
    "insights": [                       // Array de 2-4 observaciones cortas
      "string",
      "string"
    ],
    "confidence": "baja"|"media"|"alta", // Confianza en la predicción
    "notes": "string"                    // Nota adicional si es necesario
  }`;
  
    try {
      const response = await this.generateContent(prompt, { 
        model: 'llama-3.3-70b-versatile', // Modelo más potente para análisis
        temperature: 0.2,
        maxTokens: 800
      });
      
      if (!response) return null;
    
      // Extraer JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('✅ Análisis de consumo IA:', parsed);
        return parsed;
      }
      
    } catch (error) {
      console.error('❌ Error en analyzeConsumption:', error);
    }
    
    // Fallback a mock
    return this.mockConsumptionAnalysis(product, history);
  }
  
  /**
   * Mock para análisis de consumo (fallback)
   */
  mockConsumptionAnalysis(product, history) {
    console.log('🎭 Usando mock analysis para:', product.name);
    
    const dailyRate = history.dailyRate || 0.5;
    const currentQty = product.quantityCurrent || 0;
    
    const predictedDaysLeft = dailyRate > 0 
      ? Math.ceil(currentQty / dailyRate)
      : 7; // Default 7 días
    
    return {
      predictedDaysLeft,
      consumptionRate: dailyRate,
      recommendedPurchase: Math.max(1, Math.ceil(dailyRate * 14)), // Para 14 días
      insights: [
        dailyRate > 0 
          ? `Consumes aproximadamente ${dailyRate.toFixed(1)} ${product.unit} por día`
          : 'Registra más consumos para obtener predicciones precisas',
        predictedDaysLeft <= 7
          ? `⚠️ Te quedan ${predictedDaysLeft} días de ${product.name}`
          : `📦 Tienes ${product.name} para ${predictedDaysLeft} días`,
        product.status === 'low'
          ? '🛒 Considera comprar pronto'
          : '✅ Stock suficiente por ahora'
      ],
      confidence: history.totalLogs >= 10 ? 'alta' : 
                  history.totalLogs >= 5 ? 'media' : 'baja',
      notes: history.totalLogs < 5 
        ? 'Datos limitados - la precisión mejorará con más registros'
        : ''
    };
  }

  /**
   * Analizar imagen de factura (requiere modelo multimodal)
   * Nota: Para imágenes, necesitarás un modelo multimodal
   */
  async analyzeReceipt(imageBase64) {
    console.log('📸 Análisis de factura - Por implementar con modelo multimodal');
    return null;
  }

  // Mantener el getMockResponse para compatibilidad
  getMockResponse(prompt) {
    console.log('🎭 Usando mock response (modo fallback)');
    return null;
  }
}

// ¡IMPORTANTE! Exportar una instancia como default
const aiService = new AIService();
export default aiService;