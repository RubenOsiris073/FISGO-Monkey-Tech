const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const { firebaseManager } = require('../config/firebaseManager');
const Logger = require('../utils/logger.js');

dotenv.config();

// Middleware para verificar JWT token o Firebase token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Token de autorización requerido',
        message: 'Debe incluir un token Bearer en el header Authorization' 
      });
    }

    const token = authHeader.replace('Bearer ', '');
    
    try {
      // Primero intentar verificar como JWT local
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Agregar información del usuario al request
      req.user = {
        uid: decoded.uid,
        email: decoded.email,
        emailVerified: decoded.emailVerified,
        role: decoded.role || 'user'
      };
      
      return next();
    } catch (jwtError) {
      // Si falla JWT local, intentar con Firebase
      try {
        // Asegurar que Firebase esté inicializado
        await firebaseManager.initialize();
        
        if (!firebaseManager.isInitialized()) {
          throw new Error('Firebase Admin no pudo inicializarse');
        }
        
        const admin = firebaseManager.getAdmin();
        const decodedToken = await admin.auth().verifyIdToken(token);
        
        // Agregar información del usuario de Firebase al request
        req.user = {
          uid: decodedToken.uid,
          email: decodedToken.email,
          emailVerified: decodedToken.email_verified,
          role: 'user' // Por defecto role user para tokens de Firebase
        };
        
        Logger.info(`Usuario autenticado con Firebase: ${decodedToken.email}`);
        return next();
      } catch (firebaseError) {
        Logger.error('Error verificando token Firebase:', firebaseError.message);
        throw new Error('Token inválido');
      }
    }
    
  } catch (error) {
    Logger.error('Error verificando token:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expirado',
        message: 'El token de autenticación ha expirado' 
      });
    }
    
    if (error.name === 'JsonWebTokenError' || error.message === 'Token inválido') {
      return res.status(401).json({ 
        error: 'Token inválido',
        message: 'El token de autenticación no es válido' 
      });
    }
    
    return res.status(401).json({ 
      error: 'Error de autenticación',
      message: 'No se pudo verificar el token de autenticación' 
    });
  }
};

module.exports = {
  verifyToken
};