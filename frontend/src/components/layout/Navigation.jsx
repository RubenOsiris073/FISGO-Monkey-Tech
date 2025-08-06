import React, { useState, useRef, useEffect } from 'react';
import { Nav } from 'react-bootstrap';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FaBoxes, 
  FaChartBar, 
  FaCog, 
  FaSignOutAlt, 
  FaStore,
  FaUser,
  FaMoneyBillWave,
  FaChartLine,
  FaReceipt,
  FaSun,
  FaMoon,
  FaArrowRight,
  FaArrowLeft,
  FaBell,
  FaCamera
} from 'react-icons/fa';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import '../../styles/layout/navigation.css';

const Navigation = ({ onSidebarToggle }) => {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  
  // Ref para preservar la posición del scroll del contenido principal
  const scrollPositionRef = useRef(0);

  // Función para manejar el toggle del sidebar con preservación completa de scroll
  const handleSidebarToggle = () => {
    const mainContent = document.querySelector('.main-content-with-sidebar');
    const sidebar = document.querySelector('.sidebar-navigation');
    
    // Guardar la posición actual del scroll
    if (mainContent) {
      scrollPositionRef.current = mainContent.scrollTop;
    }
    
    // Actualizar estado local y global
    const newCollapsed = !collapsed;
    setCollapsed(newCollapsed);
    
    // Asegurar que la barra de navegación se mantiene en su posición de scroll actual
    if (sidebar) {
      const currentScrollTop = sidebar.scrollTop;
      setTimeout(() => {
        sidebar.scrollTop = currentScrollTop;
      }, 50);
    }
    
    // Notificar al componente padre para actualizar las clases del contenido principal
    if (onSidebarToggle) {
      onSidebarToggle(newCollapsed);
    }
    
    // Restaurar la posición del scroll después de la transición
    setTimeout(() => {
      if (mainContent) {
        mainContent.scrollTop = scrollPositionRef.current;
      }
    }, 50);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  // Función para obtener el nombre a mostrar del usuario
  const getUserDisplayName = () => {
    if (user?.displayName) {
      return user.displayName;
    }
    if (user?.email) {
      return user.email.split('@')[0]; // Usar la parte antes del @ del email
    }
    return 'Usuario';
  };

  // Debug para verificar datos del usuario
  useEffect(() => {
    if (user) {
      console.log('Navigation - User data:', {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        uid: user.uid
      });
      // Reset avatar error cuando cambie el usuario
      setAvatarError(false);
    }
  }, [user]);

  // Verificar si un enlace está activo
  const isActive = (path) => {
    return location.pathname.startsWith(path);
  };

  return (
    <nav className={`sidebar-navigation ${collapsed ? 'collapsed' : ''}`}>
      {/* Header del Sidebar con Logo y Usuario */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          {!collapsed ? (
            <>
              <span className="sidebar-brand-text">  Panel</span>
            </>
          ) : (
            <FaStore className="sidebar-logo-icon-collapsed" />
          )}
        </div>
        
        {/* Perfil de usuario */}
        <div className="sidebar-user-profile">
          {user?.photoURL && !avatarError ? (
            <img 
              src={user.photoURL} 
              alt="Avatar" 
              className="sidebar-avatar"
              onError={(e) => {
                console.log('Error cargando imagen de perfil:', e.target.src);
                setAvatarError(true);
              }}
              onLoad={() => {
                console.log('Imagen de perfil cargada correctamente:', user.photoURL);
                setAvatarError(false);
              }}
            />
          ) : (
            <div className="sidebar-user-icon">
              <FaUser />
            </div>
          )}
          {!collapsed && (
            <div className="sidebar-user-info">
              <h6 className="sidebar-user-name">{getUserDisplayName()}</h6>
              <span className="sidebar-user-role">
                {user?.role || 'Usuario'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Menú Principal */}
      <Nav className="sidebar-menu">
        {/* Sección de navegación principal */}
        <div className="sidebar-section">
          {!collapsed && <div className="sidebar-section-title">Principal</div>}
          
          <Nav.Link 
            as={Link} 
            to="/products" 
            className={`sidebar-menu-item ${isActive('/products') && !isActive('/products/new') ? 'active' : ''}`}
          >
            <FaBoxes className="sidebar-icon" />
            {!collapsed && <span>Productos</span>}
          </Nav.Link>
          
          <Nav.Link 
            as={Link} 
            to="/pos" 
            className={`sidebar-menu-item ${isActive('/pos') ? 'active' : ''}`}
          >
            <FaMoneyBillWave className="sidebar-icon" />
            {!collapsed && <span>Punto de Venta</span>}
          </Nav.Link>
        </div>
        
        {/* Sección de Order Process (según imagen POSLINE) */}
        <div className="sidebar-section">
          {!collapsed && <div className="sidebar-section-title">Historial</div>}
          
          <Nav.Link 
            as={Link} 
            to="/sales" 
            className={`sidebar-menu-item ${isActive('/sales') ? 'active' : ''}`}
          >
            <FaChartLine className="sidebar-icon" />
            {!collapsed && <span>Ventas</span>}
          </Nav.Link>
        </div>
        
        {/* Sección de Analytics */}
        <div className="sidebar-section">
          {!collapsed && <div className="sidebar-section-title">Analisis</div>}
          
          <Nav.Link 
            as={Link} 
            to="/dashboard" 
            className={`sidebar-menu-item ${isActive('/dashboard') ? 'active' : ''}`}
          >
            <FaChartBar className="sidebar-icon" />
            {!collapsed && <span>Dashboard</span>}
          </Nav.Link>
          
          <Nav.Link 
            as={Link} 
            to="/alerts" 
            className={`sidebar-menu-item ${isActive('/alerts') ? 'active' : ''}`}
          >
            <FaBell className="sidebar-icon" />
            {!collapsed && <span>Alertas</span>}
          </Nav.Link>
          
        </div>

        {/* Sección Manage Dish (según imagen POSLINE) */}
        <div className="sidebar-section">
          {!collapsed && <div className="sidebar-section-title">Registro</div>}
          

          <Nav.Link 
            as={Link} 
            to="/products/register" 
            className={`sidebar-menu-item ${isActive('/products/register') ? 'active' : ''}`}
          >
            <FaCamera className="sidebar-icon" />
            {!collapsed && <span>Registrar con Cámara</span>}
          </Nav.Link>
        </div>
      </Nav>
      
      {/* Footer del Sidebar */}
      <div className="sidebar-footer">
        <button 
          className="sidebar-theme-toggle" 
          onClick={toggleTheme}
          aria-label={`Cambiar a tema ${isDark ? 'claro' : 'oscuro'}`}
        >
          {isDark ? <FaSun className="sidebar-icon" /> : <FaMoon className="sidebar-icon" />}
          {!collapsed && <span>{isDark ? 'Tema Claro' : 'Tema Oscuro'}</span>}
        </button>
        
        <button 
          className="sidebar-logout" 
          onClick={handleLogout}
        >
          <FaSignOutAlt className="sidebar-icon" />
          {!collapsed && <span>Cerrar Sesión</span>}
        </button>
        
        {/* Botón para colapsar/expandir sidebar */}
        <button 
          className="sidebar-collapse-btn"
          onClick={handleSidebarToggle}
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {collapsed ? (
            <FaArrowRight />
          ) : (
            <>
              <FaArrowLeft className="me-2" />
              <span>Contraer</span>
            </>
          )}
        </button>
      </div>
    </nav>
  );
};

export default Navigation;