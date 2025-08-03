package com.fisgo.wallet

import android.content.Intent
import androidx.appcompat.app.AppCompatActivity
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.activity.result.ActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import com.fisgo.wallet.databinding.ActivityLoginBinding
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInClient
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider
import com.google.firebase.auth.ktx.auth
import com.google.firebase.ktx.Firebase

class LoginActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityLoginBinding
    private lateinit var auth: FirebaseAuth
    private lateinit var googleSignInClient: GoogleSignInClient
    
    private val googleSignInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result: ActivityResult ->
        Log.d(TAG, "=== Google Sign In Result Received ===")
        Log.d(TAG, "Result code: ${result.resultCode}")
        Log.d(TAG, "RESULT_OK = $RESULT_OK")
        Log.d(TAG, "RESULT_CANCELED = $RESULT_CANCELED")
        Log.d(TAG, "Intent data: ${result.data}")
        
        binding.progressBar.visibility = View.GONE
        
        when (result.resultCode) {
            RESULT_OK -> {
                Log.d(TAG, "Resultado OK - procesando datos...")
                val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
                try {
                    val account = task.getResult(ApiException::class.java)!!
                    Log.d(TAG, "Google sign in success: ${account.email}")
                    Log.d(TAG, "Account ID: ${account.id}")
                    Log.d(TAG, "Display Name: ${account.displayName}")
                    Log.d(TAG, "ID Token available: ${account.idToken != null}")
                    Log.d(TAG, "ID Token length: ${account.idToken?.length ?: 0}")
                    
                    if (account.idToken != null) {
                        firebaseAuthWithGoogle(account.idToken!!)
                    } else {
                        Log.e(TAG, "ID Token is null - posible problema de configuración")
                        Toast.makeText(this, "Error: Token de autenticación nulo. Verifique la configuración de Firebase.", 
                            Toast.LENGTH_LONG).show()
                    }
                } catch (e: ApiException) {
                    Log.w(TAG, "Google sign in failed with status code: ${e.statusCode}", e)
                    Log.w(TAG, "Error details: ${e.localizedMessage}")
                    val errorMsg = when (e.statusCode) {
                        12501 -> "Operación cancelada por el usuario"
                        12502 -> "Error de red - verifique su conexión"
                        12500 -> "Error interno de Google Services"
                        7 -> "Error de red - sin conexión"
                        10 -> "Error de desarrollo - configuración incorrecta"
                        else -> "Error ${e.statusCode}: ${e.localizedMessage}"
                    }
                    Toast.makeText(this, errorMsg, Toast.LENGTH_LONG).show()
                }
            }
            RESULT_CANCELED -> {
                Log.w(TAG, "Google sign in cancelled by user - código -1")
                Toast.makeText(this, "Inicio de sesión cancelado por el usuario", Toast.LENGTH_SHORT).show()
            }
            else -> {
                Log.w(TAG, "Google sign in failed with unexpected result code: ${result.resultCode}")
                Toast.makeText(this, "Error inesperado (código: ${result.resultCode})", Toast.LENGTH_SHORT).show()
            }
        }
    }
    
    companion object {
        private const val TAG = "LoginActivity"
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        Log.d(TAG, "=== LoginActivity onCreate ===")
        
        // Inicializar Firebase Auth
        auth = Firebase.auth
        Log.d(TAG, "Firebase Auth inicializado")
        
        // Verificar Google Play Services
        try {
            val gmsAvailable = com.google.android.gms.common.GoogleApiAvailability.getInstance()
            val resultCode = gmsAvailable.isGooglePlayServicesAvailable(this)
            Log.d(TAG, "Google Play Services check result: $resultCode")
            Log.d(TAG, "SUCCESS = ${com.google.android.gms.common.ConnectionResult.SUCCESS}")
            
            if (resultCode == com.google.android.gms.common.ConnectionResult.SUCCESS) {
                Log.d(TAG, "✅ Google Play Services disponible y actualizado")
            } else {
                Log.w(TAG, "❌ Google Play Services no disponible o desactualizado")
                if (gmsAvailable.isUserResolvableError(resultCode)) {
                    Log.w(TAG, "Error resolvible por el usuario")
                    gmsAvailable.getErrorDialog(this, resultCode, 9000)?.show()
                } else {
                    Log.e(TAG, "Error no resolvible en Google Play Services")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error verificando Google Play Services", e)
        }
        
        // Configurar Google Sign In con fallback
        val clientId = getString(R.string.default_web_client_id)
        Log.d(TAG, "Configurando Google Sign In con client ID: $clientId")
        
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(clientId)
            .requestEmail()
            .requestProfile()
            .build()
            
        googleSignInClient = GoogleSignIn.getClient(this, gso)
        
        // Verificar si tenemos configuración válida
        val account = GoogleSignIn.getLastSignedInAccount(this)
        Log.d(TAG, "Última cuenta autenticada: ${account?.email ?: "ninguna"}")
        
        Log.d(TAG, "Google Sign In configurado correctamente")
        
        // Configurar listener del botón de login
        binding.loginButton.setOnClickListener {
            loginUser()
        }
        
        // Configurar listener del botón de login con Google
        binding.googleSignInButton.setOnClickListener {
            Log.d(TAG, "Botón Google Sign In presionado")
            signInWithGoogle()
        }
        
        // Configurar listener para registro (funcionalidad futura)

    }
    
    private fun goToMainScreen() {
        // Ir directamente a la pantalla principal de la wallet
        val intent = Intent(this, MainActivity::class.java)
        intent.putExtra("EMAIL", auth.currentUser?.email)
        startActivity(intent)
        finish() // Cerrar esta actividad para que el usuario no pueda volver atrás
    }
    
    private fun loginUser() {
        val email = binding.emailEditText.text.toString().trim()
        val password = binding.passwordEditText.text.toString().trim()
        
        // Validar campos
        if (email.isEmpty()) {
            binding.emailEditText.error = "Ingrese su correo electrónico"
            binding.emailEditText.requestFocus()
            return
        }
        
        if (password.isEmpty()) {
            binding.passwordEditText.error = "Ingrese su contraseña"
            binding.passwordEditText.requestFocus()
            return
        }
        
        // Mostrar barra de progreso
        binding.progressBar.visibility = View.VISIBLE
        
        // Autenticar con Firebase
        auth.signInWithEmailAndPassword(email, password)
            .addOnCompleteListener(this) { task ->
                binding.progressBar.visibility = View.GONE
                
                if (task.isSuccessful) {
                    // Ir directamente a la pantalla principal
                    goToMainScreen()
                } else {
                    // Error en el login
                    Toast.makeText(this, "Error de autenticación: ${task.exception?.message}", 
                        Toast.LENGTH_SHORT).show()
                }
            }
    }
    
    private fun signInWithGoogle() {
        Log.d(TAG, "=== Iniciando Google Sign In ===")
        binding.progressBar.visibility = View.VISIBLE
        
        try {
            // Verificar configuración de Google Sign In
            val account = GoogleSignIn.getLastSignedInAccount(this)
            Log.d(TAG, "Cuenta previa: ${account?.email ?: "ninguna"}")
            
            // Limpiar cualquier sesión anterior
            googleSignInClient.signOut().addOnCompleteListener { signOutTask ->
                Log.d(TAG, "Sign out completado: ${signOutTask.isSuccessful}")
                
                try {
                    val signInIntent = googleSignInClient.signInIntent
                    Log.d(TAG, "Intent de Google Sign In creado, iniciando actividad...")
                    googleSignInLauncher.launch(signInIntent)
                } catch (e: Exception) {
                    Log.e(TAG, "Error al crear intent de Google Sign In", e)
                    binding.progressBar.visibility = View.GONE
                    Toast.makeText(this, "Error al inicializar Google Sign In: ${e.message}", 
                        Toast.LENGTH_LONG).show()
                }
            }.addOnFailureListener { e ->
                Log.e(TAG, "Error en sign out", e)
                // Intentar de todas formas
                try {
                    val signInIntent = googleSignInClient.signInIntent
                    googleSignInLauncher.launch(signInIntent)
                } catch (ex: Exception) {
                    Log.e(TAG, "Error crítico en Google Sign In", ex)
                    binding.progressBar.visibility = View.GONE
                    Toast.makeText(this, "Error crítico: ${ex.message}", Toast.LENGTH_LONG).show()
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error general en signInWithGoogle", e)
            binding.progressBar.visibility = View.GONE
            Toast.makeText(this, "Error inesperado: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }
    
    private fun firebaseAuthWithGoogle(idToken: String) {
        Log.d(TAG, "Autenticando con Firebase usando token de Google")
        val credential = GoogleAuthProvider.getCredential(idToken, null)
        auth.signInWithCredential(credential)
            .addOnCompleteListener(this) { task ->
                binding.progressBar.visibility = View.GONE
                if (task.isSuccessful) {
                    // Inicio de sesión exitoso
                    Log.d(TAG, "signInWithCredential:success")
                    val user = auth.currentUser
                    Log.d(TAG, "Usuario autenticado: ${user?.email}")
                    Toast.makeText(this, "Bienvenido ${user?.displayName ?: user?.email}", 
                        Toast.LENGTH_SHORT).show()
                    goToMainScreen()
                } else {
                    // Si falla el inicio de sesión, mostrar un mensaje al usuario
                    Log.w(TAG, "signInWithCredential:failure", task.exception)
                    Toast.makeText(this, "Error de autenticación con Firebase: ${task.exception?.message}", 
                        Toast.LENGTH_LONG).show()
                }
            }
    }
    
    override fun onStart() {
        super.onStart()
        // Verificar si el usuario ya está autenticado
        val currentUser = auth.currentUser
        if (currentUser != null) {
            // Si ya hay un usuario autenticado, ir directamente a la pantalla principal
            goToMainScreen()
        }
    }
}