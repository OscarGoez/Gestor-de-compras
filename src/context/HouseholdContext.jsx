// context/HouseholdContext.jsx - VERSIÓN CORREGIDA
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { householdService } from '../api/household.service';

const HouseholdContext = createContext();

export const useHousehold = () => {
  const context = useContext(HouseholdContext);
  if (!context) {
    throw new Error('useHousehold debe usarse dentro de HouseholdProvider');
  }
  return context;
};

export const HouseholdProvider = ({ children }) => {
  const { user, userData, refreshUserData } = useAuth();
  const [household, setHousehold] = useState(null);
  const [members, setMembers] = useState([]); // SIEMPRE array vacío por defecto
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);

  // Función mejorada para cargar miembros
  const loadHouseholdMembers = useCallback(async (householdId) => {
    if (!householdId) {
      setMembers([]);
      return;
    }
    
    try {
      console.log('👥 Cargando miembros para household:', householdId);
      const membersResult = await householdService.getHouseholdMembers(householdId);
      
      if (membersResult.success) {
        // Asegurar que siempre sea un array
        const safeMembers = Array.isArray(membersResult.members) 
          ? membersResult.members 
          : [];
        console.log('✅ Miembros cargados:', safeMembers.length);
        setMembers(safeMembers);
      } else {
        console.warn('⚠️ No se pudieron cargar miembros, usando array vacío');
        setMembers([]);
      }
    } catch (err) {
      console.error('❌ Error cargando miembros:', err);
      setMembers([]); // En caso de error, array vacío
    }
  }, []);

  // Carga de datos del hogar mejorada
  const loadHouseholdData = useCallback(async () => {
    console.log('🏠 loadHouseholdData llamado:', {
      userData: !!userData,
      householdId: userData?.householdId
    });
    
    // Si no hay userData o no tiene householdId, limpiar todo
    if (!userData || !userData.householdId) {
      console.log('🔄 No hay householdId, limpiando datos');
      setHousehold(null);
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Cargar datos del hogar
      console.log('📥 Cargando datos del hogar:', userData.householdId);
      const householdResult = await householdService.getHouseholdData(userData.householdId);
      
      if (householdResult.success && householdResult.data) {
        console.log('✅ Hogar cargado:', householdResult.data.name);
        setHousehold(householdResult.data);
        
        // 2. Cargar miembros del hogar
        await loadHouseholdMembers(userData.householdId);
      } else {
        console.warn('⚠️ No se encontró el hogar:', householdResult.error);
        setHousehold(null);
        setMembers([]);
      }
    } catch (err) {
      console.error('❌ Error cargando datos del hogar:', err);
      setError(err.message);
      setHousehold(null);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [userData, loadHouseholdMembers]);

  // Efecto para cargar datos cuando cambia userData
  useEffect(() => {
    const loadData = async () => {
      console.log('🔄 Household useEffect:', {
        userData: !!userData,
        hasHouseholdId: !!userData?.householdId
      });
      
      if (userData) {
        await loadHouseholdData();
      } else {
        // Si no hay userData, establecer estados por defecto
        setHousehold(null);
        setMembers([]);
        setLoading(false);
      }
    };
    
    loadData();
  }, [userData, loadHouseholdData]);

  // Resto de funciones (createHousehold, joinHousehold, etc.)...
  // Mantener el código existente pero asegurar que actualicen members

  const createHousehold = async (householdName) => {
    if (!user) {
      throw new Error('No hay usuario autenticado');
    }
    
    if (!householdName?.trim()) {
      throw new Error('El nombre del hogar es requerido');
    }
    
    setCreating(true);
    setError(null);
    
    try {
      console.log('🏠 Creando hogar desde contexto:', householdName);
      
      // 1. Crear el hogar en Firestore
      const result = await householdService.createHousehold(user.uid, householdName);
      
      if (result.success) {
        console.log('✅ Hogar creado en Firestore:', result.householdId);
        
        // 2. CRÍTICO: Esperar 1 segundo para que Firestore propague los cambios
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 3. Forzar recarga COMPLETA del AuthContext
        console.log('🔄 Forzando recarga de AuthContext...');
        await refreshUserData();
        
        // 4. Esperar un poco más para que AuthContext se actualice
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 5. Cargar datos del hogar MANUALMENTE
        console.log('📥 Cargando datos del nuevo hogar...');
        await loadHouseholdData();
        
        // 6. Verificar que todo se cargó correctamente
        console.log('✅ Estado final:', {
          householdId: result.householdId,
          householdData: household,
          members: members.length
        });
        
        return {
          success: true,
          householdId: result.householdId,
          message: result.message
        };
      } else {
        if (result.hasExistingHousehold) {
          throw new Error(result.error);
        }
        throw new Error(result.error || 'Error al crear hogar');
      }
    } catch (error) {
      console.error('❌ Error en createHousehold:', error);
      setError(error.message);
      throw error;
    } finally {
      setCreating(false);
    }
  };

  // Asegurar que todas las funciones que modifican el hogar actualicen members
  const updateHouseholdName = async (newName) => {
    try {
      if (!household?.id) throw new Error('No hay hogar seleccionado');
      
      const result = await householdService.updateHouseholdName(household.id, newName);
      if (result.success) {
        setHousehold(prev => ({ ...prev, name: newName }));
        return result;
      }
      throw new Error(result.error);
    } catch (error) {
      console.error('❌ Error actualizando nombre:', error);
      throw error;
    }
  };

  const inviteMember = async (email) => {
    try {
      if (!household?.id) throw new Error('No hay hogar seleccionado');
      
      const result = await householdService.inviteMember(household.id, email);
      if (result.success) {
        // Recargar miembros
        await loadHouseholdMembers(household.id);
      }
      return result;
    } catch (error) {
      console.error('❌ Error invitando miembro:', error);
      throw error;
    }
  };

  const removeMember = async (userId) => {
    try {
      if (!household?.id) throw new Error('No hay hogar seleccionado');
      
      const result = await householdService.removeMember(household.id, userId);
      if (result.success) {
        // Recargar miembros
        await loadHouseholdMembers(household.id);
      }
      return result;
    } catch (error) {
      console.error('❌ Error removiendo miembro:', error);
      throw error;
    }
  };

  const value = {
    // Datos del hogar
    household,
    householdId: household?.id || null,
    householdData: household,
    
    // Miembros - SIEMPRE array
    members: Array.isArray(members) ? members : [],
    
    // Estados
    loading,
    error,
    creating,
    
    // Funciones
    createHousehold,
    joinHousehold: async (inviteCode) => {
      if (!user) throw new Error('No hay usuario autenticado');
      
      setCreating(true);
      try {
        const result = await householdService.joinHousehold(user.uid, inviteCode);
        if (result.success) {
          await refreshUserData();
          await loadHouseholdData();
        }
        return result;
      } finally {
        setCreating(false);
      }
    },
    
    leaveHousehold: async () => {
      if (!user) throw new Error('No hay usuario autenticado');
      
      setCreating(true);
      try {
        const result = await householdService.leaveHousehold(user.uid);
        if (result.success) {
          setHousehold(null);
          setMembers([]);
        }
        return result;
      } finally {
        setCreating(false);
      }
    },
    
    updateHouseholdName,
    inviteMember,
    removeMember,
    
    deleteHousehold: async () => {
      if (!household?.id || !user) throw new Error('No hay hogar seleccionado');
      
      try {
        const result = await householdService.deleteHousehold(household.id, user.uid);
        if (result.success) {
          setHousehold(null);
          setMembers([]);
        }
        return result;
      } catch (error) {
        console.error('❌ Error eliminando hogar:', error);
        throw error;
      }
    },
    
    reloadHousehold: loadHouseholdData,
    reloadMembers: () => household?.id ? loadHouseholdMembers(household.id) : setMembers([])
  };

  return (
    <HouseholdContext.Provider value={value}>
      {children}
    </HouseholdContext.Provider>
  );
};