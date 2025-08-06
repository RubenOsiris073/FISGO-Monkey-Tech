import React, { useRef, useState } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { FaDownload, FaPrint } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { generateInvoicePDF } from '../../utils/pdfGenerator';

const InvoiceModal = ({ show, onHide, sale }) => {
  const [downloading, setDownloading] = useState(false);
  const contentRef = useRef(null);

  // Si no hay venta seleccionada, no mostramos el modal
  if (!sale) return null;
  
  const saleId = sale.id || sale._id || 'NoID';

  // **NUEVA FUNCIÓN**: Usar el generador de PDF mejorado
  const handleDownloadInvoice = async () => {
    try {
      setDownloading(true);
      toast.info('Generando factura PDF profesional...', {
        toastId: `invoice-info-${saleId}` // ID único
      });
      
      // Usar la función mejorada del pdfGenerator
      await generateInvoicePDF(sale);
      
      toast.success('Factura descargada correctamente', {
        toastId: `invoice-success-${saleId}` // ID único
      });
    } catch (error) {
      console.error('Error al generar la factura:', error);
      toast.error('Error al generar la factura: ' + (error.message || 'Error desconocido'), {
        toastId: `invoice-error-${saleId}` // ID único
      });
    } finally {
      setDownloading(false);
    }
  };

  // Formatear fecha
  const formatDate = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch (e) {
      return 'Fecha inválida';
    }
  };

  return (
    <Modal
      show={show}
      onHide={onHide}
      size="lg"
      aria-labelledby="invoice-modal-title"
      centered
    >
      <Modal.Header closeButton>
        <Modal.Title id="invoice-modal-title">
          Factura #{saleId}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <div id="invoice-content" ref={contentRef} className="p-3">
          {/* El contenido de la factura permanece igual */}
          <div className="d-flex justify-content-between align-items-start mb-4">
            <div>
              <h2 className="mb-1">FACTURA</h2>
              <p className="text-muted mb-0">#{saleId}</p>
              <p className="text-muted mb-0">
                Fecha: {formatDate(sale.date || sale.fecha || sale.timestamp)}
              </p>
            </div>
            <div className="text-end">
              <h5 className="mb-1">EMPRESA S.A.</h5>
              <p className="mb-0">Dirección de la Empresa</p>
              <p className="mb-0">Teléfono: +123 456 7890</p>
              <p className="mb-0">Email: info@empresa.com</p>
            </div>
          </div>

          <hr className="my-4" />

          <div className="row mb-4">
            <div className="col-md-6">
              <h6 className="text-uppercase">Cliente</h6>
              <p className="mb-1">
                <strong>Nombre:</strong> {sale.client || sale.cliente || 'Cliente general'}
              </p>
              {sale.clienteInfo && (
                <>
                  {sale.clienteInfo.email && <p className="mb-1"><strong>Email:</strong> {sale.clienteInfo.email}</p>}
                  {sale.clienteInfo.telefono && <p className="mb-1"><strong>Teléfono:</strong> {sale.clienteInfo.telefono}</p>}
                  {sale.clienteInfo.direccion && <p className="mb-1"><strong>Dirección:</strong> {sale.clienteInfo.direccion}</p>}
                </>
              )}
            </div>
            <div className="col-md-6 text-md-end">
              <h6 className="text-uppercase">Detalles de Pago</h6>
              <p className="mb-1">
                <strong>Método:</strong>{' '}
                {sale.paymentMethod === 'efectivo' ? 'Efectivo' : sale.paymentMethod === 'tarjeta' ? 'Tarjeta' : sale.paymentMethod || 'No especificado'}
              </p>
              <p className="mb-1">
                <strong>Estado:</strong> Pagado
              </p>
              {sale.paymentMethod === 'efectivo' && (
                <>
                  <p className="mb-1"><strong>Recibido:</strong> ${(sale.amountReceived || 0).toFixed(2)}</p>
                  <p className="mb-1"><strong>Cambio:</strong> ${(sale.change || 0).toFixed(2)}</p>
                </>
              )}
            </div>
          </div>

          <div className="table-responsive mb-4">
            <table className="table table-bordered">
              <thead className="bg-light">
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Producto</th>
                  <th scope="col" className="text-center">Cantidad</th>
                  <th scope="col" className="text-end">Precio</th>
                  <th scope="col" className="text-end">Total</th>
                </tr>
              </thead>
              <tbody>
                {Array.isArray(sale.items) ? (
                  sale.items.map((item, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{item.nombre || item.name || 'Producto sin nombre'}</td>
                      <td className="text-center">{item.cantidad || item.quantity || 1}</td>
                      <td className="text-end">${(item.precio || item.precioUnitario || item.price || 0).toFixed(2)}</td>
                      <td className="text-end">${(item.subtotal || item.total || ((item.precio || item.precioUnitario || item.price || 0) * (item.cantidad || item.quantity || 1)) || 0).toFixed(2)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center">No hay detalles de productos disponibles</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="4" className="text-end"><strong>TOTAL</strong></td>
                  <td className="text-end"><strong>${(sale.total || 0).toFixed(2)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-4 text-muted">
            <h6>Notas:</h6>
            <p>Gracias por su compra. Este documento sirve como comprobante de pago.</p>
          </div>
          
          <div className="text-center mt-5 pt-3 border-top">
            <p className="small text-muted mb-0">Este documento no tiene validez fiscal sin el sello de la empresa.</p>
          </div>
        </div>
      </Modal.Body>
      
      <Modal.Footer className="d-flex justify-content-center align-items-center">
        {/* Botón principal mejorado */}
        
      </Modal.Footer>
    </Modal>
  );
};

export default InvoiceModal;