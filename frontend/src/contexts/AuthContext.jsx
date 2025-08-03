import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService.js';
import { authService as firebaseAuthService, initializeFirebase } from '../services/firebase.js';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribe;
    // Configurar listener de Firebase Auth
    try {
      unsubscribe = firebaseAuthService.onAuthStateChanged((firebaseUser) => {
        console.log('Firebase Auth state changed:', firebaseUser ? 'User logged in' : 'User logged out');
        if (firebaseUser) {
          setUser(firebaseUser);
        } else {
          setUser(null);
        }
        setLoading(false);
      });
    } catch (error) {
      console.error('Error configurando listener de autenticación:', error);
      setError('Error al configurar el sistema de autenticación');
      setLoading(false);
    }
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Login con JWT (para compatibilidad con backend)
  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await authService.login(email, password);
      setUser(response.user);
      
      return response;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Login con Firebase Auth
  const signInWithEmail = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      
      const result = await firebaseAuthService.signInWithEmail(email, password);
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Login con Google
  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const result = await firebaseAuthService.signInWithGoogle();
      console.log('Google login exitoso en AuthContext:', result.user.email);
      return result;
    } catch (error) {
      console.error('Error en signInWithGoogle en AuthContext:', error);
      
      // Manejo específico de errores comunes
      let errorMessage = 'Error al iniciar sesión con Google';
      
      if (error.message === 'Login cancelado por el usuario') {
        errorMessage = 'Login cancelado';
      } else if (error.message === 'Popup bloqueado por el navegador. Permite popups para este sitio.') {
        errorMessage = 'Por favor permite popups para este sitio';
      } else if (error.message === 'Dominio no autorizado para Google Auth') {
        errorMessage = 'Dominio no autorizado. Contacta al administrador.';
      } else if (error.message === 'Error interno de autenticación. Verifica la configuración de Firebase.') {
        errorMessage = 'Error de configuración. Contacta al administrador.';
      } else if (error.message === 'Google Auth no está habilitado en Firebase.') {
        errorMessage = 'Google Auth no está configurado correctamente.';
      } else if (error.message === 'Otra ventana de login está abierta.') {
        errorMessage = 'Ya hay una ventana de login abierta. Ciérrala e intenta de nuevo.';
      } else if (error.code) {
        errorMessage = `Error de autenticación (${error.code})`;
      }
      
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      
      // Cerrar sesión en Firebase
      await firebaseAuthService.signOut();
      
      // Cerrar sesión en el backend JWT (si aplica)
      if (authService.isAuthenticated()) {
        await authService.logout();
      }
      
      setUser(null);
    } catch (error) {
      console.error('Error en logout:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  const value = {
    user,
    loading,
    error,
    login,
    signInWithEmail,
    signInWithGoogle,
    logout,
    signOut: logout, // Alias para compatibilidad
    clearError,
    isAuthenticated: !!user,
    getAuthHeaders: () => authService.getAuthHeaders()
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;