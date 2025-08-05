const express = require('express');
const router = express.Router();
const { imageService } = require('../services/imageService');
const Logger = require('../utils/logger');

// GET /api/images/products/:productCode - Obtener imagen de producto
router.get('/products/:productCode', async (req, res) => {
  try {
    const { productCode } = req.params;
    const { ext = 'jpg' } = req.query; // Extensión por defecto jpg
    
    const imagePath = `products/${productCode}.${ext}`;
    
    // Verificar si la imagen existe
    const exists = await imageService.imageExists(imagePath);
    
    if (!exists) {
      // Redirigir a imagen por defecto
      return res.redirect('/no-image.jpg');
    }
    
    // Obtener URL firmada para acceso directo
    const signedUrl = await imageService.getSignedUrl(imagePath);
    
    // Redirigir a la URL firmada
    res.redirect(signedUrl);
    
  } catch (error) {
    Logger.error('Error obteniendo imagen de producto:', error);
    res.redirect('/no-image.jpg');
  }
});

// GET /api/images/url/products/:productCode - Obtener solo la URL de la imagen
router.get('/url/products/:productCode', async (req, res) => {
  try {
    const { productCode } = req.params;
    const { ext = 'jpg' } = req.query;
    
    const imagePath = `products/${productCode}.${ext}`;
    
    // Verificar si la imagen existe
    const exists = await imageService.imageExists(imagePath);
    
    if (!exists) {
      return res.json({
        success: false,
        imageUrl: '/no-image.jpg',
        message: 'Imagen no encontrada, usando imagen por defecto'
      });
    }
    
    // Obtener URL pública o firmada
    const imageUrl = imageService.getProductImageUrl(productCode, ext);
    
    res.json({
      success: true,
      imageUrl,
      productCode,
      extension: ext
    });
    
  } catch (error) {
    Logger.error('Error obteniendo URL de imagen:', error);
    res.json({
      success: false,
      imageUrl: '/no-image.jpg',
      error: error.message
    });
  }
});

// POST /api/images/upload - Subir nueva imagen
router.post('/upload', async (req, res) => {
  try {
    const { imageData, productCode, folder = 'products' } = req.body;
    
    if (!imageData || !productCode) {
      return res.status(400).json({
        success: false,
        message: 'imageData y productCode son requeridos'
      });
    }
    
    // Convertir base64 a buffer
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    const fileName = `${productCode}.jpg`;
    const imageUrl = await imageService.uploadImage(imageBuffer, fileName, folder);
    
    res.json({
      success: true,
      imageUrl,
      productCode,
      message: 'Imagen subida exitosamente'
    });
    
  } catch (error) {
    Logger.error('Error subiendo imagen:', error);
    res.status(500).json({
      success: false,
      message: 'Error subiendo imagen',
      error: error.message
    });
  }
});

// DELETE /api/images/products/:productCode - Eliminar imagen de producto
router.delete('/products/:productCode', async (req, res) => {
  try {
    const { productCode } = req.params;
    const { ext = 'jpg' } = req.query;
    
    const imagePath = `products/${productCode}.${ext}`;
    
    await imageService.deleteImage(imagePath);
    
    res.json({
      success: true,
      message: 'Imagen eliminada exitosamente',
      productCode
    });
    
  } catch (error) {
    Logger.error('Error eliminando imagen:', error);
    res.status(500).json({
      success: false,
      message: 'Error eliminando imagen',
      error: error.message
    });
  }
});

module.exports = router;
