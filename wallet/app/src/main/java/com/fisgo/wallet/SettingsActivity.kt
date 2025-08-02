package com.fisgo.wallet

import android.app.AlertDialog
import android.content.Intent
import android.os.Bundle
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import com.google.android.material.button.MaterialButton
import com.google.firebase.auth.FirebaseAuth
import java.text.NumberFormat
import java.util.*

class SettingsActivity : AppCompatActivity() {

    private lateinit var auth: FirebaseAuth
    
    private lateinit var backButton: ImageView
    private lateinit var userNameText: TextView
    private lateinit var userEmailText: TextView
    private lateinit var userIdText: TextView
    private lateinit var currentBalanceText: TextView
    
    // Settings options
    private lateinit var notificationsCard: LinearLayout
    private lateinit var securityCard: LinearLayout
    private lateinit var themeCard: LinearLayout
    private lateinit var languageCard: LinearLayout
    private lateinit var aboutCard: LinearLayout
    
    // Action buttons
    private lateinit var logoutButton: MaterialButton
    private lateinit var deleteAccountButton: MaterialButton
    
    private lateinit var notificationStatusText: TextView
    private lateinit var themeStatusText: TextView
    private lateinit var languageStatusText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_settings)
        
        auth = FirebaseAuth.getInstance()
        
        initViews()
        setupClickListeners()
        loadUserData()
        loadSettings()
    }

    private fun initViews() {
        backButton = findViewById(R.id.backButton)
        userNameText = findViewById(R.id.userNameText)
        userEmailText = findViewById(R.id.userEmailText)
        userIdText = findViewById(R.id.userIdText)
        currentBalanceText = findViewById(R.id.currentBalanceText)
        
        // Settings cards
        notificationsCard = findViewById(R.id.notificationsCard)
        securityCard = findViewById(R.id.securityCard)
        themeCard = findViewById(R.id.themeCard)
        languageCard = findViewById(R.id.languageCard)
        aboutCard = findViewById(R.id.aboutCard)
        
        // Action buttons
        logoutButton = findViewById(R.id.logoutButton)
        deleteAccountButton = findViewById(R.id.deleteAccountButton)
        
        // Status texts
        notificationStatusText = findViewById(R.id.notificationStatusText)
        themeStatusText = findViewById(R.id.themeStatusText)
        languageStatusText = findViewById(R.id.languageStatusText)
    }

    private fun setupClickListeners() {
        backButton.setOnClickListener {
            finish()
        }
        
        notificationsCard.setOnClickListener {
            showNotificationSettings()
        }
        
        securityCard.setOnClickListener {
            showSecuritySettings()
        }
        
        themeCard.setOnClickListener {
            showThemeSettings()
        }
        
        languageCard.setOnClickListener {
            showLanguageSettings()
        }
        
        aboutCard.setOnClickListener {
            showAboutDialog()
        }
        
        logoutButton.setOnClickListener {
            showLogoutConfirmation()
        }
        
        deleteAccountButton.setOnClickListener {
            showDeleteAccountConfirmation()
        }
        
        // Click en el ID de usuario para copiarlo
        userIdText.setOnClickListener {
            copyUserIdToClipboard()
        }
    }

    private fun loadUserData() {
        val currentUser = auth.currentUser
        
        if (currentUser != null) {
            // Nombre del usuario
            val displayName = currentUser.displayName
            userNameText.text = if (!displayName.isNullOrEmpty()) {
                displayName
            } else {
                "Usuario Wallet"
            }
            
            // Email del usuario
            userEmailText.text = currentUser.email ?: "Sin email"
            
            // ID del usuario (¡aquí está tu ID!)
            userIdText.text = currentUser.uid
            
            // Saldo actual de la wallet
            val balance = WalletManager.getBalance(this)
            val currencyFormat = NumberFormat.getCurrencyInstance(Locale("es", "MX"))
            val formattedBalance = currencyFormat.format(balance).replace("MX$", "$")
            currentBalanceText.text = formattedBalance
            
        } else {
            // Si no hay usuario autenticado, redirigir al login
            redirectToLogin()
        }
    }

    private fun loadSettings() {
        // Cargar configuraciones guardadas
        val sharedPrefs = getSharedPreferences("wallet_settings", MODE_PRIVATE)
        
        // Estado de notificaciones
        val notificationsEnabled = sharedPrefs.getBoolean("notifications_enabled", true)
        notificationStatusText.text = if (notificationsEnabled) "Activadas" else "Desactivadas"
        
        // Tema actual
        val currentTheme = sharedPrefs.getString("app_theme", "system")
        themeStatusText.text = when (currentTheme) {
            "light" -> "Claro"
            "dark" -> "Oscuro"
            else -> "Sistema"
        }
        
        // Idioma
        languageStatusText.text = "Español"
    }

    private fun showNotificationSettings() {
        val sharedPrefs = getSharedPreferences("wallet_settings", MODE_PRIVATE)
        val currentlyEnabled = sharedPrefs.getBoolean("notifications_enabled", true)
        
        AlertDialog.Builder(this)
            .setTitle("Notificaciones")
            .setMessage("¿Quieres recibir notificaciones de transacciones y actividad de la wallet?")
            .setPositiveButton(if (currentlyEnabled) "Desactivar" else "Activar") { _, _ ->
                val newState = !currentlyEnabled
                sharedPrefs.edit().putBoolean("notifications_enabled", newState).apply()
                notificationStatusText.text = if (newState) "Activadas" else "Desactivadas"
                showMessage("Notificaciones ${if (newState) "activadas" else "desactivadas"}")
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun showSecuritySettings() {
        AlertDialog.Builder(this)
            .setTitle("Seguridad")
            .setMessage("Funcionalidades de seguridad:\n\n• Autenticación biométrica\n• PIN de seguridad\n• Bloqueo automático\n• Histórico de sesiones")
            .setPositiveButton("Configurar") { _, _ ->
                showMessage("Funcionalidad de seguridad próximamente")
            }
            .setNegativeButton("Cerrar", null)
            .show()
    }

    private fun showThemeSettings() {
        val themes = arrayOf("Sistema", "Claro", "Oscuro")
        val sharedPrefs = getSharedPreferences("wallet_settings", MODE_PRIVATE)
        val currentTheme = sharedPrefs.getString("app_theme", "system")
        
        val selectedIndex = when (currentTheme) {
            "light" -> 1
            "dark" -> 2
            else -> 0
        }
        
        AlertDialog.Builder(this)
            .setTitle("Tema de la aplicación")
            .setSingleChoiceItems(themes, selectedIndex) { dialog, which ->
                val newTheme = when (which) {
                    1 -> "light"
                    2 -> "dark"
                    else -> "system"
                }
                
                sharedPrefs.edit().putString("app_theme", newTheme).apply()
                
                // Aplicar tema inmediatamente
                when (newTheme) {
                    "light" -> AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_NO)
                    "dark" -> AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_YES)
                    else -> AppCompatDelegate.setDefaultNightMode(AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM)
                }
                
                loadSettings() // Actualizar el texto del estado
                dialog.dismiss()
                showMessage("Tema actualizado")
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun showLanguageSettings() {
        AlertDialog.Builder(this)
            .setTitle("Idioma")
            .setMessage("El idioma de la aplicación está configurado en Español.\n\nPróximamente estarán disponibles más idiomas.")
            .setPositiveButton("Entendido", null)
            .show()
    }

    private fun showAboutDialog() {
        AlertDialog.Builder(this)
            .setTitle("Acerca de Wallet App")
            .setMessage("""
                Wallet App v1.0
                
                Una aplicación de billetera digital moderna y segura para pagos en punto de venta.
                
                Características:
                • Pagos con QR
                • Sincronización con POS
                • Historial de transacciones
                • Múltiples métodos de pago
                • Seguridad avanzada
                
                Desarrollado con ❤️ 
            """.trimIndent())
            .setPositiveButton("Cerrar", null)
            .show()
    }

    private fun showLogoutConfirmation() {
        AlertDialog.Builder(this)
            .setTitle("Cerrar sesión")
            .setMessage("¿Estás seguro de que quieres cerrar sesión?\n\nTendrás que iniciar sesión nuevamente para usar la aplicación.")
            .setPositiveButton("Cerrar sesión") { _, _ ->
                performLogout()
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun showDeleteAccountConfirmation() {
        AlertDialog.Builder(this)
            .setTitle("⚠️ Eliminar cuenta")
            .setMessage("Esta acción eliminará permanentemente tu cuenta y todos tus datos asociados.\n\n¿Estás completamente seguro?")
            .setPositiveButton("Eliminar cuenta") { _, _ ->
                showFinalDeleteConfirmation()
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun showFinalDeleteConfirmation() {
        AlertDialog.Builder(this)
            .setTitle("⚠️ CONFIRMACIÓN FINAL")
            .setMessage("Esta acción NO se puede deshacer.\n\nSe eliminarán:\n• Tu cuenta de usuario\n• Historial de transacciones\n• Saldo de wallet\n• Todos los datos personales")
            .setPositiveButton("SÍ, ELIMINAR TODO") { _, _ ->
                performAccountDeletion()
            }
            .setNegativeButton("Cancelar", null)
            .show()
    }

    private fun copyUserIdToClipboard() {
        val clipboard = getSystemService(CLIPBOARD_SERVICE) as android.content.ClipboardManager
        val clip = android.content.ClipData.newPlainText("User ID", userIdText.text)
        clipboard.setPrimaryClip(clip)
        showMessage("ID de usuario copiado al portapapeles")
    }

    private fun performLogout() {
        try {
            // Cerrar sesión en Firebase
            auth.signOut()
            
            // Limpiar datos sensibles locales si es necesario
            val sharedPrefs = getSharedPreferences("wallet_settings", MODE_PRIVATE)
            sharedPrefs.edit().remove("user_session_data").apply()
            
            showMessage("Sesión cerrada exitosamente")
            
            // Redirigir inmediatamente al login
            redirectToLogin()
        } catch (e: Exception) {
            showMessage("Error al cerrar sesión: ${e.message}")
        }
    }

    private fun performAccountDeletion() {
        val currentUser = auth.currentUser
        
        if (currentUser != null) {
            currentUser.delete()
                .addOnCompleteListener { task ->
                    if (task.isSuccessful) {
                        // Limpiar datos locales
                        WalletManager.clearAllData(this)
                        PaymentMethodManager.clearAllData(this)
                        
                        // Limpiar configuraciones
                        val sharedPrefs = getSharedPreferences("wallet_settings", MODE_PRIVATE)
                        sharedPrefs.edit().clear().apply()
                        
                        showMessage("Cuenta eliminada exitosamente")
                        redirectToLogin()
                    } else {
                        showMessage("Error al eliminar la cuenta: ${task.exception?.message}")
                    }
                }
        }
    }

    private fun redirectToLogin() {
        // Limpiar el stack de actividades y redirigir al login
        val intent = Intent(this, LoginActivity::class.java)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        startActivity(intent)
        finish()
    }

    private fun showMessage(message: String) {
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }

    override fun onResume() {
        super.onResume()
        loadUserData()
        loadSettings()
    }
}