// context/AuthContext.jsx 
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../api/firebase';
import { usersService } from '../api/users.service';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      
      if (firebaseUser) {
        // Usuario autenticado
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          metadata: firebaseUser.metadata
        });
        
        // Obtener datos adicionales del usuario
        try {
          const result = await usersService.getUserData(firebaseUser.uid);
          if (result.success) {
            setUserData(result.data);
          } else {
            console.warn('⚠️ No se pudieron obtener datos adicionales del usuario:', result.error);
            // Usar datos básicos
            setUserData({
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'Usuario',
              email: firebaseUser.email,
              createdAt: firebaseUser.metadata.creationTime ? 
                new Date(firebaseUser.metadata.creationTime) : new Date()
            });
          }
        } catch (err) {
          console.error('❌ Error cargando datos del usuario:', err);
          setError(err.message);
        }
      } else {
        // No hay usuario autenticado
        setUser(null);
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await auth.signOut();
      setUser(null);
      setUserData(null);
    } catch (error) {
      console.error('❌ Error cerrando sesión:', error);
      throw error;
    }
  };

  const refreshUserData = async () => {
    try {
      if (user?.uid) {
        const result = await usersService.getUserData(user.uid);
        if (result.success) {
          setUserData(result.data);
          return result.data;
        }
      }
      return null;
    } catch (error) {
      console.error('❌ Error refrescando datos de usuario:', error);
      return null;
    }
  }; 

  const setUserDataFromLogin = async (firebaseUser, userDataFromLogin = null) => {
    console.log('🔄 setUserDataFromLogin llamado:', {
      firebaseUser: firebaseUser?.uid,
      hasUserDataFromLogin: !!userDataFromLogin
    });

    if (firebaseUser) {
      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        metadata: firebaseUser.metadata
      });

      // Si tenemos userData del login, usarlo inmediatamente
      if (userDataFromLogin) {
        console.log('✅ Usando userData del login:', userDataFromLogin.householdId);
        setUserData(userDataFromLogin);
      } else {
        // Si no, cargar desde Firestore
        try {
          const result = await usersService.getUserData(firebaseUser.uid);
          if (result.success) {
            console.log('📋 userData cargado desde Firestore:', result.data.householdId);
            setUserData(result.data);
          }
        } catch (err) {
          console.error('❌ Error cargando userData:', err);
        }
      }
    }
  };

  const updateProfile = async (updates) => {
    try {
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }
      
      const result = await usersService.updateUserProfile(user.uid, updates);
      if (result.success) {
        // Actualizar estado local
        if (updates.name) {
          setUser(prev => ({ ...prev, displayName: updates.name }));
        }
        if (userData) {
          setUserData(prev => ({ ...prev, ...updates }));
        }
        return result;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('❌ Error actualizando perfil:', error);
      throw error;
    }
  };

  const changePassword = async (newPassword) => {
    try {
      const result = await usersService.changePassword(newPassword);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    } catch (error) {
      console.error('❌ Error cambiando contraseña:', error);
      throw error;
    }
  };

  const changeEmail = async (newEmail) => {
    try {
      const result = await usersService.changeEmail(newEmail);
      if (result.success) {
        // Actualizar estado local
        setUser(prev => ({ ...prev, email: newEmail }));
        if (userData) {
          setUserData(prev => ({ ...prev, email: newEmail }));
        }
      }
      return result;
    } catch (error) {
      console.error('❌ Error cambiando email:', error);
      throw error;
    }
  };

  const saveSettings = async (settings) => {
    try {
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }
      
      const result = await usersService.saveUserSettings(user.uid, settings);
      if (!result.success) {
        throw new Error(result.error);
      }
      return result;
    } catch (error) {
      console.error('❌ Error guardando configuración:', error);
      throw error;
    }
  };

  const exportData = async () => {
    try {
      if (!user) {
        throw new Error('No hay usuario autenticado');
      }
      
      return await usersService.exportUserData(user.uid);
    } catch (error) {
      console.error('❌ Error exportando datos:', error);
      throw error;
    }
  };

  const value = {
    user,
    userData,
    loading,
    error,
    logout,
    updateProfile,
    changePassword,
    changeEmail,
    saveSettings,
    exportData,
    refreshUserData,
    setUserDataFromLogin
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};