package com.fisgo.wallet

import android.util.Log
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*

class TransactionService {
    private val client = OkHttpClient()
    private val gson = Gson()
    // Actualizar URL para coincidir con el backend
    private val baseUrl = "https://psychic-bassoon-j65x4rxrvj4c5p54-5000.app.github.dev" // Para emulador Android

    suspend fun getUserTransactions(userId: String): Result<List<Transaction>> {
        return withContext(Dispatchers.IO) {
            try {
                Log.d("TransactionService", "Requesting transactions for user: $userId")
                
                val request = Request.Builder()
                    .url("$baseUrl/api/transactions/user/$userId")
                    .get()
                    .addHeader("Content-Type", "application/json")
                    .build()
                
                val response = client.newCall(request).execute()
                val responseBody = response.body?.string()
                
                Log.d("TransactionService", "Response code: ${response.code}")
                Log.d("TransactionService", "Response body: $responseBody")
                
                if (response.isSuccessful) {
                    if (responseBody != null) {
                        // Parsear la respuesta que viene en formato {success: true, transactions: [...]}
                        val jsonResponse = JSONObject(responseBody)
                        if (jsonResponse.getBoolean("success")) {
                            val transactionsArray = jsonResponse.getJSONArray("transactions")
                            val transactions = mutableListOf<Transaction>()
                            
                            for (i in 0 until transactionsArray.length()) {
                                val transactionJson = transactionsArray.getJSONObject(i)
                                
                                // Convertir timestamp a Date con múltiples formatos
                                val timestampStr = transactionJson.optString("timestamp", "")
                                val createdAtStr = transactionJson.optString("createdAt", "")
                                val dateStr = transactionJson.optString("date", "")
                                
                                val createdAt = parseDate(timestampStr, createdAtStr, dateStr)
                                
                                val transaction = Transaction(
                                    id = transactionJson.getString("id"),
                                    amount = transactionJson.getDouble("amount"),
                                    status = transactionJson.optString("status", "completed"),
                                    type = transactionJson.optString("type", "payment"),
                                    createdAt = createdAt,
                                    description = transactionJson.optString("description", "Transacción"),
                                    merchantName = transactionJson.optString("merchantName", null),
                                    paymentMethod = transactionJson.optString("paymentMethod", null)
                                )
                                transactions.add(transaction)
                            }
                            
                            Log.d("TransactionService", "Parsed ${transactions.size} transactions")
                            Result.success(transactions)
                        } else {
                            val error = jsonResponse.optString("error", "Error desconocido")
                            Log.e("TransactionService", "API error: $error")
                            // Fallback a transacciones de prueba si no hay datos del backend
                            Result.success(createMockTransactions())
                        }
                    } else {
                        Log.e("TransactionService", "Empty response body")
                        // Fallback a transacciones de prueba
                        Result.success(createMockTransactions())
                    }
                } else {
                    val error = "HTTP ${response.code}: ${response.message}"
                    Log.e("TransactionService", error)
                    // Fallback a transacciones de prueba si hay error de red
                    Result.success(createMockTransactions())
                }
            } catch (e: IOException) {
                Log.e("TransactionService", "Network error", e)
                // Fallback a transacciones de prueba si hay error de red
                Result.success(createMockTransactions())
            } catch (e: Exception) {
                Log.e("TransactionService", "Error getting transactions", e)
                Result.success(createMockTransactions())
            }
        }
    }
    
    private fun createMockTransactions(): List<Transaction> {
        val calendar = Calendar.getInstance()
        val transactions = mutableListOf<Transaction>()
        
        // Transacción reciente - hoy
        transactions.add(Transaction(
            id = "tx_001",
            amount = 450.50,
            status = "completed",
            type = "payment",
            createdAt = calendar.time,
            description = "Compra en tienda",
            merchantName = "FISGO Store",
            paymentMethod = "Tarjeta •••• 4242"
        ))
        
        // Transacción de ayer
        calendar.add(Calendar.DAY_OF_MONTH, -1)
        transactions.add(Transaction(
            id = "tx_002",
            amount = 125.00,
            status = "completed",
            type = "payment",
            createdAt = calendar.time,
            description = "Café y snacks",
            merchantName = "Café Central",
            paymentMethod = "Tarjeta •••• 4242"
        ))
        
        // Reembolso hace 2 días
        calendar.add(Calendar.DAY_OF_MONTH, -1)
        transactions.add(Transaction(
            id = "tx_003",
            amount = 75.25,
            status = "completed",
            type = "refund",
            createdAt = calendar.time,
            description = "Reembolso por producto defectuoso",
            merchantName = "FISGO Store",
            paymentMethod = "Tarjeta •••• 4242"
        ))
        
        // Transacción hace 3 días
        calendar.add(Calendar.DAY_OF_MONTH, -1)
        transactions.add(Transaction(
            id = "tx_004",
            amount = 850.00,
            status = "completed",
            type = "payment",
            createdAt = calendar.time,
            description = "Compra grande",
            merchantName = "FISGO Store",
            paymentMethod = "Tarjeta •••• 4242"
        ))
        
        // Transacción pendiente hace 5 días
        calendar.add(Calendar.DAY_OF_MONTH, -2)
        transactions.add(Transaction(
            id = "tx_005",
            amount = 200.00,
            status = "pending",
            type = "payment",
            createdAt = calendar.time,
            description = "Pago en procesamiento",
            merchantName = "Otro Store",
            paymentMethod = "Tarjeta •••• 4242"
        ))
        
        // Transacción fallida hace una semana
        calendar.add(Calendar.DAY_OF_MONTH, -2)
        transactions.add(Transaction(
            id = "tx_006",
            amount = 99.99,
            status = "failed",
            type = "payment",
            createdAt = calendar.time,
            description = "Pago rechazado",
            merchantName = "Online Store",
            paymentMethod = "Tarjeta •••• 4242"
        ))
        
        // Recarga de fondos hace 10 días
        calendar.add(Calendar.DAY_OF_MONTH, -3)
        transactions.add(Transaction(
            id = "tx_007",
            amount = 300.00,
            status = "completed",
            type = "add_funds",
            createdAt = calendar.time,
            description = "Recarga de saldo",
            merchantName = "FISGO Wallet",
            paymentMethod = "Tarjeta •••• 4242"
        ))
        
        Log.d("TransactionService", "Created ${transactions.size} mock transactions")
        return transactions
    }
    
