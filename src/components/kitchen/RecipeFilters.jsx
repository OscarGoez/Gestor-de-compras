// src/components/kitchen/RecipeFilters.jsx - VERSIÓN CORREGIDA
import React from 'react';
import { Filter, Clock, ChefHat, Globe, TrendingUp } from 'lucide-react';

const RecipeFilters = ({ filters = {}, onFilterChange, onGenerate }) => {
  // Valores por defecto si filters es undefined
  const currentFilters = {
    cuisine: filters?.cuisine || 'cualquier',
    maxTime: filters?.maxTime || 60,
    difficulty: filters?.difficulty || 'cualquier',
    prioritizeExpiring: filters?.prioritizeExpiring ?? true,
    onlyAvailable: filters?.onlyAvailable ?? true
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <Filter className="h-4 w-4 mr-2 text-primary-600" />
          Filtros de recetas
        </h3>
        <button
          onClick={onGenerate}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
        >
          Generar recetas
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Tipo de cocina */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Globe className="h-4 w-4 inline mr-1" />
            Tipo de cocina
          </label>
          <select
            value={currentFilters.cuisine}
            onChange={(e) => onFilterChange?.({ cuisine: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="cualquier">Cualquier cocina</option>
            <option value="mexicana">Mexicana</option>
            <option value="italiana">Italiana</option>
            <option value="española">Española</option>
            <option value="asiática">Asiática</option>
            <option value="mediterránea">Mediterránea</option>
          </select>
        </div>

        {/* Tiempo máximo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Clock className="h-4 w-4 inline mr-1" />
            Tiempo máximo
          </label>
          <select
            value={currentFilters.maxTime}
            onChange={(e) => onFilterChange?.({ maxTime: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value={15}>15 minutos</option>
            <option value={30}>30 minutos</option>
            <option value={45}>45 minutos</option>
            <option value={60}>60 minutos</option>
            <option value={90}>90+ minutos</option>
          </select>
        </div>

        {/* Dificultad */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <ChefHat className="h-4 w-4 inline mr-1" />
            Dificultad
          </label>
          <select
            value={currentFilters.difficulty}
            onChange={(e) => onFilterChange?.({ difficulty: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            <option value="cualquier">Cualquier dificultad</option>
            <option value="fácil">Fácil</option>
            <option value="media">Media</option>
            <option value="difícil">Difícil</option>
          </select>
        </div>

        {/* Prioridades */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <TrendingUp className="h-4 w-4 inline mr-1" />
            Priorizar
          </label>
          <div className="space-y-2">
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={currentFilters.prioritizeExpiring}
                onChange={(e) => onFilterChange?.({ prioritizeExpiring: e.target.checked })}
                className="mr-2 rounded border-gray-300 text-primary-600"
              />
              Productos por vencer
            </label>
            <label className="flex items-center text-sm">
              <input
                type="checkbox"
                checked={currentFilters.onlyAvailable}
                onChange={(e) => onFilterChange?.({ onlyAvailable: e.target.checked })}
                className="mr-2 rounded border-gray-300 text-primary-600"
              />
              Solo con mis ingredientes
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeFilters;