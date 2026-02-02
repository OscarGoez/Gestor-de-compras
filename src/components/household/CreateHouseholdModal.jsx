// components/household/CreateHouseholdModal.jsx - VERSIÓN CORREGIDA
import React, { useState } from 'react';
import { 
  Home, 
  Plus, 
  Users, 
  Key,
  Check,
  AlertTriangle,
  X,
  Info // ← AGREGAR ESTE IMPORT
} from 'lucide-react';
import { useHousehold } from '../../context/HouseholdContext';
import Button from '../common/Button';
import Modal from '../common/Modal';

const CreateHouseholdModal = ({ isOpen, onClose, onSuccess }) => {
  const { createHousehold, joinHousehold, creating } = useHousehold();
  
  const [mode, setMode] = useState('create'); // 'create' o 'join'
  const [householdName, setHouseholdName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    
    // ✅ VALIDAR ANTES DE ENVIAR
    if (!householdName.trim()) {
      setError('Por favor ingresa un nombre para el hogar');
      return;
    }
    
    if (householdName.trim().length < 2) {
      setError('El nombre debe tener al menos 2 letras');
      return;
    }
    
    if (householdName.trim().length > 50) {
      setError('El nombre es demasiado largo (máx. 50 letras)');
      return;
    }
    
    setError(null);
    
    try {
      const result = await createHousehold(householdName.trim());
      
      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
          window.location.reload();
          onClose();
          resetForm();
        }, 2000);
      } else {
        // ✅ MOSTRAR ERRORES DE FIRESTORE AMIGABLEMENTE
        let userFriendlyError = result.error;
        
        if (result.error.includes('permission-denied')) {
          userFriendlyError = 'No tienes permiso para crear un hogar. Verifica tu sesión.';
        } else if (result.error.includes('resource-exhausted')) {
          userFriendlyError = 'Límite de creación alcanzado. Intenta más tarde.';
        } else if (result.hasExistingHousehold) {
          userFriendlyError = 'Ya tienes un hogar. Debes salirte primero desde Ajustes.';
        }
        
        setError(userFriendlyError);
      }
    } catch (error) {
      setError('Error inesperado. Intenta nuevamente.');
    }
  };
  
  const handleJoin = async (e) => {
    e.preventDefault();
    
    // ✅ VALIDAR CÓDIGO
    if (!inviteCode.trim()) {
      setError('Por favor ingresa el código de invitación');
      return;
    }
    
    if (inviteCode.trim().length !== 6) {
      setError('El código debe tener exactamente 6 caracteres');
      return;
    }
    
    setError(null);
    
    try {
      const result = await joinHousehold(inviteCode.trim().toUpperCase());
      
      if (result.success) {
        setSuccess(result.message);
        setTimeout(() => {
          onSuccess?.();
          onClose();
          resetForm();
        }, 1500);
      } else {
        // ✅ ERRORES AMIGABLES
        let userFriendlyError = result.error;
        
        if (result.error.includes('no encontrado')) {
          userFriendlyError = 'Código inválido o expirado. Pide el código nuevamente.';
        } else if (result.error.includes('máximo de miembros')) {
          userFriendlyError = 'Este hogar ya está lleno (10 miembros máximo).';
        } else if (result.error.includes('ya eres miembro')) {
          userFriendlyError = 'Ya formas parte de este hogar.';
        }
        
        setError(userFriendlyError);
      }
    } catch (error) {
      setError('Error al unirse. Verifica tu conexión.');
    }
  };

  const resetForm = () => {
    setHouseholdName('');
    setInviteCode('');
    setError(null);
    setSuccess(null);
    setMode('create');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm();
        onClose();
      }}
      title={mode === 'create' ? 'Crear nuevo hogar' : 'Unirse a hogar existente'}
      size="md"
    >
      <div className="space-y-6">
        {/* Selector de modo */}
        <div className="flex border-b">
          <button
            onClick={() => setMode('create')}
            className={`flex-1 py-3 font-medium text-center border-b-2 transition-colors ${
              mode === 'create'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Home className="inline-block h-5 w-5 mr-2" />
            Crear nuevo
          </button>
          <button
            onClick={() => setMode('join')}
            className={`flex-1 py-3 font-medium text-center border-b-2 transition-colors ${
              mode === 'join'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="inline-block h-5 w-5 mr-2" />
            Unirse a uno
          </button>
        </div>

        {/* Mensaje de éxito */}
        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <Check className="h-5 w-5 text-green-600 mr-3" />
              <p className="text-green-800 font-medium">{success}</p>
            </div>
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Formulario de creación */}
        {mode === 'create' && (
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre del hogar
              </label>
              <input
                type="text"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Ej: Casa de la familia, Mi departamento..."
                maxLength={50}
                disabled={creating}
              />
              <p className="text-xs text-gray-500 mt-1">
                Este nombre aparecerá en toda la aplicación
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2 flex items-center">
                <Info className="h-4 w-4 mr-2" /> {/* ← CORREGIDO */}
                ¿Qué es un hogar?
              </h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Espacio compartido para miembros de la familia</li>
                <li>• Inventario y lista de compras compartidos</li>
                <li>• Puedes invitar hasta 10 personas</li>
                <li>• Puedes salirte o eliminar el hogar en cualquier momento</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={creating}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={creating}
                disabled={creating || !householdName.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear hogar
              </Button>
            </div>
          </form>
        )}

        {/* Formulario para unirse */}
        {mode === 'join' && (
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código de invitación
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Ej: ABC123"
                  maxLength={6}
                  disabled={creating}
                  style={{ textTransform: 'uppercase' }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Pídele el código de 6 dígitos al administrador del hogar
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-900 mb-2 flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Al unirte a un hogar:
              </h4>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• Podrás ver todos los productos del hogar</li>
                <li>• Podrás modificar el inventario</li>
                <li>• Compartirás la lista de compras</li>
                <li>• El administrador puede removerte en cualquier momento</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={creating}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={creating}
                disabled={creating || !inviteCode.trim()}
              >
                <Users className="h-4 w-4 mr-2" />
                Unirse al hogar
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default CreateHouseholdModal;