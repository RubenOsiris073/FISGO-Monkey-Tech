package com.fisgo.wallet

import android.app.AlertDialog
import android.os.Bundle
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.google.android.material.button.MaterialButton
import com.google.android.material.textfield.TextInputEditText
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.*

class AddFundsActivity : AppCompatActivity() {
    
    private lateinit var backButton: ImageView
    private lateinit var currentBalanceText: TextView
    private lateinit var amountInput: TextInputEditText
    private lateinit var amount50Button: MaterialButton
    private lateinit var amount100Button: MaterialButton
    private lateinit var amount200Button: MaterialButton
    private lateinit var amount500Button: MaterialButton
    private lateinit var addFundsButton: MaterialButton
    
    private val currencyFormat = NumberFormat.getCurrencyInstance(Locale("es", "MX"))
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_add_funds)
        
        initViews()
        setupListeners()
        loadCurrentBalance()
    }
    
    private fun initViews() {
        backButton = findViewById(R.id.backButton)
        currentBalanceText = findViewById(R.id.currentBalanceText)
        amountInput = findViewById(R.id.amountInput)
        amount50Button = findViewById(R.id.amount50Button)
        amount100Button = findViewById(R.id.amount100Button)
        amount200Button = findViewById(R.id.amount200Button)
        amount500Button = findViewById(R.id.amount500Button)
        addFundsButton = findViewById(R.id.addFundsButton)
    }
    
    private fun setupListeners() {
        backButton.setOnClickListener {
            finish()
        }
        
        amount50Button.setOnClickListener {
            setAmount(50.0)
        }
        
        amount100Button.setOnClickListener {
            setAmount(100.0)
        }
        
        amount200Button.setOnClickListener {
            setAmount(200.0)
        }
        
        amount500Button.setOnClickListener {
            setAmount(500.0)
        }
        
        addFundsButton.setOnClickListener {
            processAddFunds()
        }
    }
    
    private fun loadCurrentBalance() {
        val balance = WalletManager.getBalance(this)
        val formattedBalance = currencyFormat.format(balance).replace("MX$", "$")
        currentBalanceText.text = formattedBalance
    }
    
    private fun setAmount(amount: Double) {
        amountInput.setText(amount.toString())
    }
    
    private fun processAddFunds() {
        val amountStr = amountInput.text.toString().trim()
        
        if (amountStr.isEmpty()) {
            Toast.makeText(this, "Ingresa una cantidad", Toast.LENGTH_SHORT).show()
            return
        }
        
        val amount = amountStr.toDoubleOrNull()
        if (amount == null || amount <= 0) {
            Toast.makeText(this, "Ingresa una cantidad válida", Toast.LENGTH_SHORT).show()
            return
        }
        
        if (amount > 5000) {
            Toast.makeText(this, "El monto máximo es $5,000", Toast.LENGTH_SHORT).show()
            return
        }
        
        showConfirmationDialog(amount)
    }
    
    private fun showConfirmationDialog(amount: Double) {
        val formattedAmount = currencyFormat.format(amount).replace("MX$", "$")
        
        AlertDialog.Builder(this)
            .setTitle("Confirmar Recarga")
            .setMessage("¿Deseas agregar $formattedAmount a tu saldo?")
            .setPositiveButton("Confirmar") { _, _ ->
                addFundsToWallet(amount)
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }
    
    private fun addFundsToWallet(amount: Double) {
        addFundsButton.isEnabled = false
        addFundsButton.text = "Procesando..."
        
        lifecycleScope.launch {
            try {
                // Simular proceso de pago
                kotlinx.coroutines.delay(2000)
                
                // Agregar fondos al wallet
                WalletManager.addAmount(this@AddFundsActivity, amount)
                
                // Crear transacción simulada
                createAddFundsTransaction(amount)
                
                val formattedAmount = currencyFormat.format(amount).replace("MX$", "$")
                Toast.makeText(this@AddFundsActivity, 
                    "Se agregaron $formattedAmount exitosamente", Toast.LENGTH_LONG).show()
                
                // Actualizar balance mostrado
                loadCurrentBalance()
                
                // Limpiar campo
                amountInput.setText("")
                
                addFundsButton.isEnabled = true
                addFundsButton.text = "Agregar Fondos"
                
            } catch (e: Exception) {
                Toast.makeText(this@AddFundsActivity, 
                    "Error procesando la recarga: ${e.message}", Toast.LENGTH_LONG).show()
                
                addFundsButton.isEnabled = true
                addFundsButton.text = "Agregar Fondos"
            }
        }
    }
    
    private fun createAddFundsTransaction(amount: Double) {
        // En una implementación real, esto se haría a través del TransactionService
        // Por ahora solo registramos la acción en logs
        android.util.Log.d("AddFunds", "Funds added: $amount")
    }
}
