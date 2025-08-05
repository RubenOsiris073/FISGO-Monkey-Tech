const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const Logger = require('../utils/logger.js');

// Usar firebase-admin y configuración centralizada
const { firebaseManager, COLLECTIONS } = require('../config/firebaseManager');
const firestore = require('../utils/firestoreAdmin');


// Función para borrar todos los productos
async function deleteAllProducts() {
  try {
    Logger.info('Eliminando todos los productos existentes...');
    const productsRef = firestore.collection(COLLECTIONS.PRODUCTS);
    const snapshot = await productsRef.get();
    
    if (snapshot.empty) {
      Logger.info('No se encontraron productos para eliminar');
      return;
    }

    const batch = firestore.batch();
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    Logger.info(`Se eliminaron ${snapshot.docs.length} productos exitosamente`);
  } catch (error) {
    Logger.error('Error al eliminar productos:', error && error.stack ? error.stack : error);
    throw error;
  }
}

// Productos de supermercado común
const productos = [
  // BEBIDAS
  {
    nombre: "Coca-Cola",
    descripcion: "355 ml, Refresco de cola",
    marca: "Coca-Cola",
    categoria: "Bebidas",
    subcategoria: "Refrescos",
    precio: 18.00,
    codigo: "COC001",
    unidadMedida: "pieza",
    volumen: "355 ml",
    stockMinimo: 20,
    ubicacion: "Refrigerador",
    perecedero: false,
    notas: "Mantener refrigerado",
    imageUrl: "/images/products/coca cola.png"
  },
  {
    nombre: "Pepsi",
    descripcion: "355 ml, Refresco de cola",
    marca: "Pepsi",
    categoria: "Bebidas",
    subcategoria: "Refrescos",
    precio: 17.00,
    codigo: "PEP001",
    unidadMedida: "pieza",
    volumen: "355 ml",
    stockMinimo: 20,
    ubicacion: "Refrigerador",
    perecedero: false,
    notas: "Mantener refrigerado",
    imageUrl: "/images/products/pepsi.png"
  },
  {
    nombre: "Sprite",
    descripcion: "355 ml, Refresco de lima-limón",
    marca: "Coca-Cola",
    categoria: "Bebidas",
    subcategoria: "Refrescos",
    precio: 17.00,
    codigo: "SPR001",
    unidadMedida: "pieza",
    volumen: "355 ml",
    stockMinimo: 20,
    ubicacion: "Refrigerador",
    perecedero: false,
    notas: "Mantener refrigerado",
    imageUrl: "/images/products/sprite.png"
  },
  {
    nombre: "Fanta Naranja",
    descripcion: "355 ml, Refresco de naranja",
    marca: "Coca-Cola",
    categoria: "Bebidas",
    subcategoria: "Refrescos",
    precio: 17.00,
    codigo: "FAN001",
    unidadMedida: "pieza",
    volumen: "355 ml",
    stockMinimo: 20,
    ubicacion: "Refrigerador",
    perecedero: false,
    notas: "Mantener refrigerado",
    imageUrl: "/images/products/fanta.png"
  },
  {
    nombre: "Sabritas Flaming-Hot",
    descripcion: "45 g, Papas fritas con sal y chile",
    marca: "Sabritas",
    categoria: "Snacks",
    subcategoria: "Papas fritas",
    precio: 15.00,
    codigo: "SAB001",
    unidadMedida: "pieza",
    peso: "45 g",
    stockMinimo: 30,
    ubicacion: "Estante snacks",
    perecedero: false,
    notas: "Producto popular",
    imageUrl: "/images/products/sabritas_flaming-hot.png"
  },
  {
    nombre: "Doritos Nacho",
    descripcion: "62 g, Totopos con queso nacho",
    marca: "Sabritas",
    categoria: "Snacks",
    subcategoria: "Totopos",
    precio: 18.00,
    codigo: "DOR001",
    unidadMedida: "pieza",
    peso: "62 g",
    stockMinimo: 25,
    ubicacion: "Estante snacks",
    perecedero: false,
    notas: "Sabor popular",
    imageUrl: "/images/products/doritos_nacho.png"
  },
  {
    nombre: "Cheetos Poffs",
    descripcion: "35 g, Fritura de maíz con queso",
    marca: "Sabritas",
    categoria: "Snacks",
    subcategoria: "Frituras",
    precio: 12.00,
    codigo: "CHE001",
    unidadMedida: "pieza",
    peso: "35 g",
    stockMinimo: 30,
    ubicacion: "Estante snacks",
    perecedero: false,
    notas: "Fritura de queso",
    imageUrl: "/images/products/bubulubu.png"
  },
  {
    nombre: "Ruffles Original",
    descripcion: "45 g, Papas con ondas",
    marca: "Sabritas",
    categoria: "Snacks",
    subcategoria: "Papas fritas",
    precio: 15.00,
    codigo: "RUF001",
    unidadMedida: "pieza",
    peso: "45 g",
    stockMinimo: 25,
    ubicacion: "Estante snacks",
    perecedero: false,
    notas: "Papas onduladas",
    imageUrl: "/images/products/ruffle.png"
  },
  {
    nombre: "Gansito Marinela",
    descripcion: "50 g, Pastelito relleno de crema",
    marca: "Marinela",
    categoria: "Dulces",
    subcategoria: "Pastelitos",
    precio: 14.00,
    codigo: "MAR001",
    unidadMedida: "pieza",
    peso: "50 g",
    stockMinimo: 35,
    ubicacion: "Estante dulces",
    perecedero: true,
    notas: "Producto icónico mexicano",
    imageUrl: "/images/products/gansito.png"
  },
  {
    nombre: "Pingüinos Marinela",
    descripcion: "80 g, Pastelito de chocolate",
    marca: "Marinela",
    categoria: "Dulces",
    subcategoria: "Pastelitos",
    precio: 16.00,
    codigo: "MAR002",
    unidadMedida: "pieza",
    peso: "80 g",
    stockMinimo: 30,
    ubicacion: "Estante dulces",
    perecedero: true,
    notas: "Pastelito con crema",
    imageUrl: "/images/products/pinguinos.png"
  },
  {
    nombre: "Leche Lala Entera",
    descripcion: "1 L, Leche entera pasteurizada",
    marca: "Lala",
    categoria: "Lácteos",
    subcategoria: "Leches",
    precio: 28.00,
    codigo: "LAL001",
    unidadMedida: "litro",
    volumen: "1 L",
    stockMinimo: 15,
    ubicacion: "Refrigerador",
    perecedero: true,
    notas: "Mantener refrigerado",
    imageUrl: "/images/products/lala_entera.png"
  },
  {
    nombre: "Leche Alpura Deslactosada",
    descripcion: "1 L, Leche sin lactosa",
    marca: "Alpura",
    categoria: "Lácteos",
    subcategoria: "Leches",
    precio: 32.00,
    codigo: "ALP001",
    unidadMedida: "litro",
    volumen: "1 L",
    stockMinimo: 12,
    ubicacion: "Refrigerador",
    perecedero: true,
    notas: "Sin lactosa",
    imageUrl: "/images/products/alpura_deslactosada.png"
  },
  {
    nombre: "Pan Bimbo Blanco",
    descripcion: "680 g, Pan de caja blanco",
    marca: "Bimbo",
    categoria: "Panadería",
    subcategoria: "Pan de caja",
    precio: 35.00,
    codigo: "BIM001",
    unidadMedida: "pieza",
    peso: "680 g",
    stockMinimo: 20,
    ubicacion: "Estante panadería",
    perecedero: true,
    notas: "Pan suave",
    imageUrl: "/images/products/pan_bimbo_blanco.png"
  },
  {
    nombre: "Pan Bimbo Integral",
    descripcion: "680 g, Pan integral",
    marca: "Bimbo",
    categoria: "Panadería",
    subcategoria: "Pan de caja",
    precio: 38.00,
    codigo: "BIM002",
    unidadMedida: "pieza",
    peso: "680 g",
    stockMinimo: 15,
    ubicacion: "Estante panadería",
    perecedero: true,
    notas: "Pan con fibra",
    imageUrl: "/images/products/pan_bimbo_integral.png"
  },
  {
    nombre: "Bubulubu",
    descripcion: "Chocolate Bubulubu",
    marca: "Marinela",
    categoria: "Snacks",
    subcategoria: "Snacks",
    precio: 10.00,
    codigo: "SJ001",
    unidadMedida: "pieza",
    cantidad: "18 piezas",
    stockMinimo: 20,
    ubicacion: "Refrigerador",
    perecedero: true,
    notas: "Bubulubu en Refrigeracion",
    imageUrl: "/images/products/bubulubu.png"
  },
  {
    nombre: "Detergente Ariel",
    descripcion: "1 kg, Detergente en polvo",
    marca: "Ariel",
    categoria: "Limpieza",
    subcategoria: "Detergentes",
    precio: 45.00,
    codigo: "ARI001",
    unidadMedida: "pieza",
    peso: "1 kg",
    stockMinimo: 15,
    ubicacion: "Estante limpieza",
    perecedero: false,
    notas: "Detergente concentrado",
    imageUrl: "/images/products/detergente_ariel.png"
  },
  {
    nombre: "Fabuloso Lavanda",
    descripcion: "1 L, Limpiador multiusos",
    marca: "Fabuloso",
    categoria: "Limpieza",
    subcategoria: "Limpiadores",
    precio: 28.00,
    codigo: "FAB001",
    unidadMedida: "litro",
    volumen: "1 L",
    stockMinimo: 18,
    ubicacion: "Estante limpieza",
    perecedero: false,
    notas: "Aroma lavanda",
    imageUrl: "/images/products/fabuloso_lavanda.png"
  },
  {
    nombre: "Papel Higiénico Pétalo",
    descripcion: "4 rollos, Papel doble hoja",
    marca: "Pétalo",
    categoria: "Higiene",
    subcategoria: "Papel higiénico",
    precio: 42.00,
    codigo: "PET001",
    unidadMedida: "paquete",
    cantidad: "4 rollos",
    stockMinimo: 25,
    ubicacion: "Estante higiene",
    perecedero: false,
    notas: "Doble hoja suave",
    imageUrl: "/images/products/petalo.png"
  },
  {
    nombre: "Aceite Capullo",
    descripcion: "1 L, Aceite vegetal",
    marca: "Capullo",
    categoria: "Aceites",
    subcategoria: "Aceites vegetales",
    precio: 48.00,
    codigo: "CAP001",
    unidadMedida: "litro",
    volumen: "1 L",
    stockMinimo: 12,
    ubicacion: "Estante aceites",
    perecedero: false,
    notas: "Aceite puro",
    imageUrl: "/images/products/aceite_capullo.png"
  },
  {
    nombre: "Atún Dolores",
    descripcion: "140 g, Atún en agua",
    marca: "Dolores",
    categoria: "Conservas",
    subcategoria: "Atún",
    precio: 22.00,
    codigo: "DOL001",
    unidadMedida: "pieza",
    peso: "140 g",
    stockMinimo: 30,
    ubicacion: "Estante conservas",
    perecedero: false,
    notas: "Rico en proteína",
    imageUrl: "/images/products/atun-agua.png"
  }
];

