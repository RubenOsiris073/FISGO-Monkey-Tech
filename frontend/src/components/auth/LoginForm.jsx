import React, { useState } from 'react';
import { Form, Button, Spinner } from 'react-bootstrap';
import { FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import './auth.css';

const LoginForm = ({ accessType = 'general', onBack, onLoginSuccess }) => {
  const { signInWithEmail, signInWithGoogle, error, loading, clearError } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Configuración según el tipo de acceso
  const accessConfig = {
    pos: {
      title: 'Punto de Venta',
      subtitle: 'Acceso al sistema de ventas',
      redirectPath: '/pos',
    },
    admin: {
      title: 'Panel de Administración',
      subtitle: 'Gestión completa del sistema',
      redirectPath: '/products',
    },
    general: {
      title: 'Iniciar Sesión',
      subtitle: 'Acceso al sistema',
      redirectPath: '/',
    }
  };

  const config = accessConfig[accessType] || accessConfig.general;

  // Función para obtener el dominio actual
  const getCurrentDomain = () => {
    return window.location.origin;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (error) {
      clearError();
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      return;
    }

    try {
      setIsSubmitting(true);
      await signInWithEmail(formData.email, formData.password);
      
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          navigate(config.redirectPath, { replace: true });
        }
      }, 100);
      
    } catch (error) {
      console.error('Error en login:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsSubmitting(true);
      clearError(); // Clear any previous errors
      await signInWithGoogle();
      
      setTimeout(() => {
        if (onLoginSuccess) {
          onLoginSuccess();
        } else {
          navigate(config.redirectPath, { replace: true });
        }
      }, 100);
      
    } catch (error) {
      console.error('Error en login con Google:', error);
      
      // Manejo específico para error de dominio no autorizado
      if (error.code === 'auth/unauthorized-domain') {
        const currentDomain = getCurrentDomain();
        console.error(`El dominio actual (${currentDomain}) no está autorizado para login con Google.`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-split-container">
      {/* Sección izquierda - Imagen */}
      <div className="auth-image-section">
        <div className="auth-image-overlay"></div>
        <div className="auth-image-content">
          <h1>
            <span className="brand-text">
              FISGO<sup className="brand-registered">®</sup>
            </span>
          </h1>
          <p>Sistema de gestión automatizado</p>
        </div>
      </div>

      {/* Sección derecha - Formulario */}
      <div className="auth-form-section">
        <div className="auth-form-container">
          {/* Back Button if needed */}
          {onBack && (
            <button className="auth-back-button" onClick={onBack}>
              <FaArrowLeft className="me-2" />
              Volver a selección
            </button>
          )}

          {/* Header */}
          <div className="auth-form-header">
            <div className="auth-logo">
              <h1>{config.title}</h1>
              <span className="auth-subtitle">{config.subtitle}</span>
            </div>
          </div>

          {/* Login Section */}
          <div className="auth-login-section">
            {/* Error Alert */}
            {error && (
              <div className="auth-error-message">
                <span>{error}</span>
                <button onClick={clearError} className="auth-error-close">×</button>
              </div>
            )}

            {/* Login Form */}
            <Form onSubmit={handleEmailLogin} className="auth-form">
              <div className="auth-form-group">
                <Form.Control
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Correo electrónico"
                  required
                  disabled={isSubmitting || loading}
                />
              </div>

              <div className="auth-form-group">
                <div className="password-input-wrapper">
                  <Form.Control
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Contraseña"
                    required
                    disabled={isSubmitting || loading}
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting || loading}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="auth-options">
                <div className="remember-me-section">
                  <Form.Check 
                    type="checkbox" 
                    id="rememberMe" 
                    label="Recordarme"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                  />
                </div>
                <button 
                  type="button" 
                  className="forgot-password-link"
                  onClick={() => alert('Funcionalidad de recuperación de contraseña próximamente')}
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting || loading || !formData.email || !formData.password}
                className="w-100"
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Iniciando sesión...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </Button>
            </Form>

            {/* Divider */}
            <div className="auth-divider">
              <span>o continúa con</span>
            </div>

            {/* Google Button */}
            <Button 
              variant="outline-secondary"
              onClick={handleGoogleLogin}
              disabled={isSubmitting || loading}
              className="w-100"
            >
              <FcGoogle size={20} className="me-2" />
              Google
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;