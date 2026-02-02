// utils/validationRules.js

// Reglas de validación del lado del cliente que reflejan Firestore
export const validationRules = {
  // PRODUCTOS - Las reglas más importantes
  product: {
    name: {
      required: true,
      minLength: 2,
      maxLength: 100,
      pattern: /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-.,]+$/,
      message: {
        required: 'Escribe el nombre del producto',
        minLength: 'Debe tener al menos 2 letras',
        maxLength: 'Demasiado largo (máx. 100 letras)',
        pattern: 'Solo letras, números y espacios'
      }
    },
    category: {
      required: true,
      allowedValues: ['alimentos', 'bebidas', 'limpieza', 'aseo', 'farmacia', 'otros'],
      message: 'Selecciona una categoría'
    },
    unit: {
      required: true,
      allowedValues: ['units', 'kg', 'g', 'l', 'ml', 'botellas', 'paquetes', 'latas'],
      message: 'Elige cómo se mide'
    },
    quantityTotal: {
      required: true,
      min: 0.1,
      max: 9999,
      type: 'number',
      message: {
        required: '¿Cuánto cabe en total?',
        min: 'Mínimo 0.1',
        max: 'Máximo 9999',
        type: 'Debe ser un número'
      }
    },
    quantityCurrent: {
      required: true,
      min: 0,
      max: (context) => context?.quantityTotal || 9999,
      type: 'number',
      message: {
        required: '¿Cuánto hay ahora?',
        min: 'No puede ser negativo',
        max: 'No puede ser más que el total',
        type: 'Debe ser un número'
      }
    },
    lowStockThreshold: {
      required: true,
      min: 0.2, // ✅ MÍNIMO 20% (igual que en products.service.js)
      max: 1,
      type: 'number',
      message: 'Elige entre 20% y 100%'
    },
    expirationDate: {
      pattern: /^\d{4}-\d{2}-\d{2}$|^$/,
      message: 'Fecha inválida'
    }
  },

  // HOGAR
  household: {
    name: {
      required: true,
      minLength: 2,
      maxLength: 50,
      pattern: /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s\-']+$/,
      message: {
        required: 'Ponle nombre a tu hogar',
        minLength: 'Mínimo 2 letras',
        maxLength: 'Máximo 50 letras',
        pattern: 'Solo letras y números'
      }
    }
  },

  // LISTA DE COMPRAS
  shoppingItem: {
    productName: {
      required: true,
      minLength: 2,
      maxLength: 100,
      message: '¿Qué producto es?'
    },
    quantity: {
      required: true,
      min: 0.1,
      max: 999,
      type: 'number',
      message: 'Cantidad entre 0.1 y 999'
    }
  }
};

// Función simple para validar un campo
export const validateField = (fieldName, value, context = {}) => {
  const path = fieldName.split('.');
  let rule = validationRules;
  
  // Buscar la regla
  for (const key of path) {
    if (rule[key]) {
      rule = rule[key];
    } else {
      return { isValid: true, message: '' };
    }
  }

  // Validaciones básicas
  if (rule.required && (value === undefined || value === null || value === '')) {
    return { 
      isValid: false, 
      message: typeof rule.message === 'string' ? rule.message : rule.message?.required 
    };
  }

  // Números
  if (rule.type === 'number') {
    const numValue = Number(value);
    if (isNaN(numValue)) {
      return { 
        isValid: false, 
        message: typeof rule.message === 'string' ? rule.message : rule.message?.type 
      };
    }
    
    if (rule.min !== undefined && numValue < rule.min) {
      return { 
        isValid: false, 
        message: typeof rule.message === 'string' ? rule.message : rule.message?.min 
      };
    }
    
    let maxValue = rule.max;
    if (typeof maxValue === 'function') {
      maxValue = maxValue(context);
    }
    if (maxValue !== undefined && numValue > maxValue) {
      return { 
        isValid: false, 
        message: typeof rule.message === 'string' ? rule.message : rule.message?.max 
      };
    }
  }

  // Texto
  if (rule.minLength && String(value).length < rule.minLength) {
    return { 
      isValid: false, 
      message: typeof rule.message === 'string' ? rule.message : rule.message?.minLength 
    };
  }
  
  if (rule.maxLength && String(value).length > rule.maxLength) {
    return { 
      isValid: false, 
      message: typeof rule.message === 'string' ? rule.message : rule.message?.maxLength 
    };
  }

  // Patrón
  if (rule.pattern && value && !rule.pattern.test(String(value))) {
    return { 
      isValid: false, 
      message: typeof rule.message === 'string' ? rule.message : rule.message?.pattern 
    };
  }

  // Valores permitidos
  if (rule.allowedValues && value && !rule.allowedValues.includes(value)) {
    return { 
      isValid: false, 
      message: rule.message 
    };
  }

  return { isValid: true, message: '' };
};

// Validaciones específicas para Firestore
export const firestoreValidations = {
  // Validar que quantityCurrent no sea mayor que quantityTotal
  validateQuantity: (current, total) => {
    if (current > total) {
      return {
        isValid: false,
        message: `No puede haber más cantidad actual (${current}) que total (${total})`
      };
    }
    return { isValid: true, message: '' };
  },

  // Validar fecha de vencimiento (no en el pasado, máximo 5 años)
  validateExpirationDate: (dateString) => {
    if (!dateString) return { isValid: true, message: '' };
    
    try {
      const date = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (isNaN(date.getTime())) {
        return { isValid: false, message: 'Fecha inválida' };
      }
      
      if (date < today) {
        return { isValid: false, message: 'La fecha no puede ser en el pasado' };
      }
      
      // Máximo 5 años en el futuro
      const maxDate = new Date();
      maxDate.setFullYear(maxDate.getFullYear() + 5);
      
      if (date > maxDate) {
        return { isValid: false, message: 'La fecha no puede ser mayor a 5 años' };
      }
      
      return { isValid: true, message: '' };
    } catch {
      return { isValid: false, message: 'Fecha inválida' };
    }
  },

  // Validar código de invitación (6 caracteres alfanuméricos)
  validateInviteCode: (code) => {
    if (!code || code.length !== 6) {
      return { isValid: false, message: 'El código debe tener 6 caracteres' };
    }
    
    if (!/^[A-Z0-9]+$/.test(code)) {
      return { isValid: false, message: 'Solo letras mayúsculas y números' };
    }
    
    return { isValid: true, message: '' };
  },

  // Validar umbral mínimo 20% (igual que en products.service.js)
  validateLowStockThreshold: (threshold) => {
    const num = Number(threshold);
    if (isNaN(num)) {
      return { isValid: false, message: 'Debe ser un número' };
    }
    
    if (num < 0.2) {
      return { 
        isValid: false, 
        message: 'El mínimo es 20% para alertas efectivas'
      };
    }
    
    if (num > 1) {
      return { isValid: false, message: 'El máximo es 100%' };
    }
    
    return { isValid: true, message: '' };
  }
};