import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Form, Badge, Alert, Spinner } from 'react-bootstrap';
import { 
  FaTerminal, 
  FaSearch,
  FaCircle,
  FaExclamationTriangle,
  FaInfoCircle,
  FaExclamationCircle,
  FaUser
} from 'react-icons/fa';
import apiService from '../../services/apiService';
import { useAuth } from '../../contexts/AuthContext';
import '../../styles/components/alerts/logs.css';

const BackendLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [maxLogs, setMaxLogs] = useState(500);
  
  const logsContainerRef = useRef(null);
  const eventSourceRef = useRef(null);

  // Cargar logs iniciales
  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        limit: maxLogs
      };
      
      const response = await apiService.getLogs(params);
      
      if (response && response.data && response.data.success) {
        // Limpiar los mensajes de los logs antes de guardarlos
        const cleanedLogs = response.data.logs.map(log => ({
          ...log,
          message: cleanLogMessage(log.message)
        }));
        setLogs(cleanedLogs);
      }
    } catch (err) {
      console.error('Error loading logs:', err);
      
      // Si falla la autenticación, mostrar logs de demostración
      if (err.message?.includes('401') || err.message?.includes('unauthorized')) {
        const mockLogs = [
          {
            id: 1,
            timestamp: new Date().toISOString(),
            level: 'INFO',
            message: 'Servidor iniciado correctamente en puerto 5000'
          },
          {
            id: 2,
            timestamp: new Date(Date.now() - 30000).toISOString(),
            level: 'INFO',
            message: 'Base de datos Firebase conectada exitosamente'
          },
          {
            id: 3,
            timestamp: new Date(Date.now() - 60000).toISOString(),
            level: 'WARNING',
            message: 'Cache de productos expirado, recargando datos'
          },
          {
            id: 4,
            timestamp: new Date(Date.now() - 90000).toISOString(),
            level: 'ERROR',
            message: 'Error temporal al conectar con Firebase, reintentando...'
          },
          {
            id: 5,
            timestamp: new Date(Date.now() - 120000).toISOString(),
            level: 'INFO',
            message: 'Middleware de autenticación cargado'
          },
          {
            id: 6,
            timestamp: new Date(Date.now() - 150000).toISOString(),
            level: 'DEBUG',
            message: 'Configuración de CORS aplicada'
          },
          {
            id: 7,
            timestamp: new Date(Date.now() - 180000).toISOString(),
            level: 'INFO',
            message: 'GET /api/products 200 (45ms)'
          },
          {
            id: 8,
            timestamp: new Date(Date.now() - 210000).toISOString(),
            level: 'INFO',
            message: 'Productos obtenidos: 20 (stock desde PRODUCTS)'
          }
        ];
        setLogs(mockLogs);
        if (!user) {
          setError('⚠️ No estás autenticado. Inicia sesión para ver los logs reales del servidor.');
        } else {
          setError('⚠️ Error de autorización. Verifica tus permisos de acceso.');
        }
      } else {
        setError('Error al cargar los logs del backend: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [maxLogs]);

  // Filtrar logs según criterios
  useEffect(() => {
    let filtered = [...logs];
    
    // Filtrar por búsqueda
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(search) ||
        log.level.toLowerCase().includes(search)
      );
    }
    
    setFilteredLogs(filtered);
  }, [logs, searchTerm]);

  // Auto scroll al final
  useEffect(() => {
    if (logsContainerRef.current) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [filteredLogs]);

    // Inicializar streaming de logs
  const startStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      // Usar URL relativa para el EventSource
      const streamUrl = '/api/logs/stream';
      
      console.log('Conectando a:', streamUrl);
      const eventSource = new EventSource(streamUrl);
      eventSourceRef.current = eventSource;
      
      eventSource.onopen = () => {
        setStreaming(true);
        setError(null);
        console.log('📡 Conexión de logs establecida');
      };
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'initial') {
            const cleanedLogs = data.logs.map(log => ({
              ...log,
              message: cleanLogMessage(log.message)
            }));
            setLogs(cleanedLogs);
          } else if (data.type === 'new') {
            const cleanedLog = {
              ...data.log,
              message: cleanLogMessage(data.log.message)
            };
            setLogs(prev => [cleanedLog, ...prev].slice(0, maxLogs));
          }
        } catch (err) {
          console.error('Error parsing log data:', err);
        }
      };
      
      eventSource.onerror = (err) => {
        console.error('EventSource error:', err);
        setStreaming(false);
        if (err.type === 'error') {
          setError('Error de autenticación. Streaming no disponible sin login.');
        } else {
          setError('Error en la conexión de streaming de logs');
        }
        eventSource.close();
      };
      
    } catch (err) {
      console.error('Error starting stream:', err);
      setError('No se pudo iniciar el streaming de logs');
    }
  }, [maxLogs]);

  // Detener streaming
  const stopStreaming = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setStreaming(false);
  }, []);

  // Limpiar logs
  const clearLogs = async () => {
    try {
      await apiService.clearLogs();
      setLogs([]);
      console.log('🧹 Logs limpiados');
    } catch (err) {
      console.error('Error clearing logs:', err);
      setError('Error al limpiar logs');
    }
  };

  // Descargar logs
  const downloadLogs = async (format = 'json') => {
    try {
      const response = await fetch(`/api/logs/download?format=${format}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `backend-logs-${new Date().toISOString().slice(0, 10)}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading logs:', err);
      setError('Error al descargar logs');
    }
  };

  // Limpiar códigos de escape ANSI de los logs
  const cleanLogMessage = (message) => {
    if (!message) return '';
    
    // Remover códigos de escape ANSI para colores
    return message
      .replace(/\x1b\[[0-9;]*m/g, '') // Códigos ANSI básicos
      .replace(/\[\d+m/g, '') // Códigos de color más específicos
      .replace(/\[90m|\[0m|\[34m|\[1m|\[36m|\[32m/g, '') // Códigos específicos que aparecen en los logs
      .trim();
  };

  // Obtener icono y color según nivel de log
  const getLogLevelConfig = (level) => {
    const configs = {
      ERROR: { icon: <FaExclamationCircle />, color: 'danger', bg: 'rgba(220, 53, 69, 0.1)' },
      WARN: { icon: <FaExclamationTriangle />, color: 'warning', bg: 'rgba(255, 193, 7, 0.1)' },
      WARNING: { icon: <FaExclamationTriangle />, color: 'warning', bg: 'rgba(255, 193, 7, 0.1)' },
      INFO: { icon: <FaInfoCircle />, color: 'info', bg: 'rgba(13, 202, 240, 0.1)' },
      DEBUG: { icon: <FaCircle />, color: 'secondary', bg: 'rgba(108, 117, 125, 0.1)' }
    };
    
    return configs[level.toUpperCase()] || configs.INFO;
  };

  // Formatear timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  };

  // Efectos de inicialización
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);

  return (
    <div className="backend-logs-container">
      {/* Controles */}
      <Card className="mb-3">
        <Card.Header>
          <div>
            <h5 className="mb-0">
              <FaTerminal className="me-2" />
              Logs del Backend
            </h5>
            {user && (
              <small className="text-muted">
                <FaUser className="me-1" />
                Conectado como: {user.email || 'Usuario autenticado'}
              </small>
            )}
          </div>
        </Card.Header>
        
        <Card.Body>
          <div className="row align-items-center">
            <div className="col-md-6">
              <Form.Group>
                <Form.Label><FaSearch className="me-1" />Buscar</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Buscar en logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="sm"
                />
              </Form.Group>
            </div>
            
            <div className="col-md-3">
              <Form.Group>
                <Form.Label>Máximo</Form.Label>
                <Form.Select 
                  value={maxLogs} 
                  onChange={(e) => setMaxLogs(parseInt(e.target.value))}
                  size="sm"
                >
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                  <option value={1000}>1000</option>
                </Form.Select>
              </Form.Group>
            </div>
            
            <div className="col-md-3">
              <small className="text-muted">
                {filteredLogs.length} de {logs.length} logs
              </small>
            </div>
          </div>
        </Card.Body>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Logs Container */}
      <Card>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" className="mb-3" />
              <p>Cargando logs...</p>
            </div>
          ) : (
            <div 
              ref={logsContainerRef}
              className="logs-container"
              style={{ 
                height: '600px', 
                overflowY: 'auto',
                fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                fontSize: '0.85rem',
                backgroundColor: '#1e1e1e',
                color: '#d4d4d4'
              }}
            >
              {filteredLogs.length === 0 ? (
                <div className="text-center py-5">
                  <FaTerminal size={48} className="text-muted mb-3" />
                  <h6 className="text-muted">No hay logs disponibles</h6>
                  <p className="text-muted">
                    {logs.length === 0 ? 'Inicia el streaming o recarga los logs' : 'Ajusta los filtros de búsqueda'}
                  </p>
                </div>
              ) : (
                <div className="logs-list">
                  {filteredLogs.map((log) => {
                    const config = getLogLevelConfig(log.level);
                    return (
                      <div 
                        key={log.id} 
                        className="log-entry"
                        style={{ 
                          padding: '8px 12px',
                          borderLeft: `3px solid var(--bs-${config.color})`,
                          backgroundColor: config.bg,
                          borderBottom: '1px solid rgba(255,255,255,0.1)'
                        }}
                      >
                        <div className="d-flex align-items-start">
                          <span 
                            className={`text-${config.color} me-2`}
                            style={{ minWidth: '16px' }}
                          >
                            {config.icon}
                          </span>
                          <span className="log-timestamp me-2" style={{ minWidth: '120px', fontSize: '0.75rem', color: '#adb5bd !important' }}>
                            {formatTimestamp(log.timestamp)}
                          </span>
                          <Badge bg={config.color} className="me-2" style={{ minWidth: '60px' }}>
                            {log.level}
                          </Badge>
                          <span className="flex-grow-1" style={{ wordBreak: 'break-word' }}>
                            {cleanLogMessage(log.message)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default BackendLogs;