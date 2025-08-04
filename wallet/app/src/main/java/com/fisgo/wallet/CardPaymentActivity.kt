package com.fisgo.wallet

import android.os.Bundle
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
import com.stripe.android.view.CardInputWidget
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
    private var cardInputWidget: CardInputWidget? = null
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
            binding.paymentAmountTextView.visibility = android.view.View.GONE
            binding.payButton.text = "Agregar Tarjeta"
            binding.payButton.isEnabled = false
            
            // Cambiar título si es necesario
            title = "Agregar Tarjeta"
        } else {
            // En modo pago: mostrar monto y configurar para pago
            val formatter = NumberFormat.getCurrencyInstance(Locale("es", "MX"))
            val formattedAmount = formatter.format(paymentAmount)
            
            binding.paymentAmountTextView.text = formattedAmount
            binding.paymentAmountTextView.visibility = android.view.View.VISIBLE
            binding.payButton.text = "🔒 Pagar $formattedAmount"
            binding.payButton.isEnabled = false
            
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
        
        // En modo setup, siempre mostrar el input de tarjeta nueva
        // En modo pago, verificar si hay tarjeta guardada
        if (!isSetupMode && PaymentMethodManager.hasSavedCard(this)) {
            val cardType = PaymentMethodManager.getSavedCardType(this)
            val lastFour = PaymentMethodManager.getSavedCardLastFour(this)
            
            // Mostrar información de la tarjeta guardada en lugar del input
            showSavedCardInfo(cardType, lastFour)
            return // No crear CardInputWidget si hay tarjeta guardada y no estamos en modo setup
        }
        
        // Crear CardInputWidget para nueva tarjeta
        cardInputWidget = CardInputWidget(this)
        
        // Configurar padding y background para mejor visibilidad
        cardInputWidget?.setPadding(16, 16, 16, 16)
        cardInputWidget?.setBackgroundColor(android.graphics.Color.WHITE)
        
        // Configurar parámetros de layout
        val layoutParams = android.widget.FrameLayout.LayoutParams(
            android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
            android.widget.FrameLayout.LayoutParams.WRAP_CONTENT
        )
        cardInputWidget?.layoutParams = layoutParams
        
        binding.cardInputContainer.addView(cardInputWidget!!)
        
        // Configurar listener para validación
        cardInputWidget?.setCardValidCallback { isValid, _ ->
            // En modo setup: solo requerir que la tarjeta sea válida
            // En modo pago: requerir tarjeta válida Y clientSecret
            val hasValidPayment = if (isSetupMode) {
                isValid
            } else {
                isValid && clientSecret != null
            }
            
            binding.payButton.isEnabled = hasValidPayment
            
            // Actualizar logos de tarjetas basado en el tipo detectado
            val cardBrand = cardInputWidget?.brand
            cardBrand?.let { updateCardLogos(it.code) }
            
            // Log para debugging
            Log.d(TAG, "Card validation - Valid: $isValid, SetupMode: $isSetupMode, Button enabled: $hasValidPayment")
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
            // Verificar si ya se mostró la información para evitar duplicados
            if (binding.cardInputContainer.childCount > 1) {
                return // Ya se agregaron elementos adicionales, no duplicar
            }
            
            // Mostrar información de la tarjeta guardada en la UI
            Log.d(TAG, "Tarjeta guardada encontrada: $cardType **** $lastFour")
            
            // Actualizar logos para mostrar el tipo de tarjeta guardada
            when (cardType.lowercase()) {
                "visa" -> {
                    binding.visaLogoImageView.alpha = 1.0f
                    binding.mastercardLogoImageView.alpha = 0.4f
                    binding.amexLogoImageView.alpha = 0.4f
                }
                "mastercard" -> {
                    binding.visaLogoImageView.alpha = 0.4f
                    binding.mastercardLogoImageView.alpha = 1.0f
                    binding.amexLogoImageView.alpha = 0.4f
                }
                "american express", "amex" -> {
                    binding.visaLogoImageView.alpha = 0.4f
                    binding.mastercardLogoImageView.alpha = 0.4f
                    binding.amexLogoImageView.alpha = 1.0f
                }
            }
            
            // Mostrar mensaje indicando que hay una tarjeta guardada
            showSavedCardMessage(cardType, lastFour)
        }
    }
    
    private fun showSavedCardMessage(cardType: String, lastFour: String) {
        // Verificar si ya existe el mensaje para evitar duplicados - verificación más robusta
        for (i in 0 until binding.cardInputContainer.childCount) {
            val child = binding.cardInputContainer.getChildAt(i)
            if (child.tag == "saved_card_message" || child.tag == "instruction_message") {
                Log.d(TAG, "Mensaje de tarjeta guardada ya existe, no duplicar")
                return // Ya existe el mensaje, no agregar otro
            }
        }
        
        Log.d(TAG, "Agregando mensaje de tarjeta guardada por primera vez")
        
        // Crear un TextView para mostrar información de la tarjeta guardada
        val savedCardText = android.widget.TextView(this)
        savedCardText.tag = "saved_card_message" // Tag para identificarlo
        savedCardText.text = "💳 Tarjeta guardada: $cardType •••• $lastFour"
        savedCardText.textSize = 14f
        savedCardText.setTextColor(android.graphics.Color.parseColor("#007AFF"))
        savedCardText.setPadding(16, 8, 16, 8)
        savedCardText.background = android.graphics.drawable.GradientDrawable().apply {
            setColor(android.graphics.Color.parseColor("#F0F8FF"))
            cornerRadius = 8f
        }
        
        // Crear layoutParams con márgenes
        val layoutParams = android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        )
        layoutParams.setMargins(0, 0, 0, 16) // Margen inferior
        savedCardText.layoutParams = layoutParams
        
        // Agregar el mensaje arriba del CardInputWidget
        binding.cardInputContainer.addView(savedCardText, 0)
        
        // También mostrar un mensaje explicativo con botón para cambiar tarjeta
        val instructionText = android.widget.TextView(this)
        instructionText.tag = "instruction_message"
        instructionText.text = "Toca aquí para usar una tarjeta diferente"
        instructionText.textSize = 12f
        instructionText.setTextColor(android.graphics.Color.parseColor("#007AFF"))
        instructionText.setPadding(16, 4, 16, 12)
        instructionText.isClickable = true
        instructionText.isFocusable = true
        
        // Click listener para permitir cambiar tarjeta
        instructionText.setOnClickListener {
            // Limpiar la vista y mostrar el input de tarjeta
            binding.cardInputContainer.removeAllViews()
            
            // Crear nuevo CardInputWidget
            cardInputWidget = CardInputWidget(this@CardPaymentActivity)
            
            // Configurar padding y background para mejor visibilidad
            cardInputWidget?.setPadding(16, 16, 16, 16)
            cardInputWidget?.setBackgroundColor(android.graphics.Color.WHITE)
            
            // Configurar parámetros de layout
            val layoutParams = android.widget.FrameLayout.LayoutParams(
                android.widget.FrameLayout.LayoutParams.MATCH_PARENT,
                android.widget.FrameLayout.LayoutParams.WRAP_CONTENT
            )
            cardInputWidget?.layoutParams = layoutParams
            
            binding.cardInputContainer.addView(cardInputWidget)
            
            // Configurar listener
            cardInputWidget?.setCardValidCallback { isValid, _ ->
                val hasValidPayment = if (isSetupMode) {
                    isValid
                } else {
                    isValid && clientSecret != null
                }
                binding.payButton.isEnabled = hasValidPayment
                
                val cardBrand = cardInputWidget?.brand
                cardBrand?.let { updateCardLogos(it.code) }
                
                Log.d(TAG, "Card validation after switch - Valid: $isValid, Button enabled: ${binding.payButton.isEnabled}")
            }
        }
        
        val instructionLayoutParams = android.widget.LinearLayout.LayoutParams(
            android.widget.LinearLayout.LayoutParams.MATCH_PARENT,
            android.widget.LinearLayout.LayoutParams.WRAP_CONTENT
        )
        instructionLayoutParams.setMargins(0, 0, 0, 16)
        instructionText.layoutParams = instructionLayoutParams
        
        binding.cardInputContainer.addView(instructionText, 1)
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
                    
                    // Habilitar botón si la tarjeta es válida O hay tarjeta guardada
                    val hasValidCard = cardInputWidget?.cardParams != null || PaymentMethodManager.hasSavedCard(this@CardPaymentActivity)
                    binding.payButton.isEnabled = hasValidCard
                    
                    Log.d(TAG, "Payment Intent creado: $paymentIntentId")
                    Log.d(TAG, "Botón habilitado: $hasValidCard (CardWidget: ${cardInputWidget != null}, SavedCard: ${PaymentMethodManager.hasSavedCard(this@CardPaymentActivity)})")
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
                            clientSecret = response.data.getString("client_secret"),
                            paymentIntentId = response.data.getString("id")
                        )
                    )
                } else {
                    PaymentIntentResponse(
                        success = false, 
                        error = response.error ?: "Error creando Payment Intent"
                    )
                }
            } catch (e: Exception) {
                PaymentIntentResponse(
                    success = false, 
                    error = "Error de conexión: ${e.message}"
                )
            }
        }
    }
    
    private fun processPayment() {
        val cardParams = cardInputWidget?.cardParams
        val hasSavedCard = PaymentMethodManager.hasSavedCard(this)
        
        // Permitir pago si hay nueva tarjeta válida O hay tarjeta guardada
        if (cardParams == null && !hasSavedCard) {
            showError("Por favor, ingresa una tarjeta válida")
            return
        }
        
        binding.payButton.isEnabled = false
        
        if (isSetupMode) {
            // Modo configuración: solo guardar información de la tarjeta
            if (cardParams == null) {
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
                    val cardBrand = cardInputWidget?.brand?.displayName ?: "Unknown"
                    // En modo configuración, generamos un lastFour simulado para demo
                    val lastFour = generateMockLastFour()
                    
                    PaymentMethodManager.saveCardInfo(
                        this@CardPaymentActivity,
                        lastFour,
                        cardBrand
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
                    Log.d(TAG, "Procesando pago - CardParams: ${cardParams != null}, SavedCard: $hasSavedCard")
                    
                    // Determinar qué información de tarjeta usar
                    val cardBrand: String
                    val lastFour: String
                    
                    if (cardParams != null) {
                        // Usar nueva tarjeta ingresada
                        cardBrand = cardInputWidget?.brand?.displayName ?: "Unknown"
                        lastFour = generateMockLastFour() // Simulado por seguridad
                        
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
                    if (cardParams != null) {
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