// src/components/kitchen/RecipeDetailModal.jsx - VERSIÓN COMPLETA
import React, { useState } from 'react';
import { 
  X, 
  Clock, 
  ChefHat, 
  ShoppingCart, 
  CheckCircle,
  AlertTriangle,
  Sparkles,
  Check,
  Star,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';

const RecipeDetailModal = ({ 
  recipe, 
  onClose, 
  onAddIngredients, 
  onMarkAsCooked,
  onSaveRecipe,
  onRateRecipe,
  isSaved = false 
}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [showRating, setShowRating] = useState(false);

  if (!recipe) return null;

  const difficultyColors = {
    fácil: 'bg-green-100 text-green-800',
    media: 'bg-amber-100 text-amber-800',
    difícil: 'bg-red-100 text-red-800'
  };

  const handleSaveRecipe = () => {
    if (onSaveRecipe) {
      onSaveRecipe(recipe);
    }
  };

  const handleCooked = () => {
    if (onMarkAsCooked) {
      onMarkAsCooked(recipe);
      setShowRating(true);
    }
  };

  const handleRate = (stars) => {
    setRating(stars);
    if (onRateRecipe) {
      onRateRecipe(recipe, stars);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">{recipe.name}</h2>
          <div className="flex items-center gap-2">
            {/* Botón Guardar */}
            <button
              onClick={handleSaveRecipe}
              className={`p-2 rounded-lg transition-colors ${
                isSaved 
                  ? 'bg-primary-100 text-primary-600' 
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
              title={isSaved ? "Receta guardada" : "Guardar receta"}
            >
              {isSaved ? (
                <BookmarkCheck className="h-5 w-5" />
              ) : (
                <Bookmark className="h-5 w-5" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            {recipe.usesExpiring && (
              <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm flex items-center">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Usa productos por vencer
              </span>
            )}
            {recipe.missingIngredients?.length === 0 && (
              <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm flex items-center">
                <Sparkles className="h-4 w-4 mr-1" />
                ¡Todos los ingredientes disponibles!
              </span>
            )}
          </div>

          {/* Descripción */}
          <p className="text-gray-700 mb-6">{recipe.description}</p>

          {/* Meta info */}
          <div className="flex items-center gap-4 mb-6 text-sm">
            <div className="flex items-center text-gray-600">
              <Clock className="h-4 w-4 mr-1" />
              {recipe.time} minutos
            </div>
            <div className="flex items-center text-gray-600">
              <ChefHat className="h-4 w-4 mr-1" />
              <span className={`px-2 py-0.5 rounded-full text-xs ${difficultyColors[recipe.difficulty] || 'bg-gray-100'}`}>
                {recipe.difficulty}
              </span>
            </div>
          </div>

          {/* Ingredientes */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Ingredientes</h3>
            <div className="space-y-2">
              {recipe.ingredients.map((ing, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-3 ${
                      ing.available ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                    <span className={ing.available ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                      {ing.quantity} {ing.name}
                    </span>
                  </div>
                  {ing.available ? (
                    <span className="text-xs text-green-600 flex items-center bg-green-50 px-2 py-1 rounded-full">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      En despensa
                    </span>
                  ) : (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      Te falta
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Ingredientes faltantes */}
          {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 rounded-xl">
              <h4 className="font-medium text-amber-800 mb-2 flex items-center">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Ingredientes que te faltan
              </h4>
              <div className="flex flex-wrap gap-2 mb-3">
                {recipe.missingIngredients.map((ing, idx) => (
                  <span key={idx} className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm">
                    {ing}
                  </span>
                ))}
              </div>
             
            </div>
          )}

          {/* Instrucciones */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Instrucciones</h3>
            <ol className="space-y-3">
              {recipe.steps.map((step, idx) => (
                <li key={idx} className="flex">
                  <span className="w-6 h-6 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-sm font-medium mr-3 flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-gray-700">{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Tips */}
          {recipe.tips && (
            <div className="p-4 bg-blue-50 rounded-xl mb-6">
              <h4 className="font-medium text-blue-800 mb-2">💡 Tip del chef</h4>
              <p className="text-blue-700">{recipe.tips}</p>
            </div>
          )}

          {/* Rating después de cocinar */}
          {showRating && (
            <div className="mb-6 p-4 bg-yellow-50 rounded-xl">
              <h4 className="font-medium text-yellow-800 mb-2">
                ¿Cómo te quedó?
              </h4>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleRate(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1"
                  >
                    <Star
                      className={`h-6 w-6 ${
                        star <= (hoverRating || rating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-3">
           
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeDetailModal;