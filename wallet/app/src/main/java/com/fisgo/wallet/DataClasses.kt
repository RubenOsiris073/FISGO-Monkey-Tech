package com.fisgo.wallet

// Data classes compartidas para toda la aplicación
data class CartItem(
    val id: String,
    val nombre: String,
    val precio: Double,
    val quantity: Int
) {
    override fun toString(): String {
        return "CartItem(id='$id', nombre='$nombre', precio=$precio, quantity=$quantity)"
    }
}

data class SyncResult(
    val success: Boolean,
    val sessionId: String? = null,
    val items: List<CartItem>? = null,
    val total: Double? = null,
    val error: String? = null
)

data class PaymentResult(
    val success: Boolean,
    val transactionId: String? = null,
    val error: String? = null
)
