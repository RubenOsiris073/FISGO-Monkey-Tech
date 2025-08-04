const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { verifyToken } = require('../middleware/auth');

// Almacenar logs en memoria para tiempo real
let recentLogs = [];
const MAX_LOGS = 1000; // Mantener últimos 1000 logs

// Función para agregar log
const addLog = (level, message, metadata = {}) => {
  const logEntry = {
    id: Date.now() + Math.random(),
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    metadata,
    source: 'backend'
  };
  
  recentLogs.unshift(logEntry);
  if (recentLogs.length > MAX_LOGS) {
    recentLogs = recentLogs.slice(0, MAX_LOGS);
  }
};

// Interceptar console.log para capturar logs
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
const originalInfo = console.info;

console.log = (...args) => {
  originalLog(...args);
  addLog('info', args.join(' '));
};

console.error = (...args) => {
  originalError(...args);
  addLog('error', args.join(' '));
};

console.warn = (...args) => {
  originalWarn(...args);
  addLog('warning', args.join(' '));
};

console.info = (...args) => {
  originalInfo(...args);
  addLog('info', args.join(' '));
};

// GET /api/logs - Obtener logs recientes
router.get('/', verifyToken, (req, res) => {
  const { level, limit = 100, since } = req.query;
  
  let filteredLogs = [...recentLogs];
  
  // Filtrar por nivel si se especifica
  if (level && level !== 'all') {
    filteredLogs = filteredLogs.filter(log => 
      log.level.toLowerCase() === level.toLowerCase()
    );
  }
  
  // Filtrar por timestamp si se especifica
  if (since) {
    const sinceDate = new Date(since);
    filteredLogs = filteredLogs.filter(log => 
      new Date(log.timestamp) > sinceDate
    );
  }
  
  // Limitar cantidad
  filteredLogs = filteredLogs.slice(0, parseInt(limit));
  
  res.json({
    success: true,
    logs: filteredLogs,
    total: recentLogs.length,
    filtered: filteredLogs.length
  });
});

// GET /api/logs/stream - Stream de logs en tiempo real (Server-Sent Events)
router.get('/stream', verifyToken, (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Enviar logs existentes
  res.write(`data: ${JSON.stringify({ type: 'initial', logs: recentLogs.slice(0, 50) })}\n\n`);

  // Función para enviar nuevos logs
  const sendLog = (logEntry) => {
    res.write(`data: ${JSON.stringify({ type: 'new', log: logEntry })}\n\n`);
  };

  // Agregar listener para nuevos logs (simulado con interval)
  const intervalId = setInterval(() => {
    if (recentLogs.length > 0) {
      // En una implementación real, aquí usarías un EventEmitter
      // Por ahora, enviaremos el log más reciente si es nuevo
    }
  }, 1000);

  // Cleanup cuando el cliente se desconecta
  req.on('close', () => {
    clearInterval(intervalId);
  });
});

// POST /api/logs/clear - Limpiar logs
router.post('/clear', verifyToken, (req, res) => {
  recentLogs = [];
  console.log('🧹 Logs limpiados desde la interfaz admin');
  
  res.json({
    success: true,
    message: 'Logs limpiados correctamente'
  });
});

// GET /api/logs/download - Descargar logs como archivo
router.get('/download', verifyToken, (req, res) => {
  const { format = 'json' } = req.query;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  if (format === 'json') {
    res.setHeader('Content-Disposition', `attachment; filename="backend-logs-${timestamp}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(recentLogs, null, 2));
  } else if (format === 'txt') {
    res.setHeader('Content-Disposition', `attachment; filename="backend-logs-${timestamp}.txt"`);
    res.setHeader('Content-Type', 'text/plain');
    
    const txtLogs = recentLogs.map(log => 
      `[${log.timestamp}] ${log.level}: ${log.message}`
    ).join('\n');
    
    res.send(txtLogs);
  } else {
    res.status(400).json({
      success: false,
      error: 'Formato no soportado. Use json o txt'
    });
  }
});

// Exportar función para agregar logs desde otros módulos
router.addLog = addLog;

module.exports = router;