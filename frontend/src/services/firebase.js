import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth as getFirebaseAuth, signInWithEmailAndPassword, signInWithPopup, signInWithRedirect, getRedirectResult, GoogleAuthProvider, signOut as firebaseSignOut, onAuthStateChanged, createUserWithEmailAndPassword } from 'firebase/auth';

// Colecciones de Firebase
export const COLLECTIONS = {
  PRODUCTS: 'products',
  SALES: 'sales',
  INVENTORY: 'inventory',
  TRANSACTIONS: 'transactions',
};

// Variable para almacenar la app inicializada
let firebaseApp = null;
let db = null;
let auth = null;

// Función para obtener la instancia de Firestore
export const getDb = () => {
  if (!db && firebaseApp) {
    db = getFirestore(firebaseApp);
  }
  return db;
};

// Función para obtener la instancia de Auth
export const getAuth = () => {
  if (!auth && firebaseApp) {
    auth = getFirebaseAuth(firebaseApp);
  }
  return auth;
};

// Exportamos la instancia de db para compatibilidad
export { db };

// Configuración de Firebase desde variables de entorno
export const initializeFirebase = async () => {
  try {
    if (firebaseApp) {
      console.log('Firebase ya está inicializado');
      return firebaseApp;
    }

    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
    };

    console.log('Configuración Firebase:', {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY ? 'OK' : 'MISSING',
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ? 'OK' : 'MISSING',
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ? 'OK' : 'MISSING',
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ? 'OK' : 'MISSING',
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ? 'OK' : 'MISSING',
      appId: import.meta.env.VITE_FIREBASE_APP_ID ? 'OK' : 'MISSING'
    });
    
    console.log('Inicializando Firebase con proyecto:', firebaseConfig.projectId);
    console.log('AuthDomain configurado:', firebaseConfig.authDomain);

    // Validar que todas las configuraciones necesarias estén presentes
    if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
      throw new Error('Configuración de Firebase incompleta. Verifica las variables de entorno.');
    }
    
    firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp);
    auth = getFirebaseAuth(firebaseApp);
    
    console.log('Firebase inicializado correctamente');
    console.log('Auth instance creada:', !!auth);
    
    return firebaseApp;
  } catch (error) {
    console.error("Error al inicializar Firebase:", error);
    throw error;
  }
};

// Servicios de autenticación
export const authService = {
  // Login con email y password
  signInWithEmail: async (email, password) => {
    const authInstance = getAuth();
    if (!authInstance) {
      throw new Error('Firebase Auth no está inicializado');
    }
    return await signInWithEmailAndPassword(authInstance, email, password);
  },

  // Login con Google
  signInWithGoogle: async () => {
    const authInstance = getAuth();
    if (!authInstance) {
      throw new Error('Firebase Auth no está inicializado');
    }
    
    const provider = new GoogleAuthProvider();
    // Configurar el provider para forzar la selección de cuenta
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    try {
      console.log('Iniciando Google login con popup...');
      const result = await signInWithPopup(authInstance, provider);
      console.log('Google login exitoso:', result.user.email);
      return result;
    } catch (error) {
      console.error('Error en signInWithGoogle:', error);
      
      // Manejo específico de errores de Google Auth
      if (error.code === 'auth/popup-closed-by-user') {
        throw new Error('Login cancelado por el usuario');
      } else if (error.code === 'auth/popup-blocked') {
        throw new Error('Popup bloqueado por el navegador. Permite popups para este sitio.');
      } else if (error.code === 'auth/unauthorized-domain') {
        throw new Error('Dominio no autorizado para Google Auth');
      } else if (error.code === 'auth/internal-error') {
        throw new Error('Error interno de autenticación. Verifica la configuración de Firebase.');
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error('Google Auth no está habilitado en Firebase.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        throw new Error('Otra ventana de login está abierta.');
      }
      
      throw error;
    }
  },

  // Registro con email y password
  signUpWithEmail: async (email, password) => {
    const authInstance = getAuth();
    if (!authInstance) {
      throw new Error('Firebase Auth no está inicializado');
    }
    return await createUserWithEmailAndPassword(authInstance, email, password);
  },

  // Cerrar sesión
  signOut: async () => {
    const authInstance = getAuth();
    if (!authInstance) {
      throw new Error('Firebase Auth no está inicializado');
    }
    return await firebaseSignOut(authInstance);
  },

  // Observador de estado de autenticación
  onAuthStateChanged: (callback) => {
    const authInstance = getAuth();
    if (!authInstance) {
      throw new Error('Firebase Auth no está inicializado');
    }
    return onAuthStateChanged(authInstance, callback);
  },

  // Obtener usuario actual
  getCurrentUser: () => {
    const authInstance = getAuth();
    return authInstance ? authInstance.currentUser : null;
  },

  // Obtener resultado de redirect
  getRedirectResult: async () => {
    const authInstance = getAuth();
    if (!authInstance) {
      throw new Error('Firebase Auth no está inicializado');
    }
    return await getRedirectResult(authInstance);
  }
};

const firebaseService = {
  getCollection: (collectionName) => collection(db || getDb(), collectionName),
  getDocument: (collectionName, documentId) => doc(db || getDb(), collectionName, documentId),
  addDocument: (collectionName, data) => addDoc(collection(db || getDb(), collectionName), data),
  updateDocument: (collectionName, documentId, data) => updateDoc(doc(db || getDb(), collectionName, documentId), data),
  deleteDocument: (collectionName, documentId) => deleteDoc(doc(db || getDb(), collectionName, documentId)),
  getDocuments: async (collectionName) => {
    const snapshot = await getDocs(collection(db || getDb(), collectionName));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};

export default firebaseService;