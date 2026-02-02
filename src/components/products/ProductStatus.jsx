import React from 'react';

const ProductStatus = ({ status }) => {
  const getStatusConfig = (status) => {
    switch (status) {
      case 'available':
        return {
          color: 'bg-green-100 text-green-800',
          text: 'Disponible',
          dot: 'bg-green-500'
        };
      case 'low':
        return {
          color: 'bg-amber-100 text-amber-800',
          text: 'Bajo stock',
          dot: 'bg-amber-500'
        };
      case 'out':
        return {
          color: 'bg-red-100 text-red-800',
          text: 'Agotado',
          dot: 'bg-red-500'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-800',
          text: 'Desconocido',
          dot: 'bg-gray-500'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
      <span className={`w-2 h-2 rounded-full mr-1.5 ${config.dot}`}></span>
      {config.text}
    </span>
  );
};

export default ProductStatus;