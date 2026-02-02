import React from 'react';
import { Package, Menu, X, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Header = ({ title, showMenu, onMenuClick }) => {
  const { user } = useAuth();

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {showMenu && (
              <button
                onClick={onMenuClick}
                className="md:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <Menu className="h-6 w-6" />
              </button>
            )}
            <div className="flex items-center">
              <Package className="h-8 w-8 text-primary-600" />
              <h1 className="ml-3 text-xl font-semibold text-gray-900">
                {title || 'Inventario del Hogar'}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center text-sm text-gray-600">
              <User className="h-5 w-5 mr-2" />
              <span>{user?.displayName || user?.email}</span>
            </div>
          </div>
        </div>
      </div>
      
    </header>
  );
};

export default Header;