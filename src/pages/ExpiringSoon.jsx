// pages/ExpiringSoon.jsx 
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  AlertTriangle, 
  Clock, 
  Package,
  Search,
  Filter,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { useProducts } from '../hooks/useProducts';
import { useHousehold } from '../context/HouseholdContext';
import Header from '../components/layout/Header';
import Loader from '../components/common/Loader';
import Button from '../components/common/Button';

const ExpiringSoon = () => {
  const { products, loading } = useProducts();
  const { householdId } = useHousehold();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('daysLeft'); // daysLeft, name, category
  const [sortOrder, setSortOrder] = useState('asc'); // asc, desc
  const [filterBy, setFilterBy] = useState('all'); // all, week, month, expired

  // Función para calcular días restantes
  const getDaysLeft = (expirationDate) => {
    if (!expirationDate) return null;
    
    try {
      const expiration = expirationDate instanceof Date ? 
        expirationDate : 
        new Date(expirationDate);
      
      if (isNaN(expiration.getTime())) return null;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expiration.setHours(0, 0, 0, 0);
      
      const diffTime = expiration - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays;
    } catch {
      return null;
    }
  };

  // Filtrar y ordenar productos
  const getFilteredProducts = () => {
    let filtered = products.filter(product => {
      // Solo productos con fecha de vencimiento
      if (!product.expirationDate) return false;
      
      const daysLeft = getDaysLeft(product.expirationDate);
      if (daysLeft === null) return false;
      
      // Aplicar filtro por tiempo
      switch (filterBy) {
        case 'week':
          if (daysLeft > 7) return false;
          break;
        case 'month':
          if (daysLeft > 30) return false;
          break;
        case 'expired':
          if (daysLeft >= 0) return false;
          break;
        case 'all':
        default:
          // Mostrar todos con fecha de vencimiento
          break;
      }
      
      // Aplicar búsqueda
      if (searchTerm && !product.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      return true;
    });
    
    // Ordenar
    filtered.sort((a, b) => {
      const daysLeftA = getDaysLeft(a.expirationDate);
      const daysLeftB = getDaysLeft(b.expirationDate);
      
      let comparison = 0;
      
      switch (sortBy) {
        case 'daysLeft':
          comparison = (daysLeftA || 999) - (daysLeftB || 999);
          break;
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'category':
          comparison = (a.categoryId || '').localeCompare(b.categoryId || '');
          break;
        default:
          comparison = (daysLeftA || 999) - (daysLeftB || 999);
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  };

  const filteredProducts = getFilteredProducts();
  
  // Estadísticas
  const stats = {
    total: filteredProducts.length,
    expired: filteredProducts.filter(p => {
      const daysLeft = getDaysLeft(p.expirationDate);
      return daysLeft !== null && daysLeft < 0;
    }).length,
    thisWeek: filteredProducts.filter(p => {
      const daysLeft = getDaysLeft(p.expirationDate);
      return daysLeft !== null && daysLeft >= 0 && daysLeft <= 7;
    }).length,
    thisMonth: filteredProducts.filter(p => {
      const daysLeft = getDaysLeft(p.expirationDate);
      return daysLeft !== null && daysLeft >= 8 && daysLeft <= 30;
    }).length
  };

  // Obtener color según días restantes
  const getDaysLeftColor = (daysLeft) => {
    if (daysLeft === null) return 'gray';
    if (daysLeft < 0) return 'red';
    if (daysLeft <= 3) return 'red';
    if (daysLeft <= 7) return 'amber';
    if (daysLeft <= 14) return 'yellow';
    return 'green';
  };

  // Obtener texto para días restantes
  const getDaysLeftText = (daysLeft) => {
    if (daysLeft === null) return 'Sin fecha';
    if (daysLeft < 0) return `Vencido hace ${Math.abs(daysLeft)} día${Math.abs(daysLeft) !== 1 ? 's' : ''}`;
    if (daysLeft === 0) return 'Vence hoy';
    if (daysLeft === 1) return 'Vence mañana';
    return `Vence en ${daysLeft} días`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Próximos a vencer" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Loader message="Cargando productos..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Próximos a vencer" />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
        {/* Encabezado */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Productos próximos a vencer</h1>
          <p className="text-gray-600 mt-2">
            Monitorea las fechas de vencimiento de tus productos para evitar desperdicios
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-500">Total con fecha</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-500">Esta semana</p>
            <p className="text-2xl font-bold text-amber-600">{stats.thisWeek}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-500">Este mes</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.thisMonth}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-500">Vencidos</p>
            <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
          </div>
        </div>

        {/* Filtros y búsqueda */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Búsqueda */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            
            {/* Filtro por tiempo */}
            <div className="flex gap-2">
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Todos los productos</option>
                <option value="week">Próxima semana</option>
                <option value="month">Próximo mes</option>
                <option value="expired">Vencidos</option>
              </select>
              
              {/* Ordenar */}
              <button
                onClick={() => {
                  if (sortBy === 'daysLeft') {
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('daysLeft');
                    setSortOrder('asc');
                  }
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
              >
                {sortOrder === 'asc' ? (
                  <SortAsc className="h-4 w-4 mr-2" />
                ) : (
                  <SortDesc className="h-4 w-4 mr-2" />
                )}
                Ordenar
              </button>
            </div>
          </div>
        </div>

        {/* Lista de productos */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No se encontraron productos' : 'No hay productos con fecha de vencimiento'}
            </h3>
            <p className="text-gray-500 mb-6">
              {searchTerm 
                ? 'Intenta con otro término de búsqueda' 
                : 'Agrega fechas de vencimiento a tus productos para monitorearlos aquí'}
            </p>
            <Link to="/products">
              <Button variant="primary">
                Ir a Productos
              </Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Días restantes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha de vencimiento
                    </th>                                        
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>                    
                    
                    
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredProducts.map((product) => {
                    const daysLeft = getDaysLeft(product.expirationDate);
                    const color = getDaysLeftColor(daysLeft);
                    const daysText = getDaysLeftText(daysLeft);
                    
                    return (
                      <tr key={product.id} className="hover:bg-gray-50">

                      <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full mr-2 ${
                              color === 'red' ? 'bg-red-500' :
                              color === 'amber' ? 'bg-amber-500' :
                              color === 'yellow' ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}></div>
                            <span className={`text-sm font-medium ${
                              color === 'red' ? 'text-red-700' :
                              color === 'amber' ? 'text-amber-700' :
                              color === 'yellow' ? 'text-yellow-700' :
                              'text-green-700'
                            }`}>
                              {daysText}
                            </span>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                                <Package className="h-5 w-5 text-primary-600" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {product.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {product.quantityCurrent} {product.unit} de {product.quantityTotal}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.expirationDate ? (
                              new Date(product.expirationDate).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })
                            ) : 'Sin fecha'}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            product.status === 'available' ? 'bg-green-100 text-green-800' :
                            product.status === 'low' ? 'bg-amber-100 text-amber-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {product.status === 'available' ? 'Disponible' :
                             product.status === 'low' ? 'Bajo stock' : 'Agotado'}
                          </span>
                        </td>    
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                         
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Consejos */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-blue-900 mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-blue-600" />
            Recomendaciones para manejar vencimientos
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Para productos próximos a vencer:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Úsalos primero en tus comidas</li>
                <li>• Considera donarlos si no los usarás a tiempo</li>
                <li>• Planifica menús alrededor de estos productos</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Para productos ya vencidos:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Verifica si aún son seguros para consumir</li>
                <li>• Descarta productos de alto riesgo (carnes, lácteos)</li>
                <li>• Ajusta tus hábitos de compra para evitar desperdicio</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ExpiringSoon;