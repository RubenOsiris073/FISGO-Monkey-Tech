#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger.js');

/**
 * Sistema de doble encriptación AES para credenciales de Firebase
 */
class DoubleEncryptionManager {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.keyLength = 32;
    this.ivLength = 16;
  }

  /**
   * Genera una clave desde una contraseña
   */
  generateKey(password, salt = 'fisgo-monkey-tech-salt') {
    return crypto.scryptSync(password, salt, this.keyLength);
  }

  /**
   * Encripta datos con AES
   */
  encrypt(data, password) {
    const key = this.generateKey(password);
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      iv: iv.toString('hex'),
      encrypted: encrypted,
      algorithm: this.algorithm
    };
  }

  /**
   * Desencripta datos con AES
   */
  decrypt(encryptedData, password) {
    const key = this.generateKey(password);
    const decipher = crypto.createDecipheriv(this.algorithm, key, Buffer.from(encryptedData.iv, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Doble encriptación: encripta con contraseña temporal y luego con clave maestra
   */
  doubleEncrypt(data, masterPassword) {
    const tempPassword = crypto.randomBytes(32).toString('hex');
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Primera encriptación con contraseña temporal
    const firstEncryption = this.encrypt(dataString, tempPassword);
    
    // Segunda encriptación de la contraseña temporal con clave maestra
    const passwordEncryption = this.encrypt(tempPassword, masterPassword);
    
    return {
      data: firstEncryption,
      key: passwordEncryption,
      timestamp: new Date().toISOString(),
      algorithm: this.algorithm
    };
  }

  /**
   * Doble desencriptación
   */
  doubleDecrypt(encryptedPackage, masterPassword) {
    // Desencriptar contraseña temporal
    const tempPassword = this.decrypt(encryptedPackage.key, masterPassword);
    
    // Desencriptar datos con contraseña temporal
    const decryptedData = this.decrypt(encryptedPackage.data, tempPassword);
    
    return decryptedData;
  }
}

/**
 * Script principal para encriptar credenciales de Firebase
 */
async function createFirebaseDoubleEncryptedCredentials() {
  const manager = new DoubleEncryptionManager();
  
  // Rutas
  const inputFile = path.join(__dirname, '../config/firebase-service-account.json');
  const outputFile = path.join(__dirname, '../config/firebase-credentials.double-encrypted.json');
  
  // Clave maestra (obligatoria en variable de entorno)
  const masterPassword = process.env.MASTER_ENCRYPTION_KEY;
  
  try {
    // Leer credenciales originales
    if (!fs.existsSync(inputFile)) {
      throw new Error('Archivo de credenciales de Firebase no encontrado');
    }
    
    const credentialsData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));
    
    // Doble encriptación
    const doubleEncrypted = manager.doubleEncrypt(credentialsData, masterPassword);
    
    // Guardar resultado
    fs.writeFileSync(outputFile, JSON.stringify(doubleEncrypted, null, 2));
    
    Logger.info('=== Doble encriptación de Firebase completada ===');
    Logger.info('Archivo entrada:', inputFile);
    Logger.info('Archivo salida:', outputFile);
    Logger.info('Clave maestra utilizada:', masterPassword);
    Logger.info('Timestamp:', doubleEncrypted.timestamp);
    Logger.info('Algoritmo:', doubleEncrypted.algorithm);
    
    // Eliminar archivo original por seguridad
    fs.unlinkSync(inputFile);
    Logger.info('Archivo original eliminado por seguridad');
    
    return true;
    
  } catch (error) {
    Logger.error('Error en doble encriptación de Firebase:', error.message);
    return false;
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  createFirebaseDoubleEncryptedCredentials();
}

module.exports = { DoubleEncryptionManager, createFirebaseDoubleEncryptedCredentials };
