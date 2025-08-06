const { COLLECTIONS } = require('../config/firebaseManager');
const firestore = require('../utils/firestoreAdmin');
const Logger = require('../utils/logger.js');

/**
 * Obtiene todos los productos directamente desde Firebase
 * El stock se lee directamente del campo 'cantidad' del documento PRODUCTS
 */
async function getAllProducts() {
  try {
    Logger.info("Obteniendo productos directamente desde Firebase PRODUCTS...");
    
    // Obtener productos del catálogo con stock incluido
    const snapshot = await firestore.collection(COLLECTIONS.PRODUCTS).get();
    const products = [];
    snapshot.forEach(doc => {
      products.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    if (products.length === 0) {
      Logger.info("No hay productos en el catálogo");
      return [];
    }
    
    // Asegurar que todos los productos tengan un campo cantidad válido
    const productsWithStock = products.map(product => {
      const cantidad = product.cantidad || 0;
      
      return {
        ...product,
        cantidad: cantidad,
        stock: cantidad // Mantener compatibilidad con frontend
      };
    });
    
    Logger.info(`Productos obtenidos: ${productsWithStock.length} (stock desde PRODUCTS)`);
    
    // Mostrar resumen de stock
    const productsWithStock_count = productsWithStock.filter(p => (p.cantidad || 0) > 0).length;
    const productsWithoutStock_count = productsWithStock.filter(p => (p.cantidad || 0) === 0).length;
    
    Logger.info(`Resumen: ${productsWithStock_count} con stock, ${productsWithoutStock_count} sin stock`);
    
    return productsWithStock;
  } catch (error) {
    Logger.error("Error al obtener productos:", error);
    throw error;
  }
}

/**
 * Actualiza el stock de un producto directamente en PRODUCTS
 * Esta función reemplaza al inventoryService para unificar el manejo de stock
 */
async function updateProductStock(productId, adjustment, reason = 'Ajuste de stock', userId = 'system') {
  try {
    Logger.info(`Actualizando stock en PRODUCTS - ID: ${productId}, Ajuste: ${adjustment}`);
    
    const productRef = firestore.collection(COLLECTIONS.PRODUCTS).doc(productId);
    const productDoc = await productRef.get();
    
    if (!productDoc.exists) {
      throw new Error(`Producto ${productId} no encontrado`);
    }
    
    const productData = productDoc.data();
    const currentStock = productData.cantidad || 0;
    const newStock = Math.max(0, currentStock + adjustment);

    // Actualizar directamente sin batch para simplificar
    await productRef.update({
      cantidad: newStock,
      stock: newStock,
      updatedAt: new Date(),
      lastStockUpdate: {
        adjustment,
        reason,
        previousStock: currentStock,
        newStock,
        timestamp: new Date(),
        user: userId
      }
    });

    Logger.info(`Stock actualizado: ${productData.nombre} - ${currentStock} → ${newStock}`);

    return {
      success: true,
      productId,
      productName: productData.nombre,
      previousStock: currentStock,
      newStock,
      adjustment
    };
  } catch (error) {
    Logger.error(`Error actualizando stock para ${productId}:`, error);
    throw error;
  }
}
/**
 * Obtiene el stock actual de un producto desde PRODUCTS
 */
async function getProductStock(productId) {
  try {
    const productRef = firestore.collection(COLLECTIONS.PRODUCTS).doc(productId);
    const productDoc = await productRef.get();
    
    if (!productDoc.exists) {
      return { stock: 0, exists: false };
    }
    
    const productData = productDoc.data();
    return { 
      stock: productData.cantidad || 0, 
      exists: true,
      productName: productData.nombre 
    };
  } catch (error) {
    Logger.error(`Error obteniendo stock para ${productId}:`, error);
    return { stock: 0, exists: false };
  }
}

/**
 * Busca productos por nombre o etiqueta con stock sincronizado
 */
async function searchProducts(term) {
  try {
    if (!term) {
      return await getAllProducts();
    }
    
    // Obtener todos los productos con stock para filtrar localmente
    const allProductsWithStock = await getAllProducts();
    
    // Filtrar por término de búsqueda
    const filteredProducts = allProductsWithStock.filter(product => 
      (product.nombre && product.nombre.toLowerCase().includes(term.toLowerCase())) ||
      (product.label && product.label.toLowerCase().includes(term.toLowerCase())) ||
      (product.codigo && product.codigo.toLowerCase().includes(term.toLowerCase()))
    );
    
    return filteredProducts;
  } catch (error) {
    Logger.error("Error buscando productos:", error);
    throw error;
  }
}

/**
 * Crea un nuevo producto
 */
async function createProduct(productData) {
  try {
    Logger.info('Creando producto en productService:', JSON.stringify(productData, null, 2));
    
    const { nombre, precio } = productData;
    
    if (!nombre || !precio) {
      throw new Error("Nombre y precio son requeridos");
    }
    
    const newProduct = {
      ...productData, // Guardar todos los campos del producto
      precio: parseFloat(precio),
      cantidad: parseInt(productData.cantidad) || 1, // Asegurar que cantidad sea un número
      label: productData.label || nombre.toLowerCase().replace(/\s+/g, '_'),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await firestore.collection(COLLECTIONS.PRODUCTS).add(newProduct);
    
    Logger.info('Producto guardado exitosamente:', { id: docRef.id, data: newProduct });
    
    return { 
      id: docRef.id,
      ...newProduct,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  } catch (error) {
    Logger.error("Error al crear producto:", error);
    throw error;
  }
}

/**
 * Obtiene productos con paginación y filtros
 */
async function getProductsPaginated({ page = 1, limit = 50, category, search }) {
  try {
    Logger.info(`Obteniendo productos paginados - Página: ${page}, Límite: ${limit}`);
    
    let query = firestore.collection(COLLECTIONS.PRODUCTS);
    
    // Aplicar filtro de categoría si se especifica
    if (category && category !== 'all') {
      query = query.where('categoria', '==', category);
    }
    
    // Para búsqueda, necesitamos obtener todos y filtrar en memoria
    // (Firestore no soporta búsqueda de texto completo nativa)
    const snapshot = await query.get();
    
    let products = [];
    snapshot.forEach(doc => {
      const productData = doc.data();
      products.push({
        id: doc.id,
        ...productData,
        // Asegurar que cantidad esté presente
        cantidad: productData.cantidad || productData.stock || 0
      });
    });
    
    // Aplicar filtro de búsqueda si se especifica
    if (search) {
      const searchTerm = search.toLowerCase();
      products = products.filter(product => 
        product.nombre?.toLowerCase().includes(searchTerm) ||
        product.codigo?.toLowerCase().includes(searchTerm) ||
        product.categoria?.toLowerCase().includes(searchTerm) ||
        product.marca?.toLowerCase().includes(searchTerm)
      );
    }
    
    // Calcular paginación
    const totalCount = products.length;
    const totalPages = Math.ceil(totalCount / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    // Obtener productos de la página actual
    const paginatedProducts = products.slice(startIndex, endIndex);
    
    Logger.info(`Productos paginados obtenidos: ${paginatedProducts.length} de ${totalCount}`);
    
    return {
      products: paginatedProducts,
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };
  } catch (error) {
    Logger.error('Error obteniendo productos paginados:', error);
    throw error;
  }
}

module.exports = {
  getAllProducts,
  createProduct,
  searchProducts,
  updateProductStock,
  getProductStock,
  getProductsPaginated
};