// src/hooks/useAI.js
import { useState, useCallback } from 'react';
import aiService from '../api/ai.service';

export const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const suggestCategory = useCallback(async (productName) => {
    setLoading(true);
    setError(null);
    try {
      const category = await aiService.suggestCategory(productName);
      return category;
    } catch (err) {
      setError('Error sugiriendo categoría');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const parseProductFromText = useCallback(async (text) => {
    setLoading(true);
    setError(null);
    try {
      const product = await aiService.parseProductFromText(text);
      return product;
    } catch (err) {
      setError('Error parseando producto');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const suggestRecipes = useCallback(async (products) => {
    setLoading(true);
    setError(null);
    try {
      const recipes = await aiService.suggestRecipes(products);
      return recipes;
    } catch (err) {
      setError('Error sugiriendo recetas');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const analyzeConsumption = useCallback(async (product, history) => {
    setLoading(true);
    setError(null);
    try {
      const analysis = await aiService.analyzeConsumption(product, history);
      return analysis;
    } catch (err) {
      setError('Error analizando consumo');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    suggestCategory,
    parseProductFromText,
    suggestRecipes,
    analyzeConsumption
  };
};