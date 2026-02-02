// /api/firebase.js - VERSIÓN OPTIMIZADA Y ESTABLE
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { 
  getFirestore, 
  enableIndexedDbPersistence
} from 'firebase/firestore';

// Configuración de Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Inicializar Firebase
console.log('🚀 Inicializando Firebase...');
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 🔥 INICIALIZAR FIRESTORE DE MANERA SIMPLE Y COMPATIBLE
const db = getFirestore(app);

// 🔥 HABILITAR PERSISTENCIA OFFLINE (versión simplificada y robusta)
console.log('💾 Configurando persistencia offline...');

enableIndexedDbPersistence(db)
  .then(() => {
    console.log('✅ Persistencia offline HABILITADA - La app funcionará sin conexión');
  })
  .catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Persistencia fallida: Múltiples pestañas abiertas.');
      console.info('💡 Cierra otras pestañas de la app o usa solo una pestaña para mejor experiencia offline');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ Persistencia no soportada en este navegador.');
      console.info('💡 Usa Chrome, Firefox o Edge para mejor experiencia offline');
    } else {
      console.warn('⚠️ Persistencia no disponible:', err.message);
    }
    console.info('📱 La app seguirá funcionando, pero algunos datos podrían no guardarse offline');
  });

// Estado de conexión global
let isOnline = navigator.onLine;

// Detectar cambios de conexión
const updateOnlineStatus = () => {
  const newStatus = navigator.onLine;
  if (newStatus !== isOnline) {
    isOnline = newStatus;
    const status = isOnline ? 'ONLINE ✅' : 'OFFLINE ⚠️';
    console.log(`📡 Estado de conexión: ${status}`);
    
    // Notificar a toda la app
    window.dispatchEvent(new CustomEvent('connection-changed', {
      detail: { isOnline }
    }));
  }
};

// Escuchar cambios de conexión
window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);

// Estado de autenticación (solo para debug)
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log('👤 Usuario autenticado:', user.email);
  } else {
    console.log('👤 No autenticado');
  }
});

// Función para verificar si Firestore está listo
export const waitForFirestore = () => {
  return new Promise((resolve) => {
    const check = () => {
      if (db) {
        resolve(true);
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
};

// Función para verificar conexión
export const checkConnection = () => isOnline;

// Función para simular datos offline si es necesario
export const getOfflineDemoData = (householdId) => {
  if (!isOnline) {
    console.log('📱 Usando datos de demostración (modo offline)');
    return [
      {
        id: 'offline-item-1',
        householdId: householdId || 'offline-demo',
        productName: 'Leche',
        reason: 'out',
        priority: 'high',
        quantity: 2,
        unit: 'l',
        addedAt: new Date(),
        notes: 'Agotado - Datos offline',
        checked: false
      },
      {
        id: 'offline-item-2',
        householdId: householdId || 'offline-demo',
        productName: 'Pan',
        reason: 'low',
        priority: 'medium',
        quantity: 1,
        unit: 'units',
        addedAt: new Date(Date.now() - 86400000), // Ayer
        notes: 'Bajo stock - Datos offline',
        checked: false
      }
    ];
  }
  return null;
};

console.log('✅ Firebase inicializado correctamente');
export { app, auth, db };