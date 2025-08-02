package com.fisgo.wallet

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageView
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.*

class TransactionAdapter(
    private var transactions: List<Transaction>,
    private val onItemClick: (Transaction) -> Unit
) : RecyclerView.Adapter<TransactionAdapter.TransactionViewHolder>() {

    // Formateadores para fechas y moneda en formato mexicano
    private val dateFormat = SimpleDateFormat("dd 'de' MMMM, yyyy", Locale("es", "MX"))
    private val timeFormat = SimpleDateFormat("HH:mm", Locale("es", "MX"))
    private val currencyFormat = NumberFormat.getCurrencyInstance(Locale("es", "MX"))

    class TransactionViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val transactionIcon: ImageView = view.findViewById(R.id.transactionIcon)
        val transactionTitle: TextView = view.findViewById(R.id.transactionTitle)
        val transactionDescription: TextView = view.findViewById(R.id.transactionDescription)
        val transactionAmount: TextView = view.findViewById(R.id.transactionAmount)
        val transactionDate: TextView = view.findViewById(R.id.transactionDate)
        val transactionTime: TextView = view.findViewById(R.id.transactionTime)
        val statusIndicator: View = view.findViewById(R.id.statusIndicator)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): TransactionViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_transaction, parent, false)
        return TransactionViewHolder(view)
    }

    override fun onBindViewHolder(holder: TransactionViewHolder, position: Int) {
        val transaction = transactions[position]
        
        // Título de la transacción
        holder.transactionTitle.text = when (transaction.type) {
            "payment" -> transaction.merchantName ?: "Pago"
            "refund" -> "Reembolso"
            "transfer" -> "Transferencia"
            "add_funds" -> "Recarga de saldo"
            else -> "Transacción"
        }
        
        holder.transactionDescription.text = transaction.description
        
        // Formato de monto con moneda mexicana
        val formattedAmount = currencyFormat.format(transaction.amount)
        val amountText = when (transaction.type) {
            "payment" -> "-${formattedAmount.replace("MX$", "$")}"
            "refund", "add_funds" -> "+${formattedAmount.replace("MX$", "$")}"
            else -> formattedAmount.replace("MX$", "$")
        }
        holder.transactionAmount.text = amountText
        
        // Colores para los montos
        val context = holder.itemView.context
        val amountColor = when (transaction.type) {
            "payment" -> context.getColor(android.R.color.holo_red_dark)
            "refund", "add_funds" -> context.getColor(android.R.color.holo_green_dark)
            else -> context.getColor(android.R.color.black)
        }
        holder.transactionAmount.setTextColor(amountColor)
        
        // Iconos según el tipo de transacción
        val iconResource = when (transaction.type) {
            "payment" -> android.R.drawable.ic_menu_send
            "refund" -> android.R.drawable.ic_menu_revert
            "transfer" -> android.R.drawable.ic_menu_sort_by_size
            "add_funds" -> android.R.drawable.ic_input_add
            else -> android.R.drawable.ic_menu_info_details
        }
        holder.transactionIcon.setImageResource(iconResource)
        
        // Formato mejorado de fecha y hora
        try {
            holder.transactionDate.text = dateFormat.format(transaction.createdAt)
            holder.transactionTime.text = timeFormat.format(transaction.createdAt)
        } catch (e: Exception) {
            holder.transactionDate.text = "Fecha no disponible"
            holder.transactionTime.text = ""
        }
        
        // Indicador de estado con colores
        val statusColor = when (transaction.status) {
            "completed" -> context.getColor(android.R.color.holo_green_dark)
            "pending" -> context.getColor(android.R.color.holo_orange_dark)
            "failed" -> context.getColor(android.R.color.holo_red_dark)
            else -> context.getColor(android.R.color.darker_gray)
        }
        holder.statusIndicator.setBackgroundColor(statusColor)
        
        // Click listener
        holder.itemView.setOnClickListener {
            onItemClick(transaction)
        }
    }

    override fun getItemCount() = transactions.size

    fun updateTransactions(newTransactions: List<Transaction>) {
        transactions = newTransactions
        notifyDataSetChanged()
    }
}