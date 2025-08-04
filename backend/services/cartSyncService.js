// cartSyncService.js - Servicio para sincronización entre POS web // Obtener carrito por sessionId o shortCode
const getSyncedCart = (identifier) => {
  console.log('getSyncedCart - identifier:', identifier);
  
  // Primero intentar usar el identificador como sessionId
  if (syncedCarts.has(identifier)) {
    const cart = syncedCarts.get(identifier);
    console.log('getSyncedCart - carrito encontrado por sessionId:', JSON.stringify(cart, null, 2));
    return cart;
  }
  
  // Luego intentar usar el identificador como código corto
  const sessionId = shortCodeToSessionId.get(identifier.toUpperCase());
  if (sessionId && syncedCarts.has(sessionId)) {
    const cart = syncedCarts.get(sessionId);
    console.log('getSyncedCart - carrito encontrado por shortCode:', JSON.stringify(cart, null, 2));
    return cart;
  }
  
  console.log('getSyncedCart - carrito no encontrado');
  return null;óvil
const crypto = require('crypto');
const cartService = require('./cartService');
const salesService = require('./salesService');
const transactionsService = require('./transactionsService'); // Agregar transactionsService
const Logger = require('../utils/logger.js');

// Almacén en memoria de carritos sincronizados (en producción usar Redis o similar)
const syncedCarts = new Map();
const shortCodeToSessionId = new Map();

// Generar un código alfanumérico de 6 caracteres que sea fácil de escribir
const generateShortCode = () => {
  // Caracteres que son fáciles de distinguir visualmente (excluimos 0, O, 1, I, etc.)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  
  return result;
};

// Crear una nueva sesión de sincronización
const createSyncSession = (cart) => {
  console.log('createSyncSession - cart recibido:', JSON.stringify(cart, null, 2));
  
  const sessionId = crypto.randomUUID();
  const shortCode = generateShortCode();
  
  const syncData = {
    sessionId,
    shortCode,
    items: cart.items || [],
    total: cart.total || 0,
    status: 'pending', // pending, paid, expired
    createdAt: new Date().toISOString(),
    updated: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60 * 1000) // Expira en 30 minutos
  };
  
  console.log('createSyncSession - syncData creado:', JSON.stringify(syncData, null, 2));
  
  syncedCarts.set(sessionId, syncData);
  shortCodeToSessionId.set(shortCode, sessionId);
  
  // Programar la limpieza automática después de que expire
  setTimeout(() => {
    if (syncedCarts.has(sessionId)) {
      const data = syncedCarts.get(sessionId);
      if (data.status === 'pending') {
        data.status = 'expired';
        syncedCarts.set(sessionId, data);
      }
    }
    // Limpiar después de 1 hora
    setTimeout(() => {
      syncedCarts.delete(sessionId);
      shortCodeToSessionId.delete(shortCode);
    }, 30 * 60 * 1000);
  }, 30 * 60 * 1000); // 30 minutos
  
  return { sessionId, shortCode };
};

// Obtener un carrito sincronizado por ID de sesión o código corto
const getSyncedCart = (identifier) => {
  // Primero intentar usar el identificador como sessionId
  if (syncedCarts.has(identifier)) {
    return syncedCarts.get(identifier);
  }
  
  // Luego intentar usar el identificador como código corto
  const sessionId = shortCodeToSessionId.get(identifier.toUpperCase());
  if (sessionId && syncedCarts.has(sessionId)) {
    return syncedCarts.get(sessionId);
  }
  
  return null;
};

// Actualizar un carrito sincronizado
const updateSyncedCart = (identifier, cart) => {
  let sessionId = identifier;
  
  // Verificar si es un código corto
  if (!syncedCarts.has(identifier)) {
    sessionId = shortCodeToSessionId.get(identifier.toUpperCase());
    if (!sessionId) return null;
  }
  
  if (!syncedCarts.has(sessionId)) return null;
  
  const syncData = syncedCarts.get(sessionId);
  syncData.items = cart.items || [];
  syncData.total = cart.total || 0;
  syncData.updated = new Date().toISOString();
  
  syncedCarts.set(sessionId, syncData);
  return syncData;
};

// Procesar el pago de un carrito sincronizado
const processPayment = async (identifier, paymentInfo) => {
  let sessionId = identifier;
  
  // Verificar si es un código corto
  if (!syncedCarts.has(identifier)) {
    sessionId = shortCodeToSessionId.get(identifier.toUpperCase());
    if (!sessionId) throw new Error('Carrito no encontrado');
  }
  
  const syncData = syncedCarts.get(sessionId);
  if (!syncData) throw new Error('Carrito no encontrado');
  
  if (syncData.status !== 'pending') {
    throw new Error(`El carrito ya fue ${syncData.status}`);
  }
  
  try {
    // Preparar datos para la venta en el formato que espera salesService
    const formattedItems = syncData.items.map(item => {
      // Asegurar que todos los campos necesarios existen
      const cantidad = parseInt(item.quantity || 1, 10);
      return {
        id: item.id, // Mantener id original
        productId: item.id || item.productId, // Asegurar que productId esté presente
        nombre: item.nombre,
        precio: parseFloat(item.precio),
        cantidad: cantidad, // Convertir explícitamente quantity a cantidad
        subtotal: parseFloat(item.precio) * cantidad
      };
    });
    
    Logger.info("Items formateados:", JSON.stringify(formattedItems, null, 2));
    
    const saleData = {
      items: formattedItems,
      total: syncData.total,
      paymentMethod: paymentInfo.method || 'wallet',
      amountReceived: syncData.total,  // En wallet, lo recibido siempre equivale al total
      change: 0,  // En wallet, no hay cambio
      clientName: paymentInfo.userId ? `Usuario Wallet: ${paymentInfo.userId}` : "Cliente General"
    };
    
    Logger.info("Datos de venta preparados:", saleData);
    
    // Usar salesService para crear la venta en la colección "sales"
    const sale = await salesService.createSale(saleData);
    
    // NUEVO: Crear también una transacción en la colección "transactions"
    if (paymentInfo.userId) {
      try {
        const transactionData = {
          userId: paymentInfo.userId,
          amount: syncData.total,
          type: 'payment',
          description: `Compra en POS - ${formattedItems.length} artículos`,
          sessionId: sessionId,
          paymentMethod: paymentInfo.method || 'wallet',
          saleId: sale.id // Vincular con la venta
        };
        
        const transaction = await transactionsService.createTransaction(transactionData);
        Logger.info(`Transacción creada: ${transaction.id} para usuario: ${paymentInfo.userId}`);
        
        // Actualizar el estado del carrito sincronizado
        syncData.status = 'paid';
        syncData.transactionId = transaction.id; // Usar transaction ID en lugar de sale ID
        syncData.saleId = sale.id; // Mantener referencia a la venta también
        syncData.paidAt = new Date().toISOString();
        syncedCarts.set(sessionId, syncData);
        
        return {
          success: true,
          message: 'Pago procesado con éxito',
          paymentInfo: paymentInfo,
          orderId: sale.id,
          transactionId: transaction.id,
          sessionId: sessionId
        };
      } catch (transactionError) {
        Logger.error('Error creando transacción:', transactionError.message || transactionError);
        console.error('Error completo al crear transacción:', transactionError);
        // Continuar aunque la transacción falle, la venta ya se creó
      }
    }
    
    // Fallback si no hay userId o falla la creación de transacción
    syncData.status = 'paid';
    syncData.transactionId = sale.id;
    syncData.paidAt = new Date().toISOString();
    syncedCarts.set(sessionId, syncData);
    
    return {
      success: true,
      message: 'Pago procesado con éxito',
      paymentInfo: paymentInfo,
      orderId: sale.id,
      sessionId: sessionId
    };
  } catch (error) {
    Logger.error('Error al procesar el pago:', error);
    syncData.status = 'failed';
    syncData.error = error.message;
    syncedCarts.set(sessionId, syncData);
    throw new Error('No se pudo procesar el pago: ' + error.message);
  }
};

// Limpiar sesiones expiradas periódicamente
const cleanupExpiredSessions = () => {
  const now = new Date();
  
  for (const [sessionId, data] of syncedCarts.entries()) {
    if (new Date(data.expiresAt) < now && data.status === 'pending') {
      data.status = 'expired';
      syncedCarts.set(sessionId, data);
    }
    
    // Eliminar sesiones muy antiguas (más de 2 horas)
    if (new Date(data.createdAt).getTime() + (2 * 60 * 60 * 1000) < now.getTime()) {
      const shortCode = data.shortCode;
      syncedCarts.delete(sessionId);
      if (shortCode) {
        shortCodeToSessionId.delete(shortCode);
      }
    }
  }
};

// Configurar limpieza periódica cada 5 minutos
setInterval(cleanupExpiredSessions, 5 * 60 * 1000);

module.exports = {
  createSyncSession,
  getSyncedCart,
  updateSyncedCart,
  processPayment,
  generateShortCode
};