// Función principal que borra y regenera productos
async function initializeProducts() {
  try {
    Logger.info('Iniciando reset de productos...');
    
    // Inicializar Firebase primero
    await firebaseManager.initialize();
    
    // Primero borrar todos los productos existentes
    await deleteAllProducts();
    
    // Esperar un momento antes de crear nuevos
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Crear nuevos productos
    Logger.info('Creando nuevos productos...');
    const batch = firestore.batch();
    
    productos.forEach(producto => {
      const productoRef = firestore.collection(COLLECTIONS.PRODUCTS).doc();
      const { fechaCaducidad, diasParaCaducar } = generarFechaCaducidad(producto.perecedero, producto.categoria);
      
      batch.set(productoRef, {
        ...producto,
        fechaCaducidad: fechaCaducidad,
        diasParaCaducar: diasParaCaducar,
        createdAt: new Date(),
        updatedAt: new Date(),
        activo: true,
        stockInitialized: true,
        cantidad: Math.floor(Math.random() * 50) + 10, // Stock aleatorio entre 10-60
        stock: Math.floor(Math.random() * 50) + 10,
        detectionId: null,
        precisionDeteccion: null
      });
    });

    await batch.commit();
    
    Logger.info(`Se crearon ${productos.length} productos exitosamente`);
    Logger.info('Reset de productos completado');
    
    process.exit(0);
  } catch (error) {
    Logger.error('Error en el proceso de reset:', error);
    process.exit(1);
  }
}

