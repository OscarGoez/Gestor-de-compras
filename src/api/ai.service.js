// src/api/ai.service.js - VERSIÓN COMPLETA PARA GROQ
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

class AIService {
  constructor() {
    this.apiKey = GROQ_API_KEY;
    this.useMock = !this.apiKey;
    
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
    
    IMPORTANTE: Responde SOLO con un objeto JSON válido, sin texto adicional, sin explicaciones.
    
    El objeto debe tener estos campos exactos:
    {
      "name": "string",           // Nombre del producto
      "quantity": number,          // Cantidad numérica
      "unit": "units" | "grams" | "ml",  // Unidad de medida
      "category": "Alimentos" | "Bebidas" | "Limpieza" | "Aseo Personal" | "Farmacia" | "Otros",
      "expirationDate": null | "YYYY-MM-DD"  // Fecha en formato ISO o null
    }
    
    REGLAS PARA UNIT:
    - Usa "ml" para líquidos (leche, agua, etc.)
    - Usa "g" para sólidos (arroz, harina, etc.) 
    - Usa "unidades" para artículos contables (jabón, huevos, etc.)
    
    Ejemplo correcto:
    {"name": "Leche", "quantity": 2, "unit": "ml", "category": "Alimentos", "expirationDate": null}
    
    Si no encuentras un valor, pon null.`;

    try {
      const response = await this.generateContent(prompt, { 
        model: 'llama-3.1-8b-instant', // Rápido y preciso
        temperature: 0.1 
      });
      
      if (!response) return null;

      // Intentar extraer JSON de la respuesta
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('✅ Producto parseado:', parsed);
        return parsed;
      }
      
    } catch (error) {
      console.error('❌ Error parseando producto:', error);
    }
    
    // Fallback al mock si todo falla
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
    const prompt = `Analiza este producto y su historial de consumo:
    
    Producto: ${JSON.stringify(product)}
    Historial (últimos 30 días): ${JSON.stringify(history)}
    
    Responde SOLO con un JSON con estos campos:
    {
      "predictedDaysLeft": number,      // Días estimados hasta agotarse
      "consumptionRate": number,        // Tasa de consumo diario
      "recommendedPurchase": number,    // Cantidad recomendada para próxima compra
      "insights": ["string"]            // Array de observaciones
    }`;

    const response = await this.generateContent(prompt, { model: 'llama-3.3-70b-versatile' });
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      return null;
    }
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