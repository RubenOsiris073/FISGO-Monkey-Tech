package com.fisgo.wallet

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.animation.Animation
import android.view.animation.AnimationUtils
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.android.material.button.MaterialButton
import com.google.android.material.floatingactionbutton.FloatingActionButton
import com.google.firebase.auth.FirebaseAuth
import java.text.NumberFormat
import java.util.*

class MainActivity : AppCompatActivity() {

    private lateinit var balanceAmountText: TextView
    private lateinit var addFundsButton: MaterialButton
    private lateinit var syncCard: LinearLayout
    private lateinit var transactionHistoryCard: LinearLayout
    private lateinit var paymentMethodsCard: LinearLayout
    private lateinit var settingsCard: LinearLayout
    private lateinit var mainFab: FloatingActionButton
    private lateinit var fabMenuContainer: LinearLayout
    private lateinit var fabInventoryOption: LinearLayout
    private lateinit var fabAddFundsOption: LinearLayout
    
    private var isFabMenuOpen = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        initViews()
        setupListeners()
        loadWalletData()
    }

    private fun initViews() {
        balanceAmountText = findViewById(R.id.balanceAmountText)
        addFundsButton = findViewById(R.id.addFundsButton)
        syncCard = findViewById(R.id.syncCard)
        transactionHistoryCard = findViewById(R.id.transactionHistoryCard)
        paymentMethodsCard = findViewById(R.id.paymentMethodsCard)
        settingsCard = findViewById(R.id.settingsCard)
        mainFab = findViewById(R.id.mainFab)
        fabMenuContainer = findViewById(R.id.fabMenuContainer)
        fabInventoryOption = findViewById(R.id.fabInventoryOption)
        fabAddFundsOption = findViewById(R.id.fabAddFundsOption)
    }

    private fun setupListeners() {
        // Sync with POS
        syncCard.setOnClickListener {
            val intent = Intent(this, SyncCodeActivity::class.java)
            startActivity(intent)
        }

        // Transaction History - Conectar con TransactionHistoryActivity
        transactionHistoryCard.setOnClickListener {
            val intent = Intent(this, TransactionHistoryActivity::class.java)
            startActivity(intent)
        }

        // Payment Methods - Nueva funcionalidad
        paymentMethodsCard.setOnClickListener {
            val intent = Intent(this, PaymentMethodsActivity::class.java)
            startActivity(intent)
        }

        // Settings
        settingsCard.setOnClickListener {
            val intent = Intent(this, SettingsActivity::class.java)
            startActivity(intent)
        }

        // Quick action buttons
        addFundsButton.setOnClickListener {
            showMessage("Funcionalidad de Agregar Fondos próximamente")
        }

        // Speed Dial FAB
        mainFab.setOnClickListener {
            toggleFabMenu()
        }
        
        fabInventoryOption.setOnClickListener {
            val intent = Intent(this, ProductInventoryActivity::class.java)
            startActivity(intent)
        }
        
        fabAddFundsOption.setOnClickListener {
            val intent = Intent(this, AddFundsActivity::class.java)
            startActivity(intent)
        }
    }

    private fun loadWalletData() {
        val balance = WalletManager.getBalance(this)

        // Formato simple ya que el XML maneja el signo de peso
        val currencyFormat = NumberFormat.getCurrencyInstance(Locale("es", "MX"))
        val formattedBalance = currencyFormat.format(balance).replace("MX$", "$")

        balanceAmountText.text = formattedBalance
    }

    private fun showMessage(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }

    override fun onResume() {
        super.onResume()
        // Actualizar el balance cuando se regrese a la actividad (importante para reembolsos)
        loadWalletData()

        // TEMPORAL: Mostrar el ID del usuario en logs
        val auth = FirebaseAuth.getInstance()
        val currentUser = auth.currentUser
        if (currentUser != null) {
            Log.d("USER_ID", "=== TU ID DE USUARIO ES: ${currentUser.uid} ===")
            println("=== TU ID DE USUARIO ES: ${currentUser.uid} ===")
        } else {
            Log.d("USER_ID", "No hay usuario autenticado")
        }
    }
    
    private fun toggleFabMenu() {
        if (isFabMenuOpen) {
            closeFabMenu()
        } else {
            openFabMenu()
        }
    }
    
    private fun openFabMenu() {
        isFabMenuOpen = true
        
        // Mostrar menu
        fabMenuContainer.visibility = View.VISIBLE
        
        // Animar rotación del FAB principal
        mainFab.animate()
            .rotation(45f)
            .setDuration(200)
            .start()
        
        // Animar entrada de las opciones con escalado
        fabInventoryOption.scaleX = 0f
        fabInventoryOption.scaleY = 0f
        fabInventoryOption.animate()
            .scaleX(1f)
            .scaleY(1f)
            .setDuration(200)
            .setStartDelay(50)
            .start()
        
        fabAddFundsOption.scaleX = 0f
        fabAddFundsOption.scaleY = 0f
        fabAddFundsOption.animate()
            .scaleX(1f)
            .scaleY(1f)
            .setDuration(200)
            .setStartDelay(100)
            .start()
    }
    
    private fun closeFabMenu() {
        isFabMenuOpen = false
        
        // Animar rotación del FAB principal
        mainFab.animate()
            .rotation(0f)
            .setDuration(200)
            .start()
        
        // Animar salida de las opciones
        fabInventoryOption.animate()
            .scaleX(0f)
            .scaleY(0f)
            .setDuration(150)
            .start()
        
        fabAddFundsOption.animate()
            .scaleX(0f)
            .scaleY(0f)
            .setDuration(150)
            .withEndAction {
                fabMenuContainer.visibility = View.GONE
            }
            .start()
    }
    
    override fun onBackPressed() {
        if (isFabMenuOpen) {
            closeFabMenu()
        } else {
            super.onBackPressed()
        }
    }
}