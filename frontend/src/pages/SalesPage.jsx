import React, { useState, useEffect } from 'react';
import { Button } from 'react-bootstrap';
import { FaDownload, FaShoppingCart } from 'react-icons/fa';
import SalesHistory from '../components/SalesHistory/SalesHistory';
import InvoiceModal from '../components/SalesHistory/InvoiceModal';
import { generateSalesReportPDF } from '../utils/pdfGenerator';
import { toast } from '../utils/toastHelper';

// Estilos
import '../styles/pages/sales.css';

const SalesPage = () => {
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [isComponentMounted, setIsComponentMounted] = useState(false);
  const [salesData, setSalesData] = useState([]);

  // Marcar el componente como montado después de un breve retraso
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsComponentMounted(true);
    }, 1000); // Retraso de 1 segundo para asegurar que la carga inicial termine

    return () => clearTimeout(timer);
  }, []);

  // Función para abrir el modal de factura con la venta seleccionada
  const handleShowInvoice = (sale) => {
    setSelectedSale(sale);
    setShowInvoiceModal(true);
  };

  // Función para recibir y almacenar los datos de ventas del componente hijo
  const handleSalesDataUpdate = (sales) => {
    setSalesData(sales || []);
  };

  // Función para descargar todas las ventas como PDF
  const handleDownloadSalesReport = async () => {
    if (!salesData || salesData.length === 0) {
      if (isComponentMounted) {
        toast.warning('No hay ventas para generar el reporte');
      }
      return;
    }

    try {
      setDownloading(true);
      // Mostrar toast solo cuando comienza la descarga
      if (isComponentMounted) {
        toast.info('Generando reporte de ventas...');
      }
      await generateSalesReportPDF(salesData);
      if (isComponentMounted) {
        toast.success('Reporte de ventas descargado correctamente', {
          toastId: 'sales-report-success' // Asegurar ID único para evitar duplicados
        });
      }
    } catch (error) {
      console.error('Error al generar el reporte de ventas:', error);
      if (isComponentMounted) {
        toast.error('Error al generar el reporte. Intente más tarde.');
      }
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="sales-main-container">
      <div className="sales-content-wrapper">
        {/* Header con estilo similar a alertas */}
        <div className="sales-header">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <h1 className="sales-title">
                <FaShoppingCart className="me-3" />
                Historial de Ventas
              </h1>
              <p className="sales-subtitle">
                Visualice, analice y administre el historial de transacciones
              </p>
            </div>
            <Button 
              variant="light"
              onClick={handleDownloadSalesReport}
              disabled={downloading || salesData.length === 0}
              className="sales-action-button"
              title="Descargar historial de ventas"
            >
              {downloading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  <span>Generando...</span>
                </>
              ) : (
                <>
                  <FaDownload className="me-2" />
                  <span>Descargar Reporte</span>
                </>
              )}
            </Button>
          </div>
        </div>
        
        {/* Contenido principal */}
        <div className="sales-content-container">
          <div className="sales-content-inner">
            <SalesHistory 
              onGenerateInvoice={handleShowInvoice}
              onSalesDataUpdate={handleSalesDataUpdate}
            />
          </div>
        </div>
        
        {/* Modal para mostrar y descargar facturas */}
        <InvoiceModal
          show={showInvoiceModal}
          onHide={() => setShowInvoiceModal(false)}
          sale={selectedSale}
        />
      </div>
    </div>
  );
};

export default SalesPage;