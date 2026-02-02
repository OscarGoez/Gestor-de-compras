// Función segura para convertir cualquier formato de fecha de Firestore a Date
export function safeFirestoreDateToDate(dateValue) {
  if (!dateValue) return null;
  
  try {
    // Si ya es Date
    if (dateValue instanceof Date) {
      return dateValue;
    }
    
    // Si es Timestamp de Firestore (v9+)
    if (dateValue.toDate && typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }
    
    // Si es objeto con seconds/nanoseconds (v8)
    if (dateValue.seconds) {
      return new Date(dateValue.seconds * 1000);
    }
    
    // Si es string ISO
    if (typeof dateValue === 'string') {
      const date = new Date(dateValue);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Si es número (timestamp)
    if (typeof dateValue === 'number') {
      return new Date(dateValue);
    }
    
    return null;
  } catch (error) {
    console.error('Error convirtiendo fecha de Firestore:', error, dateValue);
    return null;
  }
}

// Función para formatear fecha
export function formatFirestoreDate(dateValue, options = {}) {
  const date = safeFirestoreDateToDate(dateValue);
  if (!date) return 'N/A';
  
  const defaultOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  };
  
  return date.toLocaleDateString('es-ES', { ...defaultOptions, ...options });
}

// Función para verificar si está vencido
export function isFirestoreDateExpired(dateValue) {
  const date = safeFirestoreDateToDate(dateValue);
  if (!date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return date < today;
}

// Función para verificar si está por vencer (en los próximos X días)
export function isFirestoreDateExpiringSoon(dateValue, days = 7) {
  const date = safeFirestoreDateToDate(dateValue);
  if (!date) return false;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const diffTime = date - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays <= days && diffDays >= 0;
}