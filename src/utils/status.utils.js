// Este archivo es redundante ahora porque la función está en products.service.js
// Pero lo mantenemos por compatibilidad

export const calculateProductStatus = (quantityCurrent, quantityTotal, lowStockThreshold = 0.2) => {
  // Esta función ahora está duplicada en products.service.js
  // Mantenemos esta por compatibilidad con otros archivos
  
  if (quantityCurrent <= 0) {
    return 'out';
  }
  
  if (quantityTotal <= 0) {
    return 'available';
  }
  
  // Asegurar umbral mínimo 20%
  const safeThreshold = Math.max(0.2, lowStockThreshold);
  const thresholdValue = quantityTotal * safeThreshold;
  
  return quantityCurrent <= thresholdValue ? 'low' : 'available';
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'available':
      return 'green';
    case 'low':
      return 'amber';
    case 'out':
      return 'red';
    default:
      return 'gray';
  }
};

export const getStatusIcon = (status) => {
  switch (status) {
    case 'available':
      return '✅';
    case 'low':
      return '⚠️';
    case 'out':
      return '❌';
    default:
      return '❓';
  }
};