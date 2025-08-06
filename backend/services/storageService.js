const { COLLECTIONS } = require('../config/firebaseManager');
const firestore = require('../utils/firestoreAdmin');
const Logger = require('../utils/logger.js');
const DETECTIONS_COLLECTION = 'detecciones';
const PRODUCTS_COLLECTION = 'productos';

const addDetection = async (detectionData) => {
  try {
    const docRef = await firestore.addDoc(DETECTIONS_COLLECTION, detectionData);
    Logger.info("Detección guardada con ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    Logger.error("Error al guardar detección:", error);
    throw error;
  }
};

const getDetections = async (limitCount = 10) => {
  try {
    const snapshot = await firestore.collection(DETECTIONS_COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(limitCount)
      .get();
    
    const detections = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      detections.push({
        id: doc.id,
        ...data,
        timestamp: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        imageUrl: `https://psychic-bassoon-j65x4rxrvj4c5p54-5000.app.github.dev/images/products/${data.label}.png`
      });
    });
    
    return detections;
  } catch (error) {
    Logger.error("Error al obtener detecciones:", error);
    throw error;
  }
};

const getProductsByCategory = async (category) => {
  try {
    const snapshot = await firestore.collection(PRODUCTS_COLLECTION)
      .where('categoria', '==', category)
      .orderBy('createdAt', 'desc')
      .get();
    
    const products = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      products.push({
        id: doc.id,
        ...data,
        timestamp: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    });
    
    return products;
  } catch (error) {
    Logger.error("Error al obtener productos por categoría:", error);
    throw error;
  }
};

module.exports = {
  addDetection,
  getDetections,
  getProductsByCategory
};