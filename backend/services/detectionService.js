const tf = require('@tensorflow/tfjs-node');
const path = require('path');
const { addDetection, getDetections } = require('./storageService');
const Logger = require('../utils/logger.js');

class DetectionService {
  constructor() {
    this.model = null;
    this.isActive = false;
    this.detectionInterval = null;
    this.intervalMs = 1000; // Intervalo por defecto: 1 segundo
    this.modelPath = path.join(__dirname, '../models/model.json');
    this.initialize();
  }

  async initialize() {
    try {
      Logger.info("Iniciando servicio de detección...");
      await this.loadModel();
      Logger.info("Servicio de detección inicializado");
    } catch (error) {
      Logger.error("Error al inicializar servicio de detección:", error);
    }
  }

  async loadModel() {
    try {
      Logger.info("Cargando modelo desde:", this.modelPath);
      this.model = await tf.loadLayersModel(`file://${this.modelPath}`);
      Logger.info("Modelo cargado exitosamente");
    } catch (error) {
      Logger.error("Error al cargar el modelo:", error);
      throw error;
    }
  }

  async performDetection(imageData, options = {}) {
    try {
      if (!this.model) {
        throw new Error("Modelo no inicializado");
      }

      const startTime = Date.now();
      const { fast = false } = options;

      // Decodificar la imagen base64
      const imageBuffer = Buffer.from(imageData.split(',')[1], 'base64');

      // Convertir a tensor con optimizaciones para modo rápido
      const tensor = tf.tidy(() => {
        const decoded = tf.node.decodeImage(imageBuffer);

        // Para modo rápido, usar resize más eficiente
        const resized = fast
          ? decoded.resizeBilinear([224, 224]) // Más rápido que nearestNeighbor
          : decoded.resizeNearestNeighbor([224, 224]);

        return resized
          .expandDims()
          .toFloat()
          .div(255.0); // Normalizar para mejor rendimiento
      });

      // Realizar predicción
      const predictions = await this.model.predict(tensor).data();
      tensor.dispose();

      // Procesar resultados
      const maxProb = Math.max(...predictions);
      const idx = predictions.indexOf(maxProb);
      const etiquetas = ['Botella_Ciel_100ML', 'Cacahuates_Kiyakis_120G', 'Trident_13G', 'Del Valle_413ML', 'Pop_45G',
        'Dr.Peppe_335ML', 'Sabritas_150G', 'Takis_70G'];
      const label = etiquetas[idx] || "Desconocido";
      const similarity = parseFloat((maxProb * 100).toFixed(2));

      const processingTime = Date.now() - startTime;

      // Crear objeto de detección con imagen correspondiente
      const detection = {
        label,
        similarity,
        timestamp: new Date().toISOString(),
        processingTime: processingTime,
        fast: fast,
        imageUrl: `https://psychic-bassoon-j65x4rxrvj4c5p54-5000.app.github.dev/images/products/${label}.png`
      };

      // Guardar en base de datos si la confianza es alta (solo para detecciones no rápidas para evitar spam)
      if (similarity > 60 && !fast) {
        await addDetection(detection);
      }

      Logger.info(`Detección ${fast ? 'rápida' : 'normal'} completada en ${processingTime}ms: ${label} (${similarity}%)`);

      return detection;
    } catch (error) {
      Logger.error("Error en detección:", error);
      throw error;
    }
  }

  async getRecentDetections(limit = 10) {
    try {
      const detections = await getDetections(limit);
      return detections;
    } catch (error) {
      Logger.error("Error al obtener detecciones:", error);
      throw error;
    }
  }

  getDetectionMode() {
    return {
      active: this.isActive,
      intervalMs: this.intervalMs
    };
  }

  setDetectionMode(active, intervalMs = 1000) {
    this.isActive = active;
    this.intervalMs = intervalMs;

    if (this.detectionInterval) {
      clearInterval(this.detectionInterval);
      this.detectionInterval = null;
    }

    return {
      active: this.isActive,
      intervalMs: this.intervalMs,
      success: true
    };
  }

  async getDetectionStatus() {
    return {
      active: this.isActive,
      modelLoaded: !!this.model,
      intervalMs: this.intervalMs
    };
  }
}

// Crear una instancia única del servicio
const detectionService = new DetectionService();

module.exports = detectionService;