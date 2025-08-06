import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Row, Col, Badge, Button, Modal, Table, Spinner, Form } from 'react-bootstrap';
import { 
  FaExclamationTriangle, 
  FaClock, 
  FaBoxOpen, 
  FaCalendarAlt, 
  FaSearch,
  FaSortAmountDown,
  FaBell,
  FaEdit,
  FaTrash,
  FaEye
} from 'react-icons/fa';
import apiService from '../../services/apiService';
import '../../styles/components/alerts/expiration.css';

const ExpirationAlerts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterCritical, setFilterCritical] = useState(false);
  const [filterRange, setFilterRange] = useState('all'); // all, critical, warning, info
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sortBy, setSortBy] = useState('daysToExpire');

  // Función para calcular días hasta caducar
  const calculateDaysToExpire = useCallback((expirationDate) => {
    if (!expirationDate) return null;
    
    const today = new Date();
    let expDate;
    
    // Manejar diferentes formatos de fecha
    if (expirationDate._seconds) {
      expDate = new Date(expirationDate._seconds * 1000);
    } else if (expirationDate.seconds) {
      expDate = new Date(expirationDate.seconds * 1000);
    } else {
      expDate = new Date(expirationDate);
    }
    
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }, []);

  // Función para transformar datos de Firebase a formato de alertas
  const transformProductData = useCallback((firebaseProducts) => {
    const perecederos = firebaseProducts.filter(product => product.perecedero && product.fechaCaducidad);
    
    const transformed = perecederos
      .map(product => {
        const daysToExpire = calculateDaysToExpire(product.fechaCaducidad);
        
        // Convertir fecha a string ISO para display
        let expirationDateString;
        if (product.fechaCaducidad._seconds) {
          expirationDateString = new Date(product.fechaCaducidad._seconds * 1000).toISOString().split('T')[0];
        } else if (product.fechaCaducidad.seconds) {
          expirationDateString = new Date(product.fechaCaducidad.seconds * 1000).toISOString().split('T')[0];
        } else {
          expirationDateString = new Date(product.fechaCaducidad).toISOString().split('T')[0];
        }
        
        return {
          id: product.id,
          name: product.nombre,
          category: product.categoria,
          expirationDate: expirationDateString,
          stock: product.stock || product.cantidad || 0,
          location: product.ubicacion || 'No especificada',
          supplier: product.marca || 'Sin marca',
          batch: product.codigo || `BATCH-${product.id?.substring(0, 6)}`,
          daysToExpire: daysToExpire,
          codigo: product.codigo,
          precio: product.precio,
          imageUrl: product.imageUrl
        };
      });
    
    const filteredByDays = transformed.filter(product => product.daysToExpire !== null && product.daysToExpire <= 45);
    
    return filteredByDays.sort((a, b) => a.daysToExpire - b.daysToExpire);
  }, [calculateDaysToExpire]);

  // Función para cargar productos desde Firebase
  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Limpiar caché manualmente
      
      // Hacer petición directa con timestamp para evitar caché
      const timestamp = Date.now();
      const response = await fetch(`/api/products?_t=${timestamp}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.data) {
        // Verificar si response.data es un array o un objeto con productos
        let productsArray = data.data;
        
        // Si es un objeto con una propiedad products, extraerla
        if (!Array.isArray(productsArray) && productsArray.products) {
          productsArray = productsArray.products;
        }
        
        // Si es un objeto con propiedades que son productos, convertir a array
        if (!Array.isArray(productsArray) && typeof productsArray === 'object') {
          productsArray = Object.values(productsArray);
        }
        
        // Verificar que tenemos un array válido
        if (Array.isArray(productsArray)) {
          const transformedProducts = transformProductData(productsArray);
          setProducts(transformedProducts);
        } else {
          console.error('Los datos de productos no son un array válido:', productsArray);
          setProducts([]);
        }
      } else {
        setProducts([]);
      }
      
    } catch (error) {
      console.error('Error cargando productos:', error);
      setError('Error al cargar los productos. Por favor, intenta de nuevo.');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [transformProductData]);

  // Cargar productos al montar el componente
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const getAlertLevel = (daysToExpire) => {
    if (daysToExpire <= 15) return 'critical';      // 0-15 días: CRÍTICO
    if (daysToExpire <= 30) return 'warning';       // 16-30 días: ADVERTENCIA  
    if (daysToExpire <= 45) return 'info';          // 31-45 días: PRÓXIMO
    return 'normal';
  };

  const getAlertBadge = (daysToExpire) => {
    const level = getAlertLevel(daysToExpire);
    const configs = {
      critical: { variant: 'danger', text: 'CRÍTICO (≤15 días)', icon: <FaExclamationTriangle /> },
      warning: { variant: 'warning', text: 'ADVERTENCIA (16-30 días)', icon: <FaClock /> },
      info: { variant: 'info', text: 'PRÓXIMO (31-45 días)', icon: <FaBell /> },
      normal: { variant: 'success', text: 'OK', icon: <FaBoxOpen /> }
    };
    
    return configs[level];
  };

  const filteredProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filtro por rango de días
      let matchesRange = true;
      if (filterRange !== 'all') {
        const level = getAlertLevel(product.daysToExpire);
        matchesRange = level === filterRange;
      }
      
      return matchesSearch && matchesRange;
    })
    .sort((a, b) => {
      if (sortBy === 'daysToExpire') return a.daysToExpire - b.daysToExpire;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'stock') return a.stock - b.stock;
      return 0;
    });

  const criticalCount = products.filter(p => getAlertLevel(p.daysToExpire) === 'critical').length;
  const warningCount = products.filter(p => getAlertLevel(p.daysToExpire) === 'warning').length;
  const upcomingCount = products.filter(p => getAlertLevel(p.daysToExpire) === 'info').length;

  const handleViewDetails = (product) => {
    setSelectedProduct(product);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="expiration-alerts-container">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p>Cargando alertas de caducidad...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="expiration-alerts-container">
      {/* Filters and Controls */}
      <Card className="mb-4">
        <Card.Header>
          <Row className="align-items-center">
            <Col>
              <h5 className="mb-0">
                <FaSearch className="me-2" />
                Filtros y Búsqueda
              </h5>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body>
          <Row className="align-items-end">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Buscar Producto</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Nombre o categoría..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Filtrar por rango</Form.Label>
                <Form.Select
                  value={filterRange}
                  onChange={(e) => setFilterRange(e.target.value)}
                >
                  <option value="all">Todos los rangos</option>
                  <option value="critical">Críticos (≤15 días)</option>
                  <option value="warning">Advertencia (16-30 días)</option>
                  <option value="info">Próximos (31-45 días)</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={3}>
              <Form.Group>
                <Form.Label>Ordenar por</Form.Label>
                <Form.Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="daysToExpire">Días para caducar</option>
                  <option value="name">Nombre</option>
                  <option value="stock">Stock</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={2} className="d-flex align-items-end">
              <Button 
                variant="outline-primary" 
                size="lg"
                onClick={loadProducts}
                title="Actualizar datos"
              >
                <FaSortAmountDown />
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Products List */}
      <Card>
        <Card.Header>
          <Row className="align-items-center">
            <Col md={6}>
              <h5 className="mb-0">
                <FaCalendarAlt className="me-2" />
                Productos por Caducar ({filteredProducts.length})
              </h5>
            </Col>
            <Col md={6} className="text-end">
              <Badge bg="danger" className="me-2">
                Críticos: {criticalCount}
              </Badge>
              <Badge bg="warning" className="me-2">
                Advertencia: {warningCount}
              </Badge>
              <Badge bg="info">
                Próximos: {upcomingCount}
              </Badge>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body className="p-0">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-5">
              <FaBoxOpen className="text-muted mb-3" style={{ fontSize: '3rem' }} />
              <h5 className="text-muted">No hay productos que coincidan con los filtros</h5>
              <p className="text-muted">Intenta ajustar los criterios de búsqueda</p>
            </div>
          ) : (
            <div className="products-list">
              {filteredProducts.map((product) => {
                const alertConfig = getAlertBadge(product.daysToExpire);
                return (
                  <div key={product.id} className="product-item">
                    <Row className="align-items-center">
                      <Col md={1} className="text-center">
                        <Badge 
                          bg={alertConfig.variant} 
                          className="status-badge"
                          title={alertConfig.text}
                        >
                          {alertConfig.icon}
                        </Badge>
                      </Col>
                      <Col md={3}>
                        <div>
                          <h6 className="mb-1">{product.name}</h6>
                          <small className="text-muted">{product.category}</small>
                        </div>
                      </Col>
                      <Col md={2}>
                        <div className="text-center">
                          <div className="fw-bold text-danger">
                            {product.daysToExpire} día{product.daysToExpire !== 1 ? 's' : ''}
                          </div>
                          <small className="text-muted">para caducar</small>
                        </div>
                      </Col>
                      <Col md={2}>
                        <div className="text-center">
                          <div className="fw-bold">{product.stock}</div>
                          <small className="text-muted">unidades</small>
                        </div>
                      </Col>
                      <Col md={2}>
                        <small className="text-muted">
                          {new Date(product.expirationDate).toLocaleDateString('es-ES')}
                        </small>
                      </Col>
                      <Col md={2} className="text-center d-flex justify-content-center align-items-center">
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={() => handleViewDetails(product)}
                          className="btn-sm"
                        >
                          <FaEye className="me-1" />
                          Ver
                        </Button>
                      </Col>
                    </Row>
                  </div>
                );
              })}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Product Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            <FaBoxOpen className="me-2" />
            Detalles del Producto
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProduct && (
            <Row>
              <Col md={6}>
                <Table striped bordered>
                  <tbody>
                    <tr>
                      <td><strong>Nombre:</strong></td>
                      <td>{selectedProduct.name}</td>
                    </tr>
                    <tr>
                      <td><strong>Categoría:</strong></td>
                      <td>{selectedProduct.category}</td>
                    </tr>
                    <tr>
                      <td><strong>Stock:</strong></td>
                      <td>{selectedProduct.stock} unidades</td>
                    </tr>
                    <tr>
                      <td><strong>Ubicación:</strong></td>
                      <td>{selectedProduct.location}</td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
              <Col md={6}>
                <Table striped bordered>
                  <tbody>
                    <tr>
                      <td><strong>Fecha de Caducidad:</strong></td>
                      <td className="text-danger">
                        {new Date(selectedProduct.expirationDate).toLocaleDateString('es-ES')}
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Días Restantes:</strong></td>
                      <td>
                        <Badge bg={getAlertBadge(selectedProduct.daysToExpire).variant}>
                          {selectedProduct.daysToExpire} día{selectedProduct.daysToExpire !== 1 ? 's' : ''}
                        </Badge>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Proveedor:</strong></td>
                      <td>{selectedProduct.supplier}</td>
                    </tr>
                    <tr>
                      <td><strong>Lote:</strong></td>
                      <td>{selectedProduct.batch}</td>
                    </tr>
                  </tbody>
                </Table>
              </Col>
            </Row>
          )}
        </Modal.Body>
        <Modal.Footer>
          
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default ExpirationAlerts;