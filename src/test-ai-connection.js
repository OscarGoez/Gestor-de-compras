// src/test-ai-connection.js
import aiService from './api/ai.service';

const testConnection = async () => {
  console.log('🔍 Probando conexión con Gemini API...');
  
  const result = await aiService.generateContent(
    'Responde SOLO con "OK" si puedes leer este mensaje'
  );
  
  if (result && result.includes('OK')) {
    console.log('✅ CONEXIÓN EXITOSA - IA real funcionando');
  } else {
    console.log('❌ FALLO EN CONEXIÓN - Usando modo mock');
  }
};

testConnection();