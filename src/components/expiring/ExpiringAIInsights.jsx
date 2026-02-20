// src/components/expiring/ExpiringAIInsights.jsx
import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  ChefHat, 
  TrendingDown, 
  Lightbulb, 
  Sparkles,
  AlertTriangle,
  Clock,
  RefreshCw
} from 'lucide-react';
import expirationAIService from '../../api/expiration-ai.service'; // ¡IMPORTANTE! Import correcto
import Loader from '../common/Loader';

const ExpiringAIInsights = ({ products, consumptionHistory = [] }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRecipes, setShowRecipes] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (products && products.length > 0) {
      analyzeExpiringProducts();
    } else {
      setAnalysis(null);
    }
  }, [products]);

  const analyzeExpiringProducts = async () => {
    if (!products || products.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await expirationAIService.analyzeExpiringProducts(products, consumptionHistory);
      setAnalysis(result);
    } catch (err) {
      console.error('Error analizando productos:', err);
      setError('No se pudo completar el análisis');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    analyzeExpiringProducts();
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Brain className="h-5 w-5 text-purple-600 mr-2" />
            <h3 className="font-semibold text-gray-900">IA analizando...</h3>
          </div>
          <Loader size="small" />
        </div>
        <p className="text-sm text-gray-600">
          Analizando {products.length} productos próximos a vencer...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-red-100 rounded-lg transition-colors"
          >
            <RefreshCw className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>
    );
  }

  if (!analysis || (analysis.critical?.length === 0 && !analysis.summary)) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-center">
          <Sparkles className="h-5 w-5 text-green-600 mr-2" />
          <p className="text-sm text-green-700">
            ¡Buen trabajo! No hay productos críticos por vencer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header con badge de IA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Brain className="h-5 w-5 text-purple-600 mr-2" />
          <h3 className="font-semibold text-gray-900">
            Análisis inteligente
            {analysis.isMock && (
              <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                Modo básico
              </span>
            )}
          </h3>
        </div>
        <button
          onClick={handleRefresh}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          title="Actualizar análisis"
        >
          <RefreshCw className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Resumen principal */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-5">
        <p className="text-gray-700 mb-4">{analysis.summary}</p>
        
        {/* Productos críticos */}
        {analysis.critical && analysis.critical.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-red-700 mb-2 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" />
              ¡Atención inmediata! ({analysis.critical.length})
            </h4>
            <div className="space-y-2">
              {analysis.critical.slice(0, showAll ? undefined : 2).map((item, idx) => (
                <div key={idx} className="bg-white bg-opacity-70 rounded-lg p-3 text-sm border border-red-100">
                  <span className="font-medium text-gray-900">{item.name}:</span>{' '}
                  <span className="text-gray-700">{item.recommendation}</span>
                </div>
              ))}
              {analysis.critical.length > 2 && !showAll && (
                <button
                  onClick={() => setShowAll(true)}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                >
                  Ver {analysis.critical.length - 2} más...
                </button>
              )}
            </div>
          </div>
        )}
        
        {/* Botón de recetas */}
        {analysis.recipes && analysis.recipes.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowRecipes(!showRecipes)}
              className="flex items-center text-sm font-medium text-purple-700 mb-2 hover:text-purple-800 transition-colors"
            >
              <ChefHat className="h-4 w-4 mr-1" />
              {showRecipes ? 'Ocultar recetas' : 'Ver recetas sugeridas'}
            </button>
            
            {showRecipes && (
              <div className="space-y-2">
                {analysis.recipes.map((recipe, idx) => (
                  <div key={idx} className="bg-white bg-opacity-70 rounded-lg p-3 text-sm border border-purple-100">
                    🍳 {recipe}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Patrones de desperdicio */}
        {analysis.wastePatterns && analysis.wastePatterns.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-amber-700 mb-2 flex items-center">
              <TrendingDown className="h-4 w-4 mr-1" />
              Patrones detectados
            </h4>
            <ul className="space-y-1">
              {analysis.wastePatterns.map((pattern, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start bg-white bg-opacity-50 rounded-lg p-2">
                  <span className="mr-2">•</span>
                  {pattern}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* Consejos de compra */}
        {analysis.shoppingAdvice && analysis.shoppingAdvice.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-blue-700 mb-2 flex items-center">
              <Lightbulb className="h-4 w-4 mr-1" />
              Para tu próxima compra
            </h4>
            <ul className="space-y-1">
              {analysis.shoppingAdvice.map((advice, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start bg-white bg-opacity-50 rounded-lg p-2">
                  <span className="mr-2">🛒</span>
                  {advice}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpiringAIInsights;