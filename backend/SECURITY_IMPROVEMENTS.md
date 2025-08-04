# Mejoras de Seguridad - Protección JWT

## Cambios Implementados

Se ha implementado la protección JWT en todas las rutas críticas del backend para resolver las vulnerabilidades de seguridad identificadas.

### Rutas Protegidas con JWT:

#### 1. **Rutas de Ventas** (`/api/sales`)
- ✅ `GET /` - Obtener todas las ventas
- ✅ `POST /` - Crear nueva venta  
- ✅ `GET /paginated` - Obtener ventas paginadas
- ✅ `GET /cached` - Obtener ventas desde cache

#### 2. **Rutas de Transacciones** (`/api/transactions`)
- ✅ `GET /` - Obtener todas las transacciones
- ✅ `GET /user/:userId` - Obtener transacciones por usuario
- ✅ `GET /:transactionId/status` - Verificar estado de transacción
- ✅ `POST /` - Crear nueva transacción
- ✅ `GET /:transactionId` - Obtener transacción específica
- ✅ `POST /:transactionId/refund` - Crear reembolso

#### 3. **Rutas de Stripe/Pagos** (`/api/stripe`)
- ✅ `POST /create-payment-intent` - Crear Payment Intent
- ✅ `POST /confirm-payment` - Confirmar pago
- ✅ `GET /payment/:paymentIntentId` - Obtener información de pago
- ✅ `POST /test-payment` - Pago de prueba
- ⚠️ `POST /webhook` - Webhook (sin protección - requerido por Stripe)
- ⚠️ `POST /create-customer` - Crear cliente (evaluar si necesita protección)

#### 4. **Rutas de Carrito** (`/api/cart`)
**Rutas Públicas (funcionalidad POS y sincronización móvil):**
- ⚪ `POST /sync` - Crear sesión de sincronización (público para POS)
- ⚪ `POST /sync/:code` - Sincronizar carrito con código (público para móvil)
- ⚪ `POST /process-payment` - Procesar pago desde móvil (público para wallet)

**Rutas Protegidas (operaciones de usuario):**
- ✅ `POST /` - Crear nuevo carrito
- ✅ `GET /:sessionId` - Obtener carrito por sessionId
- ✅ `POST /:sessionId/payment` - Procesar pago del carrito

#### 5. **Rutas de Logs** (`/api/logs`)
- ✅ `GET /` - Obtener logs recientes
- ✅ `GET /stream` - Stream de logs en tiempo real
- ✅ `POST /clear` - Limpiar logs
- ✅ `GET /download` - Descargar logs

#### 6. **Rutas de Productos** (`/api/products`)
**Rutas Públicas (catálogo):**
- ⚪ `GET /` - Obtener productos (público para catálogo)
- ⚪ `GET /stock-summary` - Resumen de stock (público)
- ⚪ `GET /:id` - Obtener producto específico (público)

**Rutas Protegidas (administración):**
- ✅ `POST /` - Crear nuevo producto
- ✅ `POST /initialize-stock` - Inicializar stock
- ✅ `PUT /:id` - Actualizar producto
- ✅ `PUT /:id/stock` - Actualizar stock
- ✅ `DELETE /:id` - Eliminar producto

#### 7. **Rutas de Detección** (`/api/detection`)
**Rutas Públicas (funcionalidad core y consulta):**
- ⚪ `POST /detect` - Realizar detección (público para CameraDetectionComponent)
- ⚪ `GET /recent` - Obtener detecciones recientes (público para ProductsPage)
- ⚪ `GET /detections` - Obtener detecciones (compatibilidad, público)
- ⚪ `GET /detection-mode` - Obtener estado (público para monitoreo)
- ⚪ `GET /status` - Estado de detección (público)
- ⚪ `GET /detection/continuous/status` - Estado continuo (público)

**Rutas Protegidas (configuración administrativa):**
- ✅ `POST /detection-mode` - Cambiar modo de detección
- ✅ `POST /detection/continuous` - Configurar detección continua

### Rutas Sin Cambios:

#### **Dashboard** (`/api/dashboard`)
- ⚪ `GET /metrics` - Métricas (usa Service Account)
- ⚪ `GET /sales-data` - Datos de ventas (usa Service Account)

#### **Autenticación** (`/api/auth`)
- ⚪ `POST /login` - Login (público)
- ✅ `GET /verify` - Verificar token (ya protegido)
- ✅ `POST /logout` - Logout (ya protegido)

### Middleware de Autenticación:

El middleware `verifyToken` en `/middleware/auth.js` proporciona:

