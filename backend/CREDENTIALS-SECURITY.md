# 🔐 Sistema de Credenciales Encriptadas - Google Cloud

Este sistema permite mantener las credenciales de Google Cloud de forma segura en el repositorio usando encriptación AES-256-CBC.

## 📋 Cómo funciona

1. **Las credenciales se encriptan** usando una contraseña maestra
2. **El archivo encriptado se sube a GitHub** de forma segura
3. **En producción se desencriptan** automáticamente usando la contraseña

## 🚀 Para usar en desarrollo local

El sistema funciona automáticamente. Las credenciales se desencriptan en memoria cuando se necesitan.

```bash
# El servicio usará automáticamente las credenciales encriptadas
cd backend
npm start
```

## 🏭 Para usar en producción (nueva instancia)

Cuando hagas clone del repositorio en una nueva instancia:

### Opción 1: Desencriptación automática (Recomendado)
```bash
# 1. Clonar el repositorio
git clone https://github.com/RubenOsiris073/FISGO-Monkey-Tech.git
cd FISGO-Monkey-Tech/backend

# 2. Configurar la contraseña de encriptación
export ENCRYPTION_PASSWORD="mmm-aguachile-2025-secure-key"

# 3. Ejecutar el sistema (desencripta automáticamente)
npm start
```

### Opción 2: Desencriptación manual
```bash
# 1. Clonar el repositorio
git clone https://github.com/RubenOsiris073/FISGO-Monkey-Tech.git
cd FISGO-Monkey-Tech/backend

# 2. Desencriptar credenciales manualmente
ENCRYPTION_PASSWORD="mmm-aguachile-2025-secure-key" node scripts/decryptCredentials.js

# 3. Ejecutar el sistema
npm start
```

## 🔑 Configuración de contraseña

### Para desarrollo:
La contraseña por defecto es: `mmm-aguachile-2025-secure-key`

### Para producción:
Configura la variable de entorno:
```bash
export ENCRYPTION_PASSWORD="tu-contraseña-super-segura"
```

O en tu archivo `.env`:
```
ENCRYPTION_PASSWORD=tu-contraseña-super-segura
```

### Clave maestra para doble encriptación
Algunos scripts como `check-credentials.js` y los ubicados en `backend/scripts/` utilizan una segunda clave llamada `MASTER_ENCRYPTION_KEY`.
Esta variable **debe** configurarse en el entorno y no tiene valor por defecto.

```bash
export MASTER_ENCRYPTION_KEY="tu-clave-maestra"
```

## 🛠️ Scripts disponibles

### Encriptar credenciales (ya ejecutado)
```bash
node scripts/encryptCredentials.js
```

### Desencriptar credenciales
```bash
node scripts/decryptCredentials.js
```

## 📁 Archivos en el repositorio

✅ **SEGURO (en GitHub):**
- `backend/config/google-credentials.encrypted.json` - Credenciales encriptadas

❌ **BLOQUEADO (no se sube):**
- `backend/config/google-service-account.json` - Credenciales sin encriptar
- `.env` - Variables de entorno

## 🔒 Seguridad

- **Encriptación:** AES-256-CBC con clave derivada de PBKDF2
- **Sin secretos en GitHub:** Solo el archivo encriptado se sube al repositorio
- **Múltiples métodos:** Fallback automático a diferentes tipos de credenciales
- **Contraseña personalizable:** Usa tu propia contraseña en producción

## 🎯 Jerarquía de credenciales

El sistema busca credenciales en este orden:

1. **Variable de entorno Base64** (`GOOGLE_SERVICE_ACCOUNT_BASE64`)
2. **Archivo encriptado local** (`google-credentials.encrypted.json`) ⭐ **NUEVO**
3. **Variable de ruta** (`GOOGLE_SERVICE_ACCOUNT_PATH`)
4. **Archivo local** (`google-service-account.json`)

## 💡 Ventajas

✅ **Seguro:** Las credenciales están encriptadas en GitHub
✅ **Automático:** Se desencriptan automáticamente cuando se necesitan
✅ **Portable:** Funciona en cualquier instancia con la contraseña correcta
✅ **Fallback:** Múltiples métodos de configuración
✅ **Producción-ready:** Listo para despliegue en cualquier servidor

---

**Creado para:** MMM Aguachile POS System  
**Fecha:** Junio 2025  
**Versión:** 1.0