package com.fisgo.wallet

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import androidx.recyclerview.widget.RecyclerView

class CartAdapter(private val cartItems: List<CartItem>) : RecyclerView.Adapter<CartAdapter.ViewHolder>() {
    
    class ViewHolder(view: View) : RecyclerView.ViewHolder(view) {
        val productName: TextView = view.findViewById(R.id.itemNameText)
        val productQuantity: TextView = view.findViewById(R.id.itemQuantityText)
        val productPrice: TextView = view.findViewById(R.id.itemTotalText)
    }
    
    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val view = LayoutInflater.from(parent.context)
            .inflate(R.layout.item_cart_sync, parent, false)
        return ViewHolder(view)
    }
    
    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        val item = cartItems[position]
        holder.productName.text = item.nombre
        holder.productQuantity.text = "x${item.quantity}"
        holder.productPrice.text = "$${String.format("%.2f", item.precio * item.quantity)}"
    }
    
    override fun getItemCount() = cartItems.size
}