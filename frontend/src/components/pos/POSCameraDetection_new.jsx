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

  // Helper functions
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

  // Función de detección simplificada con logs detallados
  const performFastDetection = useCallback(async (isContinuous = false) => {
    console.log('=== INICIO DETECCIÓN ===', { isContinuous, isWebcamActive });
    
    if (!webcamRef.current || !isWebcamActive) {
      console.log('Abortando: webcam no disponible');
      return null;
    }

    const now = Date.now();
    if (isContinuous && now - lastDetectionTimeRef.current < 1500) {
      console.log('Abortando: throttling');
      return null;
    }
    lastDetectionTimeRef.current = now;

    let detection = null;
    
    try {
      if (!isContinuous) setIsDetecting(true);
      setWebcamError(null);

      // 1. Capturar imagen
      console.log('1. Capturando imagen...');
      const rawImageData = webcamRef.current.getScreenshot();
      if (!rawImageData) {
        throw new Error('No se pudo capturar imagen');
      }
      console.log('✓ Imagen capturada');

      // 2. Optimizar imagen
      console.log('2. Optimizando imagen...');
      const optimizedImage = await optimizeImage(rawImageData);
      console.log('✓ Imagen optimizada');
      
      // 3. Preparar petición
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const detectionUrl = `${apiUrl}/detection/detect`;
      console.log('3. Enviando a:', detectionUrl);
      
      // 4. Enviar petición
      console.log('4. Enviando petición...');
      const response = await fetch(detectionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: optimizedImage, fast: true }),
        signal: AbortSignal.timeout(6000)
      });

      console.log('✓ Respuesta recibida:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API Error ${response.status}: ${errorText}`);
      }

      // 5. Procesar resultado
      console.log('5. Procesando resultado...');
      const result = await response.json();
      console.log('✓ Resultado:', result);

      if (result.success && result.detection) {
        detection = {
          label: result.detection.label,
          similarity: result.detection.similarity,
          confidence: result.detection.confidence || result.detection.similarity,
          timestamp: new Date().toISOString(),
          processingTime: result.detection.processingTime
        };

        setLastDetection(detection);
        console.log('6. Detección válida:', detection.label, `${detection.similarity}%`);

        if (detection.similarity >= 70) {
          const matchedProduct = findProductByDetection(detection.label);
          
          if (matchedProduct) {
            const stock = matchedProduct.cantidad || matchedProduct.stock || 0;
            console.log('7. Producto encontrado:', matchedProduct.nombre, `Stock: ${stock}`);
            
            if (stock > 0) {
              console.log('8. ✓ Agregando al carrito...');
              if (!isContinuous) {
                toast.success(`¡${detection.label} detectado! Agregando al carrito...`);
              }
              onProductDetected?.(matchedProduct, detection);
            } else {
              console.log('✗ Sin stock');
              if (!isContinuous) {
                toast.warning(`${detection.label} detectado pero sin stock`);
              }
            }
          } else {
            console.log('✗ Producto no encontrado en inventario');
            if (!isContinuous) {
              toast.warning(`${detection.label} detectado pero no registrado`);
            }
          }
        } else {
          console.log('✗ Confianza muy baja:', `${detection.similarity}%`);
        }
      } else {
        console.log('✗ Sin detección válida');
      }

      return detection;

    } catch (error) {
      console.error('✗ Error en detección:', error.message);
      if (!isContinuous) {
        setWebcamError(`Error: ${error.message}`);
        toast.error('Error en detección');
      }
      return null;
    } finally {
      if (!isContinuous) setIsDetecting(false);
      console.log('=== FIN DETECCIÓN ===');
    }
  }, [isWebcamActive, onProductDetected, products]);

  // Verificar permisos de cámara
  const checkCameraPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 320, height: 240, facingMode: 'environment' } 
      });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (error) {
      console.error('Error de permisos:', error);
      setWebcamError(`Error de cámara: ${error.message}`);
      toast.error('Error de permisos de cámara');
      return false;
    }
  };

  // Toggle detección
  const toggleDetection = useCallback(async () => {
    console.log('toggleDetection:', { isWebcamActive, isContinuousMode });
    
    if (!isWebcamActive && !isContinuousMode) {
      // Iniciar detección
      console.log('Iniciando detección...');
      setWebcamError(null);
      
      const hasPermissions = await checkCameraPermissions();
      if (!hasPermissions) return;
      
      setIsWebcamActive(true);
      toast.info('Cámara activada...');
      
      setTimeout(() => {
        console.log('Iniciando modo continuo...');
        setIsContinuousMode(true);
        detectionIntervalRef.current = setInterval(async () => {
          try {
            await performFastDetection(true);
          } catch (error) {
            console.error('Error en ciclo:', error);
          }
        }, 1500);
        toast.success('Detección continua iniciada');
      }, 2000);
      
    } else {
      // Parar detección
      console.log('Parando detección...');
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

  // Cleanup
  useEffect(() => {
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  // Modo panel
  if (panelMode) {
    return (
      <div className="panel-camera-detection">
        {isWebcamActive && (
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            width={320}
            height={240}
            style={{ display: 'none' }}
            videoConstraints={{ width: 320, height: 240, facingMode: 'environment' }}
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

  // Otros modos (minimal y completo) - mantenemos la implementación original simplificada
  return (
    <div>
      <p>Componente de detección simplificado - otros modos por implementar</p>
    </div>
  );
};

export default POSCameraDetection;
