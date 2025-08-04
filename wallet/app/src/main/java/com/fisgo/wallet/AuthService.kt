package com.fisgo.wallet

import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.tasks.await
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object AuthService {
    
    private val auth = FirebaseAuth.getInstance()
    
    /**
     * Obtiene el token de autenticación del usuario actual
     * @return Token ID de Firebase o null si no hay usuario autenticado
     */
    suspend fun getAuthToken(): String? {
        return withContext(Dispatchers.IO) {
            try {
                val currentUser = auth.currentUser
                if (currentUser != null) {
                    // Obtener token fresco de Firebase
                    val tokenResult = currentUser.getIdToken(true).await()
                    tokenResult.token
                } else {
                    null
                }
            } catch (e: Exception) {
                android.util.Log.e("AuthService", "Error obteniendo token: ${e.message}")
                null
            }
        }
    }
    
    /**
     * Verifica si el usuario está autenticado
     * @return true si hay un usuario autenticado
     */
    fun isUserAuthenticated(): Boolean {
        return auth.currentUser != null
    }
    
    /**
     * Obtiene el UID del usuario actual
     * @return UID del usuario o null si no está autenticado
     */
    fun getCurrentUserId(): String? {
        return auth.currentUser?.uid
    }
    
    /**
     * Obtiene el email del usuario actual
     * @return Email del usuario o null si no está autenticado
     */
    fun getCurrentUserEmail(): String? {
        return auth.currentUser?.email
    }
}
