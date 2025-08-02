package com.fisgo.wallet

import android.content.Intent
import android.os.Bundle
import android.util.Log
import android.view.View
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.ProgressBar
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.button.MaterialButton
import com.google.firebase.auth.FirebaseAuth
import kotlinx.coroutines.launch
import java.text.NumberFormat
import java.util.*

class TransactionHistoryActivity : AppCompatActivity() {
    
    private lateinit var auth: FirebaseAuth
    private lateinit var transactionService: TransactionService
    private lateinit var transactionAdapter: TransactionAdapter
    
    private lateinit var backButton: ImageView
    private lateinit var filterButton: ImageView
    private lateinit var totalSpentText: TextView
    private lateinit var transactionCountText: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var emptyStateLayout: LinearLayout
    private lateinit var startShoppingButton: MaterialButton
    private lateinit var transactionsRecyclerView: RecyclerView
    
    // Filter chips
    private lateinit var chipAll: TextView
    private lateinit var chipPayments: TextView
    private lateinit var chipRefunds: TextView
    private lateinit var chipAddFunds: TextView
    
    private var allTransactions = listOf<Transaction>()
    private var currentFilter = "all"
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_transaction_history)
        
        // Initialize Firebase Auth
        auth = FirebaseAuth.getInstance()
        transactionService = TransactionService()
        
        initViews()
        setupRecyclerView()
        setupClickListeners()
        loadTransactions()
    }
    
    private fun initViews() {
        backButton = findViewById(R.id.backButton)
        filterButton = findViewById(R.id.filterButton)
        totalSpentText = findViewById(R.id.totalSpentText)
        transactionCountText = findViewById(R.id.transactionCountText)
        progressBar = findViewById(R.id.progressBar)
        emptyStateLayout = findViewById(R.id.emptyStateLayout)
        startShoppingButton = findViewById(R.id.startShoppingButton)
        transactionsRecyclerView = findViewById(R.id.transactionsRecyclerView)
        
        // Filter chips
        chipAll = findViewById(R.id.chipAll)
        chipPayments = findViewById(R.id.chipPayments)
        chipRefunds = findViewById(R.id.chipRefunds)
        chipAddFunds = findViewById(R.id.chipAddFunds)
    }
    
    private fun setupRecyclerView() {
        transactionAdapter = TransactionAdapter(emptyList()) { transaction ->
            openTransactionDetail(transaction)
        }
        
        transactionsRecyclerView.apply {
            layoutManager = LinearLayoutManager(this@TransactionHistoryActivity)
            adapter = transactionAdapter
        }
    }
    
    private fun setupClickListeners() {
        backButton.setOnClickListener {
            finish()
        }
        
        filterButton.setOnClickListener {
            // TODO: Implementar filtros avanzados (por fecha, monto, etc.)
            showFilterOptions()
        }
        
        startShoppingButton.setOnClickListener {
            // Navegar al POS o tienda
            val intent = Intent(this, MainActivity::class.java)
            startActivity(intent)
            finish()
        }
        
        // Filter chips
        chipAll.setOnClickListener { applyFilter("all") }
        chipPayments.setOnClickListener { applyFilter("payment") }
        chipRefunds.setOnClickListener { applyFilter("refund") }
        chipAddFunds.setOnClickListener { applyFilter("add_funds") }
    }
    
    private fun loadTransactions() {
        val currentUser = auth.currentUser
        
        if (currentUser == null) {
            Log.e("TransactionHistory", "No user logged in")
            showEmptyState()
            return
        }
        
        val userId = currentUser.uid
        Log.d("TransactionHistory", "Loading transactions for user: $userId")
        
        showLoading(true)
        
        lifecycleScope.launch {
            try {
                val result = transactionService.getUserTransactions(userId)
                
                result.onSuccess { transactions ->
                    Log.d("TransactionHistory", "Transactions loaded successfully: ${transactions.size}")
                    runOnUiThread {
                        allTransactions = transactions.sortedByDescending { it.createdAt }
                        updateUI()
                        showLoading(false)
                        
                        if (allTransactions.isEmpty()) {
                            showEmptyState()
                        } else {
                            hideEmptyState()
                        }
                    }
                }.onFailure { error ->
                    Log.e("TransactionHistory", "Error loading transactions", error)
                    runOnUiThread {
                        showEmptyState()
                        showLoading(false)
                    }
                }
            } catch (e: Exception) {
                Log.e("TransactionHistory", "Exception loading transactions", e)
                runOnUiThread {
                    showEmptyState()
                    showLoading(false)
                }
            }
        }
    }
    
    private fun applyFilter(filter: String) {
        currentFilter = filter
        updateFilterChips()
        
        val filteredTransactions = when (filter) {
            "all" -> allTransactions
            "payment" -> allTransactions.filter { it.type == "payment" }
            "refund" -> allTransactions.filter { it.type == "refund" }
            "add_funds" -> allTransactions.filter { it.type == "add_funds" }
            else -> allTransactions
        }
        
        Log.d("TransactionHistory", "Applied filter '$filter': ${filteredTransactions.size} of ${allTransactions.size} transactions")
        
        transactionAdapter.updateTransactions(filteredTransactions)
        
        if (filteredTransactions.isEmpty() && allTransactions.isNotEmpty()) {
            // Mostrar mensaje de que no hay transacciones con este filtro
            showEmptyState()
        } else if (filteredTransactions.isEmpty()) {
            showEmptyState()
        } else {
            hideEmptyState()
        }
    }
    
    private fun updateFilterChips() {
        // Reset all chips
        chipAll.setBackgroundResource(R.drawable.chip_unselected_bg)
        chipPayments.setBackgroundResource(R.drawable.chip_unselected_bg)
        chipRefunds.setBackgroundResource(R.drawable.chip_unselected_bg)
        chipAddFunds.setBackgroundResource(R.drawable.chip_unselected_bg)
        
        chipAll.setTextColor(getColor(android.R.color.darker_gray))
        chipPayments.setTextColor(getColor(android.R.color.darker_gray))
        chipRefunds.setTextColor(getColor(android.R.color.darker_gray))
        chipAddFunds.setTextColor(getColor(android.R.color.darker_gray))
        
        // Set selected chip
        val selectedChip = when (currentFilter) {
            "all" -> chipAll
            "payment" -> chipPayments
            "refund" -> chipRefunds
            "add_funds" -> chipAddFunds
            else -> chipAll
        }
        
        selectedChip.setBackgroundResource(R.drawable.chip_selected_bg)
        selectedChip.setTextColor(getColor(android.R.color.white))
    }
    
    private fun updateUI() {
        try {
            val summary = transactionService.getTransactionSummary(allTransactions)
            
            // Formato mejorado para el total gastado con moneda mexicana
            val currencyFormat = NumberFormat.getCurrencyInstance(Locale("es", "MX"))
            val formattedTotal = currencyFormat.format(summary.totalSpent).replace("MX$", "$")
            totalSpentText.text = formattedTotal
            
            // Formato mejorado para el conteo de transacciones
            val transactionCountFormatted = if (summary.transactionCount == 1) {
                "1 transacción"
            } else {
                "${summary.transactionCount} transacciones"
            }
            transactionCountText.text = summary.transactionCount.toString()
            
            Log.d("TransactionHistory", "UI updated - Total: $formattedTotal, Count: ${summary.transactionCount}")
            
            applyFilter(currentFilter)
        } catch (e: Exception) {
            Log.e("TransactionHistory", "Error updating UI", e)
        }
    }
    
    private fun showLoading(show: Boolean) {
        progressBar.visibility = if (show) View.VISIBLE else View.GONE
        transactionsRecyclerView.visibility = if (show) View.GONE else View.VISIBLE
    }
    
    private fun showEmptyState() {
        emptyStateLayout.visibility = View.VISIBLE
        transactionsRecyclerView.visibility = View.GONE
    }
    
    private fun hideEmptyState() {
        emptyStateLayout.visibility = View.GONE
        transactionsRecyclerView.visibility = View.VISIBLE
    }
    
    private fun openTransactionDetail(transaction: Transaction) {
        val intent = Intent(this, TransactionDetailActivity::class.java)
        intent.putExtra("transaction_id", transaction.id)
        startActivity(intent)
    }
    
    private fun showFilterOptions() {
        // TODO: Implementar diálogo con filtros avanzados
        // Por ahora mostrar un mensaje
        Log.d("TransactionHistory", "Filter options not implemented yet")
    }
}