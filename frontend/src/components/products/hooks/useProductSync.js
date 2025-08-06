import { useState, useEffect, useCallback } from 'react';
import apiService from '../../../services/apiService';

/**
 * Hook personalizado para manejar la sincronización de productos y stock
 */
const useProductSync = (initialProducts = []) => {
  const [products, setProducts] = useState(initialProducts);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cache local para evitar múltiples llamadas
  const [lastRefresh, setLastRefresh] = useState(0);
  const REFRESH_COOLDOWN = 5000; // 5 segundos de cooldown entre refreshes

  // Función optimizada para refrescar productos desde el backend
  const refreshProducts = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    
    // Evitar múltiples refreshes muy seguidos
    if (!forceRefresh && (now - lastRefresh < REFRESH_COOLDOWN)) {
      console.log('[useProductSync] Refresh bloqueado por cooldown');
      return true;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('[useProductSync] Refrescando productos desde backend (con cache)...');
      // Usar cache del apiService (useCache = true)
      const response = await apiService.getProducts(true);
      
      // Extraer productos según la estructura de respuesta
      let freshProducts = [];
      
      if (response?.data?.data && Array.isArray(response.data.data)) {
        freshProducts = response.data.data;
      } else if (response?.data && Array.isArray(response.data)) {
        freshProducts = response.data;
      } else {
        console.warn('[useProductSync] Formato de respuesta inesperado:', response);
        return false;
      }
      
      // Actualizar estado solo si hay cambios
      setProducts(prevProducts => {
        if (JSON.stringify(prevProducts) !== JSON.stringify(freshProducts)) {
          console.log(`[useProductSync] Productos actualizados: ${freshProducts.length}`);
          return freshProducts;
        }
        console.log('[useProductSync] No hay cambios en productos');
        return prevProducts;
      });
      
      setLastRefresh(now);
      return true;
      
    } catch (err) {
      console.error('[useProductSync] Error refrescando productos:', err);
      setError(err.message || 'Error al refrescar productos');
      return false;
    } finally {
      setLoading(false);
    }
  }, [lastRefresh]);

  // Función para actualizar un producto específico
  const updateProduct = useCallback((updatedProduct, skipRefresh = false) => {
    console.log('[useProductSync] Actualizando producto:', updatedProduct);
    
    setProducts(prevProducts => 
      prevProducts.map(product => 
        product.id === updatedProduct.id ? {
          ...product,
          ...updatedProduct,
          cantidad: updatedProduct.cantidad || updatedProduct.stock || product.cantidad,
          stock: updatedProduct.stock || updatedProduct.cantidad || product.stock
        } : product
      )
    );

    // Solo refrescar si es necesario (no para actualizaciones locales)
    if (!skipRefresh) {
      // Invalidar cache del apiService para la próxima llamada
      apiService.clearCache();
      
      // Refrescar después de un delay para permitir que el backend se actualice
      setTimeout(() => {
        refreshProducts(true); // forceRefresh = true
      }, 1000);
    }
  }, [refreshProducts]);

  // Función para eliminar un producto
  const removeProduct = useCallback((productId) => {
    console.log('[useProductSync] Eliminando producto:', productId);
    
    setProducts(prevProducts => 
      prevProducts.filter(product => product.id !== productId)
    );
  }, []);

  // Listener para eventos de stock actualizado y productos creados
  useEffect(() => {
    const handleStockUpdated = (event) => {
      console.log('[useProductSync] Evento stock-updated recibido:', event.detail);
      refreshProducts();
    };

    const handleProductCreated = (event) => {
      console.log('[useProductSync] Evento product-created recibido:', event.detail);
      refreshProducts(true); // Force refresh para productos nuevos
    };

    window.addEventListener('stock-updated', handleStockUpdated);
    window.addEventListener('product-created', handleProductCreated);
    
    return () => {
      window.removeEventListener('stock-updated', handleStockUpdated);
      window.removeEventListener('product-created', handleProductCreated);
    };
  }, [refreshProducts]);

  // Actualizar productos cuando cambien los props iniciales
  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setProducts(initialProducts);
    }
  }, [initialProducts]);

  return {
    products,
    loading,
    error,
    refreshProducts,
    updateProduct,
    removeProduct,
    setProducts
  };
};

export default useProductSync;