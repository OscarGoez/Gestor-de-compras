// api/household.service.js
import { 
  doc, 
  setDoc, 
  updateDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import { validateField, firestoreValidations } from '../utils/validationRules';

export const householdService = {

async createHousehold(userId, householdName) {
  try {
    console.log('🏠 Creando nuevo hogar:', { userId, householdName });

    // ✅ 1. VALIDAR NOMBRE
    const nameValidation = validateField('household.name', householdName);
    if (!nameValidation.isValid) {
      return { 
        success: false, 
        error: nameValidation.message 
      };
    }

    const name = householdName.trim();

    // ✅ 2. VERIFICAR SI EL USUARIO YA TIENE UN HOGAR
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('📋 Datos actuales del usuario:', userData);
      
      if (userData.householdId) {
        // Verificar si el hogar existe y está activo
        try {
          const existingHouseholdDoc = await getDoc(doc(db, 'households', userData.householdId));
          if (existingHouseholdDoc.exists() && existingHouseholdDoc.data().isActive !== false) {
            return {
              success: false,
              error: 'Ya tienes un hogar activo. Debes salirte primero desde Ajustes.',
              hasExistingHousehold: true
            };
          }
        } catch (error) {
          console.warn('⚠️ Error verificando hogar existente:', error);
        }
      }
    }

    // ✅ 3. VERIFICAR LÍMITES (mantener esta parte)
    const userHouseholdsQuery = query(
      collection(db, 'households'),
      where('members', 'array-contains', userId),
      where('isActive', '==', true),
      limit(4)
    );

    const userHouseholdsSnapshot = await getDocs(userHouseholdsQuery);
    if (userHouseholdsSnapshot.size >= 3) {
      return {
        success: false,
        error: 'Ya tienes 3 hogares activos (límite máximo)'
      };
    }

    // ✅ 4. CREAR EL HOGAR
    const householdRef = doc(collection(db, 'households'));
    const householdId = householdRef.id;

    const householdData = {
      id: householdId,
      name: name,
      createdBy: userId,
      members: [userId],
      isActive: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      inviteCode: this.generateInviteCode(),
      settings: {
        defaultLowStockThreshold: 20,
        defaultUnit: 'units',
        autoAddToShopping: true
      }
    };

    console.log('📝 Creando hogar con datos:', householdData);

    // ✅ 5. USAR UNA TRANSACCIÓN PARA GARANTIZAR CONSISTENCIA
    // Primero crear el hogar
    await setDoc(householdRef, householdData);
    
    // ✅ 6. ACTUALIZAR EL USUARIO CON TODOS LOS CAMPOS NECESARIOS
    const userUpdateData = {
      householdId: householdId,
      role: 'admin',
      householdPreferences: {
        language: 'es',
        units: 'metric'
      },
      updatedAt: serverTimestamp()
    };
    
    console.log('👤 Actualizando usuario con:', userUpdateData);
    
    await updateDoc(userDocRef, userUpdateData);

    console.log('✅ Hogar creado y usuario actualizado:', householdId);

    // ✅ 7. CREAR CATEGORÍAS POR DEFECTO
    await this.createDefaultCategories(householdId);

    return {
      success: true,
      householdId: householdId,
      householdData: householdData,
      message: `Hogar "${name}" creado exitosamente`
    };

  } catch (error) {
    console.error('❌ Error creando hogar:', error);
    console.error('❌ Detalles del error:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });

    const firestoreErrors = {
      'permission-denied': 'No tienes permiso para crear un hogar',
      'resource-exhausted': 'Límite de creación alcanzado. Intenta más tarde.',
      'failed-precondition': 'Se necesita crear un índice en Firestore'
    };

    return { 
      success: false, 
      error: firestoreErrors[error.code] || 'Error al crear el hogar. Detalles: ' + error.message 
    };
  }
},
  
  // Generar código de invitación único
  generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  },

  // Crear categorías por defecto para el nuevo hogar
  async createDefaultCategories(householdId) {
    try {
      const defaultCategories = [
        { name: 'Alimentos', color: '#4CAF50', icon: '🍎' },
        { name: 'Bebidas', color: '#2196F3', icon: '🥤' },
        { name: 'Limpieza', color: '#FF9800', icon: '🧼' },
        { name: 'Aseo Personal', color: '#9C27B0', icon: '🧴' },
        { name: 'Farmacia', color: '#F44336', icon: '💊' },
        { name: 'Otros', color: '#9E9E9E', icon: '📦' }
      ];
      
      // Buscar si ya existe la colección categories
      try {
        const categoriesQuery = query(
          collection(db, 'categories'),
          where('householdId', '==', householdId)
        );
        const existingCategories = await getDocs(categoriesQuery);
        
        // Si ya hay categorías, no crear duplicados
        if (!existingCategories.empty) {
          console.log('✅ Categorías ya existen para este hogar');
          return;
        }
      } catch (error) {
        console.warn('⚠️ Error verificando categorías existentes:', error);
      }
      
      const batch = [];
      
      for (const category of defaultCategories) {
        const categoryRef = doc(collection(db, 'categories'));
        const categoryData = {
          id: categoryRef.id,
          householdId: householdId,
          name: category.name,
          color: category.color,
          icon: category.icon,
          createdAt: serverTimestamp(),
          isDefault: true
        };
        
        batch.push(setDoc(categoryRef, categoryData));
      }
      
      // Ejecutar todas las inserciones
      await Promise.all(batch);
      console.log('✅ Categorías por defecto creadas para hogar:', householdId);
      
    } catch (error) {
      console.warn('⚠️ Error creando categorías por defecto:', error);
      // No fallar la creación del hogar por esto
    }
  },

  // Unirse a hogar existente por código de invitación
  async joinHousehold(userId, inviteCode) {
    try {
      console.log('🔗 Uniendo usuario a hogar:', { userId, inviteCode });
      
      // ✅ 1. VALIDAR CÓDIGO
      const codeValidation = firestoreValidations.validateInviteCode(inviteCode);
      if (!codeValidation.isValid) {
        return { success: false, error: codeValidation.message };
      }
      
      // ✅ 2. BUSCAR HOGAR POR CÓDIGO
      const q = query(
        collection(db, 'households'),
        where('inviteCode', '==', inviteCode.toUpperCase())
      );
      
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return { success: false, error: 'Código no encontrado o expirado' };
      }
      
      const householdDoc = querySnapshot.docs[0];
      const householdData = householdDoc.data();
      const householdId = householdDoc.id;
      
      // ✅ 3. VERIFICAR LÍMITES
      if (householdData.members.includes(userId)) {
        return { 
          success: false, 
          error: 'Ya eres miembro de este hogar' 
        };
      }
      
      // Límite de 10 miembros por hogar
      if (householdData.members.length >= 10) {
        return { 
          success: false, 
          error: 'Este hogar ya tiene el máximo de miembros (10)' 
        };
      }
      
      // ✅ 4. AGREGAR AL HOGAR
      const updatedMembers = [...householdData.members, userId];
      
      await updateDoc(doc(db, 'households', householdId), {
        members: updatedMembers,
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Usuario unido al hogar:', { userId, householdId });
      
      return {
        success: true,
        householdId: householdId,
        householdName: householdData.name,
        message: `Te has unido al hogar "${householdData.name}"`
      };
      
    } catch (error) {
      console.error('❌ Error uniéndose al hogar:', error);
      
      const firestoreErrors = {
        'permission-denied': 'No tienes permiso para unirte a este hogar',
        'resource-exhausted': 'Límite de operaciones alcanzado. Intenta más tarde.'
      };
      
      return { 
        success: false, 
        error: firestoreErrors[error.code] || 'Error al unirse al hogar' 
      };
    }
  },

  // Salir del hogar actual
  async leaveHousehold(userId) {
    try {
      console.log('🚪 Usuario saliendo del hogar:', userId);
      
      // Obtener datos del usuario
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        return { success: false, error: 'Usuario no encontrado' };
      }
      
      const userData = userDoc.data();
      const householdId = userData.householdId;
      
      if (!householdId) {
        return { success: false, error: 'No perteneces a ningún hogar' };
      }
      
      // Obtener datos del hogar
      const householdDoc = await getDoc(doc(db, 'households', householdId));
      if (!householdDoc.exists()) {
        return { success: false, error: 'Hogar no encontrado' };
      }
      
      const householdData = householdDoc.data();
      
      // Verificar si es el único miembro
      if (householdData.members.length === 1) {
        return { 
          success: false, 
          error: 'No puedes salirte siendo el único miembro. Elimina el hogar en su lugar.',
          isLastMember: true
        };
      }
      
      // Verificar si es el creador
      if (householdData.createdBy === userId) {
        // Transferir administración a otro miembro
        const otherMembers = householdData.members.filter(member => member !== userId);
        if (otherMembers.length > 0) {
          const newAdmin = otherMembers[0];
          await updateDoc(doc(db, 'households', householdId), {
            createdBy: newAdmin,
            members: otherMembers,
            updatedAt: serverTimestamp()
          });
          
          // Actualizar rol del nuevo admin
          await updateDoc(doc(db, 'users', newAdmin), {
            role: 'admin',
            updatedAt: serverTimestamp()
          });
        }
      } else {
        // Solo remover del array de miembros
        const updatedMembers = householdData.members.filter(member => member !== userId);
        await updateDoc(doc(db, 'households', householdId), {
          members: updatedMembers,
          updatedAt: serverTimestamp()
        });
      }
      
      // Quitar referencia del usuario
      await updateDoc(doc(db, 'users', userId), {
        householdId: null,
        role: null,
        updatedAt: serverTimestamp()
      });
      
      console.log('✅ Usuario salió del hogar:', { userId, householdId });
      
      return {
        success: true,
        message: 'Has salido del hogar exitosamente'
      };
      
    } catch (error) {
      console.error('❌ Error saliendo del hogar:', error);
      return { success: false, error: error.message };
    }
  },



  // Obtener datos del hogar
  async getHouseholdData(householdId) {
    try {
      if (!householdId) {
        return { success: false, error: 'ID de hogar requerido' };
      }
      
      const householdDoc = await getDoc(doc(db, 'households', householdId));
      if (householdDoc.exists()) {
        return { success: true, data: householdDoc.data() };
      }
      return { success: false, error: 'Hogar no encontrado' };
    } catch (error) {
      console.error('❌ Error obteniendo datos del hogar:', error);
      return { success: false, error: error.message };
    }
  },

  // Actualizar nombre del hogar
  async updateHouseholdName(householdId, newName) {
    try {
      if (!householdId || !newName.trim()) {
        return { success: false, error: 'Datos inválidos' };
      }
      
      await updateDoc(doc(db, 'households', householdId), {
        name: newName.trim(),
        updatedAt: new Date()
      });
      
      return { success: true, message: 'Nombre del hogar actualizado' };
    } catch (error) {
      console.error('❌ Error actualizando nombre del hogar:', error);
      return { success: false, error: error.message };
    }
  },

  // Obtener miembros del hogar
  async getHouseholdMembers(householdId) {
    try {
      if (!householdId) {
        return { success: false, error: 'ID de hogar requerido' };
      }
      
      // Obtener el documento del hogar
      const householdDoc = await getDoc(doc(db, 'households', householdId));
      if (!householdDoc.exists()) {
        return { success: false, error: 'Hogar no encontrado' };
      }
      
      const householdData = householdDoc.data();
      const memberIds = householdData.members || [];
      
      // Obtener datos de cada miembro
      const members = [];
      for (const memberId of memberIds) {
        try {
          const userDoc = await getDoc(doc(db, 'users', memberId));
          if (userDoc.exists()) {
            members.push({
              uid: memberId,
              ...userDoc.data(),
              // No incluir información sensible
              email: userDoc.data().email,
              name: userDoc.data().name || 'Usuario sin nombre',
              role: memberId === householdData.createdBy ? 'admin' : 'member',
              joinedAt: userDoc.data().createdAt
            });
          }
        } catch (error) {
          console.warn(`⚠️ Error obteniendo datos del miembro ${memberId}:`, error);
        }
      }
      
      return { success: true, members };
    } catch (error) {
      console.error('❌ Error obteniendo miembros del hogar:', error);
      return { success: false, error: error.message };
    }
  },

  // Invitar miembro al hogar
  async inviteMember(householdId, email) {
    try {
      if (!householdId || !email) {
        return { success: false, error: 'Datos inválidos' };
      }
      
      // Primero buscar el usuario por email
      const usersQuery = query(
        collection(db, 'users'),
        where('email', '==', email.toLowerCase().trim())
      );
      
      const userSnapshot = await getDocs(usersQuery);
      
      if (userSnapshot.empty) {
        return { 
          success: false, 
          error: 'No se encontró usuario con ese email. El usuario debe registrarse primero.' 
        };
      }
      
      const userDoc = userSnapshot.docs[0];
      const userId = userDoc.id;
      
      // Obtener el hogar actual
      const householdDoc = await getDoc(doc(db, 'households', householdId));
      if (!householdDoc.exists()) {
        return { success: false, error: 'Hogar no encontrado' };
      }
      
      const householdData = householdDoc.data();
      const currentMembers = householdData.members || [];
      
      // Verificar si ya es miembro
      if (currentMembers.includes(userId)) {
        return { success: false, error: 'El usuario ya es miembro de este hogar' };
      }
      
      // Agregar al array de miembros
      await updateDoc(doc(db, 'households', householdId), {
        members: [...currentMembers, userId],
        updatedAt: new Date()
      });
      
      // También actualizar el usuario para que tenga referencia al hogar
      await updateDoc(doc(db, 'users', userId), {
        householdId: householdId,
        updatedAt: new Date()
      });
      
      return { 
        success: true, 
        message: 'Usuario invitado correctamente al hogar',
        invitedUser: {
          uid: userId,
          email: userDoc.data().email,
          name: userDoc.data().name
        }
      };
    } catch (error) {
      console.error('❌ Error invitando miembro:', error);
      return { success: false, error: error.message };
    }
  },

  // Remover miembro del hogar
  async removeMember(householdId, userId) {
    try {
      if (!householdId || !userId) {
        return { success: false, error: 'Datos inválidos' };
      }
      
      // Obtener el hogar
      const householdDoc = await getDoc(doc(db, 'households', householdId));
      if (!householdDoc.exists()) {
        return { success: false, error: 'Hogar no encontrado' };
      }
      
      const householdData = householdDoc.data();
      const currentMembers = householdData.members || [];
      
      // Verificar que no sea el único miembro
      if (currentMembers.length <= 1) {
        return { success: false, error: 'No puedes eliminar al único miembro del hogar' };
      }
      
      // Verificar que no sea el creador del hogar
      if (userId === householdData.createdBy) {
        return { success: false, error: 'No puedes eliminar al creador del hogar' };
      }
      
      // Filtrar el miembro a eliminar
      const updatedMembers = currentMembers.filter(memberId => memberId !== userId);
      
      // Actualizar el hogar
      await updateDoc(doc(db, 'households', householdId), {
        members: updatedMembers,
        updatedAt: new Date()
      });
      
      // Quitar la referencia al hogar del usuario
      await updateDoc(doc(db, 'users', userId), {
        householdId: null,
        updatedAt: new Date()
      });
      
      return { success: true, message: 'Miembro removido correctamente' };
    } catch (error) {
      console.error('❌ Error removiendo miembro:', error);
      return { success: false, error: error.message };
    }
  },  

  // Eliminar hogar (solo administrador)
  async deleteHousehold(householdId, userId) {
    try {
      if (!householdId || !userId) {
        return { success: false, error: 'Datos inválidos' };
      }
      
      // Verificar que el usuario sea el creador
      const householdDoc = await getDoc(doc(db, 'households', householdId));
      if (!householdDoc.exists()) {
        return { success: false, error: 'Hogar no encontrado' };
      }
      
      const householdData = householdDoc.data();
      if (householdData.createdBy !== userId) {
        return { success: false, error: 'Solo el creador del hogar puede eliminarlo' };
      }
      
      // Eliminar hogar
      await deleteDoc(doc(db, 'households', householdId));
      
      // Quitar referencia del hogar a todos los miembros
      const members = householdData.members || [];
      for (const memberId of members) {
        try {
          await updateDoc(doc(db, 'users', memberId), {
            householdId: null,
            updatedAt: new Date()
          });
        } catch (error) {
          console.warn(`⚠️ Error actualizando usuario ${memberId}:`, error);
        }
      }
      
      return { success: true, message: 'Hogar eliminado correctamente' };
    } catch (error) {
      console.error('❌ Error eliminando hogar:', error);
      return { success: false, error: error.message };
    }
  }
};