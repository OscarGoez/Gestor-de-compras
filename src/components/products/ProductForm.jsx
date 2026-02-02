// components/products/ProductForm.jsx - VERSIÓN MEJORADA PARA USUARIOS
import React, { useState, useEffect } from 'react';
import { 
  X, 
  Package, 
  Calendar, 
  Hash, 
  Percent, 
  Info, 
  Tag,
  Scale,
  AlertCircle,
  Check,
  Clock,
  ShoppingBag,
  Droplet,
  Coffee,
  Home,
  Heart,
  Pill,
  Sparkles
} from 'lucide-react';
import Button from '../common/Button';
import { validateField, firestoreValidations } from '../../utils/validationRules';

const ProductForm = ({ product, onSubmit, onClose, isLoading, isEditMode, isRestock = false }) => {
  const [formData, setFormData] = useState({
    name: product?.name || '',
    category: product?.category || 'alimentos',
    unit: product?.unit || 'units',
    quantityTotal: product?.quantityTotal || 1,
    quantityCurrent: product?.quantityCurrent || (product?.quantityTotal || 1),
    lowStockThreshold: product?.lowStockThreshold || 0.3,
    expirationDate: product?.expirationDate 
      ? (product.expirationDate.toDate ? product.expirationDate.toDate().toISOString().split('T')[0] 
        : new Date(product.expirationDate).toISOString().split('T')[0])
      : '',
    notes: product?.notes || ''
  });
  
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [isQuickMode, setIsQuickMode] = useState(!product || isEditMode || isRestock); // Modo rápido para nuevos productos

  // En el estado inicial, si es restock, establecer quantityCurrent = quantityTotal
  useEffect(() => {
    if ((isEditMode || isRestock) && product) {
      setFormData(prev => ({
        ...prev,
        quantityCurrent: product.quantityTotal, // Restaurar al 100%
        status: 'available',
        lastOpenedAt: null,
      }));
    }
  }, [isEditMode, isRestock, product]);

  const isEdit = !!product;
  
  // En el título del modal
  const modalTitle = isRestock 
    ? `🛒 Reabastecer "${product?.name}"` 
    : isEditMode 
      ? `✏️ Editar "${product?.name}"` 
      : '➕ Agregar nuevo producto';

  const categories = [
    { value: 'alimentos', label: 'Alimentos', icon: <Coffee className="h-4 w-4" />, color: 'bg-orange-100 text-orange-600' },
    { value: 'bebidas', label: 'Bebidas', icon: <Droplet className="h-4 w-4" />, color: 'bg-blue-100 text-blue-600' },
    { value: 'limpieza', label: 'Limpieza', icon: <Home className="h-4 w-4" />, color: 'bg-green-100 text-green-600' },
    { value: 'aseo', label: 'Aseo Personal', icon: <Heart className="h-4 w-4" />, color: 'bg-pink-100 text-pink-600' },
    { value: 'farmacia', label: 'Farmacia', icon: <Pill className="h-4 w-4" />, color: 'bg-red-100 text-red-600' },
    { value: 'otros', label: 'Otros', icon: <Tag className="h-4 w-4" />, color: 'bg-gray-100 text-gray-600' },
  ];

  const units = [
    { value: 'units', label: 'Unidades', examples: 'botellas, paquetes, cajas' },
    { value: 'kg', label: 'Kilogramos', examples: 'arroz, azúcar, harina' },
    { value: 'g', label: 'Gramos', examples: 'café, té, especias' },
    { value: 'l', label: 'Litros', examples: 'aceite, leche, jugo' },
    { value: 'ml', label: 'Mililitros', examples: 'jarabe, shampoo, colonia' },
    { value: 'botellas', label: 'Botellas', examples: 'agua, refresco, vino' },
    { value: 'paquetes', label: 'Paquetes', examples: 'galletas, pasta, pañales' },
    { value: 'latas', label: 'Latas', examples: 'atún, frijoles, verduras' },
  ];

  // Validación mejorada
  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.name.trim()) newErrors.name = '⚠️ Escribe el nombre del producto';
      if (!formData.category) newErrors.category = 'Selecciona una categoría';
    }
    
    if (step === 2) {
      if (formData.quantityTotal <= 0) newErrors.quantityTotal = '❌ La cantidad debe ser mayor a 0';
      if (formData.quantityCurrent < 0) newErrors.quantityCurrent = '❌ No puede ser negativo';
      if (formData.quantityCurrent > formData.quantityTotal) {
        newErrors.quantityCurrent = '⚠️ No puede haber más cantidad actual que total';
      }
    }
    
    if (step === 3) {
      if (formData.lowStockThreshold < 0.1 || formData.lowStockThreshold > 1) {
        newErrors.lowStockThreshold = 'Selecciona entre 10% y 100%';
      }
    }
    
    return newErrors;
  };

  const handleNextStep = () => {
    const stepErrors = validateStep(currentStep);
    if (Object.keys(stepErrors).length === 0) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
      setErrors({});
    } else {
      setErrors(stepErrors);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ✅ VALIDACIÓN FINAL ANTES DE ENVIAR
    const validationErrors = {};
    
    // Validar todos los campos
    Object.keys(formData).forEach(fieldName => {
      if (fieldName === 'expirationDate' && !formData[fieldName]) {
        return; // La fecha es opcional
      }
      
      const validation = validateField(`product.${fieldName}`, formData[fieldName], formData);
      if (!validation.isValid) {
        validationErrors[fieldName] = validation.message;
      }
    });
    
    // Validaciones específicas
    if (formData.quantityCurrent > formData.quantityTotal) {
      validationErrors.quantityCurrent = 'No puede haber más cantidad actual que total';
    }
    
    if (formData.expirationDate) {
      const dateValidation = firestoreValidations.validateExpirationDate(formData.expirationDate);
      if (!dateValidation.isValid) {
        validationErrors.expirationDate = dateValidation.message;
      }
    }
    
    const thresholdValidation = firestoreValidations.validateLowStockThreshold(formData.lowStockThreshold);
    if (!thresholdValidation.isValid) {
      validationErrors.lowStockThreshold = thresholdValidation.message;
    }
    
    // Si hay errores, mostrarlos
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      
      // Scroll al primer error
      const firstErrorField = Object.keys(validationErrors)[0];
      const errorElement = document.querySelector(`[name="${firstErrorField}"]`);
      if (errorElement) {
        errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        errorElement.focus();
      }
      
      return;
    }
    
    // Preparar datos para enviar
    const submitData = {
      ...formData,
      name: formData.name.trim(),
      quantityTotal: Number(formData.quantityTotal),
      quantityCurrent: Number(formData.quantityCurrent),
      lowStockThreshold: Number(formData.lowStockThreshold),
      expirationDate: formData.expirationDate || null
    };
    
    try {
      await onSubmit(submitData);
    } catch (error) {
      // ✅ MANEJAR ERRORES DE FIRESTORE AMIGABLEMENTE
      let userFriendlyError = error.message;
      
      if (error.message.includes('permission-denied')) {
        userFriendlyError = 'No tienes permiso para guardar cambios. Verifica que sigas en el hogar.';
      } else if (error.message.includes('network') || error.message.includes('offline')) {
        userFriendlyError = 'Sin conexión. Los cambios se guardarán cuando reconectes.';
      } else if (error.message.includes('quota')) {
        userFriendlyError = 'Límite de almacenamiento alcanzado. Elimina algunos productos.';
      }
      
      setErrors({ submit: userFriendlyError });
    }
  };

 const handleChange = (e) => {
  const { name, value } = e.target;
  
  const newFormData = {
    ...formData,
    [name]: value
  };
  
  setFormData(newFormData);
  
  // ✅ VALIDACIÓN EN TIEMPO REAL
  let errorMessage = '';
  
  if (name === 'quantityCurrent') {
    const quantityValidation = firestoreValidations.validateQuantity(
      Number(value),
      newFormData.quantityTotal
    );
    if (!quantityValidation.isValid) {
      errorMessage = quantityValidation.message;
    }
  }
  
  if (name === 'lowStockThreshold') {
    const thresholdValidation = firestoreValidations.validateLowStockThreshold(value);
    if (!thresholdValidation.isValid) {
      errorMessage = thresholdValidation.message;
    }
  }
  
  if (name === 'expirationDate' && value) {
    const dateValidation = firestoreValidations.validateExpirationDate(value);
    if (!dateValidation.isValid) {
      errorMessage = dateValidation.message;
    }
  }
  
  // Validación general del campo
  if (!errorMessage) {
    const validation = validateField(`product.${name}`, value, newFormData);
    if (!validation.isValid) {
      errorMessage = validation.message;
    }
  }
  
  // Actualizar errores
  if (errorMessage) {
    setErrors(prev => ({ ...prev, [name]: errorMessage }));
  } else if (errors[name]) {
    const newErrors = { ...errors };
    delete newErrors[name];
    setErrors(newErrors);
  }
};


  // Componente para visualizar el stock
  const StockVisualization = () => {
    const percentage = (formData.quantityCurrent / formData.quantityTotal) * 100;
    const lowThreshold = formData.lowStockThreshold * 100;
    
    return (
      <div className="mt-4 bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Visualización del stock:</span>
          <span className="text-sm font-bold">
            {formData.quantityCurrent} / {formData.quantityTotal} {formData.unit}
          </span>
        </div>
        
        <div className="h-8 bg-gray-200 rounded-full overflow-hidden relative">
          {/* Barra de progreso */}
          <div 
            className={`h-full transition-all duration-500 ${
              percentage <= 0 ? 'bg-red-500' :
              percentage <= lowThreshold ? 'bg-amber-500' :
              'bg-green-500'
            }`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
          
          {/* Línea del umbral bajo stock */}
          <div 
            className="absolute top-0 bottom-0 w-0.5 bg-red-400"
            style={{ left: `${lowThreshold}%` }}
          >
            <div className="absolute -top-6 -left-2 text-xs font-medium text-red-600">
              {lowThreshold.toFixed(0)}%
            </div>
          </div>
        </div>
        
        <div className="flex justify-between mt-2 text-xs">
          <div className={`px-2 py-1 rounded ${percentage <= 0 ? 'bg-red-100 text-red-800' : 'text-gray-600'}`}>
            {percentage <= 0 ? '🚫 Agotado' : 'Agotado'}
          </div>
          <div className={`px-2 py-1 rounded ${percentage > 0 && percentage <= lowThreshold ? 'bg-amber-100 text-amber-800' : 'text-gray-600'}`}>
            {percentage <= lowThreshold ? '⚠️ Bajo stock' : 'Bajo stock'}
          </div>
          <div className={`px-2 py-1 rounded ${percentage > lowThreshold ? 'bg-green-100 text-green-800' : 'text-gray-600'}`}>
            {percentage > lowThreshold ? '✅ Buen stock' : 'Buen stock'}
          </div>
        </div>
      </div>
    );
  };

  // Paso 1: Información básica
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-3">
          <Package className="h-6 w-6 text-primary-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Información básica</h3>
        <p className="text-sm text-gray-600">Completa los datos principales del producto</p>
      </div>

      {/* Nombre con sugerencias */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ¿Qué producto es?
        </label>
        <div className="relative">
          <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg ${
              errors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Ej: Leche descremada, Arroz integral, Papel higiénico..."
            disabled={isLoading}
            autoFocus
          />
        </div>
        {errors.name && (
          <p className="mt-2 text-sm text-red-600 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" /> {errors.name}
          </p>
        )}
        
        {/* Sugerencias rápidas */}
        {!formData.name && (
          <div className="mt-3">
            <p className="text-xs text-gray-500 mb-2">Sugerencias rápidas:</p>
            <div className="flex flex-wrap gap-2">
              {['Leche', 'Pan', 'Huevos', 'Arroz', 'Aceite', 'Jabón'].map(item => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, name: item }))}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm transition-colors"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Categorías con iconos */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ¿En qué categoría está?
          {formData.category && (
            <span className="ml-2 text-sm text-primary-600 font-medium">
              ✓ Seleccionada: {categories.find(c => c.value === formData.category)?.label}
            </span>
          )}
        </label>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {categories.map(cat => {
            const isSelected = formData.category === cat.value;
            return (
              <button
                key={cat.value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, category: cat.value }))}
                className={`p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center relative ${
                  isSelected 
                    ? `${cat.color.replace('text-', 'border-')} border-2 bg-white shadow-lg scale-[1.02]` 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                {/* Indicador de selección */}
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                )}
                
                <div className={`p-3 rounded-lg mb-2 ${cat.color} ${isSelected ? 'ring-2 ring-offset-2 ring-primary-300' : ''}`}>
                  {cat.icon}
                </div>
                
                <span className={`text-sm font-medium ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
                  {cat.label}
                </span>
                
                {/* Indicador sutil de selección */}
                {isSelected && (
                  <div className="absolute bottom-2 left-2 right-2 h-1 bg-primary-500 rounded-full"></div>
                )}
              </button>
            );
          })}
        </div>
        
        {errors.category && (
          <p className="mt-2 text-sm text-red-600 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" /> {errors.category}
          </p>
        )}
      </div>

      {/* Unidad de medida */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          ¿Cómo lo medimos?
        </label>
        <div className="relative">
          <Scale className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 z-10" />
          <select
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 appearance-none bg-white"
            disabled={isLoading}
          >
            {units.map(unit => (
              <option key={unit.value} value={unit.value}>
                {unit.label}
              </option>
            ))}
          </select>
        </div>
        {formData.unit && (
          <p className="mt-2 text-sm text-gray-500">
            Ejemplos: {units.find(u => u.value === formData.unit)?.examples}
          </p>
        )}
      </div>
    </div>
  );

  // Paso 2: Cantidades
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-3">
          <Hash className="h-6 w-6 text-primary-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Cantidades</h3>
        <p className="text-sm text-gray-600">¿Cuánto tenemos y cuánto deberíamos tener?</p>
      </div>

      {/* Cantidad total */}
      <div className="bg-blue-50 p-4 rounded-xl">
        <label className="block text-sm font-medium text-blue-800 mb-2">
          <ShoppingBag className="inline-block h-4 w-4 mr-1" />
          Cantidad total (cuando está lleno)
        </label>
        <div className="relative">
          <input
            type="number"
            name="quantityTotal"
            value={formData.quantityTotal}
            onChange={handleChange}
            min="0.1"
            step="0.1"
            className={`w-full pl-4 pr-10 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg ${
              errors.quantityTotal ? 'border-red-500' : 'border-blue-300'
            }`}
            disabled={isLoading}
          />
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
            {formData.unit}
          </span>
        </div>
        {errors.quantityTotal && (
          <p className="mt-2 text-sm text-red-600 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" /> {errors.quantityTotal}
          </p>
        )}
        <p className="mt-2 text-sm text-blue-600">
          Esta es la cantidad máxima que puede contener el producto
        </p>
      </div>

      {/* Cantidad actual */}
      <div className="bg-green-50 p-4 rounded-xl">
        <label className="block text-sm font-medium text-green-800 mb-2">
          <Scale className="inline-block h-4 w-4 mr-1" />
          Cantidad para calcular bajo stock 
        </label>
        <div className="relative">
          <input
            type="number"
            name="quantityCurrent"
            value={formData.quantityCurrent}
            onChange={handleChange}
            min="0"
            max={formData.quantityTotal}
            step="0.1"
            className={`w-full pl-4 pr-10 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-lg ${
              errors.quantityCurrent ? 'border-red-500' : 'border-green-300'
            }`}
            disabled={isLoading}
          />
          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
            {formData.unit}
          </span>
        </div>
        {errors.quantityCurrent && (
          <p className="mt-2 text-sm text-red-600 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" /> {errors.quantityCurrent}
          </p>
        )}
        
        {/* Selector rápido de porcentajes */}
        <div className="mt-4">
          <p className="text-sm text-gray-600 mb-2">Selección rápida:</p>
          <div className="grid grid-cols-4 gap-2">
            {[100, 75, 50, 25].map(percent => {
              const value = (formData.quantityTotal * percent) / 100;
              return (
                <button
                  key={percent}
                  type="button"
                  onClick={() => setFormData(prev => ({ 
                    ...prev, 
                    quantityCurrent: Math.round(value * 10) / 10 
                  }))}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.quantityCurrent === Math.round(value * 10) / 10
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-300'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {percent}%
                </button>
              );
            })}
          </div>
        </div>
        
        {isRestock && (
          <div className="mt-3 p-3 bg-green-100 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <Check className="h-4 w-4 text-green-600 mr-2" />
              <span className="text-sm text-green-800 font-medium">
                ✓ Reabasteciendo: Se restablecerá al 100% del stock
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Visualización del stock */}
      <StockVisualization />
    </div>
  );

  // Paso 3: Configuración y extras
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-3">
          <AlertCircle className="h-6 w-6 text-primary-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Configuración</h3>
        <p className="text-sm text-gray-600">Ajustes para alertas y organización</p>
      </div>

      {/* Umbral de bajo stock */}
      <div className="bg-amber-50 p-4 rounded-xl">
        <label className="block text-sm font-medium text-amber-800 mb-2">
          <Percent className="inline-block h-4 w-4 mr-1" />
          ¿Cuándo avisarte que está por acabarse?
        </label>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700">Nivel de alerta:</span>
            <span className="text-lg font-bold text-amber-700">
              {(formData.lowStockThreshold * 100).toFixed(0)}%
            </span>
          </div>
          
          <input
            type="range"
            name="lowStockThreshold"
            value={formData.lowStockThreshold}
            onChange={handleChange}
            min="0.1"
            max="1"
            step="0.1"
            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-600"
            disabled={isLoading}
          />
          
          <div className="flex justify-between text-xs text-gray-600">
            <div className="text-center">
              <div className="font-medium">10%</div>
              <div className="text-gray-500">Sensible</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-amber-700">30%</div>
              <div className="text-gray-500">Recomendado</div>
            </div>
            <div className="text-center">
              <div className="font-medium">50%</div>
              <div className="text-gray-500">Relajado</div>
            </div>
          </div>
        </div>
        
        {errors.lowStockThreshold && (
          <p className="mt-2 text-sm text-red-600 flex items-center">
            <AlertCircle className="h-4 w-4 mr-1" /> {errors.lowStockThreshold}
          </p>
        )}
      </div>

      {/* Fecha de vencimiento */}
      <div className="bg-purple-50 p-4 rounded-xl">
        <label className="block text-sm font-medium text-purple-800 mb-2">
          <Calendar className="inline-block h-4 w-4 mr-1" />
          ¿Tiene fecha de vencimiento? (opcional)
        </label>
        
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-purple-500" />
          <input
            type="date"
            name="expirationDate"
            value={formData.expirationDate}
            onChange={handleChange}
            min={new Date().toISOString().split('T')[0]}
            className="w-full pl-10 pr-4 py-3 border border-purple-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
            disabled={isLoading}
          />
        </div>
        
        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              today.setDate(today.getDate() + 7);
              setFormData(prev => ({ 
                ...prev, 
                expirationDate: today.toISOString().split('T')[0] 
              }));
            }}
            className="w-full py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium transition-colors"
          >
            + 1 semana desde hoy
          </button>
          
          <button
            type="button"
            onClick={() => {
              const today = new Date();
              today.setMonth(today.getMonth() + 1);
              setFormData(prev => ({ 
                ...prev, 
                expirationDate: today.toISOString().split('T')[0] 
              }));
            }}
            className="w-full py-2 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg text-sm font-medium transition-colors"
          >
            + 1 mes desde hoy
          </button>
          
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, expirationDate: '' }))}
            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            No tiene fecha de vencimiento
          </button>
        </div>
        
        {formData.expirationDate && (
          <div className="mt-3 p-3 bg-purple-100 border border-purple-200 rounded-lg">
            <div className="flex items-center">
              <Clock className="h-4 w-4 text-purple-600 mr-2" />
              <span className="text-sm text-purple-800">
                📅 {new Date(formData.expirationDate).toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Info className="inline-block h-4 w-4 mr-1" />
          Notas adicionales (opcional)
        </label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="3"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="Marca, tamaño, lugar donde lo guardas, alergias..."
          disabled={isLoading}
        />
        <p className="mt-2 text-xs text-gray-500">
          Esta información es útil para todos en la familia
        </p>
      </div>
    </div>
  );

  // Barra de progreso
  const ProgressBar = () => (
    <div className="mb-6">
      <div className="flex justify-between mb-2">
        {[1, 2, 3].map(step => (
          <div key={step} className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
              currentStep >= step 
                ? 'bg-primary-600 text-white' 
                : 'bg-gray-200 text-gray-500'
            }`}>
              {currentStep > step ? <Check className="h-4 w-4" /> : step}
            </div>
            <span className="text-xs text-gray-600">
              {step === 1 ? 'Básico' : step === 2 ? 'Cantidad' : 'Ajustes'}
            </span>
          </div>
        ))}
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary-600 transition-all duration-300"
          style={{ width: `${(currentStep - 1) * 50}%` }}
        />
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Encabezado */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{modalTitle}</h2>
        {!isRestock && !isEdit && (
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setIsQuickMode(true)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${isQuickMode ? 'bg-primary-100 text-primary-700' : 'text-gray-600'}`}
            >
              🚀 Rápido
            </button>
            <button
              type="button"
              onClick={() => setIsQuickMode(false)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!isQuickMode ? 'bg-primary-100 text-primary-700' : 'text-gray-600'}`}
            >
              📝 Completo
            </button>
          </div>
        )}
      </div>

      {errors.submit && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {errors.submit}
        </div>
      )}

      {/* Modo rápido (todo en una página) */}
      {(isQuickMode && !isEdit && !isRestock) || isEditMode || isRestock ? (
        <div className="space-y-6">
          {renderStep1()}
          {renderStep2()}
          {renderStep3()}
        </div>
      ) : (
        /* Modo paso a paso solo para creación rápida */
        <>
          <ProgressBar />
          
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </>
      )}

      {/* Botones de navegación */}
      <div className="flex justify-between gap-3 pt-6 border-t border-gray-200">
        {(!isQuickMode) && currentStep > 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={handlePrevStep}
            disabled={isLoading}
            className="flex items-center"
          >
            ← Anterior
          </Button>
        ) : (
          <div></div> // Espaciador
        )}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>

          {(!isQuickMode || isEdit || isRestock) && currentStep < 3 ? (
            <Button
              type="button"
              variant="primary"
              onClick={handleNextStep}
              disabled={isLoading}
              className="flex items-center"
            >
              Siguiente →
            </Button>
          ) : (
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading}
              className="flex items-center"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⟳</span>
                  {isEdit || isRestock ? 'Guardando...' : 'Creando...'}
                </>
              ) : (
                <>
                  {isRestock ? '✅ Confirmar reabastecimiento' : 
                   isEdit ? '💾 Guardar cambios' : 
                   '✨ Crear producto'}
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Indicador de ayuda */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
        <div className="flex items-start">
          <Sparkles className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 font-medium">¡Consejo útil!</p>
            <p className="text-sm text-blue-700 mt-1">
              {currentStep === 1 ? 'Usa nombres claros que todos entiendan' :
               currentStep === 2 ? 'La cantidad actual es lo que hay en casa ahora' :
               'Las alertas te avisarán cuando el producto esté por acabarse'}
            </p>
          </div>
        </div>
      </div>
    </form>
  );
};

export default ProductForm;