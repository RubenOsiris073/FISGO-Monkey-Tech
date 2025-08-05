const { firebaseManager } = require('../config/firebaseManager');
const Logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

class ImageService {
  constructor() {
    this.storage = null;
    this.bucket = null;
  }

  async initialize() {
    try {
      const admin = await firebaseManager.initialize();
      this.storage = admin.storage();
      this.bucket = this.storage.bucket();
      Logger.info('ImageService inicializado correctamente');
    } catch (error) {
      Logger.error('Error inicializando ImageService:', error);
      throw error;
    }
  }

  /**
   * Subir imagen a Firebase Storage
   * @param {Buffer} imageBuffer - Buffer de la imagen
   * @param {string} fileName - Nombre del archivo
   * @param {string} folderPath - Ruta de la carpeta (ej: 'products')
   * @returns {string} URL pública de la imagen
   */
  async uploadImage(imageBuffer, fileName, folderPath = 'products') {
    try {
      if (!this.bucket) {
        await this.initialize();
      }

      const file = this.bucket.file(`${folderPath}/${fileName}`);
      
      const stream = file.createWriteStream({
        metadata: {
          contentType: 'image/jpeg',
        },
        public: true,
        validation: 'md5'
      });

      return new Promise((resolve, reject) => {
        stream.on('error', (error) => {
          Logger.error('Error subiendo imagen:', error);
          reject(error);
        });

        stream.on('finish', async () => {
          try {
            // Hacer el archivo público
            await file.makePublic();
            
            // Obtener la URL pública
            const publicUrl = `https://storage.googleapis.com/${this.bucket.name}/${folderPath}/${fileName}`;
            
            Logger.info('Imagen subida exitosamente:', publicUrl);
            resolve(publicUrl);
          } catch (error) {
            Logger.error('Error obteniendo URL pública:', error);
            reject(error);
          }
        });

        stream.end(imageBuffer);
      });
    } catch (error) {
      Logger.error('Error en uploadImage:', error);
      throw error;
    }
  }

  /**
   * Obtener URL firmada de una imagen
   * @param {string} filePath - Ruta del archivo en Storage
   * @returns {string} URL firmada
   */
  async getSignedUrl(filePath) {
    try {
      if (!this.bucket) {
        await this.initialize();
      }

      const file = this.bucket.file(filePath);
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 24 * 60 * 60 * 1000, // 24 horas
      });

      return url;
    } catch (error) {
      Logger.error('Error obteniendo URL firmada:', error);
      throw error;
    }
  }

  /**
   * Eliminar imagen de Firebase Storage
   * @param {string} filePath - Ruta del archivo en Storage
   */
  async deleteImage(filePath) {
    try {
      if (!this.bucket) {
        await this.initialize();
      }

      const file = this.bucket.file(filePath);
      await file.delete();
      
      Logger.info('Imagen eliminada exitosamente:', filePath);
    } catch (error) {
      Logger.error('Error eliminando imagen:', error);
      throw error;
    }
  }

  /**
   * Verificar si una imagen existe en Storage
   * @param {string} filePath - Ruta del archivo en Storage
   * @returns {boolean}
   */
  async imageExists(filePath) {
    try {
      if (!this.bucket) {
        await this.initialize();
      }

      const file = this.bucket.file(filePath);
      const [exists] = await file.exists();
      return exists;
    } catch (error) {
      Logger.error('Error verificando existencia de imagen:', error);
      return false;
    }
  }

  /**
   * Generar URL pública para una imagen de producto
   * @param {string} productCode - Código del producto
   * @param {string} extension - Extensión del archivo (jpg, png, etc.)
   * @returns {string} URL de la imagen
   */
  getProductImageUrl(productCode, extension = 'jpg') {
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET;
    return `https://storage.googleapis.com/${bucketName}/products/${productCode}.${extension}`;
  }

  /**
   * Subir imagen desde archivo local
   * @param {string} localFilePath - Ruta del archivo local
   * @param {string} destinationPath - Ruta de destino en Storage
   * @returns {string} URL pública de la imagen
   */
  async uploadFromLocal(localFilePath, destinationPath) {
    try {
      if (!fs.existsSync(localFilePath)) {
        throw new Error(`Archivo no encontrado: ${localFilePath}`);
      }

      const imageBuffer = fs.readFileSync(localFilePath);
      const fileName = path.basename(destinationPath);
      const folderPath = path.dirname(destinationPath);

      return await this.uploadImage(imageBuffer, fileName, folderPath);
    } catch (error) {
      Logger.error('Error subiendo desde archivo local:', error);
      throw error;
    }
  }
}

// Exportar instancia única (singleton)
const imageService = new ImageService();

module.exports = {
  imageService,
  ImageService
};
