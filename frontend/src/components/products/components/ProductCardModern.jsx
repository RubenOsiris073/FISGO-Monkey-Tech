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

const ProductCardModern = ({ product, onManage, onEdit }) => {
  // Función para obtener la URL de la imagen o usar la imagen por defecto
  const getImageUrl = () => {
    console.log('DEBUG ProductCardModern - product:', product);
    
    // 1. Si ya tiene una URL de imagen completa, usarla
    if (product.imageUrl || product.imagenURL) {
      const imageUrl = product.imageUrl || product.imagenURL;
      console.log('DEBUG - usando imageUrl existente:', imageUrl);
      if (imageUrl.startsWith('http')) {
        return imageUrl;
      }
      // Si es una ruta relativa, construir la URL completa
      return `https://psychic-bassoon-j65x4rxrvj4c5p54-5000.app.github.dev${imageUrl}`;
    }
    
    // 2. Si el producto fue detectado por IA, usar el label
    if (product.label || product.tipoDetectado) {
      const label = product.label || product.tipoDetectado;
      
      // Mapear labels en minúsculas a nombres correctos de archivos
      const labelToFile = {
        'dr.peppe_335ml': 'Dr.Peppe_335ML',
        'pop_45g': 'Pop_45G',
        'trident_13g': 'Trident_13G',
        'botella_ciel_100ml': 'Botella_Ciel_100ML',
        'cacahuates_kiyakis_120g': 'Cacahuates_Kiyakis_120G',
        'del valle_413ml': 'Del Valle_413ML',
        'sabritas_150g': 'Sabritas_150G',
        'takis_70g': 'Takis_70G'
      };
      
      const correctFileName = labelToFile[label.toLowerCase()] || label;
      const url = `https://psychic-bassoon-j65x4rxrvj4c5p54-5000.app.github.dev/images/products/${correctFileName}.png`;
      console.log('DEBUG - usando label:', label, 'archivo correcto:', correctFileName, 'URL:', url);
      return url;
    }
    
    // 3. Si tiene código de producto, intentar usar el código como nombre de imagen
    if (product.codigo) {
      const url = `https://psychic-bassoon-j65x4rxrvj4c5p54-5000.app.github.dev/images/products/${product.codigo}.png`;
      console.log('DEBUG - usando codigo:', product.codigo, 'URL:', url);
      return url;
    }
    
    // 4. Si el producto fue detectado automáticamente, intentar mapear el nombre al label correcto
    if (product.tipoDetectado || (product.nombre && ['Dr.Pepper_335ML', 'Pop_45G', 'Trident_13G', 'Botella_Ciel_100ML', 'Cacahuates_Kiyakis_120G', 'Del Valle_413ML', 'Sabritas_150G', 'Takis_70G'].includes(product.nombre))) {
      // Mapear nombres comunes a labels del modelo
      const nameToLabel = {
        'Dr.Pepper_335ML': 'Dr.Peppe_335ML',
        'Dr.Peppe_335ML': 'Dr.Peppe_335ML',
        'Pop_45G': 'Pop_45G',
        'Trident_13G': 'Trident_13G',
        'Botella_Ciel_100ML': 'Botella_Ciel_100ML',
        'Cacahuates_Kiyakis_120G': 'Cacahuates_Kiyakis_120G',
        'Del Valle_413ML': 'Del Valle_413ML',
        'Sabritas_150G': 'Sabritas_150G',
        'Takis_70G': 'Takis_70G'
      };
      
      const mappedLabel = nameToLabel[product.nombre] || product.tipoDetectado;
      if (mappedLabel) {
        const url = `https://psychic-bassoon-j65x4rxrvj4c5p54-5000.app.github.dev/images/products/${mappedLabel}.png`;
        console.log('DEBUG - usando mapeo de nombre a label:', product.nombre, '->', mappedLabel, 'URL:', url);
        return url;
      }
    }
    
    // 5. Si tiene nombre, intentar con el nombre exacto
    if (product.nombre) {
      const url = `https://psychic-bassoon-j65x4rxrvj4c5p54-5000.app.github.dev/images/products/${product.nombre}.png`;
      console.log('DEBUG - usando nombre exacto:', product.nombre, 'URL:', url);
      return url;
    }
    
    // 6. Imagen por defecto
    const defaultUrl = 'https://psychic-bassoon-j65x4rxrvj4c5p54-5000.app.github.dev/images/no-image.jpg';
    console.log('DEBUG - usando imagen por defecto:', defaultUrl);
    return defaultUrl;
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
          onError={(e) => {e.target.src = 'https://psychic-bassoon-j65x4rxrvj4c5p54-5000.app.github.dev/images/no-image.jpg'}}
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
            <Button 
              className="btn-edit-modern product-action-btn w-100"
              variant="primary"
              size="sm"
              onClick={() => onEdit ? onEdit(product) : onManage(product)}
            >
              <FaEdit className="me-1" />
              {product.nombre ? 'Editar' : 'Completar'}
            </Button>
            
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