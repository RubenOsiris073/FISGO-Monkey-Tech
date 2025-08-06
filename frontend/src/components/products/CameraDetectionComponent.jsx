import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, Button, Alert, Spinner, Row, Col } from 'react-bootstrap';
import { FaCamera, FaStop, FaSync } from 'react-icons/fa';
import Webcam from 'react-webcam';

const CameraDetectionComponent = ({ onDetectionResult, onError, loading }) => {
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [lastDetection, setLastDetection] = useState(null);
  const [webcamError, setWebcamError] = useState(null);
  const webcamRef = useRef(null);

  // Start webcam
  const startWebcam = useCallback(() => {
    try {
      setWebcamError(null);
      setIsWebcamActive(true);
    } catch (error) {
      console.error('Error starting webcam:', error);
      setWebcamError('No se pudo iniciar la cámara. Verifique los permisos.');
      onError?.('Error starting camera: ' + error.message);
    }
  }, [onError]);

  // Stop webcam
  const stopWebcam = useCallback(() => {
    setIsWebcamActive(false);
  }, []);

  // Handle webcam ready
  const handleWebcamReady = useCallback(() => {
    console.log('Webcam is ready');
  }, []);

  // Handle webcam error
  const handleWebcamError = useCallback((error) => {
    console.error('Webcam error:', error);
    setWebcamError('Error de cámara: ' + error.message);
    setIsWebcamActive(false);
    onError?.('Webcam error: ' + error.message);
  }, [onError]);

  // Capture frame and send for detection
  const captureAndDetect = useCallback(async () => {
    if (!webcamRef.current || !isWebcamActive) {
      setWebcamError('Cámara no está lista');
      return;
    }

    try {
      setIsDetecting(true);
      setWebcamError(null);

      // Capture screenshot from webcam
      const imageData = webcamRef.current.getScreenshot();
      
      if (!imageData) {
        throw new Error('No se pudo capturar la imagen');
      }
      
      console.log('Sending image for detection...');
      
      // Send to backend for detection
      const response = await fetch('/api/detection/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageData })
      });

      if (!response.ok) {
        throw new Error(`Detection failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('Detection result:', result);

      if (result.success && result.detection) {
        const detectionWithImage = {
          ...result.detection,
          imageUrl: `https://psychic-bassoon-j65x4rxrvj4c5p54-5000.app.github.dev/images/products/${result.detection.label}.png`
        };
        
        setLastDetection(detectionWithImage);

        // Check if detection confidence is high enough
        if (detectionWithImage.similarity >= 70) {
          onDetectionResult?.(detectionWithImage);
        } else {
          setWebcamError(`Detección poco confiable (${detectionWithImage.similarity}%). Intente de nuevo con mejor iluminación.`);
        }
      } else {
        setWebcamError('No se pudo detectar ningún producto. Intente de nuevo.');
      }
    } catch (error) {
      console.error('Detection error:', error);
      setWebcamError('Error en la detección: ' + error.message);
      onError?.('Detection error: ' + error.message);
    } finally {
      setIsDetecting(false);
    }
  }, [isWebcamActive, onDetectionResult, onError]);

  return (
    <Card>
      <Card.Body>
        <Row>
          <Col md={8}>
            <div className="camera-container">
              {!isWebcamActive ? (
                <div className="text-center py-5 bg-light rounded">
                  <FaCamera size={64} className="text-muted mb-3" />
                  <p className="text-muted">Presione "Activar Cámara" para detectar productos</p>
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
                    height={480}
                    onUserMedia={handleWebcamReady}
                    onUserMediaError={handleWebcamError}
                    className="w-100 rounded"
                    style={{ maxHeight: '400px', objectFit: 'cover' }}
                    videoConstraints={{
                      width: 640,
                      height: 480,
                      facingMode: 'environment'
                    }}
                  />
                  <div className="position-absolute top-0 start-0 p-2">
                    <div className="bg-dark bg-opacity-75 text-white px-2 py-1 rounded">
                      {isDetecting ? 'Detectando...' : 'Listo para detectar'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Col>
          
          <Col md={4}>
            <div className="controls-panel">
              <h6>Controles</h6>
              
              {isWebcamActive && (
                <div className="d-grid gap-2 mb-3">
                  <Button
                    variant="success"
                    onClick={captureAndDetect}
                    disabled={isDetecting || loading}
                  >
                    {isDetecting ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Detectando...
                      </>
                    ) : (
                      <>
                        <FaSync className="me-2" />
                        Detectar Producto
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
                <Card className="mb-3">
                  <Card.Header>
                    <small>Última Detección</small>
                  </Card.Header>
                  <Card.Body>
                    <div className="d-flex align-items-center gap-3">
                      {/* Imagen del producto detectado */}
                      <div className="detection-image-mini">
                        <img 
                          src={`https://psychic-bassoon-j65x4rxrvj4c5p54-5000.app.github.dev/images/products/${lastDetection.label}.png`}
                          alt={lastDetection.label}
                          onError={(e) => {e.target.src = 'https://psychic-bassoon-j65x4rxrvj4c5p54-5000.app.github.dev/no-image.jpg'}}
                          style={{
                            width: '60px',
                            height: '60px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid #dee2e6'
                          }}
                        />
                      </div>
                      <div className="flex-grow-1">
                        <p className="mb-1">
                          <strong>Producto:</strong> {lastDetection.label}
                        </p>
                        <p className="mb-1">
                          <strong>Confianza:</strong> {lastDetection.similarity}%
                        </p>
                        <p className="mb-0">
                          <small className="text-muted">
                            {new Date(lastDetection.timestamp).toLocaleTimeString()}
                          </small>
                        </p>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              )}

              <div className="instructions">
                <h6>Instrucciones:</h6>
                <ul className="small text-muted">
                  <li>Coloque el producto frente a la cámara</li>
                  <li>Asegúrese de tener buena iluminación</li>
                  <li>El producto debe estar centrado y visible</li>
                  <li>Presione "Detectar Producto" cuando esté listo</li>
                </ul>
              </div>
            </div>
          </Col>
        </Row>

        {webcamError && (
          <Alert variant="warning" className="mt-3">
            {webcamError}
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default CameraDetectionComponent;