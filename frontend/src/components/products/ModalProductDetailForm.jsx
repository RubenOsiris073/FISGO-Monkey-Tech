import React, { useState } from 'react';
import { Form, Row, Col, Button, Alert, Spinner, Card, InputGroup, Badge, Modal } from 'react-bootstrap';
import { 
  FaTag, FaBarcode, FaList, FaDollarSign, FaBoxes, FaRulerCombined, 
  FaExclamationTriangle, FaMapMarkerAlt, FaCalendarAlt, FaTruck, 
  FaComment, FaEye, FaRobot, FaCheckCircle, FaLightbulb, FaInfoCircle,
  FaSave, FaTimes, FaArchive
} from 'react-icons/fa';
import { saveProductDetails } from '../../services/storageService';

const ModalProductDetailForm = ({ initialProduct = null, onSuccess, onProductSaved, onCancel, show = false, mode = 'create' }) => {
  const defaultFormData = {
    nombre: '',
    cantidad: 1,
    fechaCaducidad: '',
    ubicacion: 'Bodega principal',
    precio: '',
    categoria: '',
    codigo: '',
    stockMinimo: 5,
    notas: '',
    proveedor: '',
    unidadMedida: 'unidad'
  };

  const [formData, setFormData] = useState(() => {
    const baseData = {
      ...defaultFormData,
      nombre: initialProduct?.label || initialProduct?.nombre || '',
      perecedero: initialProduct?.perecedero || false,
      marca: initialProduct?.marca || '',
      subcategoria: initialProduct?.subcategoria || '',
      descripcion: initialProduct?.descripcion || '',
      batchNumber: initialProduct?.batchNumber || ''
    };
    
    // Si hay producto inicial, usar sus datos
    if (initialProduct && Object.keys(initialProduct).length > 0) {
      return { ...baseData, ...initialProduct };
    }
    
    return baseData;
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [validated, setValidated] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Convertir valores numéricos a números
    let processedValue;
    if (type === 'checkbox') {
      processedValue = checked;
    } else if (type === 'number') {
      processedValue = value ? parseFloat(value) : '';
    } else {
      processedValue = value;
    }
    
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
      // Validación adicional para productos perecederos
      if (formData.perecedero && !formData.fechaCaducidad) {
        setError("La fecha de caducidad es requerida para productos perecederos");
        return;
      }

      // Si viene de una detección, guardar el tipo detectado
      const productToSave = {
        ...formData,
        tipoDetectado: initialProduct?.label || null,
        precisionDeteccion: initialProduct?.similarity || null,
        detectionId: initialProduct?.id || null,
        fechaRegistro: new Date().toISOString()
      };
      await saveProductDetails(productToSave);
      
      // Call both callbacks if available
      if (onSuccess) {
        onSuccess();
      }
      if (onProductSaved) {
        onProductSaved(productToSave);
      }
    } catch (err) {
      console.error("Error al guardar el producto:", err);
      setError("Ocurrió un error al guardar el producto. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    console.log('handleCancel called', { onCancel, typeof: typeof onCancel });
    if (onCancel && typeof onCancel === 'function') {
      onCancel();
    }
  };

  // Función para generar código automático
  const generateCode = () => {
    const prefix = formData.categoria?.substring(0, 3).toUpperCase() || 'PRD';
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const code = `${prefix}-${random}`;
    setFormData(prev => ({ ...prev, codigo: code }));
  };

  return (
    <>
      <Modal 
        show={show} 
        onHide={handleCancel}
        size="xl"
        centered
        backdrop="static"
        keyboard={false}
        enforceFocus={false}
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <FaTag className="me-2" />
            {mode === 'edit' ? 'Editar Producto' : 'Registrar Nuevo Producto'}
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body className="p-0">
          <div className="modern-form-container">
            <Form noValidate validated={validated} onSubmit={handleSubmit}>
              {error && (
                <Alert variant="danger" className="m-4 modern-alert">
                  <FaExclamationTriangle className="me-2" />
                  {error}
                </Alert>
              )}

          {/* Sección: Información Básica */}
          <Card className="form-section-card mb-4">
            <Card.Header className="form-section-header">
              <h5 className="mb-0">
                <FaTag className="me-2 text-primary" />
                Información Básica del Producto
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              <Row>
                <Col md={8}>
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
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">
                      <FaBarcode className="me-2" />
                      Código/SKU
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="codigo"
                      value={formData.codigo}
                      onChange={handleInputChange}
                      placeholder="PRD-001"
                      className="form-control-modern"
                    />
                    <Form.Text className="text-muted">
                      <FaInfoCircle className="me-1" />
                      Código único para identificar el producto
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
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
                      placeholder="Marca del producto"
                      className="form-control-modern"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">
                      <FaList className="me-2" />
                      Categoría *
                    </Form.Label>
                    <Form.Select
                      name="categoria"
                      value={formData.categoria}
                      onChange={handleInputChange}
                      required
                      className="form-control-modern"
                    >
                      <option value="">🏷️ Seleccionar categoría</option>
                      <option value="alimentos">🍎 Alimentos</option>
                      <option value="bebidas">🥤 Bebidas</option>
                      <option value="limpieza">🧽 Productos de limpieza</option>
                      <option value="medicamentos">💊 Medicamentos</option>
                      <option value="panaderia">🍞 Panadería</option>
                      <option value="lacteos">🥛 Lácteos</option>
                      <option value="carnes">🥩 Carnes y embutidos</option>
                      <option value="otros">📦 Otros</option>
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">
                      Selecciona una categoría para el producto
                    </Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">
                      <FaList className="me-2" />
                      Subcategoría
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="subcategoria"
                      value={formData.subcategoria}
                      onChange={handleInputChange}
                      placeholder="Subcategoría específica"
                      className="form-control-modern"
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">
                      <FaDollarSign className="me-2" />
                      Precio de Venta
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
                        placeholder="0.00"
                        className="form-control-modern"
                      />
                    </InputGroup>
                    <Form.Text className="text-muted">
                      <FaInfoCircle className="me-1" />
                      Precio al que se venderá el producto
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>

              <Form.Group className="mb-3">
                <Form.Label className="form-label-modern">
                  <FaComment className="me-2" />
                  Descripción del Producto
                </Form.Label>
                <Form.Control
                  as="textarea"
                  name="descripcion"
                  rows={3}
                  value={formData.descripcion}
                  onChange={handleInputChange}
                  placeholder="Descripción detallada del producto..."
                  className="form-control-modern"
                />
              </Form.Group>
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
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">
                      <FaBoxes className="me-2" />
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
                <Col md={4}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">
                      <FaRulerCombined className="me-2" />
                      Unidad de Medida
                    </Form.Label>
                    <Form.Select
                      name="unidadMedida"
                      value={formData.unidadMedida}
                      onChange={handleInputChange}
                      className="form-control-modern"
                    >
                      <option value="unidad">📦 Unidad</option>
                      <option value="kg">⚖️ Kilogramo</option>
                      <option value="g">📏 Gramo</option>
                      <option value="l">🪣 Litro</option>
                      <option value="ml">🥤 Mililitro</option>
                      <option value="paquete">📦 Paquete</option>
                      <option value="caja">📦 Caja</option>
                      <option value="botella">🍾 Botella</option>
                      <option value="lata">🥫 Lata</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
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
                      <option value="Bodega principal">🏪 Bodega principal</option>
                      <option value="Refrigerado">❄️ Área refrigerada</option>
                      <option value="Congelado">🧊 Área congelada</option>
                      <option value="Exhibición">🛍️ Área de exhibición</option>
                      <option value="Almacén secundario">📦 Almacén secundario</option>
                      <option value="Farmacia">💊 Farmacia</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={5}>
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
                      className="form-control-modern"
                      required={formData.perecedero}
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
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label className="form-label-modern">
                      <FaBarcode className="me-2" />
                      Número de Lote/Batch
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="batchNumber"
                      value={formData.batchNumber}
                      onChange={handleInputChange}
                      placeholder="Número de lote del fabricante"
                      className="form-control-modern"
                    />
                  </Form.Group>
                </Col>
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
                      placeholder="Nombre del proveedor"
                      className="form-control-modern"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Sección: Información Adicional */}
          <Card className="form-section-card">
            <Card.Header className="form-section-header">
              <h5 className="mb-0">
                <FaInfoCircle className="me-2 text-info" />
                Información Adicional
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              {initialProduct?.label && (
                <div className="detection-info-card mb-4">
                  <Form.Label className="form-label-modern">
                    <FaEye className="me-2" />
                    Detección Automática
                  </Form.Label>
                  <div className="detection-badge-container">
                    <Badge bg="info" className="detection-badge">
                      <FaRobot className="me-1" />
                      Detectado como: {initialProduct.label}
                    </Badge>
                    {initialProduct.similarity && (
                      <Badge bg="secondary" className="ms-2">
                        Precisión: {Math.round(initialProduct.similarity * 100)}%
                      </Badge>
                    )}
                  </div>
                </div>
              )}

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
                <Row className="g-3">
                  <Col>
                    <Button 
                      variant="secondary" 
                      size="lg" 
                      onClick={handleCancel}
                      disabled={saving}
                      className="w-100"
                    >
                      <FaTimes className="me-2" />
                      Cancelar
                    </Button>
                  </Col>
                  <Col>
                    <Button 
                      variant="success" 
                      type="submit" 
                      size="lg" 
                      disabled={saving}
                      className="submit-button-modern w-100"
                    >
                      {saving ? (
                        <>
                          <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                          />
                          <span>Guardando producto...</span>
                        </>
                      ) : (
                        <>
                          <FaCheckCircle className="me-2" />
                          <span>{mode === 'edit' ? 'Actualizar Producto' : 'Guardar Producto'}</span>
                        </>
                      )}
                    </Button>
                  </Col>
                </Row>
                
                {/* Información de ayuda */}
                <div className="form-help-text mt-3 text-center">
                  <small className="text-muted">
                    <FaLightbulb className="me-1" />
                    Los campos marcados con * son obligatorios. La información se guardará de forma segura.
                  </small>
                </div>
              </div>
            </Form>
          </div>
        </Modal.Body>
      </Modal>

      <style>{`
          .modern-form-container {
            max-width: 100%;
            margin: 0;
            padding: 1rem;
          }

          .form-section-card {
            border: none;
            box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
            border-radius: 16px;
            overflow: hidden;
            transition: all 0.3s ease;
            background: var(--card-bg);
            margin-bottom: 1rem;
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

          .btn-close-custom {
            position: absolute;
            top: 1rem;
            right: 1rem;
            border: none;
            background: none;
            font-size: 1.2rem;
            color: var(--text-secondary);
            padding: 0.5rem;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
          }

          .btn-close-custom:hover {
            background: rgba(255, 0, 0, 0.1);
            color: #dc3545;
            transform: scale(1.1);
          }

          .modal-dialog {
            max-width: 95vw;
          }

          .modal-content {
            border-radius: 20px;
            border: none;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
          }

          .modal-header {
            background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
            border-bottom: 2px solid var(--border-color);
            border-top-left-radius: 20px;
            border-top-right-radius: 20px;
            padding: 1.5rem;
          }

          .modal-title {
            font-weight: 700;
            font-size: 1.5rem;
            color: var(--text-primary);
          }

          .modal-body {
            max-height: 80vh;
            overflow-y: auto;
            padding: 0;
          }
        `}</style>
    </>
  );
};

export default ModalProductDetailForm;