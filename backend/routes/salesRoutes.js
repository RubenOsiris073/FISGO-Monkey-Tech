const express = require('express');
const router = express.Router();
const salesService = require('../services/salesService');
const Logger = require('../utils/logger.js');
const salesController = require('../controllers/salesController');
const { verifyToken } = require('../middleware/auth');

// Obtener todas las ventas
router.get('/', verifyToken, async (req, res) => {
  try {
    const sales = await salesService.getAllSales();
    // Asegúrate de devolver un objeto con una propiedad sales que contenga el array
    res.json({ sales }); 
  } catch (error) {
    Logger.error("Error al obtener ventas:", error);
    res.status(500).json({ error: "Error al obtener ventas", sales: [] });
  }
});

// Crear nueva venta
router.post('/', verifyToken, async (req, res) => {
  try {
    const result = await salesService.createSale(req.body);
    res.json(result);
  } catch (error) {
    Logger.error("Error al crear venta:", error);
    res.status(500).json({ error: error.message || "Error al crear venta" });
  }
});

// Obtener ventas paginadas
router.get('/paginated', verifyToken, salesController.getSalesPaginatedController);

// Obtener ventas desde cache
router.get('/cached', verifyToken, salesController.getCachedSalesController);

module.exports = router;