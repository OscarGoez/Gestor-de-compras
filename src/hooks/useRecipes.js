// src/hooks/useRecipes.js - VERSIÓN CORREGIDA
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import recipesAIService from '../api/recipes-ai.service';

export const useRecipes = (availableProducts, expiringProducts = []) => {
  const { user } = useAuth();
  const userId = user?.uid;
  
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [cookingHistory, setCookingHistory] = useState([]);
  const [lastGenerated, setLastGenerated] = useState(null);
  const [isMockMode, setIsMockMode] = useState(false);
  
  // Cargar favoritos del usuario desde Firestore
  useEffect(() => {
    const loadUserFavorites = async () => {
      if (!userId) return;
      
      try {
        const userFavorites = await recipesAIService.getUserFavorites(userId);
        setFavorites(userFavorites);
      } catch (error) {
        console.error('Error cargando favoritos:', error);
        // Fallback a localStorage
        const saved = localStorage.getItem(`favoriteRecipes_${userId}`);
        if (saved) {
          setFavorites(JSON.parse(saved));
        }
      }
    };
    
    loadUserFavorites();
  }, [userId]);

  // Guardar favoritos (cuando cambien)
  useEffect(() => {
    if (!userId) return;
    
    // Guardar en localStorage como backup
    localStorage.setItem(`favoriteRecipes_${userId}`, JSON.stringify(favorites));
    
    // También podrías guardar en Firestore aquí
  }, [favorites, userId]);

  const generateRecipes = useCallback(async (customFilters = {}) => {
  if (!availableProducts || availableProducts.length === 0) {
    setError('No hay productos disponibles para cocinar');
    return;
  }

  if (!userId) {
    setError('Usuario no identificado');
    return;
  }

  setLoading(true);
  setError(null);

  try {
    // Timeout para evitar que la IA tarde demasiado
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('timeout')), 15000)
    );
    
    const resultPromise = recipesAIService.generateRecipes(
      userId,
      availableProducts,
      expiringProducts,
      customFilters
    );
    
    const result = await Promise.race([resultPromise, timeoutPromise]);

    if (result && result.recipes) {
      const recipesWithFav = result.recipes.map(recipe => ({
        ...recipe,
        isFavorite: favorites.some(fav => fav.recipeId === recipe.id)
      }));
      setRecipes(recipesWithFav);
      setIsMockMode(result.isMock || false);
      setLastGenerated(new Date());
      setError(null);
    } else {
      throw new Error('No se recibieron recetas');
    }
  } catch (err) {
    console.error('Error generando recetas:', err);
    
    // Mensaje de error más amigable
    if (err.message === 'timeout') {
      setError('La IA está tardando demasiado. Usando recetas de respaldo.');
    } else {
      setError('No se pudieron generar recetas. Usando recetas de respaldo.');
    }
    
    // Usar recetas mock como fallback
    const mockResult = recipesAIService.getMockRecipes(availableProducts, expiringProducts);
    const recipesWithFav = mockResult.recipes.map(recipe => ({
      ...recipe,
      isFavorite: favorites.some(fav => fav.recipeId === recipe.id)
    }));
    setRecipes(recipesWithFav);
    setIsMockMode(true);
  } finally {
    setLoading(false);
  }
}, [availableProducts, expiringProducts, favorites, userId]);

  // 🔥 NUEVO: Función surpriseMe (la que faltaba)
  const surpriseMe = useCallback(async () => {
    if (!availableProducts || availableProducts.length === 0) {
      setError('No hay productos disponibles para cocinar');
      return;
    }

    if (!userId) {
      setError('Usuario no identificado');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await recipesAIService.surpriseMe(userId, availableProducts);
      
      if (result && result.recipes) {
        const recipesWithFav = result.recipes.map(recipe => ({
          ...recipe,
          isFavorite: favorites.some(fav => fav.recipeId === recipe.id)
        }));
        setRecipes(recipesWithFav);
        setIsMockMode(result.isMock || false);
        setLastGenerated(new Date());
      }
    } catch (err) {
      console.error('Error generando receta sorpresa:', err);
      
      // Fallback: tomar una receta aleatoria del mock
      const mockResult = recipesAIService.getMockRecipes(availableProducts, expiringProducts);
      const randomRecipe = [mockResult.recipes[Math.floor(Math.random() * mockResult.recipes.length)]];
      const recipesWithFav = randomRecipe.map(recipe => ({
        ...recipe,
        isFavorite: favorites.some(fav => fav.recipeId === recipe.id)
      }));
      setRecipes(recipesWithFav);
      setIsMockMode(true);
    } finally {
      setLoading(false);
    }
  }, [availableProducts, expiringProducts, favorites, userId]);

  const toggleFavorite = useCallback(async (recipe) => {
    if (!userId) return;
    
    // Verificar si ya existe
    const exists = favorites.some(f => f.recipeId === recipe.id);
    
    if (exists) {
      // Quitar de favoritos
      setFavorites(prev => prev.filter(f => f.recipeId !== recipe.id));
      await recipesAIService.removeFavoriteRecipe(userId, recipe.id);
    } else {
      // Agregar a favoritos
      const newFavorite = {
        userId,
        recipeId: recipe.id,
        recipeName: recipe.name,
        savedAt: new Date().toISOString(),
        recipeData: recipe
      };
      
      setFavorites(prev => [...prev, newFavorite]);
      await recipesAIService.saveFavoriteRecipe(userId, recipe);
    }

    // Actualizar estado en recipes actuales
    setRecipes(prev =>
      prev.map(r =>
        r.id === recipe.id
          ? { ...r, isFavorite: !r.isFavorite }
          : r
      )
    );
  }, [userId, favorites]);

  const markAsCooked = useCallback(async (recipe) => {
    if (!userId) return;
    
    try {
      await recipesAIService.logCookedRecipe(userId, recipe.id, recipe.name);
      
      // Actualizar historial local
      setCookingHistory(prev => [
        {
          recipeId: recipe.id,
          recipeName: recipe.name,
          cookedAt: new Date().toISOString()
        },
        ...prev
      ].slice(0, 20));
      
      return { success: true };
    } catch (error) {
      console.error('Error marcando como cocinada:', error);
      return { success: false };
    }
  }, [userId]);

  const updateFilters = useCallback((newFilters) => {
    // Esta función la puedes implementar si necesitas filtros
    console.log('Filtros actualizados:', newFilters);
  }, []);

  const clearRecipes = useCallback(() => {
    setRecipes([]);
    setLastGenerated(null);
  }, []);

  return {
    recipes,
    favorites,
    cookingHistory,
    loading,
    error,
    lastGenerated,
    isMockMode,
    generateRecipes,
    surpriseMe,          
    toggleFavorite,
    markAsCooked,
    updateFilters,
    clearRecipes,
    hasRecipes: recipes.length > 0
  };
};