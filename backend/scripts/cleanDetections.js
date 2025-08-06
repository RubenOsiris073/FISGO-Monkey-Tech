const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const Logger = require('../utils/logger.js');
const { firebaseManager, COLLECTIONS } = require('../config/firebaseManager');
const firestore = require('../utils/firestoreAdmin');

async function cleanDetections() {
  try {
    console.log('🧹 Iniciando limpieza de detecciones...');

    // Inicializar Firebase usando el gestor centralizado
    if (!firebaseManager.isInitialized()) {
      await firebaseManager.initialize();
    }

    const db = firestore;

    // Obtener todos los productos existentes
    console.log('📦 Obteniendo productos existentes...');
    const productosSnapshot = await db.collection(COLLECTIONS.PRODUCTS).get();
    const productosExistentes = new Set();
    
    productosSnapshot.forEach(doc => {
      productosExistentes.add(doc.id);
    });

    console.log(`✅ Encontrados ${productosExistentes.size} productos en la base de datos`);

    // Obtener todas las detecciones
    console.log('🔍 Obteniendo detecciones...');
    const deteccionesSnapshot = await db.collection('detecciones').get();
    
    if (deteccionesSnapshot.empty) {
      console.log('ℹ️ No hay detecciones para limpiar');
      return;
    }

    console.log(`📊 Encontradas ${deteccionesSnapshot.size} detecciones`);

    const batch = firestore.db.batch();
    let detectionsToDelete = 0;
    let detectionsToKeep = 0;

    // Revisar cada detección
    deteccionesSnapshot.forEach(doc => {
      const deteccion = doc.data();
      const productId = deteccion.productId;

      if (!productId || !productosExistentes.has(productId)) {
        // Esta detección referencia un producto que no existe
        console.log(`🗑️ Marcando para eliminar detección ${doc.id} (producto inexistente: ${productId})`);
        batch.delete(doc.ref);
        detectionsToDelete++;
      } else {
        detectionsToKeep++;
      }
    });

    if (detectionsToDelete === 0) {
      console.log('✅ No hay detecciones huérfanas para eliminar');
      return;
    }

    // Ejecutar eliminación en lotes
    console.log(`🔄 Eliminando ${detectionsToDelete} detecciones huérfanas...`);
    await batch.commit();

    console.log('✅ Limpieza completada:');
    console.log(`   • Detecciones eliminadas: ${detectionsToDelete}`);
    console.log(`   • Detecciones conservadas: ${detectionsToKeep}`);
    console.log(`   • Total de productos válidos: ${productosExistentes.size}`);

  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  cleanDetections()
    .then(() => {
      console.log('🎉 Limpieza de detecciones completada exitosamente');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Error en la limpieza:', error);
      process.exit(1);
    });
}

module.exports = { cleanDetections };
