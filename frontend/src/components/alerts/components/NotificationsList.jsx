import React from 'react';
import { Card, Button, Row, Col, Badge } from 'react-bootstrap';
import { FaBell, FaTerminal, FaCheckCircle } from 'react-icons/fa';

/**
 * Componente para renderizar la lista de notificaciones
 */
const NotificationsList = ({ 
  notifications, 
  loadNotifications, 
  markAsRead, 
  getNotificationIcon,
  getCategoryIcon,
  getPriorityBadge 
}) => {
  return (
    <Card>
      <Card.Header>
        <h5 className="mb-0">
          <FaBell className="me-2" />
          Notificaciones del Sistema
          <Button 
            variant="outline-primary" 
            size="sm" 
            className="float-end"
            onClick={loadNotifications}
          >
            <FaTerminal className="me-1" />
            Actualizar
          </Button>
        </h5>
      </Card.Header>
      <Card.Body className="p-0">
        {notifications.length === 0 ? (
          <div className="text-center py-4">
            <FaCheckCircle className="text-success mb-2" size={48} />
            <h5>No hay notificaciones</h5>
            <p className="text-muted">Todo está funcionando correctamente</p>
          </div>
        ) : (
          <div className="notifications-list">
            {notifications.map((notification) => (
              <div 
                key={notification.id} 
                className={`notification-item ${!notification.read ? 'unread' : ''}`}
                onClick={() => markAsRead(notification.id)}
              >
                <Row className="align-items-center">
                  <Col md={1} className="text-center">
                    {getNotificationIcon(notification.type)}
                  </Col>
                  <Col md={8}>
                    <div className="notification-content">
                      <div className="d-flex align-items-center mb-1">
                        {getCategoryIcon(notification.category)}
                        <h6 className="mb-0 fw-bold">{notification.title}</h6>
                        {!notification.read && <Badge bg="primary" className="ms-2">Nuevo</Badge>}
                      </div>
                      <p className="mb-1 text-muted">{notification.message}</p>
                      <small className="text-muted">
                        {notification.timestamp.toLocaleString('es-MX')}
                      </small>
                    </div>
                  </Col>
                  <Col md={3} className="text-end">
                    <div className="notification-actions">
                      {getPriorityBadge(notification.priority)}
                      
                    </div>
                  </Col>
                </Row>
              </div>
            ))}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default NotificationsList;
