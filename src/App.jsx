// App.jsx - VERSIÓN COMPLETA CON SOPORTE OFFLINE
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { HouseholdProvider } from './context/HouseholdContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import ProtectedRoute from './auth/ProtectedRoute';
import Login from './auth/Login';
import Register from './auth/Register';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import ShoppingList from './pages/ShoppingList';
import Analytics from './pages/Analytics';
import ExpiringSoon from './pages/ExpiringSoon';
import Settings from './pages/Settings';
import BottomNav from './components/layout/BottomNav';
import { useOffline } from './hooks/useOffline';
import './styles/index.css';
import './App.css';

// Componente para mostrar estado de conexión
const ConnectionStatus = () => {
  const { isOffline, queueLength, isSyncing } = useOffline();
  
  if (!isOffline && queueLength === 0 && !isSyncing) return null;
  
  return (
    <div className="connection-status">
      {isOffline && (
        <div className="bg-yellow-500 text-white text-center p-2 text-sm font-medium">
          ⚠️ Modo offline - Los cambios se guardarán localmente
        </div>
      )}
      
      {isSyncing && (
        <div className="bg-blue-500 text-white text-center p-2 text-sm font-medium">
          🔄 Sincronizando cambios pendientes...
        </div>
      )}
      
      {!isOffline && queueLength > 0 && !isSyncing && (
        <div className="bg-green-500 text-white text-center p-2 text-sm font-medium">
          ✅ Conectado - {queueLength} cambio(s) pendiente(s)
        </div>
      )}
    </div>
  );
};

// Layout para las páginas protegidas
const AppLayout = ({ children }) => {
  return (
    <div className="app-layout min-h-screen bg-gray-50">
      <ConnectionStatus />
      <div className="app-content pb-20 md:pb-0">
        {children}
      </div>
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
};

// Componente principal
function App() {
  // Estado para forzar recarga cuando cambie conexión
  const [key, setKey] = useState(0);
  const { isOffline } = useOffline();
  
  // Forzar recarga cuando cambie el estado de conexión
  useEffect(() => {
    console.log('📡 Estado de conexión cambiado:', isOffline ? 'OFFLINE' : 'ONLINE');
    setKey(prev => prev + 1);
  }, [isOffline]);
  
  return (
    <ErrorBoundary key={key}>
      <Router>
        <AuthProvider>
          <HouseholdProvider>
            <Routes>
              {/* Rutas públicas */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Rutas protegidas */}
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/products" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Products />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/shopping-list" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ShoppingList />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/analytics" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Analytics />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/settings" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </ProtectedRoute>
              } />

              <Route path="/expiring" element={
                <ProtectedRoute>
                  <AppLayout>
                    <ExpiringSoon />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Redirección por defecto */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </HouseholdProvider>
        </AuthProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;