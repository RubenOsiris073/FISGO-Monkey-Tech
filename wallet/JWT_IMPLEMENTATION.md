# Implementación JWT en Wallet Android

## Cambios Implementados

### 1. AuthService.kt (NUEVO)
- Servicio para manejo de autenticación Firebase
- Obtiene tokens ID de Firebase para enviar al backend
- Funciones: `getAuthToken()`, `isUserAuthenticated()`, `getCurrentUserId()`

### 2. ApiService.kt (NUEVO)
- Servicio centralizado para todas las llamadas HTTP
- Maneja automáticamente headers de autorización
- Funciones principales:
  - `syncCart()` - No requiere auth (POS público)
  - `processPayment()` - **REQUIERE AUTH** (protegido)
  - `createPaymentIntent()` - **REQUIERE AUTH** (protegido)
  - `confirmPayment()` - **REQUIERE AUTH** (protegido)

### 3. SyncCodeActivity.kt (ACTUALIZADO)
- Ahora usa ApiService en lugar de llamadas HTTP directas
- Funciones `syncCartWithBackend()` y `processPaymentWithBackend()` actualizadas
- Manejo automático de tokens JWT

### 4. CardPaymentActivity.kt (ACTUALIZADO)
- `createPaymentIntentRequest()` actualizada para usar ApiService
- Ahora envía tokens Firebase automáticamente

## Backend Changes

### Rutas Protegidas con JWT:
```javascript
// cartRoutes.js
router.post('/process-payment', verifyToken, async (req, res) => {
  // Procesar pago (PROTEGIDO)
});

// stripeRoutes.js  
router.post('/create-payment-intent', verifyToken, async (req, res) => {
  // Crear Payment Intent (PROTEGIDO)
});

router.post('/confirm-payment', verifyToken, async (req, res) => {
  // Confirmar pago (PROTEGIDO)
});
```

### Rutas Públicas (sin auth):
- `POST /api/cart/sync/:code` - Sincronización POS
- `POST /api/detection/detect` - Detección ML
- `GET /api/products` - Lista de productos

## Flujo de Autenticación

1. **Usuario se autentica** en la app con Firebase Auth
2. **AuthService obtiene token Firebase ID** cuando se necesita
3. **ApiService envía token** en header `Authorization: Bearer <token>`
4. **Backend verifica token** con Firebase Admin SDK o JWT local
5. **Si válido** → procesa request, **si inválido** → retorna 401

## Verificación

Para probar que funciona:

```kotlin
// En cualquier Activity
lifecycleScope.launch {
    val token = AuthService.getAuthToken()
    Log.d("JWT", "Token obtenido: ${token?.take(50)}...")
    
    val response = ApiService.processPayment(sessionId, amount, "wallet")
    if (response.success) {
        Log.d("JWT", "Pago procesado con autenticación")
    } else {
        Log.e("JWT", "Error: ${response.error}")
    }
}
```

## Manejo de Errores

El ApiService maneja automáticamente:
- Token expirado → reintenta obtener token fresco
- Usuario no autenticado → retorna error explicativo
- Error de red → manejo de timeouts y reconexión

## Seguridad

✅ **Implementado:**
- Tokens Firebase ID para autenticación
- Headers Authorization automáticos
- Validación en backend con Firebase Admin SDK
- Fallback a JWT local si Firebase falla

✅ **Protegido:**
- Procesamiento de pagos
- Creación de Payment Intents
- Confirmación de pagos Stripe

✅ **Público (correcto):**
- Sincronización POS (necesaria para funcionamiento)
- Detección ML (funcionalidad core)
- Consulta de productos (solo lectura)

## Siguiente Paso

La app wallet ahora enviará tokens automáticamente. **Reinicia la app wallet** para que los cambios tomen efecto y prueba hacer un pago.
