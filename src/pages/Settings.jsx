// pages/Settings.jsx - VERSIÓN FUNCIONAL COMPLETA CORREGIDA
import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  User, 
  LogOut, 
  Shield,
  Bell,
  Globe,
  Save,
  Home,
  Users,
  Mail,
  Lock,
  Download,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  Plus,
  Eye,
  EyeOff,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHousehold } from '../context/HouseholdContext';
import { useNavigate } from 'react-router-dom';
import Header from '../components/layout/Header';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Loader from '../components/common/Loader';
import CreateHouseholdModal from '../components/household/CreateHouseholdModal';

const Settings = () => {
  const { 
    user, 
    userData, 
    logout, 
    updateProfile, 
    changePassword, 
    changeEmail, 
    saveSettings,
    exportData 
  } = useAuth();
  
  const { 
    household, 
    members, 
    createHousehold,
    joinHousehold,
    updateHouseholdName, 
    inviteMember, 
    removeMember,
    deleteHousehold,
    reloadHousehold 
  } = useHousehold();
  
  const navigate = useNavigate();
  
  // Estados para notificaciones
  const [notifications, setNotifications] = useState({
    lowStock: true,
    expiration: true,
    newProducts: false
  });
  
  // Estados para preferencias
  const [preferences, setPreferences] = useState({
    units: 'metric',
    language: 'es'
  });
  
  // Estados generales
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Estados para modales
  const [showChangeName, setShowChangeName] = useState(false);
  const [showChangeHouseholdName, setShowChangeHouseholdName] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeEmail, setShowChangeEmail] = useState(false);
  const [showDeleteHousehold, setShowDeleteHousehold] = useState(false);
  const [showCreateHouseholdModal, setShowCreateHouseholdModal] = useState(false); 
  const [mode, setMode] = useState('create');
  
  // Estados para formularios
  const [newName, setNewName] = useState('');
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Cargar configuración al inicio
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true);
      
      // Aquí cargarías la configuración desde Firestore
      // Por ahora usamos valores por defecto
      setNotifications({
        lowStock: true,
        expiration: true,
        newProducts: false
      });
      
      setPreferences({
        units: 'metric',
        language: 'es'
      });
      
      setLoading(false);
    };
    
    loadSettings();
  }, []);
  
  // Manejar logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      setError('Error al cerrar sesión: ' + error.message);
    }
  };
  
  // Guardar configuración
  const handleSaveSettings = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    
    try {
      const settings = {
        notifications,
        preferences
      };
      
      await saveSettings(settings);
      setSuccess('Configuración guardada correctamente');
    } catch (error) {
      setError('Error guardando configuración: ' + error.message);
    } finally {
      setSaving(false);
      
      // Limpiar mensajes después de 3 segundos
      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
    }
  };
  
  // Actualizar nombre de usuario
  const handleUpdateName = async () => {
    if (!newName.trim()) {
      setError('El nombre no puede estar vacío');
      return;
    }
    
    try {
      await updateProfile({ name: newName.trim() });
      setSuccess('Nombre actualizado correctamente');
      setShowChangeName(false);
      setNewName('');
    } catch (error) {
      setError('Error actualizando nombre: ' + error.message);
    }
  };
  
  // Actualizar nombre del hogar
  const handleUpdateHouseholdName = async () => {
    if (!newHouseholdName.trim()) {
      setError('El nombre del hogar no puede estar vacío');
      return;
    }
    
    try {
      await updateHouseholdName(newHouseholdName.trim());
      setSuccess('Nombre del hogar actualizado correctamente');
      setShowChangeHouseholdName(false);
      setNewHouseholdName('');
    } catch (error) {
      setError('Error actualizando nombre del hogar: ' + error.message);
    }
  };
  
  // Invitar miembro
  const handleInviteMember = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setError('Email inválido');
      return;
    }
    
    try {
      const result = await inviteMember(inviteEmail.trim());
      setSuccess(result.message || 'Invitación enviada correctamente');
      setShowInviteMember(false);
      setInviteEmail('');
      await reloadHousehold();
    } catch (error) {
      setError('Error invitando miembro: ' + error.message);
    }
  };
  
  // Cambiar contraseña
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    
    try {
      await changePassword(newPassword);
      setSuccess('Contraseña cambiada correctamente');
      setShowChangePassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setError('Error cambiando contraseña: ' + error.message);
    }
  };
  
  // Cambiar email
  const handleChangeEmail = async () => {
    if (!newEmail.trim() || !newEmail.includes('@')) {
      setError('Email inválido');
      return;
    }
    
    try {
      await changeEmail(newEmail.trim());
      setSuccess('Email cambiado correctamente');
      setShowChangeEmail(false);
      setNewEmail('');
    } catch (error) {
      setError('Error cambiando email: ' + error.message);
    }
  };
  
  // Exportar datos
  const handleExportData = async () => {
    try {
      const result = await exportData();
      if (result.success) {
        // Crear enlace de descarga
        const link = document.createElement('a');
        link.href = result.downloadUrl;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Liberar URL
        setTimeout(() => URL.revokeObjectURL(result.downloadUrl), 100);
        
        setSuccess('Datos exportados correctamente');
      } else {
        setError('Error exportando datos: ' + result.error);
      }
    } catch (error) {
      setError('Error exportando datos: ' + error.message);
    }
  };
  
  // Eliminar hogar
  const handleDeleteHousehold = async () => {
    try {
      await deleteHousehold();
      setSuccess('Hogar eliminado correctamente');
      setShowDeleteHousehold(false);
      navigate('/dashboard');
    } catch (error) {
      setError('Error eliminando hogar: ' + error.message);
    }
  };
  
  // Remover miembro
  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`¿Estás seguro de eliminar a ${memberName} del hogar?`)) {
      return;
    }
    
    try {
      await removeMember(memberId);
      setSuccess('Miembro removido correctamente');
      await reloadHousehold();
    } catch (error) {
      setError('Error removiendo miembro: ' + error.message);
    }
  };

  // Función para unirse a hogar
  const handleJoinHousehold = async (code) => {
    try {
      const result = await joinHousehold(code);
      setSuccess(result.message);
      await reloadHousehold();
      setTimeout(() => {
      window.location.reload();
        }, 1000);
      } catch (error) {
      setError(error.message);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Ajustes" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Loader />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Ajustes" />
      
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 md:pb-8">
        {/* Mensajes de éxito/error */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {success}
          </div>
        )}
        
        {/* Perfil de usuario */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="bg-primary-100 p-3 rounded-lg mr-4">
                <User className="h-6 w-6 text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900">Perfil de usuario</h2>
                <p className="text-sm text-gray-600">Información de tu cuenta</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewName(userData?.name || user?.displayName || '');
                setShowChangeName(true);
              }}
            >
              <Edit2 className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre
              </label>
              <div className="text-gray-900 font-medium">
                {userData?.name || user?.displayName || 'No especificado'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="text-gray-900">{user?.email}</div>
            </div>
          </div>
        </div>

        {/* Información del hogar */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="bg-green-100 p-3 rounded-lg mr-4">
                <Home className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-medium text-gray-900">Hogar</h2>
                <p className="text-sm text-gray-600">Información y miembros de tu hogar</p>
              </div>
            </div>
            {household && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewHouseholdName(household?.name || '');
                  setShowChangeHouseholdName(true);
                }}
              >
                <Edit2 className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
          
          {/* CONDICIÓN: mostrar contenido diferente si hay o no hogar */}
          {!household ? (
            <div className="text-center py-8">
              <Home className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No perteneces a ningún hogar
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Un hogar te permite compartir el inventario y lista de compras con familiares o compañeros de casa.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  variant="primary"
                  onClick={() => setShowCreateHouseholdModal(true)}
                  className="sm:w-auto"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Crear nuevo hogar
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setMode('join')}
                  className="sm:w-auto"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Unirse a hogar existente
                </Button>
              </div>

              <div className="mt-6 text-sm text-gray-500">
                <p>¿Ya tienes un código de invitación?</p>
                <button
                  onClick={() => {
                    const code = prompt('Ingresa el código de invitación (6 dígitos):');
                    if (code) {
                      handleJoinHousehold(code);
                    }
                  }}
                  className="text-primary-600 hover:text-primary-700 font-medium mt-1"
                >
                  Ingresar código aquí →
                </button>
              </div>
            </div>
          ) : (
            // CONTENIDO CUANDO SÍ HAY HOGAR
            <div>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del hogar
                  </label>
                  <div className="text-gray-900 font-medium">
                    {household.name}
                  </div>
                </div>
                
              </div>
              
              {/* Miembros del hogar */}
              <div className="border-t pt-6">                
                {members.length > 0 ? (
                  <div className="space-y-3">
                    {members.map((member) => (
                      <div key={member.uid} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div>
                          <div className="font-medium text-gray-900">
                            {member.name}
                            {member.uid === household.createdBy && (
                              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                Administrador
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{member.email}</div>
                        </div>
                        {member.uid !== user?.uid && member.uid !== household.createdBy && (
                          <button
                            onClick={() => handleRemoveMember(member.uid, member.name)}
                            className="text-red-600 hover:text-red-700 p-1"
                            title="Eliminar miembro"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    No hay miembros en el hogar
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notificaciones */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center mb-6">
            <div className="bg-blue-100 p-3 rounded-lg mr-4">
              <Bell className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-900">Notificaciones</h2>
              <p className="text-sm text-gray-600">Configura las alertas que deseas recibir</p>
            </div>
          </div>
          
          <div className="space-y-4">
            {Object.entries(notifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">
                    {key === 'lowStock' && 'Productos bajos de stock'}
                    {key === 'expiration' && 'Próximos a vencer'}
                    {key === 'newProducts' && 'Nuevos productos agregados'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {key === 'lowStock' && 'Recibir alertas cuando un producto esté bajo de stock'}
                    {key === 'expiration' && 'Alertas para productos que vencen pronto'}
                    {key === 'newProducts' && 'Notificaciones cuando se agreguen productos'}
                  </p>
                </div>
                <button
                  onClick={() => setNotifications(prev => ({
                    ...prev,
                    [key]: !prev[key]
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    value ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    value ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        

        {/* Seguridad y acciones */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <div className="flex items-center mb-6">
            <div className="bg-red-100 p-3 rounded-lg mr-4">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-gray-900">Seguridad y acciones</h2>
              <p className="text-sm text-gray-600">Controla tu seguridad y datos</p>
            </div>
          </div>
          
          <div className="space-y-3">
             <Button
              variant="danger"
              className="w-full justify-start"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Cerrar sesión
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowChangePassword(true)}
            >
              <Lock className="h-4 w-4 mr-2" />
              Cambiar contraseña
            </Button>
            
            
            {household && household.createdBy === user?.uid && (
              <Button
                variant="danger"
                className="w-full justify-start"
                onClick={() => setShowDeleteHousehold(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar hogar
              </Button>
            )}
            
          </div>
        </div>

        {/* Guardar cambios */}
        <div className="sticky bottom-0 bg-white border-t p-4 shadow-lg md:rounded-lg md:border md:static">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Haz clic en Guardar para aplicar los cambios
            </div>
            <Button
              variant="primary"
              onClick={handleSaveSettings}
              loading={saving}
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar cambios
            </Button>
          </div>
        </div>

        {/* Información de la aplicación */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p className="font-medium">Inventario del Hogar v1.0.0</p>
          <p className="mt-1">© {new Date().getFullYear()} - Aplicación para gestión doméstica</p>          
        </div>
      </main>

      {/* MODALES */}

      {/* Modal: Crear hogar */}
      <CreateHouseholdModal
        isOpen={showCreateHouseholdModal}
        onClose={() => setShowCreateHouseholdModal(false)}
        onSuccess={() => {
          setSuccess('¡Hogar creado exitosamente!');
          reloadHousehold();
        }}
      />

      {/* Modal: Cambiar nombre */}
      <Modal
        isOpen={showChangeName}
        onClose={() => setShowChangeName(false)}
        title="Cambiar nombre"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nuevo nombre
            </label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Tu nombre"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowChangeName(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdateName}
            >
              Guardar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Cambiar nombre del hogar */}
      <Modal
        isOpen={showChangeHouseholdName}
        onClose={() => setShowChangeHouseholdName(false)}
        title="Cambiar nombre del hogar"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nuevo nombre del hogar
            </label>
            <input
              type="text"
              value={newHouseholdName}
              onChange={(e) => setNewHouseholdName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Nombre del hogar"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowChangeHouseholdName(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleUpdateHouseholdName}
            >
              Guardar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Invitar miembro */}
      <Modal
        isOpen={showInviteMember}
        onClose={() => setShowInviteMember(false)}
        title="Invitar miembro al hogar"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email del miembro
            </label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="ejemplo@email.com"
            />
            <p className="text-sm text-gray-500 mt-2">
              El usuario debe estar registrado en la aplicación.
            </p>
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowInviteMember(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleInviteMember}
            >
              Invitar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Cambiar contraseña */}
      <Modal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
        title="Cambiar contraseña"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 pr-10"
                placeholder="Mínimo 6 caracteres"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Repite la contraseña"
            />
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setShowChangePassword(false);
                setNewPassword('');
                setConfirmPassword('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleChangePassword}
            >
              Cambiar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Cambiar email */}
      <Modal
        isOpen={showChangeEmail}
        onClose={() => setShowChangeEmail(false)}
        title="Cambiar email"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nuevo email
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="nuevo@email.com"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowChangeEmail(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleChangeEmail}
            >
              Cambiar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Eliminar hogar */}
      <Modal
        isOpen={showDeleteHousehold}
        onClose={() => setShowDeleteHousehold(false)}
        title="Eliminar hogar"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
              <div>
                <p className="font-medium text-red-900">¡Advertencia!</p>
                <p className="text-sm text-red-800 mt-1">
                  Esta acción eliminará permanentemente el hogar <strong>{household?.name}</strong> 
                  y todos sus datos asociados. Todos los miembros serán removidos.
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowDeleteHousehold(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteHousehold}
            >
              Eliminar permanentemente
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;