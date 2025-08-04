const { firebaseManager } = require('../config/firebaseManager');
const firestoreAdmin = require('../utils/firestoreAdmin');
const Logger = require('../utils/logger.js');

// Obtener transacciones con un límite
const getTransactions = async (limitVal) => {
  try {
    await firebaseManager.initialize();
    const db = firebaseManager.getDb();
    const admin = firebaseManager.getAdmin();
    
    const transactionsRef = db.collection('transactions');
    const query = transactionsRef.orderBy('timestamp', 'desc').limit(limitVal);
    const querySnapshot = await query.get();
    
    if (querySnapshot.empty) {
      return [];
    }
    
    const transactions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return transactions;
  } catch (error) {
    Logger.error("Error al obtener transacciones:", error);
    throw new Error("Error al obtener transacciones");
  }
};

// Obtener transacciones por userId
const getUserTransactions = async (userId, limitVal = 20) => {
  try {
    if (!userId) {
      throw new Error("Se requiere un userId para obtener las transacciones del usuario");
    }

    await firebaseManager.initialize();
    const db = firebaseManager.getDb();
    
    const transactionsRef = db.collection('transactions');
    // Simplificar la consulta para evitar el error de índice
    const query = transactionsRef
      .where('userId', '==', userId)
      .limit(limitVal);
    
    const querySnapshot = await query.get();
    
    if (querySnapshot.empty) {
      return [];
    }
    
    const transactions = querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || data.timestamp
      };
    });
    
    // Ordenar en memoria por timestamp descendente
    transactions.sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
      const timeB = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
      return timeB.getTime() - timeA.getTime();
    });
    
    return transactions;
  } catch (error) {
    Logger.error(`Error al obtener transacciones para usuario ${userId}:`, error);
    throw new Error(`Error al obtener transacciones del usuario: ${error.message}`);
  }
};

/**
 * Crear una nueva transacción de pago
 * @param {Object} transactionData - Datos de la transacción
 * @param {string} transactionData.userId - ID del usuario que realiza la transacción
 * @param {number} transactionData.amount - Monto de la transacción
 * @param {string} transactionData.type - Tipo de transacción (payment, refund, etc)
 * @param {string} transactionData.description - Descripción de la transacción
 * @param {string} transactionData.sessionId - ID de la sesión asociada (opcional)
 * @returns {Object} - La transacción creada con su ID
 */
const createTransaction = async (transactionData) => {
  try {
    Logger.info("Creando nueva transacción:", transactionData);
    
    const { userId, amount, type = 'payment', description, sessionId, paymentMethod, saleId } = transactionData;
    
    if (!userId) {
      throw new Error("userId es requerido para crear una transacción");
    }
    
    if (!amount || isNaN(amount) || amount <= 0) {
      throw new Error("Se requiere un monto válido mayor que cero");
    }

    await firebaseManager.initialize();
    const db = firebaseManager.getDb();
    const admin = firebaseManager.getAdmin();
    
    const transactionsRef = db.collection('transactions');
    const newTransaction = {
      userId,
      amount: parseFloat(amount),
      type,
      description: description || `${type} de $${amount}`,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      status: 'completed'
    };
    
    // Solo agregar campos opcionales si tienen valor
    if (sessionId) {
      newTransaction.sessionId = sessionId;
    }
    
    if (paymentMethod) {
      newTransaction.paymentMethod = paymentMethod;
    }
    
    if (saleId) {
      newTransaction.saleId = saleId;
    }
    
    const docRef = await transactionsRef.add(newTransaction);
    Logger.info(`Transacción creada con ID: ${docRef.id}`);
    
    return {
      id: docRef.id,
      ...newTransaction,
      timestamp: new Date().toISOString() // Convertir serverTimestamp a string ISO para la respuesta
    };
  } catch (error) {
    Logger.error("Error al crear transacción:", error.message || error);
    console.error("Error completo createTransaction:", error);
    throw new Error(`Error al crear transacción: ${error.message || error}`);
  }
};

// Obtener una transacción por ID
const getTransactionById = async (transactionId) => {
  try {
    await firebaseManager.initialize();
    const db = firebaseManager.getDb();
    
    const docRef = db.collection('transactions').doc(transactionId);
    const docSnap = await docRef.get();
    
    if (!docSnap.exists) {
      return null;
    }
    
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      timestamp: data.timestamp?.toDate?.() || data.timestamp
    };
  } catch (error) {
    Logger.error(`Error al obtener transacción ${transactionId}:`, error);
    throw new Error(`Error al obtener transacción: ${error.message}`);
  }
};

// Actualizar el estado de una transacción
const updateTransactionStatus = async (transactionId, newStatus) => {
  try {
    await firebaseManager.initialize();
    const db = firebaseManager.getDb();
    const admin = firebaseManager.getAdmin();
    
    const docRef = db.collection('transactions').doc(transactionId);
    
    await docRef.update({
      status: newStatus,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    Logger.info(`Transacción ${transactionId} actualizada a estado: ${newStatus}`);
    return true;
  } catch (error) {
    Logger.error(`Error al actualizar transacción ${transactionId}:`, error);
    throw new Error(`Error al actualizar transacción: ${error.message}`);
  }
};

module.exports = {
  getTransactions,
  getUserTransactions,
  createTransaction,
  getTransactionById,
  updateTransactionStatus
};