1. **Doble Soporte de Autenticación**
   - Acepta JWT tokens locales firmados con `JWT_SECRET`
   - Acepta Firebase ID tokens para compatibilidad con frontend
   
2. **Validación de Header Authorization**
   - Requiere formato: `Bearer <token>`
   
3. **Verificación Híbrida**
   - Primero intenta verificar como JWT local
   - Si falla, intenta verificar como Firebase ID token
   - Firebase Admin SDK se inicializa automáticamente
   
4. **Manejo de Errores**
   - Token expirado (`TokenExpiredError`)
   - Token inválido (`JsonWebTokenError`)
   - Errores de Firebase Authentication
   - Errores generales de autenticación
   
5. **Información de Usuario**
   - Añade `req.user` con: `uid`, `email`, `emailVerified`, `role`
   - Usuarios de Firebase reciben role 'user' por defecto
   - Usuarios de JWT local mantienen su role asignado

### Impacto en Seguridad:

**Antes:**
- ❌ Datos sensibles accesibles sin autenticación
- ❌ Operaciones críticas (ventas, pagos) públicas
- ❌ Logs del sistema expuestos
- ❌ Configuración de detección modificable por cualquiera

**Después:**
- ✅ Datos financieros protegidos por JWT
- ✅ Operaciones de administración requieren autenticación
- ✅ Logs accesibles solo para usuarios autenticados
- ✅ Configuración del sistema protegida
- ✅ Separación clara entre rutas públicas y privadas

### Consideraciones de Implementación:

1. **Frontend**: Puede continuar usando Firebase Authentication sin cambios
2. **Compatibilidad**: Middleware acepta tanto JWT local como Firebase ID tokens
3. **Móvil**: App wallet puede usar Firebase Auth o implementar JWT local
4. **Webhooks**: Stripe webhooks siguen funcionando sin cambios
5. **Catálogo**: Productos siguen siendo consultables públicamente
6. **Monitoreo**: Estados de detección siguen siendo públicos para dashboards
7. **Inicialización**: Firebase Admin se inicializa automáticamente cuando es necesario

## ✅ ESTADO FINAL - TODOS LOS PROBLEMAS RESUELTOS

### 🧪 **Prueba de funcionamiento:**
```bash
# Ruta de sincronización funcionando sin token:
curl -X POST http://localhost:5000/api/cart/sync \
  -H "Content-Type: application/json" \
  -d '{"items":[{"id":"test","nombre":"test","quantity":1,"precio":10}],"total":10}'

# Respuesta exitosa:
{"success":true,"data":{"sessionId":"f5103671-d691-42fe-b6e5-50e2b7bbc628","shortCode":"3DAJ6U","message":"Sesión de sincronización creada exitosamente"}}
```

### 🔧 **Si persiste el error en frontend:**
1. **Limpiar caché del navegador** (Ctrl+Shift+R o Cmd+Shift+R)
2. **Verificar URL en Network tab** - debe apuntar a puerto 5000, no 3000
3. **Reiniciar frontend** si es necesario
4. **Variables de entorno correctas:**
   - `frontend/.env`: `VITE_API_URL=https://psychic-bassoon-j65x4rxrvj4c5p54-5000.app.github.dev/api`
   - `frontend/.env.local`: `VITE_API_URL=https://psychic-bassoon-j65x4rxrvj4c5p54-5000.app.github.dev/api`

## Resolución de Problemas de Autenticación

### Problema Identificado:
- Frontend enviaba Firebase ID tokens
- Backend solo aceptaba JWT tokens locales
- Error 401: "Token inválido" en todas las rutas protegidas

### Solución Implementada:
- Middleware híbrido que acepta ambos tipos de tokens
- Verificación automática de Firebase ID tokens como fallback
- Compatibilidad total con el sistema existente de Firebase Auth
- Corrección de acceso a Firebase Admin SDK usando `getAdmin()`
- Rutas de solo lectura de detecciones marcadas como públicas para ProductsPage
- Rutas de funcionalidad core (detección, sincronización POS) marcadas como públicas
- Rutas de sincronización de carrito públicas para funcionalidad de POS y wallet móvil

### Próximos Pasos Recomendados:

1. **Roles y Permisos**: Implementar niveles de acceso (admin, user, etc.)
2. **Rate Limiting**: Añadir límites de requests por usuario
3. **Audit Logs**: Registrar acciones de usuarios autenticados
4. **Refresh Tokens**: Implementar renovación automática de tokens
5. **CORS Específico**: Configurar CORS más restrictivo por ruta
