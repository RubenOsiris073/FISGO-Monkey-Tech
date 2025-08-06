import React, { useState } from 'react';
import { Form, Row, Col, Button, Alert, Spinner, Card, InputGroup, Badge } from 'react-bootstrap';
import { 
  FaBox, 
  FaTag, 
  FaBarcode, 
  FaSync, 
  FaInfoCircle, 
  FaTh, 
  FaDollarSign, 
  FaArchive, 
  FaHashtag, 
  FaRuler, 
  FaExclamationTriangle, 
  FaMapMarkerAlt, 
  FaCalendarAlt, 
  FaTruck, 
  FaEye, 
  FaComment, 
  FaCheckCircle, 
  FaLightbulb,
  FaRobot
} from 'react-icons/fa';

const ProductRegistrationForm = ({ detectionResult, onSubmit, loading }) => {
  const defaultFormData = {
    nombre: detectionResult?.productInfo?.nombre || detectionResult?.label || '',
    descripcion: detectionResult?.productInfo?.descripcion || '',
    marca: '',
    categoria: detectionResult?.productInfo?.categoria || '',
    subcategoria: detectionResult?.productInfo?.subcategoria || '',
    precio: detectionResult?.productInfo?.precio || '',
    codigo: detectionResult?.suggestedCode || '',
    unidadMedida: detectionResult?.productInfo?.unidadMedida || 'pieza',
    stockMinimo: detectionResult?.productInfo?.stockMinimo || 5,
    ubicacion: '',
    perecedero: detectionResult?.productInfo?.perecedero || false,
    notas: detectionResult ? `Detectado automáticamente: ${detectionResult.label} (${Math.round(detectionResult.similarity * 100)}% confianza)` : '',
    proveedor: '',
    // Initial stock data
    cantidad: 1,
    fechaCaducidad: detectionResult?.suggestedExpirationDate || '',
    batchNumber: ''
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validated, setValidated] = useState(false);

  // Listas unificadas con ProductDetailForm
  const categorias = [
    'Bebidas',
    'Lácteos',
    'Carnes y Embutidos', 
    'Frutas y Verduras',
    'Abarrotes Básicos',
    'Aceites y Condimentos',
    'Dulces y Chocolates',
    'Snacks y Botanas',
    'Productos de Limpieza',
    'Cuidado Personal',
    'Helados y Congelados',
    'Alimentos Instantáneos',
    'Varios'
  ];

  const unidadesMedida = [
    'pieza',
    'kilogramo',
    'gramo', 
    'litro',
    'mililitro',
    'paquete',
    'caja',
    'lata',
    'botella'
  ];

  const ubicaciones = [
    'Bodega principal',
    'Área refrigerada',
    'Área congelada',
    'Área de exhibición',
    'Almacén secundario',
    'Farmacia'
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Convertir valores numéricos a números
    const processedValue = type === 'number' ? (value ? parseFloat(value) : '') : 
                          type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    
    setSaving(true);
    setError(null);
    
    try {
      // Validaciones adicionales
      if (formData.perecedero && !formData.fechaCaducidad) {
        setError("La fecha de caducidad es requerida para productos perecederos");
        setSaving(false);
        return;
      }

      if (!formData.precio || parseFloat(formData.precio) <= 0) {
        setError("El precio debe ser mayor a 0");
        setSaving(false);
        return;
      }

      const productData = {
        ...formData,
        precio: parseFloat(formData.precio),
        stockMinimo: parseInt(formData.stockMinimo),
        cantidad: parseInt(formData.cantidad),
        detectionInfo: detectionResult ? {
          label: detectionResult.label,
          confidence: detectionResult.similarity,
          timestamp: detectionResult.timestamp
        } : null
      };

      await onSubmit(productData);
    } catch (err) {
      console.error("Error al registrar el producto:", err);
      setError("Ocurrió un error al registrar el producto. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  // Función para generar código automático
  const generateCode = () => {
    const prefix = formData.categoria?.substring(0, 3).toUpperCase() || 'PRD';
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const code = `${prefix}-${random}`;
    setFormData(prev => ({ ...prev, codigo: code }));
  };

  // Función para generar número de lote automático
  const generateBatchNumber = () => {
    const date = new Date();
    const batch = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    setFormData(prev => ({ ...prev, batchNumber: batch }));
  };

  return (
    <div className="modern-form-container">
      {detectionResult && (
        <Alert variant="info" className="mb-4 modern-alert">
          <FaRobot className="me-2" />
          <strong>Producto detectado:</strong> {detectionResult.label} 
          (Confianza: {Math.round(detectionResult.similarity * 100)}%)
          <br />
          <small>Complete la información del producto para registrarlo en el sistema.</small>
        </Alert>
      )}

      <Form noValidate validated={validated} onSubmit={handleSubmit}>
        {error && (
          <Alert variant="danger" className="mb-4 modern-alert">
            <FaExclamationTriangle className="me-2" />
            {error}
          </Alert>
        )}

        {/* Sección: Información Básica */}
        <Card className="form-section-card mb-4">
          <Card.Header className="form-section-header">
            <h5 className="mb-0">
              <FaBox className="me-2 text-primary" />
              Información Básica del Producto
            </h5>
          </Card.Header>
          <Card.Body className="p-4">
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-modern">
                    <FaTag className="me-2" />
                    Nombre del Producto *
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleInputChange}
                    required
                    placeholder="Ej. Botella de agua premium 1L"
                    className="form-control-modern"
                  />
                  <Form.Control.Feedback type="invalid">
                    Por favor ingresa un nombre para el producto
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-modern">
                    <FaTag className="me-2" />
                    Marca
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="marca"
                    value={formData.marca}
                    onChange={handleInputChange}
                    placeholder="Ej. Coca-Cola, Bimbo"
                    className="form-control-modern"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-modern">
                    <FaTh className="me-2" />
                    Categoría *
                  </Form.Label>
                  <Form.Select
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleInputChange}
                    required
                    className="form-control-modern"
                  >
                    <option value="">Seleccionar categoría</option>
                    {categorias.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">
                    Selecciona una categoría para el producto
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-modern">
                    <FaTh className="me-2" />
                    Subcategoría
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="subcategoria"
                    value={formData.subcategoria}
                    onChange={handleInputChange}
                    placeholder="Ej. Refrescos, Lácteos frescos"
                    className="form-control-modern"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="form-label-modern">
                <FaInfoCircle className="me-2" />
                Descripción
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="descripcion"
                value={formData.descripcion}
                onChange={handleInputChange}
                placeholder="Descripción detallada del producto..."
                className="form-control-modern"
              />
            </Form.Group>

            <Row>
              <Col md={8}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-modern">
                    <FaBarcode className="me-2" />
                    Código/SKU
                  </Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      name="codigo"
                      value={formData.codigo}
                      onChange={handleInputChange}
                      placeholder="PRD-001"
                      className="form-control-modern"
                    />
                    <Button 
                      variant="outline-secondary" 
                      onClick={generateCode}
                      type="button"
                      title="Generar código automático"
                    >
                      <FaSync />
                    </Button>
                  </InputGroup>
                  <Form.Text className="text-muted">
                    <FaInfoCircle className="me-1" />
                    Código único para identificar el producto
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-modern">
                    <FaDollarSign className="me-2" />
                    Precio de Venta *
                  </Form.Label>
                  <InputGroup>
                    <InputGroup.Text className="input-addon-modern currency-symbol">$</InputGroup.Text>
                    <Form.Control
                      type="number"
                      name="precio"
                      min="0"
                      step="0.01"
                      value={formData.precio}
                      onChange={handleInputChange}
                      required
                      placeholder="0.00"
                      className="form-control-modern"
                    />
                  </InputGroup>
                  <Form.Control.Feedback type="invalid">
                    El precio debe ser mayor a 0
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Sección: Inventario y Stock */}
        <Card className="form-section-card mb-4">
          <Card.Header className="form-section-header">
            <h5 className="mb-0">
              <FaArchive className="me-2 text-success" />
              Inventario y Stock
            </h5>
          </Card.Header>
          <Card.Body className="p-4">
            <Row>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-modern">
                    <FaHashtag className="me-2" />
                    Cantidad Inicial *
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="cantidad"
                    min="1"
                    step="1"
                    value={formData.cantidad}
                    onChange={handleInputChange}
                    required
                    className="form-control-modern"
                  />
                  <Form.Control.Feedback type="invalid">
                    La cantidad debe ser mayor a 0
                  </Form.Control.Feedback>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-modern">
                    <FaRuler className="me-2" />
                    Unidad de Medida
                  </Form.Label>
                  <Form.Select
                    name="unidadMedida"
                    value={formData.unidadMedida}
                    onChange={handleInputChange}
                    className="form-control-modern"
                  >
                    {unidadesMedida.map(unidad => (
                      <option key={unidad} value={unidad}>{unidad}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-modern">
                    <FaExclamationTriangle className="me-2" />
                    Stock Mínimo
                  </Form.Label>
                  <Form.Control
                    type="number"
                    name="stockMinimo"
                    min="0"
                    value={formData.stockMinimo}
                    onChange={handleInputChange}
                    className="form-control-modern"
                  />
                  <Form.Text className="text-muted">
                    <FaInfoCircle className="me-1" />
                    Alerta cuando el stock sea menor a este valor
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={3}>
                <Form.Group className="mb-3">
                  <Form.Check
                    type="checkbox"
                    name="perecedero"
                    checked={formData.perecedero}
                    onChange={handleInputChange}
                    label="Producto perecedero"
                    className="mt-4"
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-modern">
                    <FaMapMarkerAlt className="me-2" />
                    Ubicación/Almacén
                  </Form.Label>
                  <Form.Select
                    name="ubicacion"
                    value={formData.ubicacion}
                    onChange={handleInputChange}
                    className="form-control-modern"
                  >
                    <option value="">Seleccionar ubicación</option>
                    {ubicaciones.map(ubicacion => (
                      <option key={ubicacion} value={ubicacion}>{ubicacion}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-modern">
                    <FaCalendarAlt className="me-2" />
                    Fecha de Caducidad {formData.perecedero && '*'}
                  </Form.Label>
                  <Form.Control
                    type="date"
                    name="fechaCaducidad"
                    value={formData.fechaCaducidad}
                    onChange={handleInputChange}
                    required={formData.perecedero}
                    min={new Date().toISOString().split('T')[0]}
                    className="form-control-modern"
                  />
                  <Form.Control.Feedback type="invalid">
                    La fecha de caducidad es requerida para productos perecederos
                  </Form.Control.Feedback>
                  <Form.Text className="text-muted">
                    <FaInfoCircle className="me-1" />
                    {formData.perecedero ? 'Requerida para productos perecederos' : 'Opcional - Solo para productos perecederos'}
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-modern">
                    <FaBarcode className="me-2" />
                    Número de Lote
                  </Form.Label>
                  <InputGroup>
                    <Form.Control
                      type="text"
                      name="batchNumber"
                      value={formData.batchNumber}
                      onChange={handleInputChange}
                      placeholder="Ej: 20250715-AB12"
                      className="form-control-modern"
                    />
                    <Button 
                      variant="outline-secondary" 
                      onClick={generateBatchNumber}
                      type="button"
                      title="Generar número de lote automático"
                    >
                      <FaSync />
                    </Button>
                  </InputGroup>
                  <Form.Text className="text-muted">
                    <FaInfoCircle className="me-1" />
                    Número de lote para trazabilidad
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Card.Body>
        </Card>

        {/* Sección: Información Adicional */}
        <Card className="form-section-card mb-4">
          <Card.Header className="form-section-header">
            <h5 className="mb-0">
              <FaInfoCircle className="me-2 text-info" />
              Información Adicional
            </h5>
          </Card.Header>
          <Card.Body className="p-4">
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label-modern">
                    <FaTruck className="me-2" />
                    Proveedor
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="proveedor"
                    value={formData.proveedor}
                    onChange={handleInputChange}
                    placeholder="Nombre del proveedor (opcional)"
                    className="form-control-modern"
                  />
                  <Form.Text className="text-muted">
                    <FaInfoCircle className="me-1" />
                    Empresa o persona que suministra este producto
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col md={6}>
                {detectionResult && (
                  <div className="detection-info-card">
                    <Form.Label className="form-label-modern">
                      <FaEye className="me-2" />
                      Detección Automática
                    </Form.Label>
                    <div className="detection-badge-container">
                      <Badge bg="info" className="detection-badge">
                        <FaRobot className="me-1" />
                        Detectado como: {detectionResult.label}
                      </Badge>
                      {detectionResult.similarity && (
                        <Badge bg="secondary" className="ms-2">
                          Precisión: {Math.round(detectionResult.similarity * 100)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="form-label-modern">
                <FaComment className="me-2" />
                Observaciones y Notas
              </Form.Label>
              <Form.Control
                as="textarea"
                name="notas"
                rows={4}
                value={formData.notas}
                onChange={handleInputChange}
                placeholder="Información adicional sobre el producto: características especiales, instrucciones de manejo, etc..."
                className="form-control-modern"
              />
              <Form.Text className="text-muted">
                <FaInfoCircle className="me-1" />
                Cualquier información relevante sobre el producto
              </Form.Text>
            </Form.Group>
          </Card.Body>
        </Card>

        {/* Botón de Envío Modernizado */}
        <div className="form-submit-container">
          <div className="d-grid gap-2">
            <Button 
              variant="success" 
              type="submit" 
              size="lg" 
              disabled={saving || loading}
              className="submit-button-modern"
            >
              {saving || loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  <span>Registrando producto...</span>
                </>
              ) : (
                <>
                  <FaCheckCircle className="me-2" />
                  <span>Registrar Producto</span>
                </>
              )}
            </Button>
          </div>
          
          {/* Información de ayuda */}
          <div className="form-help-text mt-3 text-center">
            <small className="text-muted">
              <FaLightbulb className="me-1" />
              Los campos marcados con * son obligatorios. La información se guardará de forma segura.
            </small>
          </div>
        </div>
      </Form>

      <style>{`
        .modern-form-container {
          max-width: 100%;
          margin: 0 auto;
        }

        .form-section-card {
          border: none;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
          border-radius: 16px;
          overflow: hidden;
          transition: all 0.3s ease;
          background: var(--card-bg);
        }

        .form-section-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
        }

        .form-section-header {
          background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
          border-bottom: 1px solid var(--border-color);
          padding: 1rem 1.5rem;
        }

        .form-section-header h5 {
          color: var(--text-primary);
          font-weight: 600;
          margin: 0;
        }

        .form-label-modern {
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 0.5rem;
          display: flex;
          align-items: center;
        }

        .form-control-modern {
          border-radius: 12px;
          border: 2px solid var(--border-color);
          padding: 0.75rem 1rem;
          font-size: 0.95rem;
          transition: all 0.3s ease;
          background: var(--input-bg);
          color: var(--text-primary);
        }

        .form-control-modern:focus {
          border-color: var(--accent-blue);
          box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.15);
          background: var(--input-bg);
          color: var(--text-primary);
        }

        .input-addon-modern {
          background: var(--bg-secondary);
          border: 2px solid var(--border-color);
          color: var(--text-secondary);
          font-weight: 600;
        }

        .currency-symbol {
          background: var(--bg-secondary);
          border: 2px solid var(--border-color);
          color: var(--text-secondary);
          font-weight: 600;
          padding: 0.75rem 1rem;
          border-top-left-radius: 12px;
          border-bottom-left-radius: 12px;
        }

        /* Específico para tema oscuro - Símbolo de moneda */
        [data-theme="dark"] .currency-symbol {
          background: var(--bg-secondary) !important;
          border-color: var(--border-color) !important;
          color: var(--text-primary) !important;
        }

        /* También aplicar a todos los input-addon-modern en tema oscuro */
        [data-theme="dark"] .input-addon-modern {
          background: var(--bg-secondary) !important;
          border-color: var(--border-color) !important;
          color: var(--text-primary) !important;
        }

        .detection-info-card {
          background: linear-gradient(135deg, rgba(13, 202, 240, 0.1), rgba(13, 202, 240, 0.05));
          padding: 1rem;
          border-radius: 12px;
          border: 1px solid rgba(13, 202, 240, 0.2);
        }

        .detection-badge {
          font-size: 0.85rem;
          padding: 0.5rem 0.75rem;
          border-radius: 8px;
        }

        .submit-button-modern {
          background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
          border: none;
          border-radius: 16px;
          padding: 1rem 2rem;
          font-weight: 600;
          font-size: 1.1rem;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
        }

        .submit-button-modern:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(40, 167, 69, 0.4);
          background: linear-gradient(135deg, #20c997 0%, #28a745 100%);
        }

        .submit-button-modern:disabled {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          box-shadow: none;
        }

        .form-submit-container {
          margin-top: 2rem;
          padding: 1.5rem;
          background: var(--bg-secondary);
          border-radius: 16px;
          border: 1px solid var(--border-color);
        }

        .form-help-text {
          background: rgba(108, 117, 125, 0.1);
          padding: 0.75rem;
          border-radius: 8px;
          border: 1px solid rgba(108, 117, 125, 0.2);
        }

        .modern-alert {
          border: none;
          border-radius: 12px;
          padding: 1rem 1.25rem;
          font-weight: 500;
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .form-section-card {
            margin-bottom: 1rem;
          }
          
          .form-section-header {
            padding: 0.75rem 1rem;
          }
          
          .form-section-card .card-body {
            padding: 1rem !important;
          }
          
          .submit-button-modern {
            padding: 0.875rem 1.5rem;
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default ProductRegistrationForm;