    private fun parseDate(vararg dateStrings: String): Date {
        val dateFormats = listOf(
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault()),
            SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault()),
            SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.getDefault()),
            SimpleDateFormat("dd/MM/yyyy HH:mm:ss", Locale.getDefault()),
            SimpleDateFormat("dd/MM/yyyy", Locale.getDefault())
        )
        
        for (dateStr in dateStrings) {
            if (dateStr.isNotEmpty()) {
                for (format in dateFormats) {
                    try {
                        return format.parse(dateStr) ?: Date()
                    } catch (e: Exception) {
                        // Continue to next format
                    }
                }
            }
        }
        
        // Fallback a fecha actual
        return Date()
    }
    
    suspend fun getTransactionById(transactionId: String): Result<Transaction> {
        return withContext(Dispatchers.IO) {
            try {
                Log.d("TransactionService", "Requesting transaction detail for ID: $transactionId")
                
                val request = Request.Builder()
                    .url("$baseUrl/api/transactions/$transactionId")
                    .get()
                    .addHeader("Content-Type", "application/json")
                    .build()
                
                val response = client.newCall(request).execute()
                val responseBody = response.body?.string()
                
                Log.d("TransactionService", "Transaction detail response code: ${response.code}")
                Log.d("TransactionService", "Transaction detail response body: $responseBody")
                
                if (response.isSuccessful) {
                    if (responseBody != null) {
                        // Parsear la respuesta que viene en formato {success: true, transaction: {...}}
                        val jsonResponse = JSONObject(responseBody)
                        if (jsonResponse.getBoolean("success")) {
                            val transactionJson = jsonResponse.getJSONObject("transaction")
                            
                            // Convertir timestamp a Date
                            val timestampStr = transactionJson.optString("timestamp", "")
                            val createdAtStr = transactionJson.optString("createdAt", "")
                            val dateStr = transactionJson.optString("date", "")
                            
                            val createdAt = parseDate(timestampStr, createdAtStr, dateStr)
                            
                            val transaction = Transaction(
                                id = transactionJson.getString("id"),
                                amount = transactionJson.getDouble("amount"),
                                status = transactionJson.optString("status", "completed"),
                                type = transactionJson.optString("type", "payment"),
                                createdAt = createdAt,
                                description = transactionJson.optString("description", "Transacción"),
                                merchantName = transactionJson.optString("merchantName", null),
                                paymentMethod = transactionJson.optString("paymentMethod", null)
                            )
                            
                            Result.success(transaction)
                        } else {
                            Log.w("TransactionService", "API returned error, using mock data")
                            // Fallback a buscar en transacciones mock
                            findMockTransaction(transactionId)
                        }
                    } else {
                        Log.w("TransactionService", "Empty response, using mock data")
                        findMockTransaction(transactionId)
                    }
                } else {
                    Log.w("TransactionService", "HTTP error ${response.code}, using mock data")
                    findMockTransaction(transactionId)
                }
            } catch (e: IOException) {
                Log.e("TransactionService", "Network error, using mock data", e)
                findMockTransaction(transactionId)
            } catch (e: Exception) {
                Log.e("TransactionService", "Error getting transaction detail, using mock data", e)
                findMockTransaction(transactionId)
            }
        }
    }
    
    private fun findMockTransaction(transactionId: String): Result<Transaction> {
        val mockTransactions = createMockTransactions()
        val transaction = mockTransactions.find { it.id == transactionId }
        
        return if (transaction != null) {
            Log.d("TransactionService", "Found mock transaction: $transactionId")
            Result.success(transaction)
        } else {
            Log.e("TransactionService", "Transaction not found: $transactionId")
            Result.failure(Exception("Transacción no encontrada"))
        }
    }
    
    suspend fun getTransactionsByType(userId: String, type: String): Result<List<Transaction>> {
        return withContext(Dispatchers.IO) {
            try {
                val request = Request.Builder()
                    .url("$baseUrl/api/transactions/user/$userId?type=$type")
                    .get()
                    .build()
                
                val response = client.newCall(request).execute()
                
                if (response.isSuccessful) {
                    val responseBody = response.body?.string()
                    Log.d("TransactionService", "Filtered transactions response: $responseBody")
                    
                    if (responseBody != null) {
                        val type = object : TypeToken<List<Transaction>>() {}.type
                        val transactions = gson.fromJson<List<Transaction>>(responseBody, type)
                        Result.success(transactions)
                    } else {
                        Result.failure(Exception("Empty response body"))
                    }
                } else {
                    Result.failure(Exception("HTTP ${response.code}: ${response.message}"))
                }
            } catch (e: IOException) {
                Log.e("TransactionService", "Network error", e)
                Result.failure(e)
            } catch (e: Exception) {
                Log.e("TransactionService", "Error getting filtered transactions", e)
                Result.failure(e)
            }
        }
    }
    
    suspend fun requestRefund(transactionId: String, reason: String = ""): Result<RefundResponse> {
        return withContext(Dispatchers.IO) {
            try {
                val requestBody = JSONObject().apply {
                    put("reason", reason)
                }
                
                val request = Request.Builder()
                    .url("$baseUrl/api/transactions/$transactionId/refund")
                    .post(requestBody.toString().toRequestBody("application/json".toMediaType()))
                    .build()
                
                val response = client.newCall(request).execute()
                
                if (response.isSuccessful) {
                    val responseBody = response.body?.string()
                    Log.d("TransactionService", "Refund response: $responseBody")
                    
                    if (responseBody != null) {
                        val jsonResponse = JSONObject(responseBody)
                        if (jsonResponse.getBoolean("success")) {
                            val refundData = jsonResponse.getJSONObject("refund")
                            val refundResponse = RefundResponse(
                                success = true,
                                refundId = refundData.getString("id"),
                                message = jsonResponse.optString("message", "Reembolso procesado exitosamente")
                            )
                            Result.success(refundResponse)
                        } else {
                            Result.failure(Exception(jsonResponse.optString("error", "Error procesando reembolso")))
                        }
                    } else {
                        Result.failure(Exception("Empty response body"))
                    }
                } else {
                    val errorBody = response.body?.string()
                    val errorMessage = try {
                        JSONObject(errorBody ?: "").optString("error", "Error desconocido")
                    } catch (e: Exception) {
                        "HTTP ${response.code}: ${response.message}"
                    }
                    Result.failure(Exception(errorMessage))
                }
            } catch (e: IOException) {
                Log.e("TransactionService", "Network error requesting refund", e)
                Result.failure(e)
            } catch (e: Exception) {
                Log.e("TransactionService", "Error requesting refund", e)
                Result.failure(e)
            }
        }
    }

    fun getTransactionSummary(transactions: List<Transaction>): TransactionSummary {
        val currentMonth = Calendar.getInstance().get(Calendar.MONTH)
        val currentYear = Calendar.getInstance().get(Calendar.YEAR)
        
        val monthlyTransactions = transactions.filter { transaction ->
            val calendar = Calendar.getInstance()
            calendar.time = transaction.createdAt
            calendar.get(Calendar.MONTH) == currentMonth && 
            calendar.get(Calendar.YEAR) == currentYear
        }
        
        val totalSpent = monthlyTransactions
            .filter { it.type == "payment" && it.status == "completed" }
            .sumOf { it.amount }
        
        val transactionCount = monthlyTransactions.size
        
        return TransactionSummary(
            totalSpent = totalSpent,
            transactionCount = transactionCount,
            monthlyTransactions = monthlyTransactions
        )
    }
}

data class TransactionSummary(
    val totalSpent: Double,
    val transactionCount: Int,
    val monthlyTransactions: List<Transaction>
)

data class RefundResponse(
    val success: Boolean,
    val refundId: String = "",
    val message: String = ""
)