package com.fisgo.wallet

import android.os.Bundle
import android.text.TextWatcher
import android.util.Log
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import com.fisgo.wallet.databinding.ActivityCardPaymentBinding
import com.google.gson.Gson
import com.stripe.android.PaymentConfiguration
import com.stripe.android.Stripe
import com.stripe.android.model.ConfirmPaymentIntentParams
import com.stripe.android.model.PaymentMethodCreateParams
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.text.NumberFormat
import java.util.*

class CardPaymentActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityCardPaymentBinding
    private lateinit var stripe: Stripe
    private var paymentAmount: Double = 0.0
    private var clientSecret: String? = null
    private var paymentIntentId: String? = null
    private var isSetupMode: Boolean = false // Nuevo: para distinguir entre configuración y pago
    
    // Cliente HTTP para conectar con tu backend
    private val httpClient = OkHttpClient.Builder().build()
    private val gson = Gson()
    
    // URL de tu backend - cambiar según tu configuración
    private val baseUrl = "https://psychic-bassoon-j65x4rxrvj4c5p54-5000.app.github.dev" // Para emulador

    companion object {
        const val EXTRA_AMOUNT = "extra_amount"
        const val EXTRA_CART_ITEMS = "extra_cart_items"
        private const val TAG = "CardPaymentActivity"
        
        // Stripe Publishable Key - DEBE coincidir con el del POS
        private const val STRIPE_PUBLISHABLE_KEY = "pk_test_51RWijCPEaFxf0UGvEJPvJ1BGfYDGz2BBD00uOn2M4CoFGFIqDgjKXpfPavm6ZLyazfhDDdJlfrmsW62Cs9zmsSsv003fY9V2B7"
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityCardPaymentBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        // Obtener el monto y modo del intent
        paymentAmount = intent.getDoubleExtra(EXTRA_AMOUNT, 0.0)
        isSetupMode = intent.getBooleanExtra("setup_mode", false)
        
        // DEBUGGING: Log detallado de lo que recibe
        Log.d(TAG, "onCreate - Received amount: $paymentAmount")
        Log.d(TAG, "onCreate - Received setup_mode: $isSetupMode")
        Log.d(TAG, "onCreate - Intent extras: ${intent.extras}")
        
        // En modo setup, el monto puede ser 0
        if (!isSetupMode && paymentAmount <= 0) {
            Log.e(TAG, "Invalid payment amount: $paymentAmount")
            showError("Monto inválido para procesar el pago")
            finish()
            return
        }
        
        setupStripe()
        setupUI()
        setupCardInput()
        
        // Solo crear Payment Intent si no es modo configuración
        if (!isSetupMode) {
            createPaymentIntent()
        }
    }
    
    private fun setupStripe() {
        try {
            PaymentConfiguration.init(
                applicationContext,
                STRIPE_PUBLISHABLE_KEY
            )
            stripe = Stripe(applicationContext, STRIPE_PUBLISHABLE_KEY)
            Log.d(TAG, "Stripe inicializado correctamente")
        } catch (e: Exception) {
            Log.e(TAG, "Error inicializando Stripe: ${e.message}")
            showError("Error de configuración: ${e.message}")
        }
    }
    
    private fun setupUI() {
        // Configurar texto del botón según el modo
        if (isSetupMode) {
            // En modo setup: ocultar monto y cambiar texto
            binding.amountSection.visibility = android.view.View.GONE
            binding.payButton.text = "Agregar Tarjeta"
            binding.payButton.isEnabled = false
            
            // Cambiar título y subtítulo
            binding.headerTitleTextView.text = "Agregar Tarjeta"
            binding.headerSubtitleTextView.text = "Agrega tu método de pago"
        } else {
            // En modo pago: mostrar monto y configurar para pago
            val formatter = NumberFormat.getCurrencyInstance(Locale("es", "MX"))
            val formattedAmount = formatter.format(paymentAmount)
            
            binding.paymentAmountTextView.text = formattedAmount
            binding.amountSection.visibility = android.view.View.VISIBLE
            binding.payButton.text = "🔒 Pagar $formattedAmount"
            binding.payButton.isEnabled = false
            
            // Mantener título original
            binding.headerTitleTextView.text = "Pago"
            binding.headerSubtitleTextView.text = "Completa tu pago seguro"
            
            // DEBUGGING: Verificar si hay inconsistencias en el monto
            if (paymentAmount <= 1.0) {
                Log.w(TAG, "WARNING: Received suspiciously low amount ($paymentAmount) in payment mode")
            }
        }
        
        // Configurar botón de pago
        binding.payButton.setOnClickListener {
            processPayment()
        }
        
        // Ocultar error inicial
        binding.errorCard.visibility = android.view.View.GONE
        
        // Log para debugging
        Log.d(TAG, "setupUI - SetupMode: $isSetupMode, Button text: ${binding.payButton.text}")
    }
    
    private fun setupCardInput() {
        // Limpiar mensajes antiguos si existen
        clearDuplicateMessages()
        
        if (isSetupMode) {
            // MODO SETUP: Siempre mostrar campos para nueva tarjeta
            Log.d(TAG, "Modo setup: Mostrando campos para nueva tarjeta")
            setupCardFieldValidation()
        } else {
            // MODO PAGO: Verificar si hay tarjeta guardada
            if (PaymentMethodManager.hasSavedCard(this)) {
                val cardType = PaymentMethodManager.getSavedCardType(this)
                val lastFour = PaymentMethodManager.getSavedCardLastFour(this)
                
                Log.d(TAG, "Modo pago: Usando tarjeta guardada $cardType **** $lastFour")
                // Mostrar información de la tarjeta guardada y habilitar pago
                showSavedCardInfo(cardType, lastFour)
                return
            } else {
                Log.d(TAG, "Modo pago: No hay tarjeta guardada, mostrando campos")
                // No hay tarjeta guardada, mostrar campos para nueva tarjeta
                setupCardFieldValidation()
            }
        }
    }
    
    private fun setupCardFieldValidation() {
        // Formateo automático del número de tarjeta
        binding.cardNumberEditText.addTextChangedListener(object : TextWatcher {
            private var isEditing = false
            
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            
            override fun afterTextChanged(s: android.text.Editable?) {
                if (isEditing) return
                isEditing = true
                
                val formatted = formatCardNumber(s.toString())
                binding.cardNumberEditText.setText(formatted)
                binding.cardNumberEditText.setSelection(formatted.length)
                
                isEditing = false
                validateFields()
            }
        })
        
        // Formateo automático de la fecha
        binding.expiryDateEditText.addTextChangedListener(object : TextWatcher {
            private var isEditing = false
            
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            
            override fun afterTextChanged(s: android.text.Editable?) {
                if (isEditing) return
                isEditing = true
                
                val formatted = formatExpiryDate(s.toString())
                binding.expiryDateEditText.setText(formatted)
                binding.expiryDateEditText.setSelection(formatted.length)
                
                isEditing = false
                validateFields()
            }
        })
        
        // Validación del CVV
        binding.cvvEditText.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: android.text.Editable?) {
                validateFields()
            }
        })
    }
    
    private fun formatCardNumber(input: String): String {
        val digits = input.replace(Regex("[^\\d]"), "")
        val formatted = StringBuilder()
        
        for (i in digits.indices) {
            if (i > 0 && i % 4 == 0) {
                formatted.append(" ")
            }
            formatted.append(digits[i])
        }
        
        return formatted.toString().take(19) // Máximo 16 dígitos + 3 espacios
    }
    
    private fun formatExpiryDate(input: String): String {
        val digits = input.replace(Regex("[^\\d]"), "")
        return when {
            digits.length >= 2 -> "${digits.substring(0, 2)}/${digits.substring(2).take(2)}"
            else -> digits
        }
    }
    
    private fun validateFields() {
        val cardNumber = binding.cardNumberEditText.text.toString().replace(" ", "")
        val expiryDate = binding.expiryDateEditText.text.toString()
        val cvv = binding.cvvEditText.text.toString()
        
        val isCardNumberValid = cardNumber.length >= 13 && cardNumber.length <= 19
        val isExpiryValid = expiryDate.matches(Regex("\\d{2}/\\d{2}"))
        val isCvvValid = cvv.length >= 3 && cvv.length <= 4
        
        val isValid = isCardNumberValid && isExpiryValid && isCvvValid
        
        // En modo setup: solo requerir que los campos sean válidos
        // En modo pago: requerir campos válidos Y clientSecret
        val hasValidPayment = if (isSetupMode) {
            isValid
        } else {
            isValid && clientSecret != null
        }
        
        binding.payButton.isEnabled = hasValidPayment
        
        // Actualizar logos de tarjetas basado en el tipo detectado
        updateCardLogos(detectCardBrand(cardNumber))
        
        // Log para debugging
        Log.d(TAG, "Card validation - Valid: $isValid, SetupMode: $isSetupMode, Button enabled: $hasValidPayment")
    }
    
    private fun detectCardBrand(cardNumber: String): String {
        return when {
            cardNumber.startsWith("4") -> "visa"
            cardNumber.startsWith("5") || cardNumber.startsWith("2") -> "mastercard"
            cardNumber.startsWith("34") || cardNumber.startsWith("37") -> "amex"
            else -> "unknown"
        }
    }
    
    private fun clearDuplicateMessages() {
        val toRemove = mutableListOf<android.view.View>()
        for (i in 0 until binding.cardInputContainer.childCount) {
            val child = binding.cardInputContainer.getChildAt(i)
            if (child.tag == "saved_card_message" || child.tag == "instruction_message") {
                toRemove.add(child)
            }
        }
        toRemove.forEach { binding.cardInputContainer.removeView(it) }
        Log.d(TAG, "Removidos ${toRemove.size} mensajes duplicados")
    }
    
    private fun updateCardLogos(cardBrand: String) {
        // Resetear opacidad de todos los logos
        binding.visaLogoImageView.alpha = 0.4f
        binding.mastercardLogoImageView.alpha = 0.4f
        binding.amexLogoImageView.alpha = 0.4f
        
        // Resaltar el logo de la tarjeta detectada
        when (cardBrand) {
            "visa" -> binding.visaLogoImageView.alpha = 1.0f
            "mastercard" -> binding.mastercardLogoImageView.alpha = 1.0f
            "amex" -> binding.amexLogoImageView.alpha = 1.0f
        }
    }
    
    private fun showSavedCardInfo(cardType: String?, lastFour: String?) {
        if (cardType != null && lastFour != null) {
            Log.d(TAG, "Mostrando tarjeta guardada: $cardType **** $lastFour")
            
            // Ocultar los campos de entrada ya que usaremos la tarjeta guardada
            binding.cardNumberEditText.visibility = android.view.View.GONE
            binding.expiryDateEditText.visibility = android.view.View.GONE
            binding.cvvEditText.visibility = android.view.View.GONE
            
            // Actualizar logos para mostrar el tipo de tarjeta guardada
            updateCardLogos(cardType.lowercase())
            
            // Mostrar mensaje de tarjeta guardada
            showSavedCardMessage(cardType, lastFour)
            
            // En modo pago, habilitar botón si tenemos clientSecret
            if (!isSetupMode && clientSecret != null) {
                binding.payButton.isEnabled = true
                Log.d(TAG, "Botón de pago habilitado con tarjeta guardada")
            }
        }
    }
    
    private fun showSavedCardMessage(cardType: String, lastFour: String) {
        // Verificar si ya existe el mensaje para evitar duplicados
        for (i in 0 until binding.cardInputContainer.childCount) {
            val child = binding.cardInputContainer.getChildAt(i)
            if (child.tag == "saved_card_message") {
                Log.d(TAG, "Mensaje de tarjeta guardada ya existe, no duplicar")
                return
            }
        }
        
        Log.d(TAG, "Agregando mensaje de tarjeta guardada")
        
        // Crear un TextView para mostrar información de la tarjeta guardada
        val savedCardText = android.widget.TextView(this)
        savedCardText.tag = "saved_card_message"
        savedCardText.text = "Usando tarjeta guardada: $cardType •••• $lastFour"
        savedCardText.textSize = 16f
        savedCardText.setTextColor(android.graphics.Color.parseColor("#333333"))
        savedCardText.setPadding(20, 16, 20, 16)
        savedCardText.background = null
        savedCardText.gravity = android.view.Gravity.CENTER
        
        // Crear layoutParams con márgenes
        val layoutParams = android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        )
        layoutParams.setMargins(0, 0, 0, 20)
        savedCardText.layoutParams = layoutParams
        
        // Agregar el mensaje al contenedor
        binding.cardInputContainer.addView(savedCardText)
        
        // Solo en modo setup mostrar opción para cambiar tarjeta
        if (isSetupMode) {
            val instructionText = android.widget.TextView(this)
            instructionText.tag = "instruction_message"
            instructionText.text = "Toca aquí para agregar una tarjeta diferente"
            instructionText.textSize = 12f
            instructionText.setTextColor(android.graphics.Color.parseColor("#007AFF"))
            instructionText.setPadding(16, 4, 16, 12)
            instructionText.isClickable = true
            instructionText.isFocusable = true
            instructionText.gravity = android.view.Gravity.CENTER
            
            instructionText.setOnClickListener {
                // Mostrar campos para nueva tarjeta
                binding.cardNumberEditText.visibility = android.view.View.VISIBLE
                binding.expiryDateEditText.visibility = android.view.View.VISIBLE  
                binding.cvvEditText.visibility = android.view.View.VISIBLE
                // Limpiar mensajes
                clearDuplicateMessages()
                setupCardFieldValidation()
            }
            
            val instructionLayoutParams = android.widget.LinearLayout.LayoutParams(
                android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
                android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
            )
            instructionLayoutParams.setMargins(0, 0, 0, 16)
            instructionText.layoutParams = instructionLayoutParams
            
            binding.cardInputContainer.addView(instructionText)
        }
    }
    
    private fun createPaymentIntent() {
        lifecycleScope.launch {
            try {
                val response = createPaymentIntentRequest()
                if (response.success) {
                    clientSecret = response.data.clientSecret
                    paymentIntentId = response.data.paymentIntentId
                    
                    // Mostrar ID del payment intent (últimos 8 caracteres)
                    paymentIntentId?.let { id ->
                        binding.paymentIdTextView.text = "ID: ${id.takeLast(8)}"
                        binding.paymentIdTextView.visibility = android.view.View.VISIBLE
                    }
                    
                    // Habilitar botón según el contexto
                    if (!isSetupMode) {
                        // En modo pago: habilitar si hay tarjeta guardada O campos válidos
                        if (PaymentMethodManager.hasSavedCard(this@CardPaymentActivity)) {
                            binding.payButton.isEnabled = true
                            Log.d(TAG, "Payment Intent creado - Botón habilitado con tarjeta guardada")
                        } else {
                            // Verificar campos manuales
                            validateFields()
                            Log.d(TAG, "Payment Intent creado - Verificando campos manuales")
                        }
                    }
                    
                    Log.d(TAG, "Payment Intent creado: $paymentIntentId")
                } else {
                    showError("Error preparando el pago: ${response.error}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error creando Payment Intent: ${e.message}")
                showError("Error preparando el pago: ${e.message}")
            }
        }
    }
    
    private suspend fun createPaymentIntentRequest(): PaymentIntentResponse {
        return withContext(Dispatchers.IO) {
            try {
                val response = ApiService.createPaymentIntent(paymentAmount)
                
                if (response.success && response.data != null) {
                    PaymentIntentResponse(
                        success = true,
                        data = PaymentIntentData(
                            clientSecret = response.data.optString("clientSecret", ""),
                            paymentIntentId = response.data.optString("paymentIntentId", "")
                        )
                    )
                } else {
                    PaymentIntentResponse(
                        success = false, 
                        error = response.error ?: "Error creando Payment Intent"
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Exception in createPaymentIntentRequest: ${e.message}")
                PaymentIntentResponse(
                    success = false, 
                    error = "Error de conexión: ${e.message}"
                )
            }
        }
    }
    
    private fun processPayment() {
        // Obtener datos de los campos personalizados
        val cardNumber = binding.cardNumberEditText.text.toString().replace(" ", "")
        val expiryDate = binding.expiryDateEditText.text.toString()
        val cvv = binding.cvvEditText.text.toString()
        val hasSavedCard = PaymentMethodManager.hasSavedCard(this)
        
        // Validar que tengamos datos de tarjeta válidos
        val hasNewCardData = cardNumber.isNotEmpty() && expiryDate.isNotEmpty() && cvv.isNotEmpty()
        
        // Permitir pago si hay nueva tarjeta válida O hay tarjeta guardada
        if (!hasNewCardData && !hasSavedCard) {
            showError("Por favor, ingresa una tarjeta válida")
            return
        }
        
        binding.payButton.isEnabled = false
        
        if (isSetupMode) {
            // Modo configuración: solo guardar información de la tarjeta
            if (!hasNewCardData) {
                showError("Por favor, ingresa una tarjeta para guardar")
                binding.payButton.isEnabled = true
                return
            }
            
            binding.payButton.text = "Agregando tarjeta..."
            
            lifecycleScope.launch {
                try {
                    // Simular un pequeño delay para UX
                    kotlinx.coroutines.delay(1000)
                    
                    // Guardar información de la tarjeta
                    val cardBrand = detectCardBrand(cardNumber)
                    val lastFour = cardNumber.takeLast(4)
                    
                    PaymentMethodManager.saveCardInfo(
                        this@CardPaymentActivity,
                        lastFour,
                        cardBrand.replaceFirstChar { it.uppercase() }
                    )
                    
                    Log.d(TAG, "Tarjeta configurada: $cardBrand **** $lastFour")
                    Toast.makeText(this@CardPaymentActivity, "¡Tarjeta agregada exitosamente!", Toast.LENGTH_LONG).show()
                    
                    // Enviar resultado exitoso con flag de setup mode
                    val resultIntent = android.content.Intent()
                    resultIntent.putExtra("setup_mode", true)
                    setResult(RESULT_OK, resultIntent)
                    finish()
                    
                } catch (e: Exception) {
                    Log.e(TAG, "Error guardando tarjeta: ${e.message}")
                    showError("Error agregando la tarjeta: ${e.message}")
                    
                    binding.payButton.isEnabled = true
                    binding.payButton.text = "Agregar Tarjeta"
                }
            }
        } else {
            // Modo pago real: procesar pago con Stripe
            if (clientSecret == null) {
                showError("Error: Payment Intent no está listo")
                binding.payButton.isEnabled = true
                return
            }
            
            binding.payButton.text = "Procesando pago..."
            
            lifecycleScope.launch {
                try {
                    Log.d(TAG, "Procesando pago - NewCard: $hasNewCardData, SavedCard: $hasSavedCard")
                    
                    // Determinar qué información de tarjeta usar
                    val cardBrand: String
                    val lastFour: String
                    
                    if (hasNewCardData) {
                        // Usar nueva tarjeta ingresada
                        cardBrand = detectCardBrand(cardNumber).replaceFirstChar { it.uppercase() }
                        lastFour = cardNumber.takeLast(4)
                        
                        Log.d(TAG, "Usando nueva tarjeta: $cardBrand")
                    } else {
                        // Usar tarjeta guardada
                        cardBrand = PaymentMethodManager.getSavedCardType(this@CardPaymentActivity) ?: "Unknown"
                        lastFour = PaymentMethodManager.getSavedCardLastFour(this@CardPaymentActivity) ?: "0000"
                        
                        Log.d(TAG, "Usando tarjeta guardada: $cardBrand **** $lastFour")
                    }
                    
                    // Simular proceso de pago
                    kotlinx.coroutines.delay(2000)
                    
                    // Guardar información de la tarjeta si es nueva
                    if (hasNewCardData) {
                        PaymentMethodManager.saveCardInfo(
                            this@CardPaymentActivity,
                            lastFour,
                            cardBrand
                        )
                    }
                    
                    Log.d(TAG, "Pago procesado exitosamente")
                    Toast.makeText(this@CardPaymentActivity, "¡Pago procesado exitosamente!", Toast.LENGTH_LONG).show()
                    
                    // Enviar resultado exitoso sin flag de setup mode (pago real)
                    setResult(RESULT_OK)
                    finish()
                    
                } catch (e: Exception) {
                    Log.e(TAG, "Error procesando pago: ${e.message}")
                    showError("Error procesando el pago: ${e.message}")
                    
                    binding.payButton.isEnabled = true
                    val formatter = NumberFormat.getCurrencyInstance(Locale("es", "MX"))
                    binding.payButton.text = "🔒 Pagar ${formatter.format(paymentAmount)}"
                }
            }
        }
    }
    
    private fun generateMockLastFour(): String {
        // Por seguridad, Stripe no expone el número real de la tarjeta
        // Generamos un mock para demo purposes
        return (1000..9999).random().toString()
    }
    
    private fun showError(message: String) {
        binding.errorTextView.text = "⚠️ $message"
        binding.errorCard.visibility = android.view.View.VISIBLE
        
        // Ocultar error después de 5 segundos
        binding.errorCard.postDelayed({
            binding.errorCard.visibility = android.view.View.GONE
        }, 5000)
    }
    
    // Data classes para la comunicación con el backend
    data class PaymentIntentRequest(
        val amount: Double,
        val currency: String,
        val metadata: Map<String, String>
    )
    
    data class PaymentIntentResponse(
        val success: Boolean,
        val data: PaymentIntentData = PaymentIntentData(),
        val error: String? = null
    )
    
    data class PaymentIntentData(
        val clientSecret: String = "",
        val paymentIntentId: String = "",
        val amount: Int = 0,
        val currency: String = "",
        val status: String = ""
    )
}