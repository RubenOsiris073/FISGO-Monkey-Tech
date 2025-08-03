import React from 'react';
import { Card, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { 
  FaTag, 
  FaBox, 
  FaDollarSign, 
  FaBarcode, 
  FaTachometerAlt, 
  FaRuler, 
  FaLayerGroup, 
  FaInfoCircle, 
  FaEdit,
  FaEye
} from 'react-icons/fa';

const ProductCardModern = ({ product, onManage }) => {
  // Función para obtener la URL de la imagen o usar la imagen por defecto
  const getImageUrl = () => {
    if (product.imageUrl || product.imagenURL) {
      return product.imageUrl || product.imagenURL;
    }
    // Usar la imagen por defecto del directorio public
    return '/no-image.jpg';
  };
  
  return (
    <Card className="product-card-modern">
      {/* Imagen del producto */}
      <div className="product-card-image-container">
        <Card.Img 
          variant="top" 
          src={getImageUrl()} 
          alt={product.nombre || 'Producto'} 
          className="product-card-image" 
          onError={(e) => {e.target.src = '/no-image.jpg'}}
        />
      </div>
      
      <Card.Body className="d-flex flex-column p-3">
        {/* Información básica del producto */}
        <div className="mb-2">
          <h5 className="product-card-title">{product.nombre || 'Producto sin nombre'}</h5>
          
          {/* Marca si existe */}
          {product.marca && (
            <p className="product-card-brand mb-1">
              <small className="text-muted">
                <FaTag className="me-1" />
                {product.marca}
              </small>
            </p>
          )}
          
          <p className="product-card-availability mb-1">
            <small>
              <FaBox className="me-1" />
              <strong>Stock:</strong> {product.cantidad || 0} disponible{(product.cantidad || 0) !== 1 ? 's' : ''}
            </small>
          </p>
          
          {/* Precio como atributo más */}
          <p className="product-card-attribute mb-1">
            <small>
              <FaDollarSign className="me-1" />
              <strong>{parseFloat(product.precio || 0).toFixed(2)}</strong>
            </small>
          </p>
        </div>
        
        {/* Información adicional */}
        <div className="mb-2">
          {/* Código del producto */}
          {product.codigo && (
            <p className="product-card-code mb-1">
              <small>
                <FaBarcode className="me-1" />
                <strong>Código:</strong> {product.codigo}
              </small>
            </p>
          )}
          
          {/* Peso o volumen si existe */}
          {(product.peso || product.volumen) && (
            <p className="product-card-weight mb-1">
              <small>
                <FaTachometerAlt className="me-1" />
                <strong>
                  {product.peso ? 'Peso:' : 'Volumen:'}
                </strong> {product.peso || product.volumen}
              </small>
            </p>
          )}
          
          {/* Unidad de medida */}
          {product.unidadMedida && (
            <p className="product-card-unit mb-1">
              <small>
                <FaRuler className="me-1" />
                <strong>Unidad:</strong> {product.unidadMedida}
              </small>
            </p>
          )}
          
          {/* Categoría */}
          {product.categoria && (
            <p className="product-card-category mb-1">
              <small>
                <FaLayerGroup className="me-1" />
                <strong>Categoría:</strong> {product.categoria}
              </small>
            </p>
          )}
          
          {/* Descripción corta si existe */}
          {product.descripcion && (
            <p className="product-card-description small text-muted mb-0">
              <FaInfoCircle className="me-1" />
              {product.descripcion.length > 60 
                ? `${product.descripcion.substring(0, 60)}...` 
                : product.descripcion}
            </p>
          )}
        </div>
        
        {/* Botones de acción para gestionar el producto */}
        <div className="mt-auto pt-2">
          <div className="d-flex flex-column gap-2">
            <Link to={`/products/edit/${product.id}`} state={{ product }} className="text-decoration-none">
              <Button 
                className="btn-edit-modern product-action-btn w-100"
                variant="primary"
                size="sm"
              >
                <FaEdit className="me-1" />
                {product.nombre ? 'Editar' : 'Completar'}
              </Button>
            </Link>
            
            <Button 
              className="btn-manage-modern product-action-btn w-100"
              variant="outline-secondary"
              size="sm"
              onClick={() => onManage(product)}
            >
              <FaEye className="me-1" />
              Gestionar
            </Button>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default ProductCardModern;