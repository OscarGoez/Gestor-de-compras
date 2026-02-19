import React, { useState } from 'react';
import { 
  Package, 
  Battery,
  Calendar,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Minus,
  PackageOpen,
  RotateCcw,
  MoreVertical
} from 'lucide-react';

const ProductTable = ({ products, onConsume, onOpen, onRestore }) => {
  const [expandedRow, setExpandedRow] = useState(null);

  const getStatusIcon = (status) => {
    switch(status) {
      case 'out': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'low': return <TrendingDown className="h-4 w-4 text-amber-500" />;
      default: return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const formatQuantity = (product) => {
    return `${product.quantityCurrent}/${product.quantityTotal} ${product.unit}`;
  };

  const getProgressColor = (percentage) => {
    if (percentage <= 20) return 'bg-red-500';
    if (percentage <= 50) return 'bg-amber-500';
    return 'bg-green-500';
  };

  

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Producto
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Stock
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Estado
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Vencimiento
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {products.map((product) => {
            const percentage = product.quantityTotal > 0 
              ? Math.round((product.quantityCurrent / product.quantityTotal) * 100) 
              : 0;
            
            return (
              <React.Fragment key={product.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="p-2 bg-primary-50 rounded-lg mr-3">
                        <Package className="h-4 w-4 text-primary-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {product.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {product.category || 'Sin categoría'}
                        </div>
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatQuantity(product)}
                      </div>
                      <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${getProgressColor(percentage)}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(product.status)}
                      <span className="ml-2 text-sm text-gray-900">
                        {product.status === 'out' ? 'Agotado' : 
                         product.status === 'low' ? 'Bajo stock' : 
                         'Disponible'}
                      </span>
                    </div>
                  </td>
                  
                  <td className="px-4 py-3 whitespace-nowrap">
                    {product.expirationDate ? (
                      <div className="flex items-center text-sm text-gray-900">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        {new Date(product.expirationDate).toLocaleDateString('es-ES')}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Sin fecha</span>
                    )}
                  </td>
                  
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      {product.status !== 'out' && (
                        <button
                          onClick={() => onConsume(product.id, 1)}
                          className="p-1 text-primary-600 hover:bg-primary-50 rounded"
                          title="Consumir 1 unidad"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                      )}
                      
                      {product.status === 'out' && (
                        <button
                          onClick={() => onRestore(product.id)}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                          title="Restaurar"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => setExpandedRow(expandedRow === product.id ? null : product.id)}
                        className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                
                {/* Fila expandida */}
                {expandedRow === product.id && (
                  <tr>
                    <td colSpan="5" className="px-4 py-3 bg-gray-50">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <span className="text-xs text-gray-500">Última actualización</span>
                          <p className="text-sm">
                            {new Date(product.updatedAt).toLocaleDateString('es-ES')}
                          </p>
                        </div>
                        
                        <div>
                          <span className="text-xs text-gray-500">Umbral bajo stock</span>
                          <p className="text-sm">
                            {(product.lowStockThreshold * 100).toFixed(0)}%
                          </p>
                        </div>
                        
                        <div>
                          <span className="text-xs text-gray-500">En lista de compras</span>
                          <p className="text-sm">
                            {product.autoAddedToShopping ? 'Sí' : 'No'}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => onOpen(product.id)}
                            className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg"
                          >
                            <PackageOpen className="h-4 w-4 inline-block mr-1" />
                            Abrir
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};