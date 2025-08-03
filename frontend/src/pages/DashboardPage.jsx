import React, { useState, useEffect } from 'react';
import { Card, Alert, Spinner, Button, Row, Col } from 'react-bootstrap';
import { FaSyncAlt, FaChartLine } from 'react-icons/fa';
import apiService from '../services/apiService';
import '../styles/pages/dashboard.css';

// Componentes de dashboard - importaciones directas
import { DashboardMetrics } from '../components/dashboard/DashboardMetrics';
import { 
  RealtimeLineChart, 
  ProgressAreaChart,
  InventoryTrendChart
} from '../components/dashboard/LineCharts';
import { 
  MinimalBarChart, 
  BarChart 
} from '../components/dashboard/BarCharts';
import { 
  MinimalDonutChart, 
  PieChart 
} from '../components/dashboard/PieCharts';

const DashboardPage = () => {
  const [metrics, setMetrics] = useState(null);
  const [salesData, setSalesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    loadDashboardData();
    // Actualizar datos cada 30 segundos para efecto real-time
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [metricsResponse, salesResponse] = await Promise.all([
        apiService.getDashboardMetrics(),
        apiService.getSalesDataFromSheets()
      ]);

      if (metricsResponse.success) {
        setMetrics(metricsResponse.data);
      }

      if (salesResponse.success) {
        setSalesData(salesResponse.data);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('Error al cargar datos. Verificando conexión...');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  // Procesar datos reales de Google Sheets para métricas y gráficos
  const getProcessedData = () => {
    console.log('DEBUG - metrics:', metrics);
    console.log('DEBUG - salesData:', salesData);
    
    // Si no hay datos de metrics, usar datos de ejemplo
    if (!metrics) {
      console.log('DEBUG - No hay metrics, usando datos de ejemplo');
      return {
        metrics: {
          totalSales: 0,
          totalRevenue: 0,
          totalOrders: 0,
          averageTicket: 0
        },
        timeSeries: [
          {
            name: 'Ventas',
            data: Array.from({ length: 12 }, (_, i) => ({
              x: new Date().getTime() - (11 - i) * 24 * 60 * 60 * 1000,
              y: Math.floor(Math.random() * 100) + 50
            }))
          }
        ],
        categoryData: [
          { name: 'Sin datos', value: 1 }
        ],
        paymentData: [
          { name: 'Sin datos', value: 1 }
        ]
      };
    }

    // Usar datos reales de Google Sheets y calcular métricas reales
    console.log('DEBUG - Usando datos reales de metrics y salesData');
    
    let totalRevenue = 0;
    let totalOrders = salesData?.data?.length || 0;
    
    // Calcular ingresos totales reales desde salesData
    if (salesData?.data && salesData.data.length > 0) {
      totalRevenue = salesData.data.reduce((sum, sale) => {
        const revenue = parseFloat(sale.Total || sale.venta_total || sale.total || 0);
        return sum + revenue;
      }, 0);
    }

    // Calcular ventas de hoy
    let todaySales = 0;
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    
    if (salesData?.data && salesData.data.length > 0) {
      todaySales = salesData.data.filter(sale => {
        const saleDate = sale.Fecha || sale.fecha || sale.Date || sale.timestamp || sale.Timestamp || 
                        sale.venta_timestamp || sale.created_at;
        if (saleDate) {
          const saleDateStr = new Date(saleDate).toISOString().slice(0, 10);
          return saleDateStr === today;
        }
        return false;
      }).length;
    }

    const realMetrics = {
      totalSales: metrics.totalSales || 0,
      totalRevenue: totalRevenue,
      totalOrders: totalOrders,
      averageTicket: totalOrders > 0 ? (totalRevenue / totalOrders) : 0,
      todaySales: todaySales
    };
    console.log('DEBUG - realMetrics:', realMetrics);

    // Procesar datos de ventas usando salesData.data directamente
    let monthlyData = [];
    let productsData = [];

    if (salesData?.data && salesData.data.length > 0) {
      console.log('DEBUG - Primer registro de salesData:', salesData.data[0]);
      console.log('DEBUG - Campos disponibles:', Object.keys(salesData.data[0]));
      
      // Procesar datos de ventas por mes
      const salesByMonth = {};
      const productCounts = {};
      const categoryRevenue = {}; // Cambiar a ingresos por categoría

      salesData.data.forEach(sale => {
        // Procesar fecha para agrupar por mes
        const date = sale.Fecha || sale.venta_timestamp || sale.fecha || sale.Timestamp || new Date().toISOString();
        const monthKey = new Date(date).toISOString().slice(0, 7); // YYYY-MM
        
        // Procesar ingresos por mes
        const revenue = parseFloat(sale.Total || sale.venta_total || sale.total || sale.Precio || sale.precio || 0);
        if (!salesByMonth[monthKey]) {
          salesByMonth[monthKey] = 0;
        }
        salesByMonth[monthKey] += revenue;

        // Procesar productos más vendidos
        const productName = sale.Producto || sale.producto || sale.product || sale.Descripcion || sale.descripcion || 'Producto sin nombre';
        productCounts[productName] = (productCounts[productName] || 0) + 1;

        // Procesar ingresos por categoría (no conteo, sino dinero generado)
        let category = sale.Categoria || sale.categoria || sale.Category || sale.Tipo || sale.tipo || 
                      sale.Seccion || sale.seccion || sale.Departamento || sale.departamento;
        
        // Si no hay categoría, crear una basada en el producto
        if (!category || category === 'General') {
          const productName = (sale.Producto || sale.producto || sale.product || sale.Descripcion || sale.descripcion || '').toLowerCase();
          
          if (productName.includes('electrón') || productName.includes('celular') || productName.includes('comput') || productName.includes('tablet')) {
            category = 'Electrónicos';
          } else if (productName.includes('ropa') || productName.includes('camisa') || productName.includes('pantalón') || productName.includes('vestido')) {
            category = 'Ropa';
          } else if (productName.includes('hogar') || productName.includes('cocina') || productName.includes('muebl') || productName.includes('decoración')) {
            category = 'Hogar';
          } else if (productName.includes('deport') || productName.includes('ejercicio') || productName.includes('gym') || productName.includes('fitness')) {
            category = 'Deportes';
          } else if (productName.includes('comida') || productName.includes('alimento') || productName.includes('bebida')) {
            category = 'Alimentos';
          } else if (productName.includes('libro') || productName.includes('educación') || productName.includes('curso')) {
            category = 'Educación';
          } else {
            category = 'Otros';
          }
        }
        
        // Acumular ingresos por categoría en lugar de contar
        if (!categoryRevenue[category]) {
          categoryRevenue[category] = 0;
        }
        categoryRevenue[category] += revenue;
      });

      console.log('DEBUG - salesByMonth procesado:', salesByMonth);
      console.log('DEBUG - productCounts procesado:', productCounts);
      console.log('DEBUG - categoryRevenue procesado:', categoryRevenue);

      // Convertir a formato para gráficos
      monthlyData = Object.entries(salesByMonth)
        .sort(([a], [b]) => new Date(a + '-01') - new Date(b + '-01'))
        .slice(-12) // Últimos 12 meses
        .map(([month, revenue]) => ({
          x: new Date(month + '-01').getTime(),
          y: revenue
        }));

      // Top 5 categorías por ingresos (no por cantidad)
      productsData = Object.entries(categoryRevenue)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([category, revenue]) => ({
          name: category,
          value: revenue // Ahora es el ingreso, no el conteo
        }));
    }
    
    console.log('DEBUG - monthlyData procesado:', monthlyData);
    console.log('DEBUG - productsData procesado:', productsData);

    // Datos de métodos de pago (usar datos reales de ventas si están disponibles)
    let paymentsData = [
      { name: 'Sin datos', value: 1 }
    ];

    if (salesData?.data && salesData.data.length > 0) {
      const paymentMethods = {};
      salesData.data.forEach(sale => {
        const method = sale.MetodoPago || sale.PaymentMethod || sale.metodo_pago || 'No especificado';
        paymentMethods[method] = (paymentMethods[method] || 0) + 1;
      });

      paymentsData = Object.entries(paymentMethods)
        .map(([method, count]) => ({
          name: method,
          value: count
        }))
        .slice(0, 5); // Top 5 métodos de pago
    }

    console.log('DEBUG - paymentsData final:', paymentsData);

    // Múltiples opciones para el gráfico de dona - análisis completo de campos disponibles
    let topProductsData = [{ name: 'Sin datos', value: 1 }];
    let paymentMethodsData = [{ name: 'Sin datos', value: 1 }];
    let vendorData = [{ name: 'Sin datos', value: 1 }];
    let timeDistributionData = [{ name: 'Sin datos', value: 1 }];
    let regionData = [{ name: 'Sin datos', value: 1 }];

    if (salesData?.data && salesData.data.length > 0) {
      console.log('DEBUG - Analizando campos disponibles para gráfico de dona:');
      console.log('DEBUG - Campos del primer registro:', Object.keys(salesData.data[0]));
      
      // 1. PRODUCTOS POR INGRESOS (actual)
      const productRevenue = {};
      
      // 2. MÉTODOS DE PAGO
      const paymentMethods = {};
      
      // 3. VENDEDORES/EMPLEADOS (si está disponible)
      const vendors = {};
      
      // 4. DISTRIBUCIÓN POR HORAS DEL DÍA
      const timeDistribution = {
        'Mañana Temprana (6-9)': 0,
        'Media Mañana (9-12)': 0,
        'Mediodía (12-15)': 0,
        'Tarde (15-18)': 0,
        'Noche Temprana (18-20)': 0,
        'Noche Tardía (20-24)': 0,
        'Madrugada (0-6)': 0
      };
      
      // 5. REGIONES/SUCURSALES (si está disponible)
      const regions = {};

      salesData.data.forEach(sale => {
        const revenue = parseFloat(sale.Precio || sale.precio || sale.price || sale.Total || sale.total || 0);
        const quantity = parseInt(sale.Cantidad || sale.cantidad || sale.quantity || 1);
        const totalRevenue = revenue * quantity;
        
        // Productos por ingresos
        const productName = sale.Producto || sale.producto || sale.product || sale.Descripcion || sale.descripcion || 
                          sale.Productos || sale.productos || sale.Item || sale.item || sale.Items || sale.items ||
                          sale.Name || sale.name || sale.Nombre || sale.nombre || 'Producto desconocido';
        if (productName && totalRevenue > 0) {
          productRevenue[productName] = (productRevenue[productName] || 0) + totalRevenue;
        }

        // Métodos de pago
        const paymentMethod = sale.MetodoPago || sale.PaymentMethod || sale.metodo_pago || 
                             sale['Método de Pago'] || sale.payment_method || sale.forma_pago || 'No especificado';
        if (paymentMethod && paymentMethod !== 'No especificado') {
          paymentMethods[paymentMethod] = (paymentMethods[paymentMethod] || 0) + totalRevenue;
        }

        // Vendedores/Empleados
        const vendor = sale.Vendedor || sale.vendedor || sale.Empleado || sale.empleado || 
                      sale.Seller || sale.seller || sale.Usuario || sale.usuario || 
                      sale.Staff || sale.staff || sale.Cajero || sale.cajero;
        if (vendor && vendor.trim() && vendor !== '-' && vendor !== 'N/A') {
          vendors[vendor] = (vendors[vendor] || 0) + totalRevenue;
        }

        // Distribución por horas
        const date = sale.Fecha || sale.fecha || sale.Date || sale.timestamp || sale.Timestamp || 
                    sale.venta_timestamp || sale.venta_createdAt || sale.created_at || sale.timestaps;
        if (date) {
          const hour = new Date(date).getHours();
          
          if (hour >= 6 && hour < 9) timeDistribution['Mañana Temprana (6-9)'] += totalRevenue;
          else if (hour >= 9 && hour < 12) timeDistribution['Media Mañana (9-12)'] += totalRevenue;
          else if (hour >= 12 && hour < 15) timeDistribution['Mediodía (12-15)'] += totalRevenue;
          else if (hour >= 15 && hour < 18) timeDistribution['Tarde (15-18)'] += totalRevenue;
          else if (hour >= 18 && hour < 20) timeDistribution['Noche Temprana (18-20)'] += totalRevenue;
          else if (hour >= 20 && hour < 24) timeDistribution['Noche Tardía (20-24)'] += totalRevenue;
          else timeDistribution['Madrugada (0-6)'] += totalRevenue; // 0-6
        }

        // Regiones/Sucursales
        const region = sale.Sucursal || sale.sucursal || sale.Region || sale.region || 
                      sale.Ciudad || sale.ciudad || sale.Tienda || sale.tienda || 
                      sale.Store || sale.store || sale.Location || sale.location;
        if (region && region.trim() && region !== '-' && region !== 'N/A') {
          regions[region] = (regions[region] || 0) + totalRevenue;
        }
      });

      console.log('DEBUG - Datos procesados para dona:');
      console.log('- Productos:', Object.keys(productRevenue).length);
      console.log('- Métodos de pago:', Object.keys(paymentMethods).length);
      console.log('- Vendedores:', Object.keys(vendors).length);
      console.log('- Regiones:', Object.keys(regions).length);

      // Procesar datos para gráficos de dona
      
      // 1. Top 6 productos por ingresos
      if (Object.keys(productRevenue).length > 0) {
        topProductsData = Object.entries(productRevenue)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 6)
          .map(([product, revenue]) => ({
            name: product.length > 20 ? product.substring(0, 20) + '...' : product,
            value: revenue
          }));
      }

      // 2. Métodos de pago por ingresos
      if (Object.keys(paymentMethods).length > 0) {
        paymentMethodsData = Object.entries(paymentMethods)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 6)
          .map(([method, revenue]) => ({
            name: method,
            value: revenue
          }));
      }

      // 3. Top vendedores por ingresos
      if (Object.keys(vendors).length > 0) {
        vendorData = Object.entries(vendors)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 6)
          .map(([vendor, revenue]) => ({
            name: vendor.length > 15 ? vendor.substring(0, 15) + '...' : vendor,
            value: revenue
          }));
      }

      // 4. Distribución por horarios
      const timeEntries = Object.entries(timeDistribution);
      if (timeEntries.length > 0) {
        timeDistributionData = timeEntries.map(([time, revenue]) => ({
          name: time,
          value: revenue > 0 ? revenue : Math.floor(Math.random() * 200) + 50 // Datos simulados si no hay ventas reales
        }));
      }

      // 5. Top regiones por ingresos
      if (Object.keys(regions).length > 0) {
        regionData = Object.entries(regions)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 6)
          .map(([region, revenue]) => ({
            name: region.length > 15 ? region.substring(0, 15) + '...' : region,
            value: revenue
          }));
      }
    }

    console.log('DEBUG - topProductsData final:', topProductsData);
    console.log('DEBUG - paymentMethodsData final:', paymentMethodsData);
    console.log('DEBUG - vendorData final:', vendorData);
    console.log('DEBUG - timeDistributionData final:', timeDistributionData);
    console.log('DEBUG - regionData final:', regionData);

    // FORZAR distribución por tiempo siempre
    let selectedDonutData = timeDistributionData;
    let selectedDonutTitle = 'Distribución de Ventas por Horario';

    // Si no hay datos de tiempo válidos, crear datos por defecto
    if (timeDistributionData.length === 1 && timeDistributionData[0].name === 'Sin datos') {
      selectedDonutData = [
        { name: 'Mañana Temprana (6-9)', value: 15 },
        { name: 'Media Mañana (9-12)', value: 20 },
        { name: 'Mediodía (12-15)', value: 25 },
        { name: 'Tarde (15-18)', value: 20 },
        { name: 'Noche Temprana (18-20)', value: 10 },
        { name: 'Noche Tardía (20-24)', value: 8 },
        { name: 'Madrugada (0-6)', value: 2 }
      ];
    }

    console.log('DEBUG - Gráfico de dona seleccionado:', selectedDonutTitle);

    const finalData = {
      metrics: realMetrics,
      timeSeries: [
        {
          name: 'Ingresos Mensuales',
          data: monthlyData
        }
      ],
      categoryData: productsData.length > 0 ? productsData : [{ name: 'Sin datos', value: 1 }],
      paymentData: paymentsData,
      // Datos dinámicos para el gráfico de dona
      topProductsData: selectedDonutData,
      donutTitle: selectedDonutTitle,
      // Datos adicionales disponibles para futuras visualizaciones
      alternativeDonutData: {
        products: topProductsData,
        payments: paymentMethodsData,
        vendors: vendorData,
        timeDistribution: timeDistributionData,
        regions: regionData
      }
    };
    
    console.log('DEBUG - datos finales retornados:', finalData);
    return finalData;
  };

  const chartData = getProcessedData();

  if (loading) {
    return (
      <div className="dashboard-main-container">
        <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
          <div className="text-center">
            <Spinner animation="border" size="lg" className="mb-3 text-primary" />
            <h5 className="text-primary mb-2">Cargando dashboard...</h5>
            <p className="text-muted">Obteniendo datos en tiempo real</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-main-container">
      {/* Header del Dashboard con fondo azul que incluye las métricas */}
      <div className="dashboard-blue-header">
        <div className="dashboard-header-content">
          <div className="dashboard-header-left">
            <div>
              <h2 className="dashboard-header-title">
                <FaChartLine className="me-3" />
                Dashboard Analytics
              </h2>
              <p className="dashboard-header-subtitle">Visualice, analice y administre las métricas de su negocio</p>
            </div>
          </div>
          <Button 
            variant="light" 
            size="sm"
            onClick={loadDashboardData} 
            disabled={loading}
            className="dashboard-refresh-btn"
            title="Actualizar datos"
          >
            <FaSyncAlt className={loading ? 'fa-spin' : ''} size="14" />
            <span className="ms-2">Actualizar</span>
          </Button>
        </div>
        
        {/* Métricas principales dentro del header azul */}
        {chartData && (
          <div className="dashboard-metrics-in-header">
            <DashboardMetrics 
              metrics={chartData.metrics}
              formatCurrency={formatCurrency}
            />
          </div>
        )}
      </div>

      {error && (
        <Alert variant="danger" className="mb-4 mx-4" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {chartData && (
        <>

          {/* Gráficos principales en grid mejorado */}
          <div className="dashboard-charts-grid">
            <div className="chart-card large">
              <div className="chart-header">
                <h6 className="chart-title">Ventas en Tiempo Real</h6>
              </div>
              <div className="chart-content">
                <RealtimeLineChart 
                  data={chartData.timeSeries} 
                />
              </div>
            </div>
            
            <div className="chart-card medium">
              <div className="chart-header">
                <h6 className="chart-title">Ingresos por Categoría</h6>
              </div>
              <div className="chart-content">
                <MinimalBarChart 
                  data={chartData.categoryData} 
                />
              </div>
            </div>
          </div>

          {/* Segunda fila de gráficos */}
          <div className="dashboard-charts-grid">
            <div className="chart-card medium">
              <div className="chart-header">
                <h6 className="chart-title">{chartData.donutTitle || 'Top Productos por Ingresos'}</h6>
              </div>
              <div className="chart-content">
                <MinimalDonutChart 
                  data={chartData.topProductsData} 
                />
              </div>
            </div>
            
            <div className="chart-card medium">
              <div className="chart-header">
                <h6 className="chart-title">Progreso Objetivo Mensual</h6>
              </div>
              <div className="chart-content">
                <ProgressAreaChart 
                  data={[{
                    name: 'Objetivo',
                    data: [65, 78, 85, 92]
                  }]} 
                  showLabels={true}
                />
              </div>
            </div>
            

          </div>

          {/* Información adicional */}
          <div className="dashboard-footer">
            <div className="update-info">
              <small className="text-muted">
                Última actualización: {lastUpdated ? lastUpdated.toLocaleString('es-MX') : 'Nunca'}
              </small>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;