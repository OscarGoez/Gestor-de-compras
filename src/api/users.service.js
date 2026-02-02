// api/users.service.js
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { updateProfile, updatePassword, updateEmail } from 'firebase/auth';
import { auth, db } from './firebase';

export const usersService = {
  // Obtener datos del usuario
  async getUserData(uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        return { success: true, data: userDoc.data() };
      }
      return { success: false, error: 'Usuario no encontrado' };
    } catch (error) {
      console.error('❌ Error obteniendo datos de usuario:', error);
      return { success: false, error: error.message };
    }
  },

  // Actualizar perfil del usuario
  async updateUserProfile(uid, updates) {
    try {
      // Actualizar en Firestore
      await updateDoc(doc(db, 'users', uid), {
        ...updates,
        updatedAt: new Date()
      });
      
      // Actualizar en Firebase Auth si hay displayName
      if (updates.name && auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: updates.name
        });
      }
      
      return { success: true, message: 'Perfil actualizado correctamente' };
    } catch (error) {
      console.error('❌ Error actualizando perfil:', error);
      return { success: false, error: error.message };
    }
  },

  // Cambiar contraseña
  async changePassword(newPassword) {
    try {
      if (!auth.currentUser) {
        return { success: false, error: 'No hay usuario autenticado' };
      }
      
      await updatePassword(auth.currentUser, newPassword);
      return { success: true, message: 'Contraseña actualizada correctamente' };
    } catch (error) {
      console.error('❌ Error cambiando contraseña:', error);
      return { success: false, error: error.message };
    }
  },

  // Cambiar email
  async changeEmail(newEmail) {
    try {
      if (!auth.currentUser) {
        return { success: false, error: 'No hay usuario autenticado' };
      }
      
      await updateEmail(auth.currentUser, newEmail);
      
      // Actualizar en Firestore
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        email: newEmail,
        updatedAt: new Date()
      });
      
      return { success: true, message: 'Email actualizado correctamente' };
    } catch (error) {
      console.error('❌ Error cambiando email:', error);
      return { success: false, error: error.message };
    }
  },

  // Guardar configuración del usuario
  async saveUserSettings(uid, settings) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        settings: {
          ...settings,
          updatedAt: new Date()
        }
      });
      
      return { success: true, message: 'Configuración guardada' };
    } catch (error) {
      console.error('❌ Error guardando configuración:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener configuración del usuario
  async getUserSettings(uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return { 
          success: true, 
          settings: data.settings || getDefaultSettings() 
        };
      }
      return { success: false, error: 'Usuario no encontrado' };
    } catch (error) {
      console.error('❌ Error obteniendo configuración:', error);
      return { success: false, error: error.message };
    }
  },

  // Exportar datos del usuario
  async exportUserData(uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (!userDoc.exists()) {
        return { success: false, error: 'Usuario no encontrado' };
      }
      
      const userData = userDoc.data();
      
      // Aquí podrías agregar más datos (productos, historial, etc.)
      const exportData = {
        user: {
          ...userData,
          password: undefined // Nunca exportar contraseña
        },
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };
      
      // Convertir a JSON
      const jsonData = JSON.stringify(exportData, null, 2);
      
      // Crear archivo para descarga
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      return { 
        success: true, 
        downloadUrl: url,
        filename: `inventario-hogar-${uid}-${new Date().toISOString().split('T')[0]}.json`
      };
    } catch (error) {
      console.error('❌ Error exportando datos:', error);
      return { success: false, error: error.message };
    }
  }
};

// Configuración por defecto
function getDefaultSettings() {
  return {
    notifications: {
      lowStock: true,
      expiration: true,
      newProducts: false
    },
    preferences: {
      units: 'metric',
      language: 'es'
    },
    privacy: {
      showEmail: false,
      shareData: false
    }
  };
}