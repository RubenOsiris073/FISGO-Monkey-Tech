import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Sistema de caché simple para optimizar rendimiento
const cache = new Map();
const CACHE_DURATION = 30000; // 30 segundos para datos que cambian poco

// Función para manejar caché
const getCachedData = (key) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`Cache HIT para: ${key}`);
    return cached.data;
  }
  return null;
};

const setCachedData = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
  console.log(`Datos cached para: ${key}`);
};

// Crear instancia de axios optimizada
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000, // Reducir timeout para fallos más rápidos
  headers: {
    'Content-Type': 'application/json',
  },
  // Optimizaciones de axios
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
});

// Interceptor para agregar token de autenticación
api.interceptors.request.use(
  async (config) => {
    try {
      // Rutas que NO requieren autenticación
      const publicRoutes = ['/dashboard', '/health', '/status', '/detection/detect', '/detection/recent', '/detection/status'];
      const isPublicRoute = publicRoutes.some(route => config.url?.includes(route));
      
      if (!isPublicRoute) {
        // Solo agregar token para rutas protegidas
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        
        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken(true); // forzar refresh del token
          config.headers.Authorization = `Bearer ${token}`;
          
          if (import.meta.env.DEV) {
            console.log('Token de autenticación agregado correctamente');
            console.log('Usuario:', auth.currentUser.email);
          }
        } else {
          if (import.meta.env.DEV) {
            console.log('No hay usuario autenticado - sin token');
          }
          // Para rutas protegidas sin usuario, devolver error
          throw new Error('Usuario no autenticado');
        }
      } else {
        if (import.meta.env.DEV) {
          console.log('Ruta pública - sin token de autenticación');
        }
      }
    } catch (error) {
      console.error('Error obteniendo token de autenticación:', error.message);
    }
    
    if (import.meta.env.DEV) {
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor optimizado para logs solo en desarrollo
if (import.meta.env.DEV) {
  api.interceptors.response.use(
    (response) => {
      console.log(`API Response: ${response.status} - ${response.config.url}`);
      return response;
    },
    (error) => {
      console.error('API Error:', error.response?.status, error.message);
      return Promise.reject(error);
    }
  );
}

const apiService = {
  // Función para obtener productos con caché inteligente
  getProducts: async (useCache = true) => {
    try {
      const cacheKey = 'products';
      
      // Intentar obtener de caché primero
      if (useCache) {
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }
      
      console.log('Obteniendo productos del servidor...');
      const response = await api.get('/products');
      
      // Cachear la respuesta completa
      setCachedData(cacheKey, response);
      
      return response;
      
    } catch (error) {
      console.error('Error en getProducts:', error.message);
      
      // Si hay error, intentar devolver datos del caché aunque estén expirados
      const cachedData = cache.get('products');
      if (cachedData) {
        console.log('Usando datos en caché debido a error de red');
        return cachedData.data;
      }
      
      throw error;
    }
  },

  // Función para obtener ventas con caché
  getSales: async (useCache = true) => {
    try {
      const cacheKey = 'sales';
      
      if (useCache) {
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }
      
      console.log('Obteniendo ventas del servidor...');
      const response = await api.get('/sales');
      const salesData = response.data.sales || [];
      
      setCachedData(cacheKey, salesData);
      return salesData;
      
    } catch (error) {
      console.error('Error en getSales:', error.message);
      
      // Fallback a caché si existe
      const cachedData = cache.get('sales');
      if (cachedData) {
        console.log('Usando ventas en caché debido a error de red');
        return cachedData.data;
      }
      
      throw error;
    }
  },

  // Obtener ventas paginadas
  getSalesPaginated: async ({ limit = 50, startAfter } = {}, useCache = false) => {
    try {
      const cacheKey = `sales-paginated-${limit}-${startAfter || 'init'}`;
      if (useCache) {
        const cachedData = getCachedData(cacheKey);
        if (cachedData) return cachedData;
      }
      const response = await api.get('/sales/paginated', {
        params: { limit, startAfter }
      });
      setCachedData(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('Error en getSalesPaginated:', error.message);
      throw error;
    }
  },

  // Obtener ventas desde cache backend
  getSalesCached: async (limit = 50) => {
    try {
      const cacheKey = `sales-cached-${limit}`;
      const cachedData = getCachedData(cacheKey);
      if (cachedData) return cachedData;
      const response = await api.get('/sales/cached', { params: { limit } });
      setCachedData(cacheKey, response.data);
      return response.data;
    } catch (error) {
      console.error('Error en getSalesCached:', error.message);
      throw error;
    }
  },

  // Función para crear venta (invalida caché de ventas)
  createSale: async (saleData) => {
    try {
      console.log('Enviando venta...');
      const response = await api.post('/sales', saleData);
      
      // Invalidar caché de ventas después de crear una nueva
      cache.delete('sales');
      console.log('Cache de ventas invalidado');
      
      return response.data;
    } catch (error) {
      console.error('Error creating sale:', error);
      throw error;
    }
  },

  // Eliminar producto (invalida caché de productos)
  deleteProduct: async (productId) => {
    try {
      console.log(`Eliminando producto: ${productId}`);
      
      // Debug: verificar autenticación
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      console.log('Usuario autenticado:', auth.currentUser ? 'Sí' : 'No');
      if (auth.currentUser) {
        console.log('Usuario ID:', auth.currentUser.uid);
        console.log('Usuario email:', auth.currentUser.email);
      }
      
      const response = await api.delete(`/products/${productId}`);
      
      // Invalidar caché de productos
      cache.delete('products');
      console.log('Cache de productos invalidado');
      
      return response.data;
    } catch (error) {
      console.error('Error eliminando producto:', error);
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      throw error;
    }
  },

  // Actualizar stock (invalida caché de productos)
  updateProductStock: async (productId, adjustment, reason = 'Ajuste manual') => {
    try {
      console.log(`Actualizando stock - Producto: ${productId}, Ajuste: ${adjustment}`);
      const response = await api.put(`/products/${productId}/stock`, {
        adjustment,
        reason
      });
      
      // Invalidar caché de productos
      cache.delete('products');
      
      return response.data;
    } catch (error) {
      console.error('Error actualizando stock:', error);
      throw error;
    }
  },

  // Obtener stock con caché individual por producto
  getProductStock: async (productId, useCache = true) => {
    try {
      const cacheKey = `product_${productId}`;
      
      if (useCache) {
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }
      
      const response = await api.get(`/products/${productId}`);
      const result = {
        success: true,
        productId,
        stock: response.data.cantidad || response.data.stock || 0,
        stockMinimo: response.data.stockMinimo || 0
      };
      
      setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error obteniendo stock:', error);
      throw error;
    }
  },

  // Establecer stock específico (invalida cachés)
  setProductStock: async (productId, newQuantity, reason = 'Establecer stock') => {
    try {
      console.log(`Estableciendo stock - Producto: ${productId}, Nueva cantidad: ${newQuantity}`);
      const response = await api.put(`/products/${productId}/stock`, {
        adjustment: newQuantity,
        reason,
        absolute: true
      });
      
      // Invalidar cachés relacionados
      cache.delete('products');
      cache.delete(`product_${productId}`);
      
      return response.data;
    } catch (error) {
      console.error('Error estableciendo stock:', error);
      throw error;
    }
  },

  // Obtener resumen de inventario con caché
  getInventorySummary: async (useCache = true) => {
    try {
      const cacheKey = 'inventory_summary';
      
      if (useCache) {
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }
      
      const response = await api.get('/products');
      const products = response.data.data || response.data;
      
      const summary = {
        totalProducts: products.length,
        totalStock: products.reduce((sum, p) => sum + (p.cantidad || p.stock || 0), 0),
        lowStockProducts: products.filter(p => 
          (p.cantidad || p.stock || 0) <= (p.stockMinimo || 5)
        ).length,
        outOfStockProducts: products.filter(p => 
          (p.cantidad || p.stock || 0) === 0
        ).length
      };
      
      const result = { success: true, data: summary };
      setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Error obteniendo resumen de inventario:', error);
      throw error;
    }
  },

  // Función para limpiar caché manualmente
  clearCache: () => {
    cache.clear();
    console.log('Cache completamente limpiado');
  },

  // Función para obtener estadísticas del caché
  getCacheStats: () => {
    return {
      size: cache.size,
      keys: Array.from(cache.keys()),
      totalMemory: JSON.stringify(Array.from(cache.entries())).length
    };
  },

  // Funciones para Dashboard con Google Sheets
  getDashboardMetrics: async (useCache = true) => {
    try {
      const cacheKey = 'dashboard_metrics';
      
      if (useCache) {
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }
      
      console.log('Obteniendo métricas del dashboard desde Google Sheets...');
      const response = await api.get('/dashboard/metrics');
      
      setCachedData(cacheKey, response.data);
      return response.data;
      
    } catch (error) {
      console.error('Error obteniendo métricas del dashboard:', error.message);
      
      // Fallback a caché si existe
      const cachedData = cache.get('dashboard_metrics');
      if (cachedData) {
        console.log('Usando métricas en caché debido a error de red');
        return cachedData.data;
      }
      
      throw error;
    }
  },

  getSalesDataFromSheets: async (range = null, useCache = true) => {
    try {
      const cacheKey = `sheets_sales_${range || 'default'}`;
      
      if (useCache) {
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }
      
      console.log('Obteniendo datos de ventas desde Google Sheets...');
      const url = range ? `/dashboard/sales-data?range=${encodeURIComponent(range)}` : '/dashboard/sales-data';
      const response = await api.get(url);
      
      setCachedData(cacheKey, response.data);
      return response.data;
      
    } catch (error) {
      console.error('Error obteniendo datos de Google Sheets:', error.message);
      
      // Fallback a caché si existe
      const cachedData = cache.get(`sheets_sales_${range || 'default'}`);
      if (cachedData) {
        console.log('Usando datos de Sheets en caché debido a error de red');
        return cachedData.data;
      }
      
      throw error;
    }
  },

  // Funciones para Logs del Backend
  getLogs: async (params = {}) => {
    try {
      const response = await api.get('/logs', { params });
      return response.data;
    } catch (error) {
      console.error('Error obteniendo logs:', error.message);
      throw error;
    }
  },

  clearLogs: async () => {
    try {
      const response = await api.post('/logs/clear');
      return response.data;
    } catch (error) {
      console.error('Error limpiando logs:', error.message);
      throw error;
    }
  },

  downloadLogs: async (format = 'json') => {
    try {
      const response = await api.get(`/logs/download`, {
        params: { format },
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Error descargando logs:', error.message);
      throw error;
    }
  },

  // Funciones para Detección de Productos
  triggerDetection: async (imageData) => {
    try {
      console.log('Enviando imagen para detección...');
      const response = await api.post('/detection/detect', {
        image: imageData
      });
      return response.data;
    } catch (error) {
      console.error('Error en detección:', error.message);
      throw error;
    }
  },

  getDetections: async (limit = 10) => {
    try {
      const response = await api.get('/detection/recent', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error obteniendo detecciones:', error.message);
      throw error;
    }
  },

  getDetectionStatus: async () => {
    try {
      const response = await api.get('/detection/status');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo estado de detección:', error.message);
      throw error;
    }
  },

  // Función para crear producto
  createProduct: async (productData) => {
    try {
      console.log('Creando producto:', productData);
      const response = await api.post('/products', productData);
      
      // Invalidar caché de productos
      cache.delete('products');
      
      return response.data;
    } catch (error) {
      console.error('Error creando producto:', error.message);
      throw error;
    }
  },

  // Función para obtener productos con paginación
  getProductsPaginated: async ({ page = 1, limit = 50, category, search, useCache = true } = {}) => {
    try {
      const cacheKey = `products-paginated-${page}-${limit}-${category || 'all'}-${search || 'none'}`;
      
      if (useCache) {
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }
      
      console.log(`Obteniendo productos paginados - Página: ${page}, Límite: ${limit}`);
      const response = await api.get('/products', {
        params: { page, limit, category, search }
      });
      
      setCachedData(cacheKey, response);
      return response;
      
    } catch (error) {
      console.error('Error en getProductsPaginated:', error.message);
      throw error;
    }
  },

  // Función para obtener productos por categoría (optimizada)
  getProductsByCategory: async (category, useCache = true) => {
    try {
      const cacheKey = `products-category-${category}`;
      
      if (useCache) {
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }
      
      console.log(`Obteniendo productos de categoría: ${category}`);
      const response = await api.get('/products', {
        params: { category, limit: 100 } // Límite alto para categorías
      });
      
      setCachedData(cacheKey, response);
      return response;
      
    } catch (error) {
      console.error('Error en getProductsByCategory:', error.message);
      throw error;
    }
  },

  // Función para búsqueda optimizada con cache
  searchProducts: async (searchTerm, useCache = true) => {
    try {
      if (!searchTerm || searchTerm.length < 2) {
        return { data: { data: [], totalCount: 0 } };
      }
      
      const cacheKey = `products-search-${searchTerm.toLowerCase()}`;
      
      if (useCache) {
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }
      
      console.log(`Buscando productos: ${searchTerm}`);
      const response = await api.get('/products', {
        params: { search: searchTerm, limit: 100 }
      });
      
      // Cache por menos tiempo para búsquedas (15 segundos)
      cache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      });
      
      return response;
      
    } catch (error) {
      console.error('Error en searchProducts:', error.message);
      throw error;
    }
  },

  // Función para obtener logs del backend
  getLogs: async (params = {}) => {
    try {
      console.log('Obteniendo logs del servidor...');
      const response = await api.get('/logs', { params });
      
      return response;
      
    } catch (error) {
      console.error('Error en getLogs:', error.message);
      throw error;
    }
  },

  // Función para limpiar logs del backend
  clearLogs: async () => {
    try {
      console.log('Limpiando logs del servidor...');
      const response = await api.post('/logs/clear');
      
      return response;
      
    } catch (error) {
      console.error('Error en clearLogs:', error.message);
      throw error;
    }
  }
};

export default apiService;