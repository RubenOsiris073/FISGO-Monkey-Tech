#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Logger = require('../utils/logger.js');

/**
 * Sistema de doble encriptación AES para credenciales
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
   * Genera una contraseña aleatoria fuerte
   */
  generateRandomPassword(length = 64) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
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
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * Doble encriptación: credenciales + contraseña
   */
  doubleEncrypt(jsonData, masterPassword) {
    // Paso 1: Generar contraseña aleatoria
    const randomPassword = this.generateRandomPassword();
    
    // Paso 2: Encriptar credenciales con contraseña aleatoria
    const credentialsEncrypted = this.encrypt(JSON.stringify(jsonData, null, 2), randomPassword);
    
    // Paso 3: Encriptar contraseña aleatoria con clave maestra
    const passwordEncrypted = this.encrypt(randomPassword, masterPassword);
    
    return {
      credentials: credentialsEncrypted,
      password: passwordEncrypted,
      timestamp: new Date().toISOString(),
      version: '1.0'
    };
  }

  /**
   * Doble desencriptación
   */
  doubleDecrypt(doubleEncryptedData, masterPassword) {
    // Paso 1: Desencriptar contraseña aleatoria
    const randomPassword = this.decrypt(doubleEncryptedData.password, masterPassword);
    
    // Paso 2: Desencriptar credenciales con contraseña aleatoria
    const credentialsJson = this.decrypt(doubleEncryptedData.credentials, randomPassword);
    
    return JSON.parse(credentialsJson);
  }

  /**
   * Cargar y desencriptar credenciales desde archivo
   */
  loadAndDecryptCredentials(filePath, masterKey) {
    try {
      const fullPath = path.isAbsolute(filePath) ? filePath : path.join(__dirname, '../config', filePath);
      
      if (!fs.existsSync(fullPath)) {
        throw new Error(`Archivo de credenciales no encontrado: ${filePath}`);
      }

      const encryptedData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      const decryptedCredentials = this.doubleDecrypt(encryptedData, masterKey);
      return decryptedCredentials;
    } catch (error) {
      throw new Error(`Error cargando credenciales: ${error.message}`);
    }
  }
}

/**
 * Script principal
 */
async function createDoubleEncryptedCredentials(credentialType = 'google') {
  const manager = new DoubleEncryptionManager();
  
  // Configuración de archivos basada en el tipo
  const configs = {
    google: {
      inputFile: path.join(__dirname, '../config/google-service-account.json'),
      outputFile: path.join(__dirname, '../config/sys-auth-config.double-encrypted.json'),
      description: 'Google Sheets credentials'
    },
    firebase: {
      inputFile: path.join(__dirname, '../config/firebase-service-account.json'),
      outputFile: path.join(__dirname, '../config/db-auth-config.double-encrypted.json'),
      description: 'Firebase Admin credentials'
    }
  };
  
  const config = configs[credentialType];
  if (!config) {
    throw new Error(`Tipo de credencial no válido: ${credentialType}`);
  }
  
  // Clave maestra (obligatoria en variable de entorno)
  const masterPassword = process.env.MASTER_ENCRYPTION_KEY;
  
  try {
    // Leer credenciales originales
    if (!fs.existsSync(config.inputFile)) {
      throw new Error(`Archivo de credenciales no encontrado: ${config.inputFile}`);
    }
    
    const credentialsData = JSON.parse(fs.readFileSync(config.inputFile, 'utf8'));
    
    // Doble encriptación
    const doubleEncrypted = manager.doubleEncrypt(credentialsData, masterPassword);
    
    // Agregar metadata
    doubleEncrypted.credentialType = credentialType;
    doubleEncrypted.description = config.description;
    
    // Guardar resultado
    fs.writeFileSync(config.outputFile, JSON.stringify(doubleEncrypted, null, 2));
    
    Logger.info(`Doble encriptación completada para ${credentialType}`);
    Logger.info('Archivo guardado:', config.outputFile);
    Logger.info('Descripción:', config.description);
    Logger.info('Timestamp:', doubleEncrypted.timestamp);
    
    return true;
    
  } catch (error) {
    Logger.error(`Error en doble encriptación para ${credentialType}:`, error.message);
    return false;
  }
}

/**
 * Función para encriptar todas las credenciales
 */
async function encryptAllCredentials() {
  Logger.info('Iniciando encriptación de todas las credenciales...\n');
  
  const types = ['google', 'firebase'];
  const results = [];
  
  for (const type of types) {
    try {
      Logger.info(`--- Procesando credenciales de ${type} ---`);
      const success = await createDoubleEncryptedCredentials(type);
      results.push({ type, success });
      Logger.info(`✓ ${type} completado\n`);
    } catch (error) {
      Logger.error(`✗ Error en ${type}:`, error.message);
      results.push({ type, success: false, error: error.message });
    }
  }
  
  // Resumen
  Logger.info('\n=== RESUMEN DE ENCRIPTACIÓN ===');
  results.forEach(result => {
    const status = result.success ? '✓ ÉXITO' : '✗ ERROR';
    Logger.info(`${result.type}: ${status}`);
    if (result.error) {
      Logger.info(`  Error: ${result.error}`);
    }
  });
  
  return results;
}

// Ejecutar si se llama directamente
if (require.main === module) {
  // Verificar argumentos de línea de comandos
  const args = process.argv.slice(2);
  
  if (args.includes('--all')) {
    encryptAllCredentials();
  } else if (args.includes('--firebase')) {
    createDoubleEncryptedCredentials('firebase');
  } else if (args.includes('--google')) {
    createDoubleEncryptedCredentials('google');
  } else {
    Logger.info('Uso del script:');
    Logger.info('  node doubleEncryption.js --all        # Encriptar todas las credenciales');
    Logger.info('  node doubleEncryption.js --firebase   # Solo Firebase');
    Logger.info('  node doubleEncryption.js --google     # Solo Google Sheets');
    Logger.info('\nPor defecto, se ejecutará --all');
    encryptAllCredentials();
  }
}

module.exports = { 
  DoubleEncryptionManager, 
  createDoubleEncryptedCredentials, 
  encryptAllCredentials 
};
