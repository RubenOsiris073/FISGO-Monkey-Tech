import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';

const ClientNameModal = ({ show, onHide, onConfirm, loading }) => {
  const [clientName, setClientName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (clientName.trim()) {
      onConfirm(clientName.trim());
      setClientName(''); // Limpiar después de confirmar
    }
  };

  const handleHide = () => {
    setClientName(''); // Limpiar al cerrar
    onHide();
  };

  return (
    <Modal show={show} onHide={handleHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Nombre del Cliente</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Ingrese el nombre del cliente para la factura:</Form.Label>
            <Form.Control
              type="text"
              placeholder="Nombre del cliente"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              disabled={loading}
              autoFocus
              required
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          
          <Button 
            variant="primary" 
            type="submit" 
            disabled={!clientName.trim() || loading}
          >
            {loading ? 'Generando...' : 'Generar Factura'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ClientNameModal;