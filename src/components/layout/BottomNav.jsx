// src/components/layout/BottomNav.jsx
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Package, 
  ChefHat,
  ShoppingCart, 
  BarChart3,
  Bookmark,  
  Calendar,
  Settings
} from 'lucide-react';

const BottomNav = () => {
  const location = useLocation();
  
  // Ocultar en rutas de autenticación
  const hiddenRoutes = ['/login', '/register', '/onboarding'];
  if (hiddenRoutes.includes(location.pathname)) return null;

  const navItems = [
    { 
      id: 'inicio', 
      icon: Home, 
      label: 'Inicio', 
      path: '/dashboard',
      color: 'text-primary-600'
    },
    { 
      id: 'productos', 
      icon: Package, 
      label: 'Productos', 
      path: '/products',
      color: 'text-green-600'
    },
    { 
      id: 'cocina', 
      icon: ChefHat, 
      label: 'Cocina', 
      path: '/kitchen',
      color: 'text-orange-600'
    },
    { 
      id: 'recetas', 
      icon: Bookmark, 
      label: 'Mis Recetas', 
      path: '/saved-recipes',
      color: 'text-purple-600'
    },
    { 
      id: 'compras', 
      icon: ShoppingCart, 
      label: 'Compras', 
      path: '/shopping-list',
      color: 'text-red-600'
    },
    { 
      id: 'stats', 
      icon: BarChart3, 
      label: 'Stats', 
      path: '/analytics',
      color: 'text-purple-600'
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg md:hidden z-50">
      <div className="flex justify-between items-center max-w-7xl mx-auto px-4 py-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) => 
                `flex flex-col items-center py-1 px-3 rounded-lg transition-all ${
                  isActive ? 'scale-110' : 'opacity-70 hover:opacity-100'
                }`
              }
            >
              <Icon 
                className={`h-6 w-6 mb-1 ${
                  isActive ? item.color : 'text-gray-600'
                }`} 
              />
              <span className={`text-xs font-medium ${
                isActive ? item.color : 'text-gray-600'
              }`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;