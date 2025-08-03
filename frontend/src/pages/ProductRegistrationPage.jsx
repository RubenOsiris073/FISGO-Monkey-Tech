import React, { useState, useEffect } from 'react';
import { Card, Button, Alert } from 'react-bootstrap';
import { FaCamera, FaBoxOpen, FaPlus } from 'react-icons/fa';
import '../styles/pages/productRegistration.css';
import CameraDetectionComponent from '../components/products/CameraDetectionComponent';
import ProductRegistrationForm from '../components/products/ProductRegistrationForm';
import ProductUpdateForm from '../components/products/ProductUpdateForm';
import apiService from '../services/apiService';
import { getProductInfoFromLabel, generateProductCodeFromLabel, getSuggestedExpirationDate } from '../utils/productMapping';

const ProductRegistrationPage = () => {
  const [currentStep, setCurrentStep] = useState('selection'); // selection, camera, form
  const [detectionResult, setDetectionResult] = useState(null);
  const [existingProduct, setExistingProduct] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  // Reset states when starting over
  const resetFlow = () => {
    setCurrentStep('selection');
    setDetectionResult(null);
    setExistingProduct(null);
    setError(null);
    setSuccess(null);
    setLoading(false);
  };

  // Cache para productos - evitar múltiples llamadas
  const [cachedProducts, setCachedProducts] = useState(null);
  const [cacheTimestamp, setCacheTimestamp] = useState(null);
  const CACHE_DURATION = 30000; // 30 segundos

  // Función optimizada para obtener productos con cache local
  const getCachedProducts = async () => {
    const now = Date.now();
    
    // Si tenemos cache válido, usarlo
    if (cachedProducts && cacheTimestamp && (now - cacheTimestamp < CACHE_DURATION)) {
      console.log('Usando productos desde cache local');
      return cachedProducts;
    }
    
    // Si no, obtener del servidor (que también tiene su propio cache)
    console.log('Obteniendo productos del servidor...');
    const products = await apiService.getProducts(true); // useCache = true
    
    // Extraer correctamente el array de productos
    let productsData = [];
    if (products.data && Array.isArray(products.data.data)) {
      productsData = products.data.data;
    } else if (products.data && Array.isArray(products.data)) {
      productsData = products.data;
    } else if (Array.isArray(products)) {
      productsData = products;
    }
    
    // Actualizar cache local
    setCachedProducts(productsData);
    setCacheTimestamp(now);
    
    return productsData;
  };

  // Handle detection result from camera
  const handleDetectionResult = async (detection) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Detection result received:', detection);
      
      // Enriquecer la detección con información del mapeo
      const productInfo = getProductInfoFromLabel(detection.label);
      const enrichedDetection = {
        ...detection,
        productInfo,
        suggestedCode: generateProductCodeFromLabel(detection.label),
        suggestedExpirationDate: getSuggestedExpirationDate(productInfo.categoria, productInfo.perecedero)
      };
      
      setDetectionResult(enrichedDetection);

      // Usar productos cacheados para evitar múltiples llamadas
      const productsData = await getCachedProducts();
      
      console.log(`Buscando en ${productsData.length} productos cacheados`);
      
      // Look for product with matching detection label or similar name
      const foundProduct = productsData.find(product => 
        product.detectionId === detection.label ||
        product.nombre?.toLowerCase().includes(detection.label.toLowerCase()) ||
        product.nombre?.toLowerCase().includes(productInfo.nombre.toLowerCase()) ||
        product.label?.toLowerCase().includes(detection.label.toLowerCase())
      );

      if (foundProduct) {
        // Product found - show simplified form for stock update
        console.log('Producto existente encontrado:', foundProduct.nombre);
        setExistingProduct(foundProduct);
        setCurrentStep('product-update');
      } else {
        // Product not found - show full registration form with pre-filled data
        console.log('Producto nuevo detectado:', productInfo.nombre);
        setExistingProduct(null);
        setCurrentStep('product-registration');
      }
    } catch (err) {
      setError(`Error processing detection: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle product stock update for existing product
  const handleProductStockUpdate = async (updateData) => {
    try {
      setLoading(true);
      setError(null);

      // Update product stock
      const response = await apiService.updateProductStock(
        existingProduct.id,
        updateData.quantity,
        `Registro por detección: ${detectionResult.label}`
      );

      if (response.success) {
        setSuccess(`Inventario actualizado: +${updateData.quantity} unidades de ${existingProduct.nombre}`);
        // Ask if user wants to register another product
        setTimeout(() => {
          const continueRegistration = window.confirm('¿Desea registrar otro producto?');
          if (continueRegistration) {
            resetFlow();
          }
        }, 2000);
      }
    } catch (err) {
      setError(`Error updating inventory: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle new product registration
  const handleProductRegistration = async (productData) => {
    try {
      setLoading(true);
      setError(null);

      // Create new product with detection mapping
      const newProduct = {
        ...productData,
        detectionId: detectionResult.label,
        precisionDeteccion: detectionResult.similarity,
        cantidad: productData.initialQuantity || 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const response = await apiService.createProduct(newProduct);

      if (response.success || response.id) {
        setSuccess(`Producto creado exitosamente: ${productData.nombre} con ${productData.initialQuantity} unidades`);
        // Ask if user wants to register another product
        setTimeout(() => {
          const continueRegistration = window.confirm('¿Desea registrar otro producto?');
          if (continueRegistration) {
            resetFlow();
          }
        }, 2000);
      }
    } catch (err) {
      setError(`Error creating product: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-registration-container">
      {/* Header azul estilo dashboard */}
      <div className="product-registration-header">
        <div className="product-header-content">
          <div className="product-header-left">
            <div>
              <h2 className="product-header-title">
                <FaBoxOpen className="me-3" />
                Gestión de Inventario
              </h2>
              <p className="product-header-subtitle">Registre y administre productos con detección automática o manual</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="product-registration-content"
             style={{ marginTop: '1rem' }}>
              {error && (
                <Alert variant="danger" dismissible onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}
              
              {success && (
                <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
                  {success}
                </Alert>
              )}

              {/* Step 1: Selection */}
              {currentStep === 'selection' && (
                <div className="selection-cards-container">
                  <h3 className="selection-title">Seleccione el método de registro</h3>
                  <div className="method-cards-row">
                    <div className="method-card-wrapper">
                      <div className="method-card primary" onClick={() => setCurrentStep('camera')}>
                        <FaCamera className="method-icon primary" />
                        <h4 className="method-title">Registro con Cámara</h4>
                        <p className="method-description">
                          Use la cámara para detectar productos automáticamente con inteligencia artificial
                        </p>
                        <Button 
                          variant="primary" 
                          className="method-button"
                          disabled={loading}
                        >
                          Activar Cámara
                        </Button>
                      </div>
                    </div>
                    <div className="method-card-wrapper">
                      <div className="method-card secondary" onClick={() => setCurrentStep('product-registration')}>
                        <FaPlus className="method-icon secondary" />
                        <h4 className="method-title">Registro Manual</h4>
                        <p className="method-description">
                          Registre productos manualmente completando el formulario paso a paso
                        </p>
                        <Button 
                          variant="secondary" 
                          className="method-button"
                          disabled={loading}
                        >
                          Registro Manual
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Camera Detection */}
              {currentStep === 'camera' && (
                <div className="step-container">
                  <div className="step-header">
                    <h3 className="step-title">
                      <FaCamera className="me-2" />
                      Detección por Cámara
                    </h3>
                    <Button variant="outline-secondary" className="back-button" onClick={resetFlow}>
                      Volver
                    </Button>
                  </div>
                  <CameraDetectionComponent 
                    onDetectionResult={handleDetectionResult}
                    onError={setError}
                    loading={loading}
                  />
                </div>
              )}

              {/* Step 3: Product Update (Existing Product) */}
              {currentStep === 'product-update' && existingProduct && (
                <div className="step-container">
                  <div className="step-header">
                    <h3 className="step-title">
                      <FaBoxOpen className="me-2" />
                      Actualizar Stock - Producto Existente
                    </h3>
                    <Button variant="outline-secondary" className="back-button" onClick={resetFlow}>
                      Nuevo Registro
                    </Button>
                  </div>
                  <ProductUpdateForm
                    product={existingProduct}
                    detectionResult={detectionResult}
                    onSubmit={handleProductStockUpdate}
                    loading={loading}
                  />
                </div>
              )}

              {/* Step 4: Product Registration (New Product) */}
              {currentStep === 'product-registration' && (
                <div className="step-container">
                  <div className="step-header">
                    <h3 className="step-title">
                      <FaPlus className="me-2" />
                      {detectionResult ? 'Registrar Nuevo Producto Detectado' : 'Registro Manual de Producto'}
                    </h3>
                    <Button variant="outline-secondary" className="back-button" onClick={resetFlow}>
                      Volver
                    </Button>
                  </div>
                  <ProductRegistrationForm
                    detectionResult={detectionResult}
                    onSubmit={handleProductRegistration}
                    loading={loading}
                  />
                </div>
              )}
            </div>
      </div>
    </div>
  );
};

export default ProductRegistrationPage;