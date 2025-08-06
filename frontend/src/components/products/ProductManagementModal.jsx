import React, { useState } from 'react';
import { Modal, Button, Form, Alert, Badge, InputGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';
import apiService from '../../services/apiService';

const ProductManagementModal = ({ 
  show, 
  onHide, 
  product, 
  onProductUpdated,
  onProductDeleted 
}) => {
  const [action, setAction] = useState('reduce'); // 'reduce' o 'delete'
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentStock = product?.cantidad || product?.stock || 0;

  const handleClose = () => {
    setAction('reduce');
    setQuantity(1);
    setReason('');
    setError(null);
    onHide();
  };

  const handleReduceStock = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!quantity || quantity <= 0) {
        setError('La cantidad debe ser mayor a 0');
        return;
      }

      if (quantity > currentStock) {
        setError(`No se puede reducir más del stock disponible (${currentStock})`);
        return;
      }

      // Realizar ajuste negativo (reducir stock)
      const adjustment = -quantity;
      console.log('Iniciando actualización de stock...', { productId: product.id, adjustment });
      
      const response = await apiService.updateProductStock(
        product.id, 
        adjustment, 
        reason || `Reducción manual de ${quantity} unidades`
      );

      console.log('Respuesta del backend:', response);

      if (response.success) {
        console.log('Stock actualizado exitosamente, emitiendo evento...');
        
        toast.success(`Stock reducido: -${quantity} unidades`);
        
        // Actualizar el producto localmente
        const updatedProduct = {
          ...product,
          cantidad: response.newStock,
          stock: response.newStock
        };
        
        if (onProductUpdated) {
          onProductUpdated(updatedProduct);
        }

        // **EMITIR EVENTO PARA SINCRONIZACIÓN GLOBAL**
        const eventDetail = { productId: product.id, newStock: response.newStock };
        console.log('Disparando evento stock-updated:', eventDetail);
        window.dispatchEvent(new CustomEvent('stock-updated', {
          detail: eventDetail
        }));
        
        handleClose();
      } else {
        throw new Error(response.message || 'Error al actualizar stock');
      }
    } catch (error) {
      console.error('Error reduciendo stock:', error);
      setError(error.message || 'Error al reducir stock');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiService.deleteProduct(product.id);

      if (response.success) {
        toast.success('Producto eliminado correctamente');
        
        if (onProductDeleted) {
          onProductDeleted(product.id);
        }
        
        handleClose();
      } else {
        throw new Error(response.message || 'Error al eliminar producto');
      }
    } catch (error) {
      console.error('Error eliminando producto:', error);
      setError(error.message || 'Error al eliminar producto');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (action === 'reduce') {
      await handleReduceStock();
    } else {
      await handleDeleteProduct();
    }
  };

  if (!product) return null;

  return (
    <Modal show={show} onHide={handleClose} centered size="sm" className="product-management-modal">
      <Modal.Header closeButton>
        <Modal.Title>
          Gestionar Producto
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body className="p-3">
        {/* Información del producto */}
        <div className="d-flex align-items-center p-2 bg-light rounded mb-3">
          <div className="product-icon me-2">
            📦
          </div>
          <div className="flex-grow-1">
            <h6 className="mb-1 text-capitalize">
              {product.nombre || product.label || 'Producto sin nombre'}
            </h6>
            <div className="d-flex gap-2">
              <Badge bg="info" className="small">
                Stock actual: {currentStock} unidades
              </Badge>
              {product.precio && (
                <Badge bg="success" className="small">
                  ${parseFloat(product.precio).toFixed(2)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="danger" className="mb-2 py-2">
            {error}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          {/* Selector de acción */}
          <Form.Group className="mb-2">
            <Form.Label className="fw-bold small">¿Qué deseas hacer?</Form.Label>
            <div className="d-flex gap-2">
              <Form.Check
                type="radio"
                id="reduce"
                name="action"
                label="Reducir cantidad del stock"
                checked={action === 'reduce'}
                onChange={() => setAction('reduce')}
                className="small"
              />
              <Form.Check
                type="radio"
                id="delete"
                name="action"
                label="Eliminar producto completo"
                checked={action === 'delete'}
                onChange={() => setAction('delete')}
                className="small"
              />
            </div>
          </Form.Group>

          {/* Campos condicionales según la acción */}
          {action === 'reduce' && (
            <>
              <Form.Group className="mb-2">
                <Form.Label className="fw-bold small">
                  Cantidad a reducir
                </Form.Label>
                <InputGroup>
                  <Form.Control
                    type="number"
                    min="1"
                    max={currentStock}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    placeholder="Cantidad..."
                    disabled={loading}
                  />
                  <InputGroup.Text className="small">unidades</InputGroup.Text>
                </InputGroup>
                <Form.Text className="text-muted small">
                  Máximo: {currentStock} unidades disponibles
                </Form.Text>
              </Form.Group>

              <Form.Group className="mb-2">
                <Form.Label className="small">Motivo de la reducción</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ejemplo: Producto dañado, vencido, etc."
                  disabled={loading}
                  className="small"
                />
              </Form.Group>
            </>
          )}

          {action === 'delete' && (
            <Alert variant="warning" className="py-2">
              <i className="bi bi-exclamation-triangle me-2"></i>
              <strong>¡Atención!</strong> Esta acción eliminará completamente el producto 
              del catálogo y del inventario. No se puede deshacer.
            </Alert>
          )}
        </Form>
      </Modal.Body>

      <Modal.Footer className="py-2">
        <div className="d-flex gap-2 w-100">
          <Button variant="outline-secondary" onClick={handleClose} disabled={loading} size="sm" className="flex-fill">
            Cancelar
          </Button>
          
          {action === 'reduce' ? (
            <Button 
              variant="danger" 
              onClick={handleSubmit}
              disabled={loading || !quantity || quantity > currentStock}
              size="sm"
              className="flex-fill"
            >
              {loading ? 'Reduciendo...' : `Reducir ${quantity} unidad${quantity !== 1 ? 'es' : ''}`}
            </Button>
          ) : (
            <Button 
              variant="danger" 
              onClick={handleSubmit}
              disabled={loading}
              size="sm"
              className="flex-fill"
            >
              {loading ? 'Eliminando...' : 'Eliminar Producto'}
            </Button>
          )}
        </div>
      </Modal.Footer>

      <style>{`
        .product-management-modal .modal-dialog {
          max-width: 450px;
        }
        
        .product-management-modal .modal-content {
          border-radius: 12px;
          border: none;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        
        .product-management-modal .modal-header {
          padding: 1rem 1.25rem;
          border-bottom: 1px solid #dee2e6;
        }
        
        .product-management-modal .modal-title {
          font-size: 1.1rem;
          font-weight: 600;
        }
        
        .product-management-modal .product-icon {
          font-size: 1.5rem;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 123, 255, 0.1);
          border-radius: 8px;
        }
      `}</style>
    </Modal>
  );
};

export default ProductManagementModal;