require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

// Importar configuraciones
const config = require('./config/config');
const corsOptions = require('./config/cors');

// Importar middleware
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

// Importar controladores
const systemController = require('./controllers/systemController');
const authController = require('./controllers/authController');

// Importar rutas
const productRoutes = require('./routes/productRoutes');
const detectionRoutes = require('./routes/detectionRoutes');
const salesRoutes = require('./routes/salesRoutes');
const transactionsRoutes = require('./routes/transactionsRoutes');
const stripeRoutes = require('./routes/stripeRoutes');
const cartRoutes = require('./routes/cartRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const logsRoutes = require('./routes/logsRoutes');
const imageRoutes = require('./routes/imageRoutes');

// Importar servicios
const googleSheetsService = require('./services/googleSheetsService');

// Importar logger mejorado
const Logger = require('./utils/logger');

// Configurar express
const app = express();

// Guardar tiempo de inicio del servidor
app.locals.startTime = new Date();

// Aplicar middleware global
app.use(logger);
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Crear router principal
const apiRouter = express.Router();

// =========================================================
// ENDPOINTS DE SISTEMA
// =========================================================
apiRouter.get('/health', systemController.healthCheck);
apiRouter.get('/status', systemController.serverStatus);

// =========================================================
// ENDPOINTS DE AUTENTICACIÓN
// =========================================================
apiRouter.post('/auth/login', authController.login);
apiRouter.get('/auth/verify', (req, res, next) => {
  const { verifyToken } = require('./middleware/auth');
  verifyToken(req, res, next);
}, authController.verify);
apiRouter.post('/auth/logout', (req, res, next) => {
  const { verifyToken } = require('./middleware/auth');
  verifyToken(req, res, next);
}, authController.logout);

// =========================================================
// REGISTRAR TODAS LAS RUTAS DE LA API
// =========================================================

// Registrar sub-rutas en el router principal
apiRouter.use('/products', productRoutes);
apiRouter.use('/detection', detectionRoutes);
apiRouter.use('/sales', salesRoutes);
apiRouter.use('/transactions', transactionsRoutes);
apiRouter.use('/stripe', stripeRoutes);
apiRouter.use('/cart', cartRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/logs', logsRoutes);
apiRouter.use('/images', imageRoutes);

// Montar el router principal en /api
app.use('/api', apiRouter);

// Servir archivos estáticos (imágenes de productos)
app.use('/images', express.static(path.join(__dirname, 'public/images')));
app.use('/static', express.static(path.join(__dirname, 'public')));

// =========================================================
// CONFIGURACIÓN DE PRODUCCIÓN
// =========================================================

// Ruta para servir archivos estáticos en producción
if (config.env === 'production') {
  app.use(express.static(path.join(__dirname, 'public')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

// =========================================================
// MANEJO DE ERRORES
// =========================================================

// Manejador de errores global
app.use(errorHandler);

// =========================================================
// INICIALIZACIÓN DE FIREBASE Y DATOS
// =========================================================

// Inicializar Firebase y datos necesarios
(async () => {
  try {
    Logger.startOperation('Backend Server Initialization');
    
    // Inicializar Firebase PRIMERO
    const { firebaseManager } = require('./config/firebaseManager');
    await firebaseManager.initialize();
    
    Logger.info("Inventario integrado en productos - no requiere inicialización separada");
    
    Logger.info("Inicializando servicio de Google Sheets...");
    await googleSheetsService.initialize();
    
    Logger.endOperation('Backend Server Initialization', true);
  } catch (error) {
    Logger.error("Error en inicialización del servidor", { error: error.message });
    Logger.endOperation('Backend Server Initialization', false);
  }
})();

// =========================================================
// INICIAR SERVIDOR
// =========================================================

// Puerto de escucha
const PORT = config.port;
const HOST = '0.0.0.0'; // Escuchar en todas las interfaces de red

app.listen(PORT, HOST, () => {
  Logger.separator('SERVIDOR BACKEND INICIADO');
  Logger.system(`Servidor corriendo en http://0.0.0.0:${PORT}`);
  Logger.system(`Modo: ${config.env}`);
  Logger.system(`Timestamp: ${new Date().toISOString()}`);
  Logger.separator('ENDPOINTS DISPONIBLES');
  
  Logger.info('Sistema:');
  Logger.info('  - GET /api/health - Estado de salud del API');
  Logger.info('  - GET /api/status - Estado del servidor');
  
  Logger.info('Autenticación:');
  Logger.info('  - POST /api/auth/login - Iniciar sesión');
  Logger.info('  - GET /api/auth/verify - Verificar token');
  Logger.info('  - POST /api/auth/logout - Cerrar sesión');
  
  Logger.info('Productos:');
  Logger.info('  - GET /api/products - Listar productos');
  Logger.info('  - GET /api/products/:id - Obtener producto');
  Logger.info('  - POST /api/products - Crear producto');
  Logger.info('  - PUT /api/products/:id - Actualizar producto');
  Logger.info('  - DELETE /api/products/:id - Eliminar producto');
  
  Logger.info('Stock (integrado en productos):');
  Logger.info('  - PUT /api/products/:id/stock - Actualizar stock de producto');
  Logger.info('  - GET /api/products/:id - Ver stock en datos del producto');
  
  Logger.info('Ventas:');
  Logger.info('  - GET /api/sales - Listar ventas');
  Logger.info('  - GET /api/sales/:id - Obtener venta');
  Logger.info('  - POST /api/sales - Crear venta');
  
  Logger.info('Carrito y Transacciones:');
  Logger.info('  - GET /api/cart - Obtener carrito');
  Logger.info('  - POST /api/cart - Agregar item al carrito');
  Logger.info('  - DELETE /api/cart/:id - Eliminar item del carrito');
  Logger.info('  - GET /api/transactions - Listar transacciones');
  
  Logger.separator();
  Logger.info('Detección:');
  Logger.info('  - POST /api/detection - Detectar objetos');
  Logger.info('  - POST /api/detection/capture - Capturar imagen');
  Logger.info('=========================================================');
  Logger.info('Dashboard:');
  Logger.info('  - GET /api/dashboard/metrics - Métricas del dashboard');
  Logger.info('  - GET /api/dashboard/sales-data - Datos de ventas desde Google Sheets');
  Logger.info('=========================================================');
  Logger.info('Logs del Backend:');
  Logger.info('  - GET /api/logs - Obtener logs recientes');
  Logger.info('  - GET /api/logs/stream - Stream en tiempo real');
  Logger.info('  - POST /api/logs/clear - Limpiar logs');
  Logger.info('  - GET /api/logs/download - Descargar logs');
  Logger.info('=========================================================');
});

// Exportar para testing
module.exports = app;