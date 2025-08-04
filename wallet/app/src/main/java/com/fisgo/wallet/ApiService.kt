package com.fisgo.wallet

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

object ApiService {
    
    private const val BASE_URL = "https://psychic-bassoon-j65x4rxrvj4c5p54-5000.app.github.dev/api"
    private const val TAG = "ApiService"
    
    /**
     * Realiza una solicitud HTTP autenticada
     */
    suspend fun makeAuthenticatedRequest(
        endpoint: String,
        method: String = "GET",
        body: JSONObject? = null,
        requireAuth: Boolean = true
    ): ApiResponse {
        return withContext(Dispatchers.IO) {
            try {
                val url = URL("$BASE_URL$endpoint")
                val connection = url.openConnection() as HttpURLConnection
                
                // Configuración básica
                connection.requestMethod = method
                connection.setRequestProperty("Content-Type", "application/json")
                connection.connectTimeout = 10000
                connection.readTimeout = 10000
                
                // Agregar token de autenticación si es requerido
                if (requireAuth) {
                    val token = AuthService.getAuthToken()
                    if (token != null) {
                        connection.setRequestProperty("Authorization", "Bearer $token")
                        Log.d(TAG, "Token agregado a la solicitud: ${endpoint}")
                    } else {
                        Log.w(TAG, "No se pudo obtener token para: ${endpoint}")
                        return@withContext ApiResponse(
                            success = false,
                            error = "No se pudo obtener token de autenticación"
                        )
                    }
                }
                
                // Enviar body si existe
                if (body != null) {
                    connection.doOutput = true
                    OutputStreamWriter(connection.outputStream).use { writer ->
                        writer.write(body.toString())
                        writer.flush()
                    }
                }
                
                val responseCode = connection.responseCode
                val inputStream = if (responseCode == HttpURLConnection.HTTP_OK) {
                    connection.inputStream
                } else {
                    connection.errorStream
                }
                
                val response = BufferedReader(InputStreamReader(inputStream)).use { reader ->
                    reader.readText()
                }
                
                Log.d(TAG, "Response code: $responseCode, Response: $response")
                
                if (responseCode == HttpURLConnection.HTTP_OK) {
                    val jsonResponse = JSONObject(response)
                    ApiResponse(
                        success = jsonResponse.optBoolean("success", false),
                        data = jsonResponse.optJSONObject("data"),
                        error = if (jsonResponse.has("error")) jsonResponse.getString("error") else null
                    )
                } else {
                    // Intentar parsear error del response
                    val errorMessage = try {
                        val jsonResponse = JSONObject(response)
                        jsonResponse.optString("error", "Error desconocido")
                    } catch (e: Exception) {
                        "Error HTTP $responseCode"
                    }
                    
                    ApiResponse(
                        success = false,
                        error = errorMessage
                    )
                }
                
            } catch (e: Exception) {
                Log.e(TAG, "Error en solicitud a $endpoint: ${e.message}")
                ApiResponse(
                    success = false,
                    error = "Error de conexión: ${e.message}"
                )
            }
        }
    }
    
    /**
     * Sincronizar carrito con código
     */
    suspend fun syncCart(code: String): ApiResponse {
        val body = JSONObject().apply {
            put("userId", AuthService.getCurrentUserId() ?: "anonymous")
        }
        
        return makeAuthenticatedRequest(
            endpoint = "/cart/sync/$code",
            method = "POST",
            body = body,
            requireAuth = false // Esta ruta no requiere autenticación según el backend
        )
    }
    
    /**
     * Procesar pago
     */
    suspend fun processPayment(sessionId: String, amount: Double, paymentMethod: String): ApiResponse {
        val body = JSONObject().apply {
            put("sessionId", sessionId)
            put("userId", AuthService.getCurrentUserId() ?: "anonymous")
            put("amount", amount)
            put("paymentMethod", paymentMethod)
        }
        
        return makeAuthenticatedRequest(
            endpoint = "/cart/process-payment",
            method = "POST",
            body = body,
            requireAuth = true // Ahora SÍ requiere autenticación
        )
    }
    
    /**
     * Crear Payment Intent para Stripe
     */
    suspend fun createPaymentIntent(amount: Double): ApiResponse {
        val body = JSONObject().apply {
            put("amount", amount)
            put("currency", "usd")
            put("metadata", JSONObject().apply {
                put("userId", AuthService.getCurrentUserId() ?: "anonymous")
            })
        }
        
        return makeAuthenticatedRequest(
            endpoint = "/stripe/create-payment-intent",
            method = "POST",
            body = body,
            requireAuth = true // Esta ruta SÍ requiere autenticación
        )
    }
    
    /**
     * Confirmar pago de Stripe
     */
    suspend fun confirmPayment(paymentIntentId: String): ApiResponse {
        val body = JSONObject().apply {
            put("paymentIntentId", paymentIntentId)
        }
        
        return makeAuthenticatedRequest(
            endpoint = "/stripe/confirm-payment",
            method = "POST",
            body = body,
            requireAuth = true // Esta ruta SÍ requiere autenticación
        )
    }
}

data class ApiResponse(
    val success: Boolean,
    val data: JSONObject? = null,
    val error: String? = null
)