// Función para generar fechas de caducidad aleatorias
function generarFechaCaducidad(perecedero, categoria) {
  const hoy = new Date();
  let diasAleatorios;
  
  if (!perecedero) {
    diasAleatorios = Math.floor(Math.random() * (1095 - 180 + 1)) + 180;
  } else {
    switch (categoria) {
      case 'Bebidas':
        diasAleatorios = Math.floor(Math.random() * (90 - 30 + 1)) + 30;
        break;
      case 'Panadería':
        diasAleatorios = Math.floor(Math.random() * (15 - 3 + 1)) + 3;
        break;
      case 'Lácteos':
        diasAleatorios = Math.floor(Math.random() * (14 - 3 + 1)) + 3;
        break;
      case 'Carnes y Embutidos':
        diasAleatorios = Math.floor(Math.random() * (21 - 5 + 1)) + 5;
        break;
      case 'Frutas y Verduras':
        diasAleatorios = Math.floor(Math.random() * (10 - 2 + 1)) + 2;
        break;
      case 'Helados y Congelados':
        diasAleatorios = Math.floor(Math.random() * (180 - 30 + 1)) + 30;
        break;
      default:
        diasAleatorios = Math.floor(Math.random() * (30 - 7 + 1)) + 7;
    }
  }
  
  const fechaCaducidad = new Date(hoy);
  fechaCaducidad.setDate(hoy.getDate() + diasAleatorios);
  
  return {
    fechaCaducidad,
    diasParaCaducar: diasAleatorios
  };
}

// Ejecutar el script
initializeProducts();