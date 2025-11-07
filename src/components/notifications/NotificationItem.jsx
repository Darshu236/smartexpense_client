// src/components/notifications/NotificationItem.jsx
import React from 'react';

const NotificationItem = ({ notification, onDelete }) => {
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this notification?')) {
      onDelete(notification.id);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="notification-item">
      <div className="notification-content">
        <h3 className="notification-title">{notification.title}</h3>
        <p className="notification-message">{notification.message}</p>
        {notification.createdAt && (
          <span className="notification-date">{formatDate(notification.createdAt)}</span>
        )}
      </div>
      <div className="notification-actions">
        <button 
          onClick={handleDelete}
          className="delete-btn"
          aria-label="Delete notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default NotificationItem;