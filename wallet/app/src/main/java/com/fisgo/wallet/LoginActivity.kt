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
    
    // ActivityResultLauncher para manejar el resultado del inicio de sesión con Google
    private val googleSignInLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result: ActivityResult ->
        Log.d(TAG, "Google Sign In result: ${result.resultCode}")
        if (result.resultCode == RESULT_OK) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
            try {
                // El inicio de sesión con Google fue exitoso, autenticar con Firebase
                val account = task.getResult(ApiException::class.java)!!
                Log.d(TAG, "Google sign in success: ${account.email}")
                Log.d(TAG, "firebaseAuthWithGoogle:" + account.id)
                firebaseAuthWithGoogle(account.idToken!!)
            } catch (e: ApiException) {
                // El inicio de sesión con Google falló
                Log.w(TAG, "Google sign in failed", e)
                Toast.makeText(this, "Error en el inicio de sesión con Google: ${e.statusCode} - ${e.message}", 
                    Toast.LENGTH_LONG).show()
                binding.progressBar.visibility = View.GONE
            }
        } else {
            binding.progressBar.visibility = View.GONE
            Log.w(TAG, "Google sign in cancelled or failed: result code ${result.resultCode}")
            Toast.makeText(this, "Inicio de sesión cancelado", Toast.LENGTH_SHORT).show()
        }
    }
    
    companion object {
        private const val TAG = "LoginActivity"
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        // Inicializar Firebase Auth
        auth = Firebase.auth
        
        // Configurar Google Sign In
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(getString(R.string.default_web_client_id))
            .requestEmail()
            .build()
            
        googleSignInClient = GoogleSignIn.getClient(this, gso)
        
        // Configurar listener del botón de login
        binding.loginButton.setOnClickListener {
            loginUser()
        }
        
        // Configurar listener del botón de login con Google
        binding.googleSignInButton.setOnClickListener {
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
        Log.d(TAG, "Iniciando sign in con Google")
        binding.progressBar.visibility = View.VISIBLE
        
        // Cerrar sesión anterior si existe para forzar selección de cuenta
        googleSignInClient.signOut().addOnCompleteListener {
            val signInIntent = googleSignInClient.signInIntent
            googleSignInLauncher.launch(signInIntent)
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