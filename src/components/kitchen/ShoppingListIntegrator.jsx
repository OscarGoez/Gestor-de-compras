// src/components/kitchen/ShoppingListIntegrator.jsx
import React, { useState } from 'react';
import { ShoppingCart, Check, X, Plus, AlertCircle } from 'lucide-react';
import { shoppingService } from '../../api/shopping.service';
import { useHousehold } from '../../context/HouseholdContext';

const ShoppingListIntegrator = ({ ingredients, onComplete, onCancel }) => {
  const { householdId } = useHousehold();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedIngredients, setSelectedIngredients] = useState(
    ingredients.map(ing => ({ name: ing, selected: true }))
  );

  const toggleIngredient = (index) => {
    setSelectedIngredients(prev =>
      prev.map((item, i) => 
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleAddToShoppingList = async () => {
    const toAdd = selectedIngredients.filter(item => item.selected).map(item => item.name);
    
    if (toAdd.length === 0) {
      setError('Selecciona al menos un ingrediente');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Agregar cada ingrediente a la lista de compras
      for (const ingredient of toAdd) {
        await shoppingService.addItem({
          householdId,
          name: ingredient,
          quantity: 1,
          unit: 'unidad',
          category: 'Otros',
          notes: 'Agregado desde Cocina Inteligente'
        });
      }
      
      onComplete(toAdd.length);
    } catch (err) {
      console.error('Error agregando a lista:', err);
      setError('No se pudieron agregar los ingredientes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-5 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center">
          <ShoppingCart className="h-5 w-5 text-primary-600 mr-2" />
          Agregar a la lista de compras
        </h3>
        <button
          onClick={onCancel}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Selecciona los ingredientes que quieres agregar a tu lista de compras:
      </p>

      <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
        {selectedIngredients.map((item, index) => (
          <label
            key={index}
            className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
          >
            <input
              type="checkbox"
              checked={item.selected}
              onChange={() => toggleIngredient(index)}
              className="mr-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="flex-1 text-gray-700">{item.name}</span>
            {item.selected && (
              <Check className="h-4 w-4 text-green-600" />
            )}
          </label>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center text-sm text-red-700">
          <AlertCircle className="h-4 w-4 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleAddToShoppingList}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            'Agregando...'
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Agregar seleccionados
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default ShoppingListIntegrator;