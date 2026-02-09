export const formatDate = (date, short = false) => {
  if (!date) return 'Nunca';
  
  try {
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    if (isNaN(dateObj.getTime())) return 'Fecha inválida';
    
    const now = new Date();
    const diffTime = now.getTime() - dateObj.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (short) {
      if (diffDays === 0) return 'Hoy';
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;
    }
    
    return dateObj.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: short ? 'short' : 'long',
      year: 'numeric'
    });
  } catch (error) {
    return 'Fecha inválida';
  }
};

export const formatDateShort = (date) => {
  if (!date) return 'Nunca';
  
  try {
    const dateObj = date.toDate ? date.toDate() : new Date(date);
    if (isNaN(dateObj.getTime())) return 'Fecha inválida';
    
    const now = new Date();
    const diffTime = now.getTime() - dateObj.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    
    return dateObj.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short'
    });
  } catch (error) {
    return 'Fecha inválida';
  }
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