package com.fisgo.wallet

import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.text.InputFilter
import android.util.Log
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.CheckBox
import android.widget.EditText
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.ktx.auth
import com.google.firebase.ktx.Firebase
import kotlinx.coroutines.*
import org.json.JSONObject

class SyncCodeActivity : AppCompatActivity() {
    
    private lateinit var syncCodeInput: EditText
    private lateinit var syncButton: MaterialButton
    private lateinit var progressContainer: LinearLayout
    private lateinit var progressBar: ProgressBar
    private lateinit var errorContainer: LinearLayout
    private lateinit var errorText: TextView
    private lateinit var cartContainer: LinearLayout
    private lateinit var cartRecyclerView: RecyclerView
    private lateinit var totalText: TextView
    private lateinit var confirmPurchaseButton: MaterialButton
    
    // Payment method components
    private lateinit var paymentMethodsContainer: LinearLayout
    private lateinit var walletOptionContainer: LinearLayout
    private lateinit var cardOptionContainer: LinearLayout
    private lateinit var walletCheckBox: CheckBox
    private lateinit var cardCheckBox: CheckBox
    private lateinit var walletBalanceText: TextView
    private lateinit var savedCardInfo: LinearLayout
    private lateinit var savedCardText: TextView
    private lateinit var changeCardButton: MaterialButton
    private lateinit var addCardButton: MaterialButton
    private lateinit var cardTypeIcon: ImageView
    
    private lateinit var auth: FirebaseAuth
    
    private var cartItems = mutableListOf<CartItem>()
    private var cartTotal = 0.0
    private var sessionId: String? = null
    private var selectedPaymentMethod = "wallet"
    
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    
    companion object {
        private const val CARD_PAYMENT_REQUEST_CODE = 1001
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_sync_code)
        
        auth = Firebase.auth
        initViews()
        setupListeners()
        setupSyncCodeInput()
        loadSavedPaymentMethods()
    }
    
    private fun initViews() {
        syncCodeInput = findViewById(R.id.syncCodeInput)
        syncButton = findViewById(R.id.syncButton)
        progressContainer = findViewById(R.id.progressContainer)
        progressBar = findViewById(R.id.progressBar)
        errorContainer = findViewById(R.id.errorContainer)
        errorText = findViewById(R.id.errorText)
        cartContainer = findViewById(R.id.cartContainer)
        cartRecyclerView = findViewById(R.id.cartRecyclerView)
        totalText = findViewById(R.id.totalText)
        confirmPurchaseButton = findViewById(R.id.confirmPurchaseButton)
        
        // Payment method components
        paymentMethodsContainer = findViewById(R.id.paymentMethodsContainer)
        walletOptionContainer = findViewById(R.id.walletOptionContainer)
        cardOptionContainer = findViewById(R.id.cardOptionContainer)
        walletCheckBox = findViewById(R.id.walletCheckBox)
        cardCheckBox = findViewById(R.id.cardCheckBox)
        walletBalanceText = findViewById(R.id.walletBalanceText)
        savedCardInfo = findViewById(R.id.savedCardInfo)
        savedCardText = findViewById(R.id.savedCardText)
        changeCardButton = findViewById(R.id.changeCardButton)
        addCardButton = findViewById(R.id.addCardButton)
        cardTypeIcon = findViewById(R.id.cardTypeIcon)
        
        cartRecyclerView.layoutManager = LinearLayoutManager(this)
        syncButton.isEnabled = false
    }
    
    private fun setupSyncCodeInput() {
        syncCodeInput.filters = arrayOf(InputFilter.LengthFilter(6))
        
        syncCodeInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                hideError()
                val length = s?.length ?: 0
                syncButton.isEnabled = length == 6
                
                if (length == 6) {
                    hideKeyboard()
                }
            }
        })
    }
    
    private fun hideKeyboard() {
        val imm = getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager
        imm.hideSoftInputFromWindow(syncCodeInput.windowToken, 0)
    }
    
    private fun loadSavedPaymentMethods() {
        val currentBalance = WalletManager.getBalance(this)
        walletBalanceText.text = "Available: $${String.format("%.2f", currentBalance)}"
        
        selectedPaymentMethod = PaymentMethodManager.getPreferredPaymentMethod(this)
        
        if (PaymentMethodManager.hasSavedCard(this)) {
            val lastFour = PaymentMethodManager.getSavedCardLastFour(this)
            val cardType = PaymentMethodManager.getSavedCardType(this)
            
            savedCardText.text = "$cardType •••• $lastFour"
            savedCardInfo.visibility = View.VISIBLE
            addCardButton.visibility = View.GONE
            changeCardButton.visibility = View.VISIBLE
        } else {
            savedCardInfo.visibility = View.GONE
            addCardButton.visibility = View.VISIBLE
            changeCardButton.visibility = View.GONE
        }
        
        updatePaymentMethodSelection()
    }
    
    private fun setupListeners() {
        syncButton.setOnClickListener {
            val code = syncCodeInput.text.toString()
            if (code.length == 6) {
                handleSyncCode(code)
            }
        }
        
        confirmPurchaseButton.setOnClickListener {
            handleProcessPayment()
        }
        
        walletOptionContainer.setOnClickListener {
            setPaymentMethod("wallet")
        }
        
        cardOptionContainer.setOnClickListener {
            setPaymentMethod("card")
        }
        
        walletCheckBox.setOnCheckedChangeListener { _, isChecked ->
            if (isChecked) {
                setPaymentMethod("wallet")
            }
        }
        
        cardCheckBox.setOnCheckedChangeListener { _, isChecked ->
            if (isChecked) {
                setPaymentMethod("card")
            }
        }
        
        changeCardButton.setOnClickListener {
            val intent = Intent(this, CardPaymentActivity::class.java)
            intent.putExtra("setup_mode", true)
            intent.putExtra(CardPaymentActivity.EXTRA_AMOUNT, 0.0)
            startActivityForResult(intent, CARD_PAYMENT_REQUEST_CODE)
        }
        
        addCardButton.setOnClickListener {
            val intent = Intent(this, CardPaymentActivity::class.java)
            intent.putExtra("setup_mode", true)
            intent.putExtra(CardPaymentActivity.EXTRA_AMOUNT, 0.0)
            startActivityForResult(intent, CARD_PAYMENT_REQUEST_CODE)
        }
    }
    
    private fun setPaymentMethod(method: String) {
        selectedPaymentMethod = method
        PaymentMethodManager.setPreferredPaymentMethod(this, method)
        updatePaymentMethodSelection()
    }
    
    private fun updatePaymentMethodSelection() {
        when (selectedPaymentMethod) {
            "wallet" -> {
                walletCheckBox.isChecked = true
                cardCheckBox.isChecked = false
            }
            "card" -> {
                cardCheckBox.isChecked = true
                walletCheckBox.isChecked = false
            }
        }
        
        updatePaymentMethodAvailability()
    }
    
    private fun updatePaymentMethodAvailability() {
        val currentBalance = WalletManager.getBalance(this)
        val hasSavedCard = PaymentMethodManager.hasSavedCard(this)
        
        val walletAvailable = currentBalance >= cartTotal
        val cardAvailable = hasSavedCard
        
        walletOptionContainer.alpha = if (walletAvailable) 1.0f else 0.5f
        cardOptionContainer.alpha = if (cardAvailable) 1.0f else 0.5f
        
        if (selectedPaymentMethod == "wallet" && !walletAvailable && cardAvailable) {
            setPaymentMethod("card")
        } else if (selectedPaymentMethod == "card" && !cardAvailable && walletAvailable) {
            setPaymentMethod("wallet")
        }
        
        val anyMethodAvailable = walletAvailable || cardAvailable
        confirmPurchaseButton.isEnabled = anyMethodAvailable && sessionId != null
    }
    
    private fun handleSyncCode(code: String) {
        if (code.isBlank()) {
            showError("Código no puede estar vacío")
            return
        }
        
        if (code.length != 6) {
            showError("El código debe tener 6 caracteres")
            return
        }
        
        showLoading(true)
        hideError()
        
        scope.launch {
            try {
                val result = withContext(Dispatchers.IO) {
                    syncCartWithBackend(code)
                }
                
                if (result.success) {
                    cartItems.clear()
                    cartItems.addAll(result.items ?: emptyList())
                    cartTotal = result.total ?: 0.0
                    sessionId = result.sessionId
                    showCartItems()
                    showMessage("¡Carrito sincronizado exitosamente!")
                } else {
                    showError(result.error ?: "Error desconocido")
                }
            } catch (e: Exception) {
                showError("Error de conexión: ${e.message}")
            } finally {
                showLoading(false)
            }
        }
    }
    
    private fun handleProcessPayment() {
        if (sessionId == null) {
            showError("Error: No hay sesión activa")
            return
        }

        when (selectedPaymentMethod) {
            "wallet" -> processWalletPayment()
            "card" -> processCardPayment()
        }
    }
    
    private fun processCardPayment() {
        Log.d("SyncCodeActivity", "processCardPayment - cartTotal: $cartTotal")
        
        val intent = Intent(this, CardPaymentActivity::class.java)
        intent.putExtra(CardPaymentActivity.EXTRA_AMOUNT, cartTotal)
        intent.putExtra("setup_mode", false)
        
        startActivityForResult(intent, CARD_PAYMENT_REQUEST_CODE)
    }
    
    private fun processWalletPayment() {
        val currentBalance = WalletManager.getBalance(this)
        
        if (currentBalance < cartTotal) {
            showError("Saldo insuficiente: \$${String.format("%.2f", currentBalance)} disponible")
            return
        }
        
        confirmPurchaseButton.text = "Procesando..."
        confirmPurchaseButton.isEnabled = false
        showLoading(true)
        
        scope.launch {
            try {
                val result = withContext(Dispatchers.IO) {
                    processPaymentWithBackend("wallet")
                }
                
                if (result.success) {
                    WalletManager.deductAmount(this@SyncCodeActivity, cartTotal)
                    
                    confirmPurchaseButton.text = "¡Pago exitoso!"
                    showMessage("¡Compra realizada exitosamente con wallet!")
                    
                    val intent = Intent(this@SyncCodeActivity, PaymentSuccessActivity::class.java)
                    intent.putExtra("amount", cartTotal)
                    intent.putExtra("transactionId", result.transactionId)
                    intent.putExtra("paymentMethod", "Wallet")
                    startActivity(intent)
                    finish()
                } else {
                    showError(result.error ?: "Error procesando el pago")
                    resetPaymentButton()
                }
            } catch (e: Exception) {
                showError("Error de conexión: ${e.message}")
                resetPaymentButton()
            } finally {
                showLoading(false)
            }
        }
    }
    
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        if (requestCode == CARD_PAYMENT_REQUEST_CODE) {
            if (resultCode == RESULT_OK) {
                val setupMode = data?.getBooleanExtra("setup_mode", false) ?: false
                
                if (setupMode) {
                    showMessage("¡Tarjeta configurada exitosamente!")
                    loadSavedPaymentMethods()
                    setPaymentMethod("card")
                } else {
                    scope.launch {
                        try {
                            val result = withContext(Dispatchers.IO) {
                                processPaymentWithBackend("card")
                            }
                            
                            if (result.success) {
                                showMessage("¡Compra realizada exitosamente con tarjeta!")
                                
                                val intent = Intent(this@SyncCodeActivity, PaymentSuccessActivity::class.java)
                                intent.putExtra("amount", cartTotal)
                                intent.putExtra("transactionId", result.transactionId)
                                intent.putExtra("paymentMethod", "Tarjeta de Crédito")
                                startActivity(intent)
                                finish()
                            } else {
                                showError("Error al confirmar el pago: ${result.error}")
                                resetPaymentButton()
                            }
                        } catch (e: Exception) {
                            showError("Error confirmando el pago: ${e.message}")
                            resetPaymentButton()
                        }
                    }
                }
            } else {
                val setupMode = data?.getBooleanExtra("setup_mode", false) ?: false
                if (setupMode) {
                    showError("Configuración de tarjeta cancelada")
                } else {
                    showError("Pago con tarjeta cancelado")
                    resetPaymentButton()
                }
            }
        }
    }
    
    private fun resetPaymentButton() {
        confirmPurchaseButton.text = "Confirmar Compra"
        confirmPurchaseButton.isEnabled = true
    }
    
    private suspend fun syncCartWithBackend(code: String): SyncResult {
        return withContext(Dispatchers.IO) {
            try {
                val response = ApiService.syncCart(code)
                
                if (response.success && response.data != null) {
                    val data = response.data
                    val itemsArray = data.getJSONArray("items")
                    val items = mutableListOf<CartItem>()
                    
                    for (i in 0 until itemsArray.length()) {
                        val item = itemsArray.getJSONObject(i)
                        items.add(
                            CartItem(
                                id = item.getString("id"),
                                nombre = item.getString("nombre"),
                                precio = item.getDouble("precio"),
                                quantity = item.getInt("quantity")
                            )
                        )
                    }
                    
                    SyncResult(
                        success = true,
                        sessionId = data.getString("sessionId"),
                        items = items,
                        total = data.getDouble("total")
                    )
                } else {
                    SyncResult(
                        success = false,
                        error = response.error ?: "Error desconocido al sincronizar"
                    )
                }
            } catch (e: Exception) {
                SyncResult(
                    success = false,
                    error = "Error de conexión: ${e.message}"
                )
            }
        }
    }
    
    private suspend fun processPaymentWithBackend(paymentMethod: String): PaymentResult {
        return withContext(Dispatchers.IO) {
            try {
                val response = ApiService.processPayment(
                    sessionId = sessionId ?: "",
                    amount = cartTotal,
                    paymentMethod = paymentMethod
                )
                
                if (response.success && response.data != null) {
                    PaymentResult(
                        success = true,
                        transactionId = response.data.optString("transactionId", sessionId ?: "")
                    )
                } else {
                    PaymentResult(
                        success = false,
                        error = response.error ?: "Error procesando el pago"
                    )
                }
            } catch (e: Exception) {
                PaymentResult(
                    success = false,
                    error = "Error de conexión: ${e.message}"
                )
            }
        }
    }
    
    private fun showCartItems() {
        cartContainer.visibility = View.VISIBLE
        
        val adapter = CartAdapter(cartItems)
        cartRecyclerView.adapter = adapter
        
        totalText.text = "Total: $${String.format("%.2f", cartTotal)}"
        
        updatePaymentMethodAvailability()
        
        if (cartItems.isNotEmpty()) {
            paymentMethodsContainer.visibility = View.VISIBLE
            syncButton.text = syncCodeInput.text.toString()
            confirmPurchaseButton.visibility = if (sessionId != null) View.VISIBLE else View.GONE
        }
    }
    
    private fun showError(message: String) {
        errorText.text = message
        errorContainer.visibility = View.VISIBLE
        
        errorContainer.postDelayed({
            errorContainer.visibility = View.GONE
        }, 5000)
    }
    
    private fun hideError() {
        errorContainer.visibility = View.GONE
    }
    
    private fun showLoading(show: Boolean) {
        progressContainer.visibility = if (show) View.VISIBLE else View.GONE
    }
    
    private fun showMessage(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }
    
    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
}
