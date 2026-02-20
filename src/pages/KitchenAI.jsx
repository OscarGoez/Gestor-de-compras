// src/pages/KitchenAI.jsx - VERSIÓN CORREGIDA
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChefHat, 
  Sparkles, 
  RefreshCw,
  Clock,
  AlertTriangle,
  Filter,
  Package
} from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useRecipes } from '../hooks/useRecipes';
import { useAuth } from '../context/AuthContext';
import Header from '../components/layout/Header';
import Loader from '../components/common/Loader';
import RecipeCard from '../components/kitchen/RecipeCard';
import RecipeFilters from '../components/kitchen/RecipeFilters';
import RecipeDetailModal from '../components/kitchen/RecipeDetailModal';
import ShoppingListIntegrator from '../components/kitchen/ShoppingListIntegrator';

const KitchenAI = () => {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const { products, loading: productsLoading } = useProducts();
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [pendingIngredients, setPendingIngredients] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [savedRecipes, setSavedRecipes] = useState([]);

  // Productos disponibles
  const availableProducts = products.filter(p => p.status !== 'out');
  
  // Productos por vencer
  const expiringProducts = products.filter(p => {
    if (!p.expirationDate) return false;
    const today = new Date();
    const expDate = new Date(p.expirationDate);
    const daysLeft = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    return daysLeft <= 7 && daysLeft >= 0;
  });

  const {
    recipes,
    loading,
    error,
    lastGenerated,
    isMockMode,
    filters,
    generateRecipes,
    surpriseMe,
    toggleFavorite,
    markAsCooked,
    updateFilters
  } = useRecipes(availableProducts, expiringProducts);

  useEffect(() => {
    if (availableProducts.length > 0 && recipes.length === 0) {
      generateRecipes();
    }
  }, [availableProducts]);

  const handleCook = (recipe) => setSelectedRecipe(recipe);
  const handleAddIngredients = (ingredients) => {
    setPendingIngredients(ingredients);
    setShowShoppingList(true);
  };
  const handleSaveRecipe = (recipe) => {
    // Aquí llamarás a tu servicio para guardar
    console.log('Guardar receta:', recipe.name);
    // TODO: Implementar recipesAIService.saveRecipe(userId, recipe)
    
    // Actualizar UI
    setSavedRecipes(prev => [...prev, recipe.id]);
  };
  const handleShoppingComplete = (count) => {
    setShowShoppingList(false);
    setPendingIngredients([]);
    alert(`${count} ingredientes agregados a la lista de compras`);
  };
  const handleShoppingCancel = () => {
    setShowShoppingList(false);
    setPendingIngredients([]);
  };

  const handleRateRecipe = (recipe, rating) => {
    console.log('Valorar receta:', recipe.name, rating, 'estrellas');
    // TODO: Implementar recipesAIService.rateRecipe(userId, recipe, rating)
  };


  if (productsLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Cocina Inteligente" />
        <div className="max-w-7xl mx-auto px-4 py-8 pb-24">
          <Loader message="Cargando tu despensa..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Cocina Inteligente" />
      
      <main className="max-w-7xl mx-auto px-4 py-6 pb-24">
        {/* Banner de bienvenida */}
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 rounded-2xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2 flex items-center">
                <ChefHat className="h-8 w-8 mr-3" />
                ¡Hola {userData?.name?.split(' ')[0] || 'chef'}!
              </h1>
              <p className="text-orange-100">
                {availableProducts.length} productos disponibles
                {expiringProducts.length > 0 && (
                  <span className="ml-2 inline-flex items-center bg-white/20 px-2 py-1 rounded-full text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {expiringProducts.length} por vencer
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex gap-2">
              {/* Botón Sorpresa */}
              <button
                onClick={surpriseMe}
                disabled={loading}
                className="px-4 py-2 bg-white text-orange-600 rounded-xl hover:bg-orange-50 font-medium flex items-center shadow-lg transition-all hover:scale-105 active:scale-95"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                
              </button>
              
              {/* Botón Filtros */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="p-2 bg-white/20 backdrop-blur rounded-xl hover:bg-white/30 transition-all"
              >
                <Filter className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modo mock indicator */}
        {isMockMode && (
          <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-sm text-amber-700 flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Modo offline: Mostrando recetas de ejemplo
            </p>
          </div>
        )}

        {/* Filtros */}
        {showFilters && (
          <div className="mb-6">
            <RecipeFilters
              filters={filters}
              onFilterChange={updateFilters}
              onGenerate={() => {
                generateRecipes();
                setShowFilters(false);
              }}
            />
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <Loader message="Cocinando ideas para ti..." />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center mb-8">
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => generateRecipes()}
              className="mt-4 px-6 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700"
            >
              Intentar de nuevo
            </button>
          </div>
        )}

        {/* Grid de recetas */}
        {!loading && !error && (
          <>
            {recipes.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <ChefHat className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay recetas disponibles
                </h3>
                <p className="text-gray-500 mb-6">
                  Prueba con otros filtros o agrega más productos
                </p>
                <button
                  onClick={() => generateRecipes()}
                  className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2 inline" />
                  Generar recetas
                </button>
              </div>
            ) : (
              <>
                {lastGenerated && (
                  <p className="text-xs text-gray-500 mb-3 text-right">
                    Generado: {lastGenerated.toLocaleTimeString()}
                  </p>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recipes.map(recipe => (
                    <RecipeCard
                      key={recipe.id}
                      recipe={recipe}
                      onFavorite={toggleFavorite}
                      onCook={handleCook}
                      onAddIngredients={handleAddIngredients}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* Mensaje sin productos */}
        {availableProducts.length === 0 && !loading && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay productos disponibles
            </h3>
            <p className="text-gray-500 mb-6">
              Agrega productos a tu despensa para recibir sugerencias
            </p>
            <button
              onClick={() => navigate('/products?action=add')}
              className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
            >
              Agregar productos
            </button>
          </div>
        )}
        
      </main>

      {/* Modales */}
      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onAddIngredients={handleAddIngredients}
          onMarkAsCooked={markAsCooked}
          onSaveRecipe={handleSaveRecipe}
          onRateRecipe={handleRateRecipe}
          isSaved={savedRecipes.includes(selectedRecipe.id)}
        />
      )}
      

      {showShoppingList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <ShoppingListIntegrator
            ingredients={pendingIngredients}
            onComplete={handleShoppingComplete}
            onCancel={handleShoppingCancel}
          />
        </div>
      )}
    </div>
  );
};

export default KitchenAI;