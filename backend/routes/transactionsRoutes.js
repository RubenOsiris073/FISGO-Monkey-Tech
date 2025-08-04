const express = require('express');
const router = express.Router();
const transactionsService = require('../services/transactionsService');
const Logger = require('../utils/logger.js');
const { verifyToken } = require('../middleware/auth');

// Obtener todas las transacciones con límite
router.get('/', verifyToken, async (req, res) => {
  try {
    const limitVal = parseInt(req.query.limit) || 10;
    const transactions = await transactionsService.getTransactions(limitVal);
    res.json({
      success: true, 
      transactions
    });
  } catch (error) {
    Logger.error("Error al obtener transacciones:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Error al obtener transacciones",
      transactions: []
    });
  }
});

// Obtener transacciones por usuario
router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const limitVal = parseInt(req.query.limit) || 20;
    
    Logger.info(`Obteniendo transacciones para usuario ${userId} con límite ${limitVal}`);
    
    const transactions = await transactionsService.getUserTransactions(userId, limitVal);
    
    res.json({
      success: true,
      transactions
    });
  } catch (error) {
    Logger.error(`Error al obtener transacciones para usuario ${req.params.userId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message || "Error al obtener transacciones del usuario",
      transactions: []
    });
  }
});

// Verificar estado de transacción por ID
router.get('/:transactionId/status', verifyToken, async (req, res) => {
  try {
    const { transactionId } = req.params;
    // Esta ruta es un placeholder por ahora
    // En una implementación completa, verificaría el estado actual de la transacción
    res.json({
      success: true,
      status: 'completed',
      transactionId
    });
  } catch (error) {
    Logger.error(`Error al verificar estado de transacción ${req.params.transactionId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message || "Error al verificar estado de la transacción"
    });
  }
});

// Crear una nueva transacción
router.post('/', verifyToken, async (req, res) => {
  try {
    const transactionData = req.body;
    
    Logger.info('Creando transacción:', transactionData);
    
    const transaction = await transactionsService.createTransaction(transactionData);
    
    res.json({
      success: true,
      transaction
    });
  } catch (error) {
    Logger.error('Error al crear transacción:', error);
    res.status(500).json({
      success: false,
      error: error.message || "Error al crear transacción"
    });
  }
});

// Obtener una transacción específica por ID
router.get('/:transactionId', verifyToken, async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    Logger.info(`Obteniendo transacción con ID: ${transactionId}`);
    
    const transaction = await transactionsService.getTransactionById(transactionId);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: "Transacción no encontrada"
      });
    }
    
    res.json({
      success: true,
      transaction
    });
  } catch (error) {
    Logger.error(`Error al obtener transacción ${req.params.transactionId}:`, error);
    res.status(500).json({
      success: false,
      error: error.message || "Error al obtener la transacción"
    });
  }
});

// Crear reembolso para una transacción específica
router.post('/:transactionId/refund', verifyToken, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { reason, amount } = req.body;
    
    Logger.info(`Procesando reembolso para transacción ${transactionId}`);
    
    // Primero obtener la transacción original
    const originalTransaction = await transactionsService.getTransactionById(transactionId);
    
    if (!originalTransaction) {
      return res.status(404).json({
        success: false,
        error: "Transacción no encontrada"
      });
    }
    
    // Verificar que sea una transacción de pago
    if (originalTransaction.type !== 'payment') {
      return res.status(400).json({
        success: false,
        error: "Solo se pueden reembolsar pagos"
      });
    }
    
    // Verificar que no haya sido reembolsada ya
    if (originalTransaction.status === 'refunded') {
      return res.status(400).json({
        success: false,
        error: "Esta transacción ya fue reembolsada"
      });
    }
    
    // Calcular monto del reembolso
    const refundAmount = amount || originalTransaction.amount;
    
    if (refundAmount > originalTransaction.amount) {
      return res.status(400).json({
        success: false,
        error: "El monto del reembolso no puede ser mayor al monto original"
      });
    }
    
    // Crear transacción de reembolso
    const refundData = {
      userId: originalTransaction.userId,
      amount: refundAmount,
      type: 'refund',
      description: `Reembolso de transacción ${transactionId}${reason ? ` - ${reason}` : ''}`,
      originalTransactionId: transactionId,
      paymentMethod: originalTransaction.paymentMethod
    };
    
    const refundTransaction = await transactionsService.createTransaction(refundData);
    
    // Actualizar la transacción original como reembolsada
    await transactionsService.updateTransactionStatus(transactionId, 'refunded');
    
    res.json({
      success: true,
      refund: refundTransaction,
      message: 'Reembolso procesado exitosamente'
    });
    
  } catch (error) {
    Logger.error(`Error procesando reembolso:`, error);
    res.status(500).json({
      success: false,
      error: error.message || "Error al procesar el reembolso"
    });
  }
});

module.exports = router;