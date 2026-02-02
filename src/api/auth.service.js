// api/auth.service.js
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

export const authService = {
  // Registrar nuevo usuario
  async register(email, password, name) {
    try {
      console.log('📝 Registrando nuevo usuario:', email);
      
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Actualizar perfil con nombre
      await updateProfile(user, { displayName: name });
      
      // Crear documento de usuario en Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name: name,
        email: email,
        createdAt: new Date(),
        lastLogin: new Date(),
        settings: {
          notifications: {
            lowStock: true,
            expiration: true,
            newProducts: false
          },
          preferences: {
            units: 'metric',
            language: 'es'
          }
        }
      });
      
      console.log('✅ Usuario registrado exitosamente:', user.uid);
      return { success: true, user };
    } catch (error) {
      console.error('❌ Error registrando usuario:', error);
      return { success: false, error: error.message };
    }
  },

  // Iniciar sesión - VERSIÓN CORREGIDA CON MEJOR SINCRONIZACIÓN
  async login(email, password) {
    try {
      console.log('🔐 Iniciando sesión para:', email);
      
      // 1. Autenticar con Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      console.log('✅ Autenticación exitosa:', user.uid);
      
      // 2. Obtener datos COMPLETOS del usuario desde Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      let userData;
      
      if (!userDoc.exists()) {
        console.warn('⚠️ Usuario no encontrado en Firestore, creando documento...');
        
        // Crear documento si no existe
        const newUserData = {
          uid: user.uid,
          name: user.displayName || 'Usuario',
          email: user.email,
          createdAt: new Date(),
          lastLogin: new Date(),
          settings: {
            notifications: {
              lowStock: true,
              expiration: true,
              newProducts: false
            },
            preferences: {
              units: 'metric',
              language: 'es'
            }
          }
        };
        
        await setDoc(doc(db, 'users', user.uid), newUserData);
        userData = newUserData;
      } else {
        // 3. Actualizar último inicio de sesión
        await updateDoc(doc(db, 'users', user.uid), {
          lastLogin: new Date()
        });
        
        // 4. Obtener datos actualizados
        userData = userDoc.data();
      }
      
      console.log('📋 userData obtenido:', {
        name: userData.name,
        householdId: userData.householdId,
        hasHousehold: !!userData.householdId,
        householdIdLength: userData.householdId?.length
      });
      
      return { 
        success: true, 
        user,
        userData: userData 
      };
    } catch (error) {
      console.error('❌ Error iniciando sesión:', error);
      return { success: false, error: error.message };
    }
  },

  // Cerrar sesión
  async logout() {
    try {
      console.log('👋 Cerrando sesión');
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error('❌ Error cerrando sesión:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener información del usuario (para uso externo)
  async getUserData(uid) {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        console.log('📄 getUserData para', uid, ':', {
          householdId: data.householdId,
          hasHousehold: !!data.householdId
        });
        return { success: true, data };
      }
      return { success: false, error: 'Usuario no encontrado' };
    } catch (error) {
      console.error('❌ Error obteniendo datos de usuario:', error);
      return { success: false, error: error.message };
    }
  },

  // Función para actualizar datos del usuario
  async updateUserData(uid, updates) {
    try {
      await updateDoc(doc(db, 'users', uid), {
        ...updates,
        updatedAt: new Date()
      });
      return { success: true };
    } catch (error) {
      console.error('❌ Error actualizando datos de usuario:', error);
      return { success: false, error: error.message };
    }
  }
};