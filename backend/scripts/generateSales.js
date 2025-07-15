const { COLLECTIONS } = require('../config/firebaseManager');
const firestore = require('../utils/firestoreAdmin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const Logger = require('../utils/logger.js');

// Métodos de pago posibles
const metodosDepago = [
  'efectivo',
  'tarjeta',
];

// Nombres de clientes aleatorios (mexicanos)
const nombresClientes = [
  'Cliente General'
];

/**
 * Genera una fecha aleatoria entre enero y junio de 2025
 */
function generarFechaAleatoria() {
  const año = 2025;
  const mesInicio = 0; // Enero (0-indexado)
  const mesFin = 5;    // Junio (0-indexado)
  
  const mes = Math.floor(Math.random() * (mesFin - mesInicio + 1)) + mesInicio;
  const diasEnMes = new Date(año, mes + 1, 0).getDate();
  const dia = Math.floor(Math.random() * diasEnMes) + 1;
  
  // Hora aleatoria entre 8:00 AM y 10:00 PM
  const hora = Math.floor(Math.random() * 14) + 8; // 8-21
  const minutos = Math.floor(Math.random() * 60);
  const segundos = Math.floor(Math.random() * 60);
  
  return new Date(año, mes, dia, hora, minutos, segundos);
}

/**
 * Genera una cantidad aleatoria para un producto
 */
function generarCantidadAleatoria() {
  // 70% de las veces cantidad 1-3, 25% cantidad 4-8, 5% cantidad 9-15
  const random = Math.random();
  if (random < 0.7) {
    return Math.floor(Math.random() * 3) + 1; // 1-3
  } else if (random < 0.95) {
    return Math.floor(Math.random() * 5) + 4; // 4-8
  } else {
    return Math.floor(Math.random() * 7) + 9; // 9-15
  }
}

/**
 * Selecciona productos aleatorios para una venta
 */
function seleccionarProductosAleatorios(productos) {
  // Entre 1 y 8 productos por venta
  const numProductos = Math.floor(Math.random() * 8) + 1;
  const productosSeleccionados = [];
  const productosUsados = new Set();
  
  for (let i = 0; i < numProductos; i++) {
    let productoAleatorio;
    let intentos = 0;
    
    // Evitar productos duplicados en la misma venta
    do {
      productoAleatorio = productos[Math.floor(Math.random() * productos.length)];
      intentos++;
    } while (productosUsados.has(productoAleatorio.id) && intentos < 20);
    
    if (!productosUsados.has(productoAleatorio.id)) {
      productosUsados.add(productoAleatorio.id);
      
      const cantidad = generarCantidadAleatoria();
      const precioUnitario = productoAleatorio.precio;
      const subtotal = cantidad * precioUnitario;
      
      // Generar fecha de caducidad aleatoria si no existe
      let fechaCaducidad = productoAleatorio.fechaCaducidad;
      if (!fechaCaducidad) {
        fechaCaducidad = generarFechaCaducidadAleatoria(productoAleatorio.perecedero, productoAleatorio.categoria);
      }
      
      // Calcular días para caducar desde la fecha actual (23 de junio de 2025)
      const fechaActual = new Date('2025-06-23');
      const diasParaCaducar = Math.ceil((new Date(fechaCaducidad) - fechaActual) / (1000 * 60 * 60 * 24));
      
      productosSeleccionados.push({
        productId: productoAleatorio.id,
        id: productoAleatorio.id,
        nombre: productoAleatorio.nombre,
        precio: precioUnitario,
        cantidad: cantidad,
        subtotal: subtotal,
        categoria: productoAleatorio.categoria,
        marca: productoAleatorio.marca,
        codigo: productoAleatorio.codigo,
        // NUEVOS CAMPOS DE CADUCIDAD
        fechaCaducidad: fechaCaducidad,
        diasParaCaducar: diasParaCaducar,
        perecedero: productoAleatorio.perecedero || false,
        estadoCaducidad: determinarEstadoCaducidad(diasParaCaducar, productoAleatorio.perecedero),
        lote: generarNumeroLote(), // Número de lote aleatorio
        ubicacion: productoAleatorio.ubicacion || 'Estante general'
      });
    }
  }
  
  return productosSeleccionados;
}

/**
 * Genera una fecha de caducidad aleatoria para productos sin fecha
 */
function generarFechaCaducidadAleatoria(perecedero, categoria) {
  const hoy = new Date('2025-06-23');
  let diasAleatorios;
  
  if (!perecedero) {
    // Productos no perecederos: 6 meses a 3 años
    diasAleatorios = Math.floor(Math.random() * (1095 - 180 + 1)) + 180;
  } else {
    // Productos perecederos según categoría
    switch (categoria) {
      case 'Bebidas':
        diasAleatorios = Math.floor(Math.random() * (90 - 30 + 1)) + 30; // 1-3 meses
        break;
      case 'Panadería y Galletas':
        diasAleatorios = Math.floor(Math.random() * (15 - 3 + 1)) + 3; // 3-15 días
        break;
      case 'Abarrotes Básicos':
        diasAleatorios = Math.floor(Math.random() * (60 - 15 + 1)) + 15; // 15-60 días
        break;
      case 'Lácteos':
        diasAleatorios = Math.floor(Math.random() * (14 - 3 + 1)) + 3; // 3-14 días
        break;
      case 'Carnes y Embutidos':
        diasAleatorios = Math.floor(Math.random() * (21 - 5 + 1)) + 5; // 5-21 días
        break;
      case 'Frutas y Verduras':
        diasAleatorios = Math.floor(Math.random() * (10 - 2 + 1)) + 2; // 2-10 días
        break;
      case 'Helados y Congelados':
        diasAleatorios = Math.floor(Math.random() * (180 - 30 + 1)) + 30; // 1-6 meses
        break;
      default:
        diasAleatorios = Math.floor(Math.random() * (30 - 7 + 1)) + 7; // 7-30 días
    }
  }
  
  const fechaCaducidad = new Date(hoy);
  fechaCaducidad.setDate(hoy.getDate() + diasAleatorios);
  return fechaCaducidad;
}

/**
 * Determina el estado de caducidad de un producto
 */
function determinarEstadoCaducidad(diasParaCaducar, perecedero) {
  if (!perecedero) {
    return 'no_perecedero';
  }
  
  if (diasParaCaducar < 0) {
    return 'vencido';
  } else if (diasParaCaducar <= 3) {
    return 'critico'; // Vence en 3 días o menos
  } else if (diasParaCaducar <= 7) {
    return 'proximo'; // Vence en una semana
  } else if (diasParaCaducar <= 30) {
    return 'normal'; // Vence en un mes
  } else {
    return 'lejano'; // Vence en más de un mes
  }
}

/**
 * Genera un número de lote aleatorio
 */
function generarNumeroLote() {
  const letras = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numeros = '0123456789';
  
  let lote = '';
  // 2 letras + 4 números (ej: AB1234)
  for (let i = 0; i < 2; i++) {
    lote += letras[Math.floor(Math.random() * letras.length)];
  }
  for (let i = 0; i < 4; i++) {
    lote += numeros[Math.floor(Math.random() * numeros.length)];
  }
  
  return lote;
}

/**
 * Calcula el cambio para pagos en efectivo
 */
function calcularCambio(total, metodoPago) {
  if (metodoPago !== 'efectivo') {
    return { amountReceived: total, change: 0 };
  }
  
  // Para efectivo, simular que a veces pagan con billetes grandes
  const random = Math.random();
  let amountReceived;
  
  if (random < 0.3) {
    // 30% paga exacto
    amountReceived = total;
  } else if (random < 0.7) {
    // 40% paga con el siguiente múltiplo de 50
    amountReceived = Math.ceil(total / 50) * 50;
  } else {
    // 30% paga con billetes grandes (100, 200, 500)
    const billetesGrandes = [100, 200, 500];
    const billeteMinimo = billetesGrandes.find(b => b >= total) || 500;
    amountReceived = billeteMinimo;
  }
  
  const change = amountReceived - total;
  return { amountReceived, change };
}

/**
 * Genera una venta aleatoria
 */
function generarVentaAleatoria(productos) {
  const items = seleccionarProductosAleatorios(productos);
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const metodoPago = metodosDepago[Math.floor(Math.random() * metodosDepago.length)];
  const clientName = nombresClientes[Math.floor(Math.random() * nombresClientes.length)];
  const fecha = generarFechaAleatoria();
  const { amountReceived, change } = calcularCambio(total, metodoPago);
  
  return {
    items,
    total: parseFloat(total.toFixed(2)),
    paymentMethod: metodoPago,
    amountReceived: parseFloat(amountReceived.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    clientName,
    timestamp: fecha,
    createdAt: fecha,
    updatedAt: fecha
  };
}

/**
 * Función principal para generar ventas aleatorias
 */
async function generateSales() {
  try {
    Logger.info('Iniciando generación de 5000 ventas aleatorias...');
    
    // Obtener productos existentes
    Logger.info('Obteniendo productos desde Firebase...');
    const productosSnapshot = await firestore.collection(COLLECTIONS.PRODUCTS).get();
    
    if (productosSnapshot.empty) {
      throw new Error('No hay productos en la base de datos. Ejecuta primero initializeProducts.js');
    }
    
    const productos = [];
    productosSnapshot.forEach(doc => {
      productos.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    Logger.info(`Se encontraron ${productos.length} productos disponibles`);
    
    // Limpiar ventas existentes (opcional)
    Logger.info('🧹 Limpiando ventas existentes...');
    const existingSales = await firestore.collection(COLLECTIONS.SALES).get();
    if (!existingSales.empty) {
      Logger.info(`⚠️ Se encontraron ${existingSales.size} ventas existentes. Se agregarán las nuevas ventas.`);
    }
    
    // Generar y agregar ventas
    Logger.info('💰 Generando 1000 ventas aleatorias...');
    const batchSize = 50; // Procesar en lotes para evitar sobrecarga
    const totalVentas = 5000;
    let ventasCreadas = 0;
    let montoTotalVentas = 0;
    const estadisticasPorMes = {};
    const estadisticasPorMetodo = {};
    const productosVendidos = {};
    
    for (let lote = 0; lote < Math.ceil(totalVentas / batchSize); lote++) {
      const ventasLote = [];
      const ventasEnEsteLote = Math.min(batchSize, totalVentas - ventasCreadas);
      
      Logger.info(`Procesando lote ${lote + 1}: ${ventasEnEsteLote} ventas...`);
      
      for (let i = 0; i < ventasEnEsteLote; i++) {
        const venta = generarVentaAleatoria(productos);
        ventasLote.push(venta);
        
        // Estadísticas
        montoTotalVentas += venta.total;
        
        const mes = venta.timestamp.getMonth() + 1;
        const nombreMes = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio'][mes - 1];
        
        if (!estadisticasPorMes[nombreMes]) {
          estadisticasPorMes[nombreMes] = { ventas: 0, monto: 0 };
        }
        estadisticasPorMes[nombreMes].ventas++;
        estadisticasPorMes[nombreMes].monto += venta.total;
        
        if (!estadisticasPorMetodo[venta.paymentMethod]) {
          estadisticasPorMetodo[venta.paymentMethod] = { ventas: 0, monto: 0 };
        }
        estadisticasPorMetodo[venta.paymentMethod].ventas++;
        estadisticasPorMetodo[venta.paymentMethod].monto += venta.total;
        
        // Contar productos vendidos
        venta.items.forEach(item => {
          if (!productosVendidos[item.nombre]) {
            productosVendidos[item.nombre] = { cantidad: 0, monto: 0 };
          }
          productosVendidos[item.nombre].cantidad += item.cantidad;
          productosVendidos[item.nombre].monto += item.subtotal;
        });
      }
      
      // Guardar lote en Firebase
      const promesasVentas = ventasLote.map(async (venta, index) => {
        try {
          const docRef = await firestore.collection(COLLECTIONS.SALES).add(venta);
          return { id: docRef.id, ...venta };
        } catch (error) {
          Logger.error(`Error creando venta ${ventasCreadas + index + 1}:`, error);
          throw error;
        }
      });
      
      const ventasGuardadas = await Promise.all(promesasVentas);
      ventasCreadas += ventasGuardadas.length;
      
      Logger.info(`Lote ${lote + 1} completado: ${ventasGuardadas.length} ventas guardadas`);
    }
    
    // Resumen de productos más vendidos
    const topProductos = Object.entries(productosVendidos)
      .sort((a, b) => b[1].cantidad - a[1].cantidad)
      .slice(0, 10);
    
    Logger.info('\n📊 RESUMEN DE VENTAS GENERADAS:');
    Logger.info(`💰 Total de ventas: ${ventasCreadas}`);
    Logger.info(`💵 Monto total: $${montoTotalVentas.toFixed(2)}`);
    Logger.info(`📈 Ticket promedio: $${(montoTotalVentas / ventasCreadas).toFixed(2)}`);
    
    Logger.info('\n📅 VENTAS POR MES:');
    Object.entries(estadisticasPorMes).forEach(([mes, stats]) => {
      Logger.info(`  ${mes}: ${stats.ventas} ventas - $${stats.monto.toFixed(2)}`);
    });
    
    Logger.info('\n💳 VENTAS POR MÉTODO DE PAGO:');
    Object.entries(estadisticasPorMetodo).forEach(([metodo, stats]) => {
      const porcentaje = ((stats.ventas / ventasCreadas) * 100).toFixed(1);
      Logger.info(`  ${metodo}: ${stats.ventas} ventas (${porcentaje}%) - $${stats.monto.toFixed(2)}`);
    });
    
    Logger.info('\n🏆 TOP 10 PRODUCTOS MÁS VENDIDOS:');
    topProductos.forEach(([nombre, stats], index) => {
      Logger.info(`  ${index + 1}. ${nombre}: ${stats.cantidad} unidades - $${stats.monto.toFixed(2)}`);
    });
    
    Logger.info(`\n🎉 ¡Generación de ventas completada exitosamente!`);
    Logger.info(`📊 Se generaron ${ventasCreadas} ventas desde enero hasta junio de 2025`);
    
    return {
      success: true,
      ventasGeneradas: ventasCreadas,
      montoTotal: montoTotalVentas,
      estadisticasPorMes,
      estadisticasPorMetodo,
      topProductos
    };
    
  } catch (error) {
    Logger.error('Error durante la generación de ventas:', error);
    throw error;
  }
}

// Ejecutar el script solo si se llama directamente
if (require.main === module) {
  generateSales()
    .then(result => {
      Logger.info('\nScript completado exitosamente:', {
        ventasGeneradas: result.ventasGeneradas,
        montoTotal: `$${result.montoTotal.toFixed(2)}`
      });
      process.exit(0);
    })
    .catch(error => {
      Logger.error('\nError en el script:', error);
      process.exit(1);
    });
}

module.exports = { generateSales };