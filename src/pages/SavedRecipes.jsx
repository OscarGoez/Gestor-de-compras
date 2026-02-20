// src/pages/SavedRecipes.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bookmark, 
  ChefHat, 
  Clock,
  AlertTriangle,
  Filter,
  Heart,
  Trash2,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../api/firebase';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from 'firebase/firestore';
import Header from '../components/layout/Header';
import Loader from '../components/common/Loader';
import RecipeCard from '../components/kitchen/RecipeCard';
import RecipeDetailModal from '../components/kitchen/RecipeDetailModal';

const SavedRecipes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.uid;
  
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [filter, setFilter] = useState('all'); // 'all', 'favorites', 'recent'

  useEffect(() => {
    loadSavedRecipes();
  }, [userId]);

  const loadSavedRecipes = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const q = query(
        collection(db, 'userFavorites'),
        where('userId', '==', userId),
        orderBy('savedAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const recipes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setSavedRecipes(recipes);
    } catch (error) {
      console.error('Error cargando recetas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRecipe = async (recipeId) => {
    if (!confirm('¿Eliminar esta receta de tus guardadas?')) return;
    
    try {
      await deleteDoc(doc(db, 'userFavorites', recipeId));
      setSavedRecipes(prev => prev.filter(r => r.id !== recipeId));
    } catch (error) {
      console.error('Error eliminando receta:', error);
    }
  };

  const filteredRecipes = savedRecipes.filter(recipe => {
    if (filter === 'favorites') {
      return recipe.recipeData?.isFavorite;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Mis Recetas" showBack={true} />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Loader message="Cargando tus recetas..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Mis Recetas Guardadas" showBack={true} />
      
      <main className="max-w-7xl mx-auto px-4 py-6 pb-24">
        {/* Header con estadísticas */}
        <div className="bg-gradient-to-r from-primary-500 to-purple-600 rounded-2xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2 flex items-center">
                <Bookmark className="h-8 w-8 mr-3" />
                Tus Recetas
              </h1>
              <p className="text-white/80">
                {savedRecipes.length} receta{savedRecipes.length !== 1 ? 's' : ''} guardada{savedRecipes.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            {/* Filtros */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 bg-white/20 backdrop-blur text-white rounded-xl border border-white/30"
            >
              <option value="all">Todas</option>
              <option value="recent">Más recientes</option>
              <option value="favorites">Favoritas</option>
            </select>
          </div>
        </div>

        {/* Grid de recetas guardadas */}
        {filteredRecipes.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Bookmark className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No tienes recetas guardadas
            </h3>
            <p className="text-gray-500 mb-6">
              Guarda recetas que te gusten para tenerlas siempre a mano
            </p>
            <button
              onClick={() => navigate('/kitchen')}
              className="px-6 py-2 bg-primary-600 text-white rounded-xl hover:bg-primary-700"
            >
              Explorar recetas
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((saved) => (
              <div key={saved.id} className="relative group">
                <RecipeCard
                  recipe={saved.recipeData}
                  onFavorite={() => {}}
                  onCook={() => setSelectedRecipe(saved.recipeData)}
                  onAddIngredients={() => {}}
                />
                {/* Botón eliminar */}
                <button
                  onClick={() => handleDeleteRecipe(saved.id)}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                {/* Fecha guardado */}
                <div className="absolute bottom-2 left-2 text-xs text-gray-500 bg-white/90 px-2 py-1 rounded-full">
                  {new Date(saved.savedAt).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal de receta */}
      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onAddIngredients={() => {}}
          onMarkAsCooked={() => {}}
        />
      )}
    </div>
  );
};

export default SavedRecipes;