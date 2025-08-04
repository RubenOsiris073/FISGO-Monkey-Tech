const express = require('express');
const router = express.Router();
const detectionService = require('../services/detectionService');
const Logger = require('../utils/logger.js');
const { verifyToken } = require('../middleware/auth');

// Realizar una detección
router.post('/detect', async (req, res) => {
  try {
    const { image, fast = false } = req.body;
    
    if (!image) {
      return res.status(400).json({ 
        error: "Se requiere una imagen para la detección" 
      });
    }

    const detection = await detectionService.performDetection(image, { fast });
    res.json({
      success: true,
      detection
    });
  } catch (error) {
    Logger.error("Error en detección:", error);
    res.status(500).json({ 
      error: "Error en detección",
      details: error.message 
    });
  }
});

// Obtener detecciones recientes
router.get('/recent', async (req, res) => {
  try {
    const limitParam = parseInt(req.query.limit) || 10;
    const detections = await detectionService.getRecentDetections(limitParam);
    res.json({ detections });
  } catch (error) {
    Logger.error("Error al obtener detecciones:", error);
    res.status(500).json({ error: "Error al obtener detecciones", detections: [] });
  }
});

// Mantener compatibilidad con ruta anterior
router.get('/detections', async (req, res) => {
  try {
    const limitParam = parseInt(req.query.limit) || 10;
    const detections = await detectionService.getRecentDetections(limitParam);
    res.json({ detections });
  } catch (error) {
    Logger.error("Error al obtener detecciones:", error);
    res.status(500).json({ error: "Error al obtener detecciones", detections: [] });
  }
});

// Obtener estado de detección
router.get('/detection-mode', async (req, res) => {
  res.json(detectionService.getDetectionMode());
});

// Cambiar modo de detección
router.post('/detection-mode', verifyToken, (req, res) => {
  const { active } = req.body;
  
  if (typeof active !== 'boolean') {
    return res.status(400).json({ error: "El parámetro 'active' debe ser un booleano" });
  }
  
  const result = detectionService.setDetectionMode(active);
  res.json({
    ...result,
    message: result.active ? "Modo de detección continua activado" : "Modo de detección continua desactivado"
  });
});

// Obtener estado de detección (ruta simplificada)
router.get('/status', async (req, res) => {
  try {
    const status = await detectionService.getDetectionStatus();
    res.json(status);
  } catch (error) {
    Logger.error("Error al obtener estado de detección:", error);
    res.status(500).json({ error: "Error al obtener estado de detección" });
  }
});

// Consultar estado de detección continua (mantener compatibilidad)
router.get('/detection/continuous/status', async (req, res) => {
  try {
    const status = await detectionService.getDetectionStatus();
    res.json(status);
  } catch (error) {
    Logger.error("Error al obtener estado de detección continua:", error);
    res.status(500).json({ error: "Error al obtener estado de detección continua" });
  }
});

// Configuración de detección continua
router.post('/detection/continuous', verifyToken, async (req, res) => {
  try {
    const { active, intervalMs } = req.body;
    const result = await detectionService.setDetectionMode(active, intervalMs);
    res.json(result);
  } catch (error) {
    Logger.error("Error al configurar modo de detección continua:", error);
    res.status(500).json({ error: "Error al configurar modo de detección continua" });
  }
});

module.exports = router;