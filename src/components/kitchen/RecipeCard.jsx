// src/components/kitchen/RecipeCard.jsx
import React from 'react';
import { 
  Clock, 
  ChefHat, 
  Bookmark, 
  BookmarkCheck,
  ShoppingCart,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

const RecipeCard = ({ recipe, onFavorite, onCook, onAddIngredients }) => {
  const difficultyColors = {
    fácil: 'bg-green-100 text-green-800',
    media: 'bg-amber-100 text-amber-800',
    difícil: 'bg-red-100 text-red-800'
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border hover:shadow-md transition-all overflow-hidden">
      {/* Badge de productos por vencer */}
      {recipe.usesExpiring && (
        <div className="bg-amber-500 text-white text-xs py-1 px-3 flex items-center">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Usa productos que vencen pronto
        </div>
      )}

      {/* Badge de receta destacada */}
      {!recipe.usesExpiring && recipe.missingIngredients?.length === 0 && (
        <div className="bg-green-500 text-white text-xs py-1 px-3 flex items-center">
          <Sparkles className="h-3 w-3 mr-1" />
          ¡Puedes hacerla ahora!
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-bold text-gray-900 text-lg flex-1">{recipe.name}</h3>
          <button
            onClick={() => onFavorite(recipe)}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {recipe.isFavorite ? (
              <BookmarkCheck className="h-5 w-5 text-primary-600" />
            ) : (
              <Bookmark className="h-5 w-5 text-gray-400" />
            )}
          </button>
        </div>

        {/* Descripción */}
        <p className="text-sm text-gray-600 mb-3">{recipe.description}</p>

        {/* Tiempo y dificultad */}
        <div className="flex items-center gap-3 mb-4 text-sm">
          <div className="flex items-center text-gray-600">
            <Clock className="h-4 w-4 mr-1" />
            {recipe.time} min
          </div>
          <div className="flex items-center text-gray-600">
            <ChefHat className="h-4 w-4 mr-1" />
            <span className={`px-2 py-0.5 rounded-full text-xs ${difficultyColors[recipe.difficulty] || 'bg-gray-100 text-gray-800'}`}>
              {recipe.difficulty}
            </span>
          </div>
        </div>

        {/* Ingredientes */}
        <div className="mb-4">
          <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
            Ingredientes:
          </h4>
          <div className="space-y-1">
            {recipe.ingredients.map((ing, idx) => (
              <div key={idx} className="flex items-center text-sm">
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  ing.available ? 'bg-green-500' : 'bg-gray-300'
                }`} />
                <span className={ing.available ? 'text-gray-900' : 'text-gray-500'}>
                  {ing.quantity} {ing.name}
                  {!ing.available && ' (te falta)'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Ingredientes faltantes */}
        {recipe.missingIngredients && recipe.missingIngredients.length > 0 && (
          <div className="mb-4 p-3 bg-amber-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-700">
                Te faltan {recipe.missingIngredients.length} ingredientes:
              </span>
              
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {recipe.missingIngredients.map((ing, idx) => (
                <span key={idx} className="text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                  {ing}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tips */}
        {recipe.tips && (
          <div className="mb-4 p-2 bg-blue-50 rounded-lg text-sm text-blue-700">
            <span className="font-medium">💡 Tip:</span> {recipe.tips}
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => onCook(recipe)}
            className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium transition-colors"
          >
            Ver receta completa
          </button>
          <button
            onClick={() => onFavorite(recipe)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors md:hidden"
          >
            {recipe.isFavorite ? '★' : '☆'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecipeCard;