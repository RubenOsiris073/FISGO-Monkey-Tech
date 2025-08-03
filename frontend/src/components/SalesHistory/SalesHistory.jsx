/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import { Table, Spinner, Card, Alert, Button, Row, Col, Form, Badge } from 'react-bootstrap';
import { FaDownload, FaEye, FaSearch, FaShoppingCart } from 'react-icons/fa';
import apiService from '../../services/apiService';
import { toast } from 'react-toastify';
import InvoiceModal from './InvoiceModal';
import ClientNameModal from './ClientNameModal';
import OrderProductManagementModal from '../orders/OrderProductManagementModal';
import { generateInvoicePDF } from '../../utils/pdfGenerator';

// Estilos
import '../../styles/components/sales/history.css';

const SalesHistory = memo(({ onGenerateInvoice, onSalesDataUpdate }) => {
  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [displayedSales, setDisplayedSales] = useState([]); // Nuevas ventas mostradas
  const [selectedSale, setSelectedSale] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showClientNameModal, setShowClientNameModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [saleForInvoice, setSaleForInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false); // Loading para cargar más
  const [error, setError] = useState(null);
  const [isComponentMounted, setIsComponentMounted] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  
  // Estados para paginación
  const [itemsPerPage] = useState(100);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [lastSaleTimestamp, setLastSaleTimestamp] = useState(null);
  const [useBackendCache, setUseBackendCache] = useState(false);
  
  // Usar useRef para mantener una referencia estable a onSalesDataUpdate
  const onSalesDataUpdateRef = useRef(onSalesDataUpdate);
  
  // Actualizar la referencia cuando cambie la prop
  useEffect(() => {
    onSalesDataUpdateRef.current = onSalesDataUpdate;
  }, [onSalesDataUpdate]);

    // Función para cargar ventas - usando el mismo endpoint que el dashboard
  const loadSales = useCallback(async (loadMore = false) => {
    try {
      setLoading(!loadMore);
      setLoadingMore(loadMore);
      setError(null);

      // Usar el mismo método que el dashboard para obtener datos reales
      const salesResponse = await apiService.getSalesDataFromSheets();
      
      // Verificar que salesResponse sea válido y tenga datos
      if (salesResponse && salesResponse.success && Array.isArray(salesResponse.data)) {
        console.log('Ventas cargadas correctamente desde Sheets:', salesResponse.data.length);
        
        // Convertir los datos de Google Sheets al formato esperado por el componente
        const salesData = salesResponse.data.map((sale, index) => ({
          id: sale.ID || sale.id || `sheet-${index}`,
          timestamp: sale.Timestamp || sale.timestamp || sale.Fecha || sale.fecha || sale.Date,
          total: parseFloat(sale.Total || sale.venta_total || sale.total || 0),
          payment_method: sale['Método de Pago'] || sale.payment_method || sale.metodo_pago || 'Efectivo',
          items: sale.Productos || sale.items || sale.productos || [],
          client_name: sale['Nombre Cliente'] || sale.client_name || sale.nombre_cliente || 'Cliente General',
          status: sale.Status || sale.status || 'completed',
          // Campos adicionales que podrían estar en Google Sheets
          vendor: sale.Vendedor || sale.vendor,
          location: sale.Ubicación || sale.location,
          notes: sale.Notas || sale.notes || sale.observaciones,
          // Mantener los datos originales para referencia
          originalData: sale
        }));
        
        setSales(salesData);
        setFilteredSales(salesData);
        setDisplayedSales(salesData.slice(0, itemsPerPage));
        
        // Enviar los datos al componente padre usando la referencia estable
        if (typeof onSalesDataUpdateRef.current === 'function') {
          onSalesDataUpdateRef.current(salesData);
        }
      } else {
        console.error('getSalesDataFromSheets no devolvió datos válidos:', salesResponse);
        setSales([]);
        setFilteredSales([]);
        setError('No se pudieron cargar los datos de ventas desde Google Sheets');
        
        // Informar al padre que no hay datos
        if (typeof onSalesDataUpdateRef.current === 'function') {
          onSalesDataUpdateRef.current([]);
        }
      }
    } catch (err) {
      console.error('Error al cargar ventas:', err);
      setError(err.message || 'Error al cargar el historial de ventas');
      setSales([]);
      setFilteredSales([]);
      
      // Informar al padre que no hay datos debido al error
      if (typeof onSalesDataUpdateRef.current === 'function') {
        onSalesDataUpdateRef.current([]);
      }
      
      // Solo mostrar toast si el componente ya se ha montado completamente
      if (isComponentMounted) {
        toast.error('Error al cargar el historial de ventas', {
          toastId: 'sales-history-load-error'
        });
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [itemsPerPage, isComponentMounted]);

  // Función para cargar ventas paginadas
  const loadSalesPaginated = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);
      let salesData;
      if (useBackendCache) {
        salesData = await apiService.getSalesCached(itemsPerPage);
      } else {
        salesData = await apiService.getSalesPaginated({
          limit: itemsPerPage,
          startAfter: reset ? undefined : lastSaleTimestamp
        });
      }
      if (reset) {
        setSales(salesData);
        setDisplayedSales(salesData);
        setHasMoreData(salesData.length === itemsPerPage);
      } else {
        setSales(prev => [...prev, ...salesData]);
        setDisplayedSales(prev => [...prev, ...salesData]);
        setHasMoreData(salesData.length === itemsPerPage);
      }
      if (salesData.length > 0) {
        setLastSaleTimestamp(salesData[salesData.length - 1].timestamp);
      }
    } catch (err) {
      setError('Error al cargar ventas paginadas');
    } finally {
      setLoading(false);
    }
  }, [itemsPerPage, lastSaleTimestamp, useBackendCache]);

  // Función para cargar más ventas
  const loadMoreSales = async () => {
    if (loadingMore || !hasMoreData) return;
    
    setLoadingMore(true);
    
    // Simular carga de más datos
    setTimeout(() => {
      setDisplayedSales(prev => [
        ...prev,
        ...filteredSales.slice(prev.length, prev.length + itemsPerPage)
      ]);
      
      // Verificar si hay más datos
      if (displayedSales.length + itemsPerPage >= filteredSales.length) {
        setHasMoreData(false);
      }
      
      setLoadingMore(false);
    }, 1000);
  };

  // useEffect para cargar ventas al montar el componente
  useEffect(() => {
    loadSalesPaginated(true);
    // eslint-disable-next-line
  }, [useBackendCache]);

  const handleViewInvoice = (sale) => {
    setSelectedSale(sale);
    setShowInvoiceModal(true);
  };

  const handleViewProducts = (sale) => {
    setSelectedSale(sale);
    setShowProductModal(true);
  };

  const handleDownloadInvoice = (sale) => {
    setSaleForInvoice(sale);
    setShowClientNameModal(true);
  };

  const handleConfirmClientName = async (clientName) => {
    try {
      setGeneratingPDF(true);
      
      if (isComponentMounted) {
        toast.info('Generando factura PDF...', {
          toastId: `sales-invoice-gen-${saleForInvoice?.id || 'noid'}`
        });
      }
      
      // Crear copia de la venta con el nombre del cliente actualizado
      const updatedSale = {
        ...saleForInvoice,
        client: clientName,
        cliente: clientName
      };
      
      await generateInvoicePDF(updatedSale);
      
      if (isComponentMounted) {
        toast.success(`Factura generada para ${clientName}`, {
          toastId: `sales-invoice-success-${saleForInvoice?.id || 'noid'}`
        });
      }
      
      setShowClientNameModal(false);
      setSaleForInvoice(null);
    } catch (error) {
      console.error('Error al generar factura PDF:', error);
      if (isComponentMounted) {
        toast.error('Error al generar la factura PDF', {
          toastId: `sales-invoice-error-${saleForInvoice?.id || 'noid'}`
        });
      }
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleCloseClientNameModal = () => {
    setShowClientNameModal(false);
    setSaleForInvoice(null);
    setGeneratingPDF(false);
  };

  // Función para formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-CO') + ' ' + date.toLocaleTimeString();
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  // Función para formatear moneda
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '$0.00';
    }
    
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(amount));
  };

  // Usar useMemo para formatear las ventas mostradas
  const formattedDisplayedSales = useMemo(() => {
    return displayedSales.map(sale => ({
      ...sale,
      formattedDate: formatDate(sale.date || sale.fecha || sale.timestamp),
      formattedTotal: formatCurrency(sale.total),
      itemsCount: Array.isArray(sale.items) ? sale.items.length : 0
    }));
  }, [displayedSales]);

  // Si hay un error pero no está cargando, mostramos el error
  if (error && !loading) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error</Alert.Heading>
        <p>{error}</p>
        <div className="d-flex justify-content-end">
          <Button 
            variant="outline-danger" 
            size="sm"
            onClick={loadSales}
            className="px-2 py-1"
          >
            Reintentar
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <>
      {/* Panel principal */}
      <div className="sales-history-container">
        
        {/* Tabla de ventas optimizada */}
        <div className="sales-history-table-container">
          {loading ? (
            <div className="text-center p-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Cargando ventas...</p>
            </div>
          ) : (
            formattedDisplayedSales.length > 0 ? (
              <Table responsive hover className="sales-history-table mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Método de Pago</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {formattedDisplayedSales.map((sale) => (
                    <SaleRow 
                      key={sale.id || sale._id || `sale-${Math.random()}`}
                      sale={sale}
                      onViewInvoice={handleViewInvoice}
                      onViewProducts={handleViewProducts}
                      onDownloadInvoice={handleDownloadInvoice}
                    />
                  ))}
                </tbody>
              </Table>
            ) : (
              <div className="sales-history-empty">
                <div className="sales-history-empty-icon">
                  <FaSearch />
                </div>
                <p>No se encontraron ventas</p>
                {(filters.startDate || filters.paymentMethod) && (
                  <Button 
                    variant="outline-primary" 
                    size="sm"
                    onClick={clearFilters}
                    className="sales-history-btn mt-2"
                  >
                    <FaTimes className="me-1" /> Limpiar filtros
                  </Button>
                )}
              </div>
            )
          )}
        </div>
        
        {/* Footer con acciones adicionales */}
        <div className="sales-history-footer">
          <div>
            <small className="text-muted">
              Total de ventas paginadas: <strong>{filteredSales.length}</strong>
            </small>
          </div>
          <div>
            {hasMoreData && (
              <Button 
                variant="outline-primary" 
                size="sm"
                onClick={loadMoreSales}
                disabled={loadingMore}
                className="sales-history-btn"
              >
                {loadingMore ? 'Cargando más...' : 'Cargar más ventas'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Modal de factura */}
      <InvoiceModal
        show={showInvoiceModal}
        onHide={() => setShowInvoiceModal(false)}
        sale={selectedSale}
      />

      {/* Modal para nombre del cliente */}
      <ClientNameModal
        show={showClientNameModal}
        onHide={handleCloseClientNameModal}
        onConfirm={handleConfirmClientName}
        loading={generatingPDF}
      />

      {/* Modal para gestión de productos - CORREGIDO */}
      <OrderProductManagementModal
        show={showProductModal}
        onHide={() => setShowProductModal(false)}
        products={selectedSale?.items || []}
        orderInfo={{
          id: selectedSale?.id,
          fecha: selectedSale?.date || selectedSale?.fecha || selectedSale?.timestamp,
          metodoPago: selectedSale?.paymentMethod,
          montoRecibido: selectedSale?.amountReceived,
          cambio: selectedSale?.change,
          cliente: selectedSale?.client || selectedSale?.cliente
        }}
        onUpdate={loadSales}
      />
    </>
  );
});

// Componente optimizado para cada fila de venta con nuevo diseño
const SaleRow = memo(({ sale, onViewInvoice, onViewProducts, onDownloadInvoice }) => (
  <tr>
    <td>
      <Badge bg="primary" pill className="px-2 py-1">{sale.id}</Badge>
    </td>
    <td>
      <span>{sale.formattedDate}</span>
    </td>
    <td>
      <div className="d-inline-block text-truncate" style={{ maxWidth: "150px" }}>
        {sale.client || sale.cliente || 'Cliente general'}
      </div>
    </td>
    <td>
      <Badge bg="light" text="dark" pill className="px-2 py-1">
        {sale.itemsCount} productos
      </Badge>
    </td>
    <td>
      <span className="fw-bold text-success" style={{ fontSize: '1.05rem', letterSpacing: '0.3px' }}>{sale.formattedTotal}</span>
    </td>
    <td>
      <Badge bg="success" pill className="px-2 py-1">{sale.paymentMethod || 'Desconocido'}</Badge>
    </td>
    <td>
      <div className="d-flex">
        <Button
          variant="outline-primary"
          size="sm"
          className="me-1 rounded-circle p-1"
          style={{ width: "30px", height: "30px" }}
          onClick={() => onViewInvoice(sale)}
          title="Ver factura"
        >
          <FaEye size={14} />
        </Button>
        <Button
          variant="outline-info"
          size="sm"
          className="me-1 rounded-circle p-1"
          style={{ width: "30px", height: "30px" }}
          onClick={() => onViewProducts(sale)}
          title="Ver productos"
        >
          <FaShoppingCart size={14} />
        </Button>
        <Button
          variant="outline-success"
          size="sm"
          className="rounded-circle p-1"
          style={{ width: "30px", height: "30px" }}
          onClick={() => onDownloadInvoice(sale)}
          title="Descargar PDF"
        >
          <FaDownload size={14} />
        </Button>
      </div>
    </td>
  </tr>
));

SalesHistory.displayName = 'SalesHistory';
SaleRow.displayName = 'SaleRow';

export default SalesHistory;