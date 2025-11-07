// src/hooks/useNotifications.js
import { useState, useEffect } from 'react';
import * as notificationApi from '../api/notificationApi';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all notifications
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationApi.getNotifications();
      setNotifications(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  // Create new notification
  const addNotification = async (notificationData) => {
    try {
      setLoading(true);
      const newNotification = await notificationApi.createNotification(notificationData);
      setNotifications(prev => [newNotification, ...prev]);
      return newNotification;
    } catch (err) {
      setError(err.message || 'Failed to create notification');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Delete notification
  const removeNotification = async (id) => {
    try {
      await notificationApi.deleteNotification(id);
      setNotifications(prev => prev.filter(notification => notification.id !== id));
    } catch (err) {
      setError(err.message || 'Failed to delete notification');
      throw err;
    }
  };

  // Load notifications on component mount
  useEffect(() => {
    fetchNotifications();
  }, []);

  return {
    notifications,
    loading,
    error,
    fetchNotifications,
    addNotification,
    removeNotification,
    setError
  };
};