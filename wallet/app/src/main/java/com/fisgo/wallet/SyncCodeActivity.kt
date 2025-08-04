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
    private var selectedPaymentMethod = "wallet" // Default to wallet
    
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    
    // Request codes
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
        
        // Configuración inicial
        cartRecyclerView.layoutManager = LinearLayoutManager(this)
        
        // Initially disable sync button
        syncButton.isEnabled = false
    }
    
    private fun setupSyncCodeInput() {
        // Limitar a 6 caracteres y solo números/letras
        syncCodeInput.filters = arrayOf(InputFilter.LengthFilter(6))
        
        syncCodeInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                hideError()
                val length = s?.length ?: 0
                syncButton.isEnabled = length == 6
                
                // Ocultar teclado cuando alcance 6 caracteres
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
        // Cargar saldo de wallet
        val currentBalance = WalletManager.getBalance(this)
        walletBalanceText.text = "Available: $${String.format("%.2f", currentBalance)}"
        
        // Cargar método preferido
        selectedPaymentMethod = PaymentMethodManager.getPreferredPaymentMethod(this)
        
        // Cargar tarjeta guardada si existe
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
        
        // Payment method selection
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
            // Ir a configurar nueva tarjeta
            val intent = Intent(this, CardPaymentActivity::class.java)
            intent.putExtra("setup_mode", true)
            intent.putExtra(CardPaymentActivity.EXTRA_AMOUNT, 0.0) // Sin monto para configuración
            startActivityForResult(intent, CARD_PAYMENT_REQUEST_CODE)
        }
        
        addCardButton.setOnClickListener {
            // Ir a agregar tarjeta
            val intent = Intent(this, CardPaymentActivity::class.java)
            intent.putExtra("setup_mode", true)
            intent.putExtra(CardPaymentActivity.EXTRA_AMOUNT, 0.0) // Sin monto para configuración
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
        
        // Determinar si cada método está disponible
        val walletAvailable = currentBalance >= cartTotal
        val cardAvailable = hasSavedCard
        
        // Actualizar UI de disponibilidad
        walletOptionContainer.alpha = if (walletAvailable) 1.0f else 0.5f
        cardOptionContainer.alpha = if (cardAvailable) 1.0f else 0.5f
        
        // Si el método seleccionado no está disponible, cambiar automáticamente
        if (selectedPaymentMethod == "wallet" && !walletAvailable && cardAvailable) {
            setPaymentMethod("card")
        } else if (selectedPaymentMethod == "card" && !cardAvailable && walletAvailable) {
            setPaymentMethod("wallet")
        }
        
        // Habilitar botón de compra solo si hay al menos un método disponible
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

        // Procesar pago según el método seleccionado
        when (selectedPaymentMethod) {
            "wallet" -> processWalletPayment()
            "card" -> processCardPayment()
        }
    }
    
    private fun processCardPayment() {
        Log.d("SyncCodeActivity", "processCardPayment - cartTotal: $cartTotal")
        
        val intent = Intent(this, CardPaymentActivity::class.java)
        intent.putExtra(CardPaymentActivity.EXTRA_AMOUNT, cartTotal)
        intent.putExtra("setup_mode", false) // Asegurar que NO es modo configuración
        
        Log.d("SyncCodeActivity", "Launching CardPaymentActivity with amount: $cartTotal, setup_mode: false")
        
        startActivityForResult(intent, CARD_PAYMENT_REQUEST_CODE)
    }
    
    private fun processWalletPayment() {
        val currentBalance = WalletManager.getBalance(this)
        
        if (currentBalance < cartTotal) {
            showError("Saldo insuficiente: \$${String.format("%.2f", currentBalance)} disponible. Necesitas \$${String.format("%.2f", cartTotal)}")
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
                    // Restar el monto del saldo de la wallet
                    WalletManager.deductAmount(this@SyncCodeActivity, cartTotal)
                    
                    // Mostrar feedback de éxito
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
                    // Configuración de tarjeta completada
                    showMessage("¡Tarjeta configurada exitosamente!")
                    loadSavedPaymentMethods() // Recargar métodos de pago
                    setPaymentMethod("card") // Seleccionar tarjeta como método preferido
                } else {
                    // Pago con tarjeta completado
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
                // Pago cancelado o falló
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
        
        // Actualizar disponibilidad de métodos de pago
        updatePaymentMethodAvailability()
        
        // Mostrar métodos de pago si hay items
        if (cartItems.isNotEmpty()) {
            paymentMethodsContainer.visibility = View.VISIBLE
            syncButton.text = syncCodeInput.text.toString()
            confirmPurchaseButton.visibility = if (sessionId != null) View.VISIBLE else View.GONE
        }
    }
    
    private fun showError(message: String) {
        errorText.text = message
        errorContainer.visibility = View.VISIBLE
        
        // Ocultar error después de 5 segundos
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

// Data classes
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

data class CartItem(
    val id: String,
    val nombre: String,
    val precio: Double,
    val quantity: Int
)
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
    private var selectedPaymentMethod = "wallet" // Default to wallet
    
    private val scope = CoroutineScope(Dispatchers.Main + SupervisorJob())
    
    // Request codes
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
        
        // Configuración inicial
        cartRecyclerView.layoutManager = LinearLayoutManager(this)
        
        // Initially disable sync button
        syncButton.isEnabled = false
    }
    
    private fun setupSyncCodeInput() {
        // Limitar a 6 caracteres y solo números/letras
        syncCodeInput.filters = arrayOf(InputFilter.LengthFilter(6))
        
        syncCodeInput.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                hideError()
                val length = s?.length ?: 0
                syncButton.isEnabled = length == 6
                
                // Ocultar teclado cuando alcance 6 caracteres
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
        // Cargar saldo de wallet
        val currentBalance = WalletManager.getBalance(this)
        walletBalanceText.text = "Available: $${String.format("%.2f", currentBalance)}"
        
        // Cargar método preferido
        selectedPaymentMethod = PaymentMethodManager.getPreferredPaymentMethod(this)
        
        // Configurar información de tarjeta guardada
        if (PaymentMethodManager.hasSavedCard(this)) {
            val lastFour = PaymentMethodManager.getSavedCardLastFour(this)
            val cardType = PaymentMethodManager.getSavedCardType(this)
            
            savedCardText.text = "${cardType?.uppercase()} •••• $lastFour"
            savedCardInfo.visibility = View.VISIBLE
            addCardButton.visibility = View.GONE
            
            // Configurar icono de tarjeta
            when (cardType?.lowercase()) {
                "visa" -> cardTypeIcon.setImageResource(R.drawable.ic_visa)
                "mastercard" -> cardTypeIcon.setImageResource(R.drawable.ic_mastercard)
                else -> cardTypeIcon.setImageResource(R.drawable.ic_credit_card)
            }
        } else {
            savedCardInfo.visibility = View.GONE
            addCardButton.visibility = View.VISIBLE
        }
        
        // Seleccionar método preferido usando nuestro nuevo método
        setPaymentMethod(selectedPaymentMethod)
        
        updatePaymentMethodAvailability()
    }
    
    private fun updatePaymentMethodAvailability() {
        val currentBalance = WalletManager.getBalance(this)
        val hasCard = PaymentMethodManager.hasSavedCard(this)
        
        // Habilitar/deshabilitar opciones según disponibilidad
        walletCheckBox.isEnabled = currentBalance >= cartTotal
        cardCheckBox.isEnabled = hasCard
        
        // Si el método seleccionado no está disponible, cambiar al disponible
        if (selectedPaymentMethod == "wallet" && currentBalance < cartTotal && hasCard) {
            setPaymentMethod("card")
        } else if (selectedPaymentMethod == "card" && !hasCard) {
            setPaymentMethod("wallet")
        }
        
        // Mostrar indicadores visuales
        if (currentBalance < cartTotal) {
            walletBalanceText.setTextColor(getColor(android.R.color.holo_red_dark))
            walletBalanceText.text = "Insufficient funds: $${String.format("%.2f", currentBalance)}"
        } else {
            walletBalanceText.setTextColor(getColor(android.R.color.holo_green_dark))
            walletBalanceText.text = "Available: $${String.format("%.2f", currentBalance)}"
        }
    }
    
    private fun setupListeners() {
        syncButton.setOnClickListener {
            handleSyncCart()
        }
        
        confirmPurchaseButton.setOnClickListener {
            handleProcessPayment()
        }
        
        setupPaymentMethodListener()
        
        changeCardButton.setOnClickListener {
            launchCardPaymentForSetup()
        }
        
        addCardButton.setOnClickListener {
            launchCardPaymentForSetup()
        }
    }
    
    private fun setupPaymentMethodListener() {
        // Listener para los CheckBoxes de método de pago
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
        
        // Listeners para los contenedores completos
        walletOptionContainer.setOnClickListener {
            setPaymentMethod("wallet")
        }
        
        cardOptionContainer.setOnClickListener {
            // Solo permitir seleccionar tarjeta si hay una guardada
            if (PaymentMethodManager.hasSavedCard(this)) {
                setPaymentMethod("card")
            } else {
                // Si no hay tarjeta, mostrar opción para agregar una
                launchCardPaymentForSetup()
            }
        }
    }
    
    private fun launchCardPaymentForSetup() {
        // Lanzar CardPaymentActivity para configurar/cambiar tarjeta
        val intent = Intent(this, CardPaymentActivity::class.java)
        intent.putExtra(CardPaymentActivity.EXTRA_AMOUNT, 1.0) // Monto mínimo para setup
        intent.putExtra("setup_mode", true) // Modo configuración
        startActivityForResult(intent, CARD_PAYMENT_REQUEST_CODE)
    }
    
    private fun handleSyncCart() {
        val syncCode = syncCodeInput.text.toString().trim().uppercase()
        
        if (syncCode.isEmpty()) {
            showError("Por favor ingresa un código de sincronización")
            return
        }
        
        if (syncCode.length != 6) {
            showError("El código debe tener exactamente 6 caracteres")
            return
        }
        
        showLoading(true)
        hideError()
        
        scope.launch {
            try {
                val result = withContext(Dispatchers.IO) {
                    syncCartWithBackend(syncCode)
                }
                
                if (result.success) {
                    cartItems.clear()
                    cartItems.addAll(result.items)
                    cartTotal = result.total
                    sessionId = result.sessionId
                    showCartItems()
                    showMessage("¡Sincronización exitosa!")
                } else {
                    showError(result.error ?: "Error al sincronizar carrito")
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

        // Procesar pago según el método seleccionado
        when (selectedPaymentMethod) {
            "wallet" -> processWalletPayment()
            "card" -> processCardPayment()
        }
    }
    
    private fun processCardPayment() {
        Log.d("SyncCodeActivity", "processCardPayment - cartTotal: $cartTotal")
        
        val intent = Intent(this, CardPaymentActivity::class.java)
        intent.putExtra(CardPaymentActivity.EXTRA_AMOUNT, cartTotal)
        intent.putExtra("setup_mode", false) // Asegurar que NO es modo configuración
        
        Log.d("SyncCodeActivity", "Launching CardPaymentActivity with amount: $cartTotal, setup_mode: false")
        
        startActivityForResult(intent, CARD_PAYMENT_REQUEST_CODE)
    }
    
    private fun processWalletPayment() {
        val currentBalance = WalletManager.getBalance(this)
        
        if (currentBalance < cartTotal) {
            showError("Saldo insuficiente: \$${String.format("%.2f", currentBalance)} disponible. Necesitas \$${String.format("%.2f", cartTotal)}")
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
                    // Restar el monto del saldo de la wallet
                    WalletManager.deductAmount(this@SyncCodeActivity, cartTotal)
                    
                    // Mostrar feedback de éxito
                    confirmPurchaseButton.text = "¡Pago exitoso!"
                    showMessage("¡Compra realizada exitosamente con wallet!")
                    
                    val intent = Intent(this@SyncCodeActivity, PaymentSuccessActivity::class.java)
                    intent.putExtra("amount", cartTotal)
                    intent.putExtra("transactionId", result.transactionId)
                    intent.putExtra("paymentMethod", "Saldo de Wallet")
                    startActivity(intent)
                    finish()
                } else {
                    showError(result.error ?: "Error al procesar el pago")
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
    
    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        when (requestCode) {
            CARD_PAYMENT_REQUEST_CODE -> {
                if (resultCode == RESULT_OK) {
                    // Verificar si era modo configuración o pago real
                    val setupMode = data?.getBooleanExtra("setup_mode", false) ?: false
                    
                    if (setupMode) {
                        // Solo era configuración de tarjeta, recargar métodos de pago
                        loadSavedPaymentMethods()
                        showMessage("¡Tarjeta configurada exitosamente!")
                        
                        // Si ahora hay una tarjeta guardada, seleccionarla automáticamente
                        if (PaymentMethodManager.hasSavedCard(this)) {
                            // Establecer tarjeta como método preferido
                            setPaymentMethod("card")
                            Log.d("SyncCodeActivity", "Card saved successfully - switched to card payment method")
                        }
                    } else {
                        // Era un pago real, procesar con el backend
                        scope.launch {
                            try {
                                // Notificar al backend que el pago fue exitoso
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
                    // Pago cancelado o falló
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
        // Asegurar que el contenedor del carrito sea visible
        cartContainer.visibility = View.VISIBLE
        
        val adapter = CartAdapter(cartItems)
        cartRecyclerView.adapter = adapter
        
        totalText.text = String.format("%.2f", cartTotal)
        
        // Actualizar disponibilidad de métodos de pago con el nuevo total
        updatePaymentMethodAvailability()
        
        showMessage("Carrito sincronizado! Revisa tus artículos y confirma la compra.")
    }
    
    private fun showLoading(show: Boolean) {
        progressContainer.visibility = if (show) View.VISIBLE else View.GONE
        syncButton.isEnabled = !show && syncCodeInput.text.length == 6
        confirmPurchaseButton.isEnabled = !show && sessionId != null
    }
    
    private fun showError(message: String) {
        errorText.text = message
        errorContainer.visibility = View.VISIBLE
    }
    
    private fun hideError() {
        errorContainer.visibility = View.GONE
    }
    
    private fun showMessage(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }
    
    private fun setPaymentMethod(method: String) {
        // Guardar el método seleccionado
        selectedPaymentMethod = method
        PaymentMethodManager.setPreferredPaymentMethod(this, method)
        
        // Establecer manualmente el estado de los checkboxes
        when (method) {
            "wallet" -> {
                walletCheckBox.isChecked = true
                cardCheckBox.isChecked = false
                Log.d("SyncCodeActivity", "Payment method set to Wallet")
            }
            "card" -> {
                cardCheckBox.isChecked = true
                walletCheckBox.isChecked = false
                Log.d("SyncCodeActivity", "Payment method set to Card")
            }
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        scope.cancel()
    }
    
    // Data classes
    data class SyncResult(
        val success: Boolean,
        val items: List<CartItem> = emptyList(),
        val total: Double = 0.0,
        val sessionId: String = "",
        val error: String = ""
    )
    
    data class PaymentResult(
        val success: Boolean,
        val transactionId: String = "",
        val error: String = ""
    )
    
    // Adaptador para el RecyclerView
    private class CartAdapter(private val items: List<CartItem>) : 
        RecyclerView.Adapter<CartAdapter.ViewHolder>() {
        
        class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
            val nameText: TextView = view.findViewById(R.id.itemNameText)
            val priceText: TextView = view.findViewById(R.id.itemPriceText)
            val quantityText: TextView = view.findViewById(R.id.itemQuantityText)
            val totalText: TextView = view.findViewById(R.id.itemTotalText)
        }
        
        override fun onCreateViewHolder(parent: android.view.ViewGroup, viewType: Int): ViewHolder {
            val view = android.view.LayoutInflater.from(parent.context)
                .inflate(R.layout.item_cart_sync, parent, false)
            return ViewHolder(view)
        }
        
        override fun onBindViewHolder(holder: ViewHolder, position: Int) {
            val item = items[position]
            holder.nameText.text = item.nombre
            holder.priceText.text = "$${String.format("%.2f", item.precio)}"
            holder.quantityText.text = "x${item.quantity}"
            holder.totalText.text = "$${String.format("%.2f", item.precio * item.quantity)}"
        }
        
        override fun getItemCount() = items.size
    }
    
    @Parcelize
    data class CartItem(
        val id: String,
        val nombre: String,
        val precio: Double,
        val quantity: Int
    ) : Parcelable
}