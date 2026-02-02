import React from 'react';
import { NavLink } from 'react-router-dom';

const BottomNav = () => {
  const navItems = [
    { id: 'inicio', icon: '🏠', label: 'Inicio', path: '/dashboard' },
    { id: 'productos', icon: '📦', label: 'Productos', path: '/products' },
    { id: 'compras', icon: '🛒', label: 'Compras', path: '/shopping-list' },
    { id: 'estadisticas', icon: '📊', label: 'Estadísticas', path: '/analytics' },
    { id: 'ajustes', icon: '⚙️', label: 'Ajustes', path: '/settings' },
  ];
  
  return (
    <nav className="bottom-nav">
      {navItems.map((item) => (
        <NavLink
          key={item.id}
          to={item.path}
          className={({ isActive }) => 
            `bottom-nav-item ${isActive ? 'active' : ''}`
          }
          end
        >
          <span className="bottom-nav-icon">{item.icon}</span>
          <span className="bottom-nav-label">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNav;