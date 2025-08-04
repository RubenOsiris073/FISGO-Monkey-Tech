// Servicio para gestionar carritos compartidos entre POS y wallet móvil
const { firebaseManager } = require('../config/firebaseManager');
const firestoreAdmin = require('../utils/firestoreAdmin');
const Logger = require('../utils/logger.js');

/**
 * Genera un código alfanumérico aleatorio de la longitud especificada
 * @param {number} length - Longitud del código
 * @returns {string} Código generado
 */
const generateSessionCode = (length = 8) => {
  // Solo incluimos caracteres fácilmente distinguibles (sin 0/O, 1/I, etc.)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Servicio para manejar carritos sincronizados
 */
class CartService {
  /**
   * Crea un nuevo carrito
   * @param {Object} cartData - Datos del carrito
   * @returns {Object} - Carrito creado
   */
  async createCart(cartData) {
    try {
      // Generar código de sesión aleatorio
      const sessionId = generateSessionCode(8);

      // Preparar datos del carrito
      const newCartData = {
        sessionId,
        items: cartData.items || [],
        total: cartData.total || 0,
        status: 'pending',
        deviceInfo: cartData.deviceInfo || null,
        paymentInfo: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Guardar en Firestore
      await firebaseManager.initialize();
      const db = firebaseManager.getDb();
      
      const cartsRef = db.collection('carts');
      const docRef = await cartsRef.add(newCartData);

      return {
        id: docRef.id,
        ...newCartData
      };
    } catch (error) {
      Logger.error('Error al crear carrito:', error);
      throw error;
    }
  }

  /**
   * Obtiene un carrito por ID de sesión
   * @param {string} sessionId - ID de sesión del carrito
   * @returns {Object|null} - Carrito encontrado o null
   */
  async getCartBySessionId(sessionId) {
    try {
      await firebaseManager.initialize();
      const db = firebaseManager.getDb();
      
      const cartsRef = db.collection('carts');
      const query = cartsRef.where('sessionId', '==', sessionId);
      const querySnapshot = await query.get();

      if (querySnapshot.empty) {
        return null;
      }

      const cartDoc = querySnapshot.docs[0];
      return {
        id: cartDoc.id,
        ...cartDoc.data()
      };
    } catch (error) {
      Logger.error(`Error al obtener carrito con sessionId ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Actualiza el estado de un carrito
   * @param {string} sessionId - ID de sesión del carrito
   * @param {Object} statusData - Datos de estado
   * @returns {Object} - Carrito actualizado
   */
  async updateCartStatus(sessionId, statusData) {
    try {
      const cart = await this.getCartBySessionId(sessionId);

      if (!cart) {
        throw new Error(`No se encontró el carrito con sessionId: ${sessionId}`);
      }

      await firebaseManager.initialize();
      const db = firebaseManager.getDb();

      const updateData = {
        ...statusData,
        updatedAt: new Date()
      };

      const cartRef = db.collection('carts').doc(cart.id);
      await cartRef.update(updateData);

      return {
        id: cart.id,
        ...cart,
        ...updateData
      };
    } catch (error) {
      Logger.error(`Error al actualizar estado del carrito con sessionId ${sessionId}:`, error);
      throw error;
    }
  }

  /**
   * Procesa el pago de un carrito
   * @param {string} sessionId - ID de sesión del carrito
   * @param {Object} paymentData - Datos del pago
   * @returns {Object} - Carrito con pago procesado
   */
  async processPayment(sessionId, paymentData) {
    try {
      const cart = await this.getCartBySessionId(sessionId);

      if (!cart) {
        throw new Error(`No se encontró el carrito con sessionId: ${sessionId}`);
      }

      await firebaseManager.initialize();
      const db = firebaseManager.getDb();

      const updateData = {
        status: 'completed',
        paymentInfo: {
          ...paymentData,
          processedAt: new Date()
        },
        updatedAt: new Date()
      };

      const cartRef = db.collection('carts').doc(cart.id);
      await cartRef.update(updateData);

      return {
        id: cart.id,
        ...cart,
        ...updateData
      };
    } catch (error) {
      Logger.error(`Error al procesar pago del carrito con sessionId ${sessionId}:`, error);
      throw error;
    }
  }
}

module.exports = new CartService();