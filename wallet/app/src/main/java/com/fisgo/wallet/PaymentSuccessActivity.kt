package com.fisgo.wallet

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class PaymentSuccessActivity : AppCompatActivity() {
    
    private lateinit var amountText: TextView
    private lateinit var transactionIdText: TextView
    private lateinit var remainingBalanceText: TextView  // Nuevo TextView para el saldo restante
    private lateinit var closeButton: Button
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_payment_success)
        
        initViews()
        loadPaymentData()
        setupListeners()
    }
    
    private fun initViews() {
        amountText = findViewById(R.id.amountText)
        transactionIdText = findViewById(R.id.transactionIdText)
        remainingBalanceText = findViewById(R.id.remainingBalanceText)  // Inicializar el nuevo TextView
        closeButton = findViewById(R.id.closeButton)
    }
    
    private fun loadPaymentData() {
        val amount = intent.getDoubleExtra("amount", 0.0)
        val transactionId = intent.getStringExtra("transactionId") ?: ""
        val paymentMethod = intent.getStringExtra("paymentMethod") ?: "Desconocido"
        
        // Obtener el saldo restante después de la compra
        val remainingBalance = WalletManager.getBalance(this)
        
        amountText.text = "$${String.format("%.2f", amount)}"
        
        // Formatear el ID de transacción más limpio (solo el ID sin texto adicional)
        transactionIdText.text = if (transactionId.isNotEmpty()) transactionId else "N/A"
        
        remainingBalanceText.text = "$${String.format("%.2f", remainingBalance)}"
    }
    
    private fun setupListeners() {
        closeButton.setOnClickListener {
            // Regresar a la pantalla principal
            val intent = Intent(this, MainActivity::class.java)
            intent.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
            startActivity(intent)
            finish()
        }
    }
    
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        super.onBackPressed()
        // Prevenir que el usuario regrese a la pantalla de pago
        val intent = Intent(this, MainActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
        startActivity(intent)
        finish()
    }
}