export const formatDate = (date) => {
  if (!date) return 'N/A';
  
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

export const formatDateTime = (date) => {
  if (!date) return 'N/A';
  
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const getDaysDifference = (date1, date2) => {
  const d1 = date1.toDate ? date1.toDate() : new Date(date1);
  const d2 = date2.toDate ? date2.toDate() : new Date(date2);
  
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const isExpiringSoon = (expirationDate, days = 7) => {
  if (!expirationDate) return false;
  
  const expiration = expirationDate.toDate ? expirationDate.toDate() : new Date(expirationDate);
  const today = new Date();
  
  const diffTime = expiration - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays <= days && diffDays >= 0;
};

export const isExpired = (expirationDate) => {
  if (!expirationDate) return false;
  
  const expiration = expirationDate.toDate ? expirationDate.toDate() : new Date(expirationDate);
  const today = new Date();
  
  return expiration < today;
};