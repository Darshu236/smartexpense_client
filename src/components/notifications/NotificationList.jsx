// src/components/notifications/NotificationList.jsx
import React from 'react';
import NotificationItem from './NotificationItem';
import { useNotifications } from '../../hooks/useNotifications';

const NotificationList = () => {
  const { notifications, loading, error, removeNotification } = useNotifications();

  if (loading) {
    return (
      <div className="notification-loading">
        <p>Loading notifications...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="notification-error">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="notification-empty">
        <p>No notifications yet.</p>
      </div>
    );
  }

  return (
    <div className="notification-list">
      <h2>Notifications ({notifications.length})</h2>
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDelete={removeNotification}
        />
      ))}
    </div>
  );
};

export default NotificationList;