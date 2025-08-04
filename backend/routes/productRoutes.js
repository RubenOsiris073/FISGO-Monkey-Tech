const express = require('express');
const router = express.Router();
const { COLLECTIONS } = require('../config/firebaseManager');
const firestore = require('../utils/firestoreAdmin');
const productService = require('../services/productService');
const Logger = require('../utils/logger.js');
const { verifyToken } = require('../middleware/auth');

// GET /api/products - Usar el servicio automatizado
router.get('/', async (req, res) => {
  try {
    const { page, limit, category, search } = req.query;
    
    // Si no se especifica paginación, obtener todos (para compatibilidad)
    if (!page && !limit) {
      const products = await productService.getAllProducts();
      
      res.json({
        data: products,
        success: true,
        count: products.length
      });
      return;
    }
    
    // Obtener productos con paginación
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    
    const result = await productService.getProductsPaginated({
      page: pageNum,
      limit: limitNum,
      category,
      search
    });
    
    res.json({
      data: result.products,
      success: true,
      count: result.products.length,
      totalCount: result.totalCount,
      totalPages: result.totalPages,
      currentPage: pageNum,
      hasNextPage: result.hasNextPage,
      hasPrevPage: result.hasPrevPage
    });
  } catch (error) {
    Logger.error('Error al obtener productos:', error);
    res.status(500).json({ 
      error: 'Error al obtener productos',
      message: error.message,
      success: false
    });
  }
});

// POST /api/products - Crear nuevo producto
router.post('/', verifyToken, async (req, res) => {
  try {
    const productData = req.body;
    
    Logger.info('Creando nuevo producto:', productData.nombre);
    
    // Validar datos requeridos
    if (!productData.nombre || !productData.categoria || !productData.precio) {
      return res.status(400).json({
        success: false,
        error: 'Faltan campos requeridos: nombre, categoria, precio'
      });
    }

    // Preparar datos del producto
    const newProduct = {
      ...productData,
      createdAt: new Date(),
      updatedAt: new Date(),
      activo: true,
      stockInitialized: true,
      // Si viene con initialQuantity, usar esa cantidad como stock inicial
      cantidad: productData.initialQuantity || productData.cantidad || 0
    };

    // Crear producto usando el servicio
    const result = await productService.createProduct(newProduct);
    
    Logger.info(`Producto creado exitosamente: ${result.id}`);
    
    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      id: result.id,
      product: result
    });
  } catch (error) {
    Logger.error('Error creando producto:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear producto',
      message: error.message
    });
  }
});

// Nuevo endpoint para inicializar stock automáticamente
router.post('/initialize-stock', verifyToken, async (req, res) => {
  try {
    Logger.info('🚀 Inicializando stock para todos los productos...');
    
    // Forzar la inicialización ejecutando getAllProducts
    const products = await productService.getAllProducts();
    
    // Contar productos con stock
    const productsWithStock = products.filter(p => p.cantidad > 0);
    const productsWithoutStock = products.filter(p => p.cantidad === 0);
    
    res.json({
      success: true,
      message: 'Stock inicializado correctamente',
      summary: {
        totalProducts: products.length,
        withStock: productsWithStock.length,
        withoutStock: productsWithoutStock.length
      }
    });
  } catch (error) {
    Logger.error('Error inicializando stock:', error);
    res.status(500).json({
      success: false,
      error: 'Error al inicializar stock',
      details: error.message
    });
  }
});

// Nuevo endpoint para obtener resumen de stock - MOVER ANTES DE /:id
router.get('/stock-summary', async (req, res) => {
  try {
    const products = await productService.getAllProducts();
    
    const summary = {
      totalProducts: products.length,
      withStock: products.filter(p => p.cantidad > 0).length,
      withoutStock: products.filter(p => p.cantidad === 0).length,
      totalStock: products.reduce((sum, p) => sum + (p.cantidad || 0), 0),
      lowStock: products.filter(p => p.cantidad > 0 && p.cantidad <= 5).length
    };
    
    res.json({
      success: true,
      summary
    });
  } catch (error) {
    Logger.error('Error obteniendo resumen de stock:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener resumen de stock'
    });
  }
});

// GET /api/products/:id - DESPUÉS de las rutas específicas
router.get('/:id', async (req, res) => {
  try {
    const productDoc = await firestore.collection(COLLECTIONS.PRODUCTS).doc(req.params.id).get();

    if (!productDoc.exists) {
      return res.status(404).json({ 
        error: 'Producto no encontrado' 
      });
    }

    res.json({
      id: productDoc.id,
      ...productDoc.data()
    });
  } catch (error) {
    Logger.error('Error al obtener producto:', error);
    res.status(500).json({ 
      error: 'Error al obtener producto',
      message: error.message 
    });
  }
});

// PUT /api/products/:id - Actualizar producto completo
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    Logger.info(`Actualizando producto: ${id}`);
    
    // Validar que el producto existe
    const existingProduct = await firestore.collection(COLLECTIONS.PRODUCTS).doc(id).get();
    
    if (!existingProduct.exists) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }
    
    // Preparar datos de actualización
    const updatedData = {
      ...updateData,
      updatedAt: new Date(),
      // Mantener campos importantes si no se proporcionan
      id: existingProduct.id,
      createdAt: existingProduct.data().createdAt || new Date()
    };
    
    // Actualizar el producto
    await existingProduct.ref.update(updatedData);
    
    // Obtener el producto actualizado
    const updatedProduct = await existingProduct.ref.get();
    
    Logger.info(`Producto actualizado exitosamente: ${updatedData.nombre || id}`);
    
    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      product: {
        id: updatedProduct.id,
        ...updatedProduct.data()
      }
    });
  } catch (error) {
    Logger.error(`Error actualizando producto ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar producto',
      message: error.message
    });
  }
});

// PUT /api/products/:id/stock - Actualizar stock directamente en el producto
router.put('/:id/stock', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { adjustment, reason = 'Ajuste manual' } = req.body;
    
    if (typeof adjustment !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'El ajuste debe ser un número'
      });
    }
    
    Logger.info(`Actualizando stock del producto ${id}: ajuste ${adjustment}`);
    
    // Usar productService unificado
    const updateResult = await productService.updateProductStock(id, adjustment, reason);
    
    res.json({
      success: true,
      message: 'Stock actualizado correctamente',
      product: {
        id,
        nombre: updateResult.productName,
        cantidad: updateResult.newStock,
        stock: updateResult.newStock
      },
      adjustment,
      newStock: updateResult.newStock
    });
    
  } catch (error) {
    Logger.error(`Error actualizando stock del producto ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Error al actualizar stock',
      message: error.message
    });
  }
});

// DELETE /api/products/:id - Eliminar producto completo
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    Logger.info(`Eliminando producto completo: ${id}`);
    
    // Obtener el producto antes de eliminarlo
    const productDoc = await firestore.collection(COLLECTIONS.PRODUCTS).doc(id).get();
    
    if (!productDoc.exists) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }
    
    const productData = productDoc.data();
    
    // Eliminar el producto (el stock está integrado en el mismo documento)
    await productDoc.ref.delete();
    
    Logger.info(`Producto eliminado: ${productData.nombre || id}`);
    
    res.json({
      success: true,
      message: 'Producto eliminado correctamente',
      deletedProduct: {
        id,
        nombre: productData.nombre || 'Producto sin nombre'
      }
    });
  } catch (error) {
    Logger.error(`Error eliminando producto ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Error al eliminar producto',
      message: error.message
    });
  }
});

module.exports = router;