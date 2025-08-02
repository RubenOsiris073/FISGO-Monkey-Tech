package com.fisgo.wallet

import android.app.AlertDialog
import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.widget.EditText
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*

class TransactionDetailActivity : AppCompatActivity() {
    
    private lateinit var transactionService: TransactionService
    
    private lateinit var backButton: ImageView
    private lateinit var transactionAmountText: TextView
    private lateinit var transactionTitleText: TextView
    private lateinit var transactionStatusText: TextView
    private lateinit var transactionDateText: TextView
    private lateinit var transactionIdText: TextView
    private lateinit var transactionDescriptionText: TextView
    private lateinit var paymentMethodText: TextView
    private lateinit var shareButton: MaterialButton
    private lateinit var refundButton: MaterialButton
    
    // Formateadores para fechas y moneda mexicana
    private val fullDateFormat = SimpleDateFormat("EEEE, dd 'de' MMMM 'de' yyyy 'a las' HH:mm", Locale("es", "MX"))
    private val currencyFormat = NumberFormat.getCurrencyInstance(Locale("es", "MX"))
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_transaction_detail)
        
        transactionService = TransactionService()
        
        initViews()
        setupClickListeners()
        loadTransactionDetail()
    }
    
    private fun initViews() {
        backButton = findViewById(R.id.backButton)
        transactionAmountText = findViewById(R.id.transactionAmountText)
        transactionTitleText = findViewById(R.id.transactionTitleText)
        transactionStatusText = findViewById(R.id.transactionStatusText)
        transactionDateText = findViewById(R.id.transactionDateText)
        transactionIdText = findViewById(R.id.transactionIdText)
        transactionDescriptionText = findViewById(R.id.transactionDescriptionText)
        paymentMethodText = findViewById(R.id.paymentMethodText)
        shareButton = findViewById(R.id.shareButton)
        refundButton = findViewById(R.id.refundButton)
    }
    
    private fun setupClickListeners() {
        backButton.setOnClickListener {
            finish()
        }
        
        shareButton.setOnClickListener {
            shareTransactionReceipt()
        }
        
        refundButton.setOnClickListener {
            showRefundDialog()
        }
    }
    
    private fun loadTransactionDetail() {
        val transactionId = intent.getStringExtra("transaction_id")
        
        if (transactionId == null) {
            Log.e("TransactionDetail", "No transaction ID provided")
            Toast.makeText(this, "Error: ID de transacción no válido", Toast.LENGTH_SHORT).show()
            finish()
            return
        }
        
        Log.d("TransactionDetail", "Loading transaction detail for ID: $transactionId")
        
        lifecycleScope.launch {
            try {
                val result = transactionService.getTransactionById(transactionId)
                
                result.onSuccess { transaction ->
                    Log.d("TransactionDetail", "Transaction detail loaded: ${transaction.id}")
                    runOnUiThread {
                        updateUI(transaction)
                    }
                }.onFailure { error ->
                    Log.e("TransactionDetail", "Error loading transaction detail", error)
                    runOnUiThread {
                        Toast.makeText(this@TransactionDetailActivity, "Error cargando detalles: ${error.message}", Toast.LENGTH_SHORT).show()
                        finish()
                    }
                }
            } catch (e: Exception) {
                Log.e("TransactionDetail", "Exception loading transaction detail", e)
                runOnUiThread {
                    Toast.makeText(this@TransactionDetailActivity, "Error inesperado", Toast.LENGTH_SHORT).show()
                    finish()
                }
            }
        }
    }
    
    private fun updateUI(transaction: Transaction) {
        // Formato de monto con signo y moneda
        val formattedAmount = currencyFormat.format(transaction.amount).replace("MX$", "$")
        val amountWithSign = when (transaction.type ?: "unknown") {
            "payment" -> "-$formattedAmount"
            "refund" -> "+$formattedAmount"
            else -> formattedAmount
        }
        transactionAmountText.text = amountWithSign
        
        // Color del monto según el tipo
        val amountColor = when (transaction.type ?: "unknown") {
            "payment" -> getColor(android.R.color.holo_red_dark)
            "refund" -> getColor(android.R.color.holo_green_dark)
            else -> getColor(android.R.color.black)
        }
        transactionAmountText.setTextColor(amountColor)
        
        // Título descriptivo
        val title = when (transaction.type ?: "unknown") {
            "payment" -> transaction.merchantName ?: "Pago realizado"
            "refund" -> "Reembolso recibido"
            "transfer" -> "Transferencia"
            else -> "Transacción"
        }
        transactionTitleText.text = title
        
        // Estado formateado
        val status = transaction.status ?: "unknown"
        val statusText = when (status) {
            "completed" -> "Completado"
            "pending" -> "Pendiente"
            "failed" -> "Fallido"
            "refunded" -> "Reembolsado"
            else -> status.replaceFirstChar { 
                if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() 
            }
        }
        transactionStatusText.text = statusText
        
        // Color del estado
        val statusColor = when (status) {
            "completed" -> getColor(android.R.color.holo_green_dark)
            "pending" -> getColor(android.R.color.holo_orange_dark)
            "failed" -> getColor(android.R.color.holo_red_dark)
            "refunded" -> getColor(android.R.color.holo_blue_dark)
            else -> getColor(android.R.color.darker_gray)
        }
        transactionStatusText.setTextColor(statusColor)
        
        // Fecha y hora formateada en español
        try {
            transactionDateText.text = fullDateFormat.format(transaction.createdAt)
        } catch (e: Exception) {
            transactionDateText.text = "Fecha no disponible"
        }
        
        // ID de transacción
        transactionIdText.text = transaction.id ?: "ID no disponible"
        
        // Descripción
        transactionDescriptionText.text = transaction.description ?: "Sin descripción"
        
        // Método de pago formateado
        val paymentMethod = transaction.paymentMethod ?: "unknown"
        val paymentMethodFormatted = when (paymentMethod) {
            "wallet" -> "Billetera Digital"
            "card" -> "Tarjeta de Crédito"
            "bank_transfer" -> "Transferencia Bancaria"
            "cash" -> "Efectivo"
            else -> paymentMethod.replaceFirstChar { 
                if (it.isLowerCase()) it.titlecase(Locale.getDefault()) else it.toString() 
            }.ifEmpty { "No especificado" }
        }
        paymentMethodText.text = paymentMethodFormatted
        
        // Mostrar/ocultar botón de reembolso según el tipo y estado de la transacción
        val canRefund = (transaction.type == "payment") && (transaction.status != "refunded") && (transaction.status != "failed")
        refundButton.visibility = if (canRefund) android.view.View.VISIBLE else android.view.View.GONE
    }
    
    private fun shareTransactionReceipt() {
        // Crear texto del comprobante para compartir
        val transactionId = intent.getStringExtra("transaction_id") ?: ""
        val receiptText = """
            🧾 COMPROBANTE DE TRANSACCIÓN
            
            ID: $transactionId
            Monto: ${transactionAmountText.text}
            Fecha: ${transactionDateText.text}
            Estado: ${transactionStatusText.text}
            Método: ${paymentMethodText.text}
            
            Descripción: ${transactionDescriptionText.text}
            
            ───────────────────────────
            Generado desde Wallet App
        """.trimIndent()
        
        val shareIntent = Intent().apply {
            action = Intent.ACTION_SEND
            type = "text/plain"
            putExtra(Intent.EXTRA_TEXT, receiptText)
            putExtra(Intent.EXTRA_SUBJECT, "Comprobante de Transacción #$transactionId")
        }
        
        startActivity(Intent.createChooser(shareIntent, "Compartir comprobante"))
    }
    
    private fun showError(message: String) {
        // Aquí podrías mostrar un Toast o Snackbar
        Log.e("TransactionDetail", message)
        finish()
    }
    
    private fun showRefundDialog() {
        val transactionId = intent.getStringExtra("transaction_id") ?: return
        
        // Crear un EditText para la razón del reembolso
        val reasonInput = EditText(this).apply {
            hint = "Razón del reembolso (opcional)"
            maxLines = 3
        }
        
        AlertDialog.Builder(this)
            .setTitle("Solicitar Reembolso")
            .setMessage("¿Estás seguro de que deseas solicitar un reembolso para esta transacción?")
            .setView(reasonInput)
            .setPositiveButton("Solicitar Reembolso") { _, _ ->
                val reason = reasonInput.text.toString().trim()
                processRefund(transactionId, reason)
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }
    
    private fun processRefund(transactionId: String, reason: String) {
        refundButton.isEnabled = false
        refundButton.text = "Procesando..."
        
        lifecycleScope.launch {
            try {
                val result = transactionService.requestRefund(transactionId, reason)
                
                result.onSuccess { refundResponse ->
                    Toast.makeText(this@TransactionDetailActivity, refundResponse.message, Toast.LENGTH_LONG).show()
                    
                    // Actualizar el saldo de la wallet si el pago original fue con wallet
                    if (paymentMethodText.text.contains("Billetera")) {
                        val amount = transactionAmountText.text.toString()
                            .replace("-", "").replace("$", "").replace(",", "").toDoubleOrNull() ?: 0.0
                        WalletManager.addAmount(this@TransactionDetailActivity, amount)
                    }
                    
                    // Cerrar la actividad y regresar al historial
                    setResult(RESULT_OK)
                    finish()
                    
                }.onFailure { error ->
                    Toast.makeText(this@TransactionDetailActivity, 
                        "Error: ${error.message}", Toast.LENGTH_LONG).show()
                    refundButton.isEnabled = true
                    refundButton.text = "Solicitar Reembolso"
                }
            } catch (e: Exception) {
                Toast.makeText(this@TransactionDetailActivity, 
                    "Error inesperado: ${e.message}", Toast.LENGTH_LONG).show()
                refundButton.isEnabled = true
                refundButton.text = "Solicitar Reembolso"
            }
        }
    }
}