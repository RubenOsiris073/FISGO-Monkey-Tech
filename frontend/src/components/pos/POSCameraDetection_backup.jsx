import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, Button, Alert, Spinner, Row, Col, Badge } from 'react-bootstrap';
import { FaCamera, FaStop, FaSync } from 'react-icons/fa';
import Webcam from 'react-webcam';
import { toast } from 'react-toastify';
import './styles/POSCameraDetection.css';

const POSCameraDetection = ({ onProductDetected, products, loading, minimal = false, panelMode = false }) => {
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [lastDetection, setLastDetection] = useState(null);
  const [webcamError, setWebcamError] = useState(null);
  const [detectionStats, setDetectionStats] = useState({ total: 0, successful: 0 });
  const webcamRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const lastDetectionTimeRef = useRef(0);
  const detectionCacheRef = useRef(new Map());

  // Mapeo de clases detectadas a productos
  const classToProductMapping = {
    'Botella_Ciel_100ML': 'Botella',
    'Cacahuates_Kiyakis_120G': 'Cacahuates', 
    'Trident_13G': 'Trident',
    'Del Valle_413ML': 'Del Valle',
    'Pop_45G': 'Pop',
    'Dr.Peppe_335ML': 'Dr.Peppe',
    'Sabritas_150G': 'Sabritas',
    'Takis_70G': 'Takis'
  };

  // Helper functions defined as regular functions to avoid hoisting issues
  const findProductByDetection = (detectionLabel) => {
    console.log('Buscando producto para detección:', detectionLabel);
    console.log('Total productos disponibles:', products.length);
    
    // Buscar por label exacto, código, nombre y label en productos
    const normalizedLabel = detectionLabel.toLowerCase();
    const product = products.find(
      p => p.label?.toLowerCase() === normalizedLabel ||
           p.codigo?.toLowerCase() === normalizedLabel ||
           p.nombre?.toLowerCase() === normalizedLabel ||
           p.name?.toLowerCase() === normalizedLabel
    );
    
    if (product) {
      console.log('Producto encontrado por búsqueda directa:', product);
      return product;
    }

    // Si no encuentra, usar el mapeo secundario
    const productCode = classToProductMapping[detectionLabel];
    console.log('Código de mapeo secundario:', productCode);
    
    if (!productCode) {
      console.log('No hay mapeo secundario para:', detectionLabel);
      return null;
    }

    const mappedProduct = products.find(product =>
      product.codigo?.toLowerCase().includes(productCode.toLowerCase()) ||
      product.nombre?.toLowerCase().includes(productCode.toLowerCase()) ||
      product.name?.toLowerCase().includes(productCode.toLowerCase())
    );
    
    if (mappedProduct) {
      console.log('Producto encontrado por mapeo secundario:', mappedProduct);
    } else {
      console.log('No se encontró producto con mapeo secundario');
    }
    
    return mappedProduct;
  };

  const optimizeImage = (imageData) => {
    console.log('Iniciando optimización de imagen...');
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        console.log('Imagen cargada para optimización');
        canvas.width = 224;
        canvas.height = 224;
        ctx.drawImage(img, 0, 0, 224, 224);
        const optimizedData = canvas.toDataURL('image/jpeg', 0.7);
        console.log('Imagen optimizada completada');
        resolve(optimizedData);
      };
      
      img.onerror = (error) => {
        console.error('Error cargando imagen para optimización:', error);
        reject(error);
      };
      
      img.src = imageData;
    });
  };

  // Fast detection with cache and throttling
  const performFastDetection = useCallback(async (isContinuous = false) => {
    console.log('performFastDetection iniciado:', { isContinuous, isWebcamActive });
    
    // Timeout global para toda la función
    return Promise.race([
      performDetectionInternal(isContinuous),
      new Promise((_, reject) => 
        setTimeout(() => {
          console.error('TIMEOUT GLOBAL DE DETECCIÓN');
          reject(new Error('Timeout global de detección'));
        }, 10000)
      )
    ]);
  }, [isWebcamActive, onProductDetected, products]);

  const performDetectionInternal = async (isContinuous = false) => {
    console.log('performDetectionInternal iniciado:', { isContinuous, isWebcamActive });
    console.log('performFastDetection iniciado:', { isContinuous, isWebcamActive });
    
    if (!webcamRef.current || !isWebcamActive) {
      console.log('Detección abortada: webcam no disponible o inactiva');
      return null;
    }

    const now = Date.now();
    if (isContinuous && now - lastDetectionTimeRef.current < 1500) {
      console.log('Detección omitida por throttling');
      return null;
    }
    lastDetectionTimeRef.current = now;

    try {
      if (!isContinuous) setIsDetecting(true);
      setWebcamError(null);

      console.log('Capturando imagen de webcam...');
      const rawImageData = webcamRef.current.getScreenshot();
      if (!rawImageData) {
        console.error('No se pudo capturar imagen de webcam');
        throw new Error('No se pudo capturar la imagen');
      }
      console.log('Imagen capturada exitosamente');

      // Check cache first
      const imageHash = btoa(rawImageData.slice(-100));
      if (isContinuous && detectionCacheRef.current.has(imageHash)) {
        const cachedResult = detectionCacheRef.current.get(imageHash);
        if (now - cachedResult.timestamp < 3000) {
          console.log('Usando resultado cacheado');
          return cachedResult.detection;
        }
      }

      console.log('Optimizando imagen...');
      const optimizePromise = optimizeImage(rawImageData);
      const optimizedImage = await Promise.race([
        optimizePromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout en optimización de imagen')), 3000)
        )
      ]);
      console.log('Imagen optimizada');
      
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const detectionUrl = `${apiUrl}/detection/detect`;
      console.log('Enviando detección a:', detectionUrl);
      
      // Verificar si el endpoint está disponible
      try {
        const healthCheck = await fetch(`${apiUrl}/health`, { 
          method: 'GET',
          timeout: 2000
        });
        console.log('Health check del backend:', healthCheck.status);
      } catch (healthError) {
        console.error('Backend no disponible:', healthError);
        throw new Error('Backend no disponible');
      }
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Timeout de detección alcanzado');
        controller.abort();
      }, 8000); // Aumentado a 8 segundos

      const response = await fetch(detectionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          image: optimizedImage,
          fast: true
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log('Respuesta de detección recibida:', response.status);

      if (!response.ok) {
        console.error('Error en respuesta de detección:', response.status);
        throw new Error(`Detection failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Resultado de detección:', result);
      
      setDetectionStats(prev => ({
        total: prev.total + 1,
        successful: result.success ? prev.successful + 1 : prev.successful
      }));

      if (result.success && result.detection) {
        const detection = {
          label: result.detection.label,
          similarity: result.detection.similarity,
          confidence: result.detection.confidence || result.detection.similarity,
          timestamp: new Date().toISOString(),
          processingTime: result.detection.processingTime
        };

        if (isContinuous) {
          detectionCacheRef.current.set(imageHash, {
            detection,
            timestamp: now
          });
          
          if (detectionCacheRef.current.size > 10) {
            const oldestKey = detectionCacheRef.current.keys().next().value;
            detectionCacheRef.current.delete(oldestKey);
          }
        }

        setLastDetection(detection);

        if (detection.similarity >= 70) {
          const matchedProduct = findProductByDetection(detection.label);
          
          console.log('Detección > 70%:', {
            label: detection.label,
            similarity: detection.similarity,
            matchedProduct: matchedProduct,
            productId: matchedProduct?.id,
            productName: matchedProduct?.nombre || matchedProduct?.name,
            stock: matchedProduct?.cantidad || matchedProduct?.stock
          });
          
          if (matchedProduct) {
            const stock = matchedProduct.cantidad || matchedProduct.stock || 0;
            if (stock > 0) {
              if (!isContinuous) {
                toast.success(`¡${detection.label} detectado! Agregando al carrito...`);
              }
              console.log('Llamando onProductDetected con:', matchedProduct);
              onProductDetected?.(matchedProduct, detection);
              return detection;
            } else {
              if (!isContinuous) {
                toast.warning(`${detection.label} detectado pero sin stock disponible`);
                setWebcamError(`Producto detectado: ${detection.label}, pero sin stock disponible`);
              }
            }
          } else {
            console.log('Producto no encontrado en inventario. Productos disponibles:', products.length);
            console.log('Primeros 3 productos:', products.slice(0, 3).map(p => ({
              id: p.id,
              nombre: p.nombre || p.name,
              codigo: p.codigo,
              label: p.label
            })));
            
            if (!isContinuous) {
              toast.warning(`${detection.label} detectado pero no encontrado en inventario`);
              setWebcamError(`Producto detectado: ${detection.label}, pero no está registrado en el sistema`);
            }
          }
        } else if (!isContinuous) {
          setWebcamError(`Detección poco confiable (${detection.similarity}%). Intente de nuevo con mejor iluminación.`);
        }
        
        return detection;
      } else if (!isContinuous) {
        setWebcamError('No se pudo detectar ningún producto. Intente de nuevo.');
      }
      
      return null;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Detection timeout');
        if (!isContinuous) setWebcamError('Detección cancelada por timeout');
      } else {
        console.error('Detection error:', error);
        if (!isContinuous) {
          setWebcamError('Error en la detección: ' + error.message);
          toast.error('Error en la detección');
        }
      }
      return null;
    } finally {
      if (!isContinuous) setIsDetecting(false);
    }
  }, [isWebcamActive, onProductDetected, products]);

  // Start webcam
  const startWebcam = useCallback(() => {
    try {
      setWebcamError(null);
      setIsWebcamActive(true);
      toast.info('Cámara activada. Coloca un producto frente a la cámara.');
    } catch (error) {
      console.error('Error starting webcam:', error);
      setWebcamError('No se pudo iniciar la cámara. Verifique los permisos.');
      toast.error('Error al iniciar la cámara');
    }
  }, []);

  // Stop webcam
  const stopWebcam = useCallback(() => {
    setIsWebcamActive(false);
    setIsContinuousMode(false);
    setLastDetection(null);
    
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    
    detectionCacheRef.current.clear();
    toast.info('Cámara desactivada');
  }, []);

  // Handle webcam error
  const handleWebcamError = useCallback((error) => {
    console.error('Webcam error:', error);
    setWebcamError('Error de cámara: ' + error.message);
    setIsWebcamActive(false);
    toast.error('Error de cámara');
  }, []);

  // Toggle continuous detection mode
  const toggleContinuousMode = useCallback(() => {
    if (!isWebcamActive) {
      toast.warning('Primero activa la cámara');
      return;
    }

    const newContinuousMode = !isContinuousMode;
    setIsContinuousMode(newContinuousMode);

    if (newContinuousMode) {
      toast.info('Modo continuo activado - Detección automática cada 1.5s');
      detectionIntervalRef.current = setInterval(async () => {
        await performFastDetection(true);
      }, 1500);
    } else {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      toast.info('Modo continuo desactivado');
    }
  }, [isWebcamActive, isContinuousMode, performFastDetection]);

  // Manual detection
  const captureAndDetect = useCallback(async () => {
    await performFastDetection(false);
  }, [performFastDetection]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  // Función para verificar permisos de cámara
  const checkCameraPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: 'environment'
        } 
      });
      
      // Si llegamos aquí, tenemos permisos
      stream.getTracks().forEach(track => track.stop()); // Liberar la cámara
      return true;
    } catch (error) {
      console.error('Camera permission error:', error);
      
      if (error.name === 'NotAllowedError') {
        setWebcamError('Permisos de cámara denegados. Por favor, permite el acceso a la cámara.');
        toast.error('Permisos de cámara denegados');
      } else if (error.name === 'NotFoundError') {
        setWebcamError('No se encontró ninguna cámara en el dispositivo.');
        toast.error('Cámara no encontrada');
      } else if (error.name === 'NotReadableError') {
        setWebcamError('La cámara está siendo usada por otra aplicación.');
        toast.error('Cámara en uso');
      } else {
        setWebcamError(`Error de cámara: ${error.message}`);
        toast.error('Error de cámara');
      }
      
      return false;
    }
  };

  // Función para iniciar/parar detección continua automáticamente
  const toggleDetection = useCallback(async () => {
    console.log('toggleDetection called', { isWebcamActive, isContinuousMode });
    
    if (!isWebcamActive && !isContinuousMode) {
      // Iniciar: verificar permisos y activar cámara
      console.log('Starting detection...');
      setWebcamError(null);
      toast.info('Verificando permisos de cámara...');
      
      const hasPermissions = await checkCameraPermissions();
      if (!hasPermissions) {
        return; // No continuar si no hay permisos
      }
      
      try {
        console.log('Permissions OK, activating webcam...');
        setIsWebcamActive(true);
        toast.info('Cámara activada, iniciando detección...');
        
        // Esperar un poco más para que la cámara se active completamente
        setTimeout(() => {
          console.log('Starting continuous detection mode');
          setIsContinuousMode(true);
          detectionIntervalRef.current = setInterval(async () => {
            console.log('=== INICIO CICLO DE DETECCIÓN ===');
            try {
              const result = await performFastDetection(true);
              console.log('=== RESULTADO CICLO:', result);
            } catch (error) {
              console.error('=== ERROR EN CICLO:', error);
            }
            console.log('=== FIN CICLO DE DETECCIÓN ===');
          }, 1500);
          toast.success('Detección continua iniciada');
        }, 2000); // Aumentado a 2 segundos
        
      } catch (error) {
        console.error('Error starting detection:', error);
        setWebcamError('No se pudo iniciar la detección');
        toast.error('Error al iniciar la detección');
        setIsWebcamActive(false);
      }
    } else {
      // Parar: desactivar todo
      console.log('Stopping detection...');
      setIsWebcamActive(false);
      setIsContinuousMode(false);
      setLastDetection(null);
      
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
        detectionIntervalRef.current = null;
      }
      
      detectionCacheRef.current.clear();
      toast.info('Detección detenida');
    }
  }, [isWebcamActive, isContinuousMode, performFastDetection]);

  // Modo panel - para el panel "Botón de Cámara"
  if (panelMode) {
    return (
      <div className="panel-camera-detection">
        {/* Webcam oculta pero funcional */}
        {isWebcamActive && (
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            width={320}
            height={240}
            onUserMediaError={handleWebcamError}
            style={{ display: 'none' }}
            videoConstraints={{
              width: 320,
              height: 240,
              facingMode: 'environment'
            }}
          />
        )}
        

        
        <button
          className={`detection-toggle-btn ${isContinuousMode ? 'active' : ''}`}
          onClick={toggleDetection}
          disabled={loading}
        >
          {isContinuousMode ? (
            <>
              <FaStop className="btn-icon" />
              <span>Parar Detección</span>
            </>
          ) : (
            <>
              <FaCamera className="btn-icon" />
              <span>Iniciar Detección</span>
            </>
          )}
        </button>

        {isContinuousMode && (
          <div className="detection-status">
            <div className="status-indicator"></div>
            <span>Detección Activa</span>
          </div>
        )}

        {lastDetection && (
          <div className="last-detection-panel">
            <div className="detection-info">
              <span className="product-name">{lastDetection.label}</span>
              <span className="confidence-badge">{lastDetection.similarity}%</span>
            </div>
            <div className="detection-time">
              {new Date(lastDetection.timestamp).toLocaleTimeString()}
            </div>
          </div>
        )}

        {webcamError && (
          <div className="panel-error">
            {webcamError}
          </div>
        )}

        <style>{`
          .panel-camera-detection {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
            padding: 10px;
          }

          .panel-header {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #666;
            font-size: 0.9rem;
            margin-bottom: 5px;
          }

          .panel-camera-icon {
            font-size: 1.1rem;
          }

          .panel-title {
            font-weight: 500;
          }

          .detection-toggle-btn {
            background: #f8f9fa;
            color: #333;
            border: 2px solid #dee2e6;
            border-radius: 8px;
            padding: 12px 20px;
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.2s ease;
            min-width: 160px;
            justify-content: center;
          }

          .detection-toggle-btn:hover:not(:disabled) {
            background: #e9ecef;
            border-color: #adb5bd;
            transform: translateY(-1px);
          }

          .detection-toggle-btn.active {
            background: #dc3545;
            color: white;
            border-color: #dc3545;
          }

          .detection-toggle-btn.active:hover:not(:disabled) {
            background: #c82333;
            border-color: #c82333;
          }

          .detection-toggle-btn:disabled {
            background: #e9ecef;
            color: #6c757d;
            border-color: #dee2e6;
            cursor: not-allowed;
            transform: none;
          }

          .btn-icon {
            font-size: 1rem;
          }

          .detection-status {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #28a745;
            font-size: 0.85rem;
            font-weight: 500;
          }

          .status-indicator {
            width: 8px;
            height: 8px;
            background: #28a745;
            border-radius: 50%;
            animation: pulse 2s infinite;
          }

          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }

          .last-detection-panel {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 10px;
            width: 100%;
            font-size: 0.85rem;
          }

          .detection-info {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 5px;
          }

          .product-name {
            font-weight: 500;
            color: #333;
          }

          .confidence-badge {
            background: #28a745;
            color: white;
            padding: 2px 6px;
            border-radius: 10px;
            font-size: 0.75rem;
            font-weight: 500;
          }

          .detection-time {
            color: #666;
            font-size: 0.75rem;
            text-align: center;
          }

          .panel-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 0.8rem;
            text-align: center;
            width: 100%;
          }
        `}</style>
      </div>
    );
  }

  // Modo minimalista - solo botón
  if (minimal) {
    return (
      <div className="minimal-camera-detection">
        {/* Webcam oculta pero funcional */}
        {isWebcamActive && (
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            width={320}
            height={240}
            onUserMediaError={handleWebcamError}
            style={{ display: 'none' }}
            videoConstraints={{
              width: 320,
              height: 240,
              facingMode: 'environment'
            }}
          />
        )}
        
        <button
          className="camera-detection-btn"
          onClick={!isWebcamActive ? startWebcam : toggleContinuousMode}
          disabled={loading || isDetecting}
        >
          <FaCamera className="camera-icon" />
          {isDetecting ? (
            <span>Detectando...</span>
          ) : !isWebcamActive ? (
            <span>Activar Cámara</span>
          ) : isContinuousMode ? (
            <span>Detección Activa</span>
          ) : (
            <span>Iniciar Detección</span>
          )}
        </button>

        {isWebcamActive && (
          <button
            className="stop-detection-btn"
            onClick={stopWebcam}
            disabled={loading}
          >
            <FaStop />
          </button>
        )}

        {lastDetection && (
          <div className="last-detection-minimal">
            <span className="detection-label">{lastDetection.label}</span>
            <span className="detection-confidence">{lastDetection.similarity}%</span>
          </div>
        )}

        {webcamError && (
          <div className="detection-error">
            {webcamError}
          </div>
        )}

        <style>{`
          .minimal-camera-detection {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 15px;
          }

          .camera-detection-btn {
            background: #007bff;
            color: white;
            border: none;
            border-radius: 8px;
            padding: 15px 30px;
            font-size: 1rem;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 10px;
            transition: all 0.2s ease;
            min-width: 200px;
            justify-content: center;
          }

          .camera-detection-btn:hover:not(:disabled) {
            background: #0056b3;
            transform: translateY(-1px);
          }

          .camera-detection-btn:disabled {
            background: #6c757d;
            cursor: not-allowed;
            transform: none;
          }

          .camera-icon {
            font-size: 1.2rem;
          }

          .stop-detection-btn {
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .stop-detection-btn:hover:not(:disabled) {
            background: #c82333;
            transform: scale(1.1);
          }

          .last-detection-minimal {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 6px;
            padding: 8px 15px;
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 0.9rem;
          }

          .detection-label {
            font-weight: 500;
            color: #333;
          }

          .detection-confidence {
            background: #28a745;
            color: white;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 500;
          }

          .detection-error {
            background: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            border-radius: 6px;
            padding: 8px 15px;
            font-size: 0.85rem;
            text-align: center;
            max-width: 300px;
          }
        `}</style>
      </div>
    );
  }

  // Modo completo original
  return (
    <Card className="detection-card">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h6 className="mb-0">
          <FaCamera className="me-2" />
          Detección de Productos
        </h6>
        <Badge bg={isWebcamActive ? 'success' : 'secondary'}>
          {isWebcamActive ? 'Activa' : 'Inactiva'}
        </Badge>
      </Card.Header>
      
      <Card.Body>
        <Row>
          <Col md={8}>
            <div className="camera-container">
              {!isWebcamActive ? (
                <div className="text-center py-4 bg-light rounded">
                  <FaCamera size={48} className="text-muted mb-3" />
                  <p className="text-muted mb-3">Activa la cámara para detectar productos automáticamente</p>
                  <Button 
                    variant="primary" 
                    onClick={startWebcam}
                    disabled={loading}
                  >
                    <FaCamera className="me-2" />
                    Activar Cámara
                  </Button>
                </div>
              ) : (
                <div className="position-relative">
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    width={640}
                    height={360}
                    onUserMediaError={handleWebcamError}
                    className="w-100 rounded"
                    style={{ maxHeight: '300px', objectFit: 'cover' }}
                    videoConstraints={{
                      width: 640,
                      height: 360,
                      facingMode: 'environment'
                    }}
                  />
                  <div className="position-absolute top-0 start-0 p-2">
                    <div className={`px-2 py-1 rounded small text-white ${
                      isContinuousMode ? 'bg-warning bg-opacity-90' : 
                      isDetecting ? 'bg-primary bg-opacity-90' : 
                      'bg-dark bg-opacity-75'
                    }`}>
                      {isContinuousMode ? '🔄 Continuo' : 
                       isDetecting ? 'Detectando...' : 
                       'Listo'}
                    </div>
                  </div>
                  {lastDetection && (
                    <div className="position-absolute top-0 end-0 p-2">
                      <div className={`text-white px-2 py-1 rounded small ${
                        lastDetection.similarity >= 80 ? 'bg-success bg-opacity-90' :
                        lastDetection.similarity >= 70 ? 'bg-warning bg-opacity-90' :
                        'bg-danger bg-opacity-90'
                      }`}>
                        {lastDetection.label} ({lastDetection.similarity}%)
                        {lastDetection.processingTime && (
                          <div className="small">{lastDetection.processingTime}ms</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Col>
          
          <Col md={4}>
            <div className="controls-panel">
              {isWebcamActive && (
                <div className="d-grid gap-2 mb-3">
                  <Button
                    variant={isContinuousMode ? "warning" : "info"}
                    onClick={toggleContinuousMode}
                    disabled={loading}
                  >
                    {isContinuousMode ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Modo Continuo ON
                      </>
                    ) : (
                      <>
                        <FaSync className="me-2" />
                        Modo Continuo
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="success"
                    onClick={captureAndDetect}
                    disabled={isDetecting || loading || isContinuousMode}
                  >
                    {isDetecting ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Detectando...
                      </>
                    ) : (
                      <>
                        <FaSync className="me-2" />
                        Detectar Una Vez
                      </>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline-danger"
                    onClick={stopWebcam}
                    disabled={loading}
                  >
                    <FaStop className="me-2" />
                    Detener Cámara
                  </Button>
                </div>
              )}

              {lastDetection && (
                <Card className="mb-3" size="sm">
                  <Card.Header className="py-2">
                    <small>Última Detección</small>
                  </Card.Header>
                  <Card.Body className="py-2">
                    <p className="mb-1 small">
                      <strong>Producto:</strong> {lastDetection.label}
                    </p>
                    <p className="mb-1 small">
                      <strong>Confianza:</strong> {lastDetection.similarity}%
                    </p>
                    <p className="mb-0">
                      <small className="text-muted">
                        {new Date(lastDetection.timestamp).toLocaleTimeString()}
                      </small>
                    </p>
                  </Card.Body>
                </Card>
              )}

              {detectionStats.total > 0 && (
                <Card className="mb-3" size="sm">
                  <Card.Header className="py-2">
                    <small>Estadísticas</small>
                  </Card.Header>
                  <Card.Body className="py-2">
                    <p className="mb-1 small">
                      <strong>Total:</strong> {detectionStats.total}
                    </p>
                    <p className="mb-1 small">
                      <strong>Exitosas:</strong> {detectionStats.successful}
                    </p>
                    <p className="mb-0 small">
                      <strong>Precisión:</strong> {detectionStats.total > 0 ? Math.round((detectionStats.successful / detectionStats.total) * 100) : 0}%
                    </p>
                  </Card.Body>
                </Card>
              )}

              <div className="instructions">
                <h6 className="small">Productos Detectables:</h6>
                <ul className="small text-muted mb-2">
                  <li>Cacahuates_Kiyakis</li>
                  <li>Botella_Ciel</li>
                  <li>Trident</li>
                  <li>Dr.Peppe</li>
                  <li>Takis</li>
                  <li>Pop</li>
                  <li>Sabritas</li>
                  <li>pan</li>
                  <li>yogurt</li>
                  <li>Del Valle</li>
                </ul>
                
                <div className="performance-tips">
                  <h6 className="small">⚡ Modo Rápido:</h6>
                  <ul className="small text-muted mb-0">
                    <li>Detección continua cada 1.5s</li>
                    <li>Cache inteligente</li>
                    <li>Imágenes optimizadas</li>
                    <li>Timeout de 5s</li>
                  </ul>
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {webcamError && (
          <Alert variant="warning" className="mt-3 mb-0">
            <small>{webcamError}</small>
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default POSCameraDetection;