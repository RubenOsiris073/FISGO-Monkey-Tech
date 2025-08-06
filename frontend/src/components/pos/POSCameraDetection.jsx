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
    console.log('Tipo de imagen:', typeof imageData);
    console.log('Primeros 50 caracteres:', imageData.substring(0, 50));
    
    return new Promise((resolve, reject) => {
      // Verificar que la imagen tenga el formato correcto
      if (!imageData || typeof imageData !== 'string') {
        console.error('Datos de imagen inválidos:', typeof imageData);
        reject(new Error('Datos de imagen inválidos'));
        return;
      }

      // Verificar que sea un data URL válido
      if (!imageData.startsWith('data:image/')) {
        console.error('No es un data URL válido:', imageData.substring(0, 30));
        reject(new Error('Formato de imagen inválido'));
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      // Timeout para la carga de imagen
      const timeout = setTimeout(() => {
        console.error('Timeout en carga de imagen');
        reject(new Error('Timeout al cargar imagen'));
      }, 5000);
      
      img.onload = () => {
        clearTimeout(timeout);
        try {
          console.log('Imagen cargada para optimización, dimensiones:', img.width, 'x', img.height);
          canvas.width = 224;
          canvas.height = 224;
          ctx.drawImage(img, 0, 0, 224, 224);
          const optimizedData = canvas.toDataURL('image/jpeg', 0.7);
          console.log('Imagen optimizada completada, tamaño:', optimizedData.length);
          resolve(optimizedData);
        } catch (error) {
          console.error('Error en canvas:', error);
          reject(error);
        }
      };
      
      img.onerror = (error) => {
        clearTimeout(timeout);
        console.error('Error cargando imagen para optimización:', error);
        console.error('Data URL problemático:', imageData.substring(0, 100));
        
        // Intentar enviar la imagen original sin optimizar
        console.log('Intentando usar imagen original sin optimizar...');
        resolve(imageData);
      };
      
      try {
        img.src = imageData;
      } catch (error) {
        clearTimeout(timeout);
        console.error('Error estableciendo src de imagen:', error);
        reject(error);
      }
    });
  };

  // Función de detección simplificada con logs detallados
  const performFastDetection = useCallback(async (isContinuous = false) => {
    console.log('=== INICIO DETECCIÓN ===', { 
      isContinuous, 
      isWebcamActive, 
      webcamRefExists: !!webcamRef.current,
      webcamReadyState: webcamRef.current?.video?.readyState
    });
    
    // Verificar que webcamRef esté disponible independientemente del estado
    if (!webcamRef.current) {
      console.log('Abortando: webcamRef no disponible');
      return null;
    }

    // Verificar que la webcam esté realmente cargada
    if (webcamRef.current.video && webcamRef.current.video.readyState < 2) {
      console.log('Abortando: webcam no está lista (readyState:', webcamRef.current.video.readyState, ')');
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
      console.log('Estado del video:', {
        readyState: webcamRef.current.video?.readyState,
        videoWidth: webcamRef.current.video?.videoWidth,
        videoHeight: webcamRef.current.video?.videoHeight,
        paused: webcamRef.current.video?.paused,
        currentTime: webcamRef.current.video?.currentTime
      });
      
      const rawImageData = webcamRef.current.getScreenshot({
        width: 640,
        height: 480,
        screenshotFormat: 'image/jpeg',
        screenshotQuality: 0.92
      });
      
      if (!rawImageData || rawImageData === 'data:,') {
        console.error('getScreenshot falló, intentando método alternativo...');
        
        // Método alternativo usando canvas directamente
        const video = webcamRef.current.video;
        if (video && video.readyState >= 2) {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          
          try {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const alternativeData = canvas.toDataURL('image/jpeg', 0.92);
            console.log('✓ Imagen capturada con método alternativo');
            console.log('✓ Formato:', alternativeData.substring(0, 30));
            console.log('✓ Tamaño total:', alternativeData.length, 'caracteres');
            
            if (alternativeData && alternativeData !== 'data:,' && alternativeData.startsWith('data:image/')) {
              rawImageData = alternativeData;
            } else {
              throw new Error('Método alternativo también falló');
            }
          } catch (canvasError) {
            console.error('Error en método alternativo:', canvasError);
            throw new Error('No se pudo capturar imagen con ningún método');
          }
        } else {
          throw new Error('Video no está listo para captura');
        }
      }
      
      if (!rawImageData || !rawImageData.startsWith('data:image/')) {
        throw new Error('Imagen capturada inválida');
      }
      
      console.log('✓ Imagen capturada exitosamente, formato:', rawImageData.substring(0, 30));
      console.log('✓ Tamaño total:', rawImageData.length, 'caracteres');

      // 2. Optimizar imagen
      console.log('2. Optimizando imagen...');
      let optimizedImage;
      try {
        optimizedImage = await optimizeImage(rawImageData);
        console.log('✓ Imagen optimizada exitosamente');
      } catch (optimizeError) {
        console.warn('⚠️ Error en optimización, usando imagen original:', optimizeError.message);
        optimizedImage = rawImageData;
      }
      
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
          processingTime: result.detection.processingTime,
          imageUrl: `/products/${result.detection.label}.jpg`
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
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 }, 
          facingMode: 'environment',
          frameRate: { ideal: 15, max: 30 }
        } 
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
      
      console.log('Permisos OK, activando webcam...');
      setIsWebcamActive(true);
      toast.info('Activando cámara...');
      
      // El modo continuo se iniciará automáticamente en handleWebcamReady
      
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
  }, [isWebcamActive, isContinuousMode]);

  // Handler para cuando la webcam esté lista
  const handleWebcamReady = useCallback(() => {
    console.log('Webcam lista, video readyState:', webcamRef.current?.video?.readyState);
    // Si estamos esperando para iniciar modo continuo, iniciarlo ahora
    if (isWebcamActive && !isContinuousMode && !detectionIntervalRef.current) {
      console.log('Auto-iniciando modo continuo porque webcam está lista');
      setTimeout(() => {
        setIsContinuousMode(true);
        detectionIntervalRef.current = setInterval(async () => {
          try {
            await performFastDetection(true);
          } catch (error) {
            console.error('Error en ciclo:', error);
          }
        }, 1500);
        toast.success('Detección continua iniciada automáticamente');
      }, 500);
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
            screenshotQuality={0.92}
            width={640}
            height={480}
            style={{ display: 'none' }}
            videoConstraints={{ 
              width: { ideal: 640 }, 
              height: { ideal: 480 }, 
              facingMode: 'environment',
              frameRate: { ideal: 15, max: 30 }
            }}
            onLoadedData={handleWebcamReady}
            onUserMediaError={(error) => {
              console.error('Error de webcam:', error);
              setWebcamError(`Error de webcam: ${error.message}`);
              setIsWebcamActive(false);
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
