import { useCallback } from 'react';

/**
 * Hook personalizado para optimizar callbacks del POS
 * Evita re-renders innecesarios memorizando las funciones
 */
const usePOSCallbacks = ({ 
  addToCart, 
  updateQuantity, 
  removeFromCart, 
  setShowPaymentModal,
  setError 
}) => {
  
  // Callback optimizado para detección de productos
  const handleProductDetected = useCallback((product, detection) => {
    console.log('handleProductDetected llamado con:', {
      product,
      detection,
      productId: product?.id,
      productName: product?.nombre || product?.name
    });
    
    try {
      if (!product) {
        console.error('Producto es null o undefined');
        setError('Producto detectado no válido');
        return;
      }
      
      if (!product.id) {
        console.error('Producto no tiene ID:', product);
        setError('Error: producto detectado sin ID');
        return;
      }
      
      console.log('Llamando addToCart con producto:', product);
      addToCart(product);
      
      console.log('Producto detectado y agregado al carrito:', {
        product: product.nombre || product.name,
        detection: detection.label,
        confidence: detection.similarity
      });
    } catch (error) {
      console.error('Error agregando producto detectado al carrito:', error);
      setError('Error al agregar el producto detectado al carrito');
    }
  }, [addToCart, setError]);

  // Callback optimizado para abrir modal de pago
  const handleOpenPayment = useCallback(() => {
    setShowPaymentModal(true);
  }, [setShowPaymentModal]);

  // Callback optimizado para actualizar cantidad
  const handleUpdateQuantity = useCallback((itemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
    } else {
      updateQuantity(itemId, newQuantity);
    }
  }, [updateQuantity, removeFromCart]);

  // Callback optimizado para remover item
  const handleRemoveFromCart = useCallback((itemId) => {
    removeFromCart(itemId);
  }, [removeFromCart]);

  return {
    handleProductDetected,
    handleOpenPayment,
    handleUpdateQuantity,
    handleRemoveFromCart
  };
};

export default usePOSCallbacks;