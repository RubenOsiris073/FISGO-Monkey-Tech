import React, { useState } from 'react';
import { Modal, Button, Alert, Badge, Table } from 'react-bootstrap';
import { FaReceipt, FaInfoCircle, FaFilePdf, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';

// Estilos
import '../../styles/components/modals.css';

const OrderProductManagementModal = ({ 
  show, 
  onHide, 
  products = [], // Lista de productos en la orden
  orderInfo = {} // Información de la orden
}) => {
  const [loading] = useState(false);
  const [error, setError] = useState(null);

  const handleClose = () => {
    setError(null);
    onHide();
  };

  // Función para formatear moneda
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '$0.00';
    }
    
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Number(amount));
  };

  // Función para formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-CO') + ' ' + date.toLocaleTimeString();
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  // Calcular totales
  const calculateTotals = () => {
    const subtotal = products.reduce((sum, product) => {
      const precio = product.precio || product.precioUnitario || product.price || 0;
      const cantidad = product.cantidad || product.quantity || 1;
      return sum + (precio * cantidad);
    }, 0);
    
    const tax = subtotal * 0.16; // 16% IVA
    const total = subtotal + tax;
    
    return { subtotal, tax, total };
  };

  const { subtotal, tax, total } = calculateTotals();

  // Función para obtener el icono del producto según su categoría
  const getProductIcon = (product) => {
    const categoria = (product.categoria || product.category || '').toLowerCase();
    const nombre = (product.nombre || product.name || '').toLowerCase();
    
    // Iconos específicos por categoría REAL de tu sistema
    if (categoria.includes('bebidas')) {
      if (nombre.includes('refresco') || nombre.includes('coca') || nombre.includes('pepsi')) {
        return '🥤';
      }
      if (nombre.includes('agua') || nombre.includes('jamaica')) {
        return '💧';
      }
      if (nombre.includes('leche')) {
        return '🥛';
      }
      if (nombre.includes('horchata') || nombre.includes('coco')) {
        return '🥥';
      }
      return '🧃'; // Bebidas en general
    }
    
    if (categoria.includes('snacks') || categoria.includes('botanas')) {
      if (nombre.includes('papa') || nombre.includes('sabritas')) {
        return '🍟';
      }
      if (nombre.includes('cacahuate') || nombre.includes('japoneses')) {
        return '🥜';
      }
      if (nombre.includes('churrito') || nombre.includes('cheetos')) {
        return '🌽';
      }
      if (nombre.includes('palomita') || nombre.includes('totis')) {
        return '🍿';
      }
      return '🥨'; // Snacks en general
    }
    
    if (categoria.includes('panadería') || categoria.includes('galletas')) {
      if (nombre.includes('galleta')) {
        return '🍪';
      }
      if (nombre.includes('pan') || nombre.includes('bimbo')) {
        return '🍞';
      }
      if (nombre.includes('dona') || nombre.includes('roles')) {
        return '🍩';
      }
      if (nombre.includes('concha')) {
        return '🧁';
      }
      return '🥖'; // Panadería en general
    }
    
    if (categoria.includes('dulces') || categoria.includes('chocolates')) {
      if (nombre.includes('chocolate')) {
        return '🍫';
      }
      if (nombre.includes('paleta') || nombre.includes('vero')) {
        return '🍭';
      }
      if (nombre.includes('tamarindo') || nombre.includes('pulparindo')) {
        return '🌶️';
      }
      if (nombre.includes('mazapán') || nombre.includes('rosa')) {
        return '🥜';
      }
      if (nombre.includes('chamoy') || nombre.includes('miguelito')) {
        return '🍯';
      }
      return '🍬'; // Dulces en general
    }
    
    if (categoria.includes('abarrotes básicos')) {
      if (nombre.includes('tortilla')) {
        return '🫓';
      }
      if (nombre.includes('arroz')) {
        return '🍚';
      }
      if (nombre.includes('frijol') || nombre.includes('lenteja')) {
        return '🫘';
      }
      if (nombre.includes('azúcar') || nombre.includes('sal')) {
        return '🧂';
      }
      if (nombre.includes('harina') || nombre.includes('masa')) {
        return '🌾';
      }
      return '🛒'; // Abarrotes en general
    }
    
    if (categoria.includes('enlatados') || categoria.includes('conservas')) {
      if (nombre.includes('atún') || nombre.includes('sardina')) {
        return '🐟';
      }
      if (nombre.includes('frijol') || nombre.includes('elote')) {
        return '🥫';
      }
      if (nombre.includes('chile') || nombre.includes('jalapeño')) {
        return '🌶️';
      }
      return '🥫'; // Enlatados en general
    }
    
    if (categoria.includes('aceites') || categoria.includes('condimentos')) {
      if (nombre.includes('aceite')) {
        return '🫒';
      }
      if (nombre.includes('salsa') || nombre.includes('valentina')) {
        return '🌶️';
      }
      if (nombre.includes('vinagre')) {
        return '🍾';
      }
      if (nombre.includes('consomé') || nombre.includes('knorr')) {
        return '🧊';
      }
      return '🧂'; // Condimentos en general
    }
    
    if (categoria.includes('alimentos instantáneos')) {
      if (nombre.includes('sopa') || nombre.includes('maruchan')) {
        return '🍜';
      }
      if (nombre.includes('avena') || nombre.includes('quaker')) {
        return '🥣';
      }
      if (nombre.includes('puré') || nombre.includes('papa')) {
        return '🥔';
      }
      return '⚡'; // Instantáneos en general
    }
    
    if (categoria.includes('bebidas calientes')) {
      if (nombre.includes('chocolate') || nombre.includes('abuelita')) {
        return '☕';
      }
      if (nombre.includes('té') || nombre.includes('manzanilla')) {
        return '🍵';
      }
      if (nombre.includes('canela')) {
        return '🥧';
      }
      return '♨️'; // Bebidas calientes en general
    }
    
    if (categoria.includes('productos de limpieza')) {
      if (nombre.includes('jabón') || nombre.includes('trastes')) {
        return '🧽';
      }
      if (nombre.includes('detergente') || nombre.includes('ariel')) {
        return '🧴';
      }
      if (nombre.includes('suavizante')) {
        return '💧';
      }
      return '🧹'; // Limpieza en general
    }
    
    if (categoria.includes('cuidado personal')) {
      if (nombre.includes('champú') || nombre.includes('head')) {
        return '🧴';
      }
      if (nombre.includes('pasta') || nombre.includes('dental')) {
        return '🦷';
      }
      if (nombre.includes('jabón') || nombre.includes('palmolive')) {
        return '🧼';
      }
      return '🧴'; // Cuidado personal en general
    }
    
    // Icono por defecto para productos no categorizados
    return '🛒';
  };

  if (!show) return null;

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <FaReceipt className="me-2" />
          Detalles de los Productos de la Venta
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {/* Información de la orden */}
        <div className="p-3 bg-light rounded mb-4">
          <div className="row">
            <div className="col-md-8">
              <h6 className="mb-2">
                Fecha: {formatDate(orderInfo.fecha)}
              </h6>
              <h6 className="mb-2">
                Venta ID: #{orderInfo.id || 'N/A'}
              </h6>
              {orderInfo.cliente && (
                <h6 className="mb-2">
                  Cliente: {orderInfo.cliente}
                </h6>
              )}
            </div>
            <div className="col-md-4 text-md-end">
              <Badge bg="primary" className="fs-6">
                {products.length} producto{products.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {/* Lista de productos en formato tabla - mejorada */}
        {products.length > 0 ? (
          <div className="mb-4">
            <h6 className="mb-3">
              Productos en la Venta
            </h6>
            <Table responsive className="mb-0">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className="text-center">Cantidad</th>
                  <th className="text-end">Precio Unitario</th>
                  <th className="text-end">Total</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, index) => {
                  const precio = product.precio || product.precioUnitario || product.price || 0;
                  const cantidad = product.cantidad || product.quantity || 1;
                  const totalItem = product.total || (precio * cantidad);
                  
                  return (
                    <tr key={product.id || index}>
                      <td>
                        <div className="d-flex align-items-center">
                          <div className="product-icon me-2">
                            {getProductIcon(product)}
                          </div>
                          <div>
                            <div className="fw-bold text-capitalize">
                              {product.nombre || product.name || product.label || 'Producto sin nombre'}
                            </div>
                            {product.descripcion && (
                              <small className="text-muted">
                                {product.descripcion}
                              </small>
                            )}
                            {product.codigo && (
                              <div>
                                <Badge bg="outline-secondary" className="mt-1">
                                  {product.codigo}
                                </Badge>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-center">
                        <Badge bg="info">
                          {cantidad} {product.unidadMedida || 'unidades'}
                        </Badge>
                      </td>
                      <td className="text-end">
                        <Badge bg="success">
                          {formatCurrency(precio)}
                        </Badge>
                      </td>
                      <td className="text-end">
                        <strong>
                          {formatCurrency(totalItem)}
                        </strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </div>
        ) : (
          <div className="text-center p-4 border rounded">
            <i className="bi bi-cart-x display-4 text-muted"></i>
            <h5 className="mt-3">No hay productos en esta venta</h5>
            <p className="text-muted">La venta está vacía o no se han cargado los productos.</p>
          </div>
        )}

        {/* Resumen de totales - mejorado */}
        {products.length > 0 && (
          <div className="border-top pt-3">
            <div className="row">
              <div className="col-md-6 offset-md-6">
                <table className="table table-borderless">
                  <tbody>
                    <tr>
                      <td className="text-end"><strong>Subtotal:</strong></td>
                      <td className="text-end">{formatCurrency(subtotal)}</td>
                    </tr>
                    <tr>
                      <td className="text-end"><strong>IVA (16%):</strong></td>
                      <td className="text-end">{formatCurrency(tax)}</td>
                    </tr>
                    <tr className="border-top">
                      <td className="text-end"><strong>Total:</strong></td>
                      <td className="text-end">
                        <h5 className="mb-0 text-primary">
                          {formatCurrency(total)}
                        </h5>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Información de pago - mejorada */}
        {orderInfo.metodoPago && (
          <div className="mt-3 p-3 bg-info bg-opacity-10 rounded">
            <h6 className="mb-2">
              Información de Pago
            </h6>
            <div className="row">
              <div className="col-md-6">
                <strong>Método:</strong> 
                <Badge bg="success" className="ms-2">
                  {orderInfo.metodoPago}
                </Badge>
              </div>
              {orderInfo.montoRecibido && (
                <div className="col-md-6">
                  <span><strong>Monto recibido:</strong> {formatCurrency(orderInfo.montoRecibido)}</span>
                </div>
              )}
            </div>
            {orderInfo.cambio && orderInfo.cambio > 0 && (
              <div className="mt-2">
                <strong>Cambio:</strong> 
                <span className="text-success fw-bold ms-2">
                  {formatCurrency(orderInfo.cambio)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Notas adicionales */}
        <div className="mt-4 p-3 bg-light rounded">
          <h6 className="mb-2">
            <FaInfoCircle className="me-2" />
            Resumen de la Venta
          </h6>
          <p className="mb-1">
            <strong>Productos:</strong> {products.length} artículo{products.length !== 1 ? 's' : ''} vendido{products.length !== 1 ? 's' : ''}
          </p>
          <p className="mb-1">
            <strong>Fecha de venta:</strong> {formatDate(orderInfo.fecha)}
          </p>
          <p className="mb-0">
            <strong>Total final:</strong> {formatCurrency(orderInfo.total || total)}
          </p>
        </div>
      </Modal.Body>

      
    </Modal>
  );
};

export default OrderProductManagementModal;