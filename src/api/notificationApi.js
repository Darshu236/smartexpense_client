// client/src/api/notificationApi.js - Notification system for split expenses
import axios from 'axios';

// Get base URL from environment or default to localhost
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken') || 
                localStorage.getItem('token') || 
                sessionStorage.getItem('authToken') ||
                sessionStorage.getItem('token');
                
  if (token) {
    config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }
  
  return config;
});

// Enhanced error handling
api.interceptors.response.use(
  (response) => {
    console.log('✅ Notification API Success:', {
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status
    });
    return response;
  },
  (error) => {
    console.warn('❌ Notification API Error:', {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    
    if (error.response?.status === 401) {
      return Promise.resolve({
        data: {
          success: false,
          authError: true,
          message: 'Authentication required',
          status: 401
        }
      });
    }
    
    return Promise.resolve({
      data: {
        success: false,
        message: error.response?.data?.message || error.message,
        status: error.response?.status || 500
      }
    });
  }
);

// ============================
// NOTIFICATION API FUNCTIONS
// ============================

/**
 * Send notification to friends about a new split expense
 * @param {Object} notificationData - The notification details
 * @param {string} notificationData.expenseId - The expense ID
 * @param {Array} notificationData.friendIds - Array of friend IDs to notify
 * @param {string} notificationData.type - Type of notification (e.g., 'expense_created')
 * @param {Object} notificationData.data - Additional data for the notification
 */
export const sendExpenseNotification = async (notificationData) => {
  try {
    const { expenseId, friendIds, type = 'expense_created', data = {} } = notificationData;
    
    console.log('📧 Sending expense notification:', {
      expenseId,
      friendIds,
      type
    });
    
    if (!expenseId || !friendIds || friendIds.length === 0) {
      throw new Error('Expense ID and friend IDs are required');
    }
    
    const response = await api.post('/notifications/send', {
      expenseId,
      recipientIds: friendIds,
      type,
      data
    });
    
    if (response.data.authError) {
      return {
        success: false,
        message: 'Authentication required to send notifications',
        authError: true
      };
    }
    
    console.log('✅ Notification sent successfully:', response.data);
    return {
      success: true,
      ...response.data
    };
    
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    return {
      success: false,
      message: error.message || 'Failed to send notification'
    };
  }
};

/**
 * Fetch notifications for the current user
 */
export const fetchNotifications = async (filters = {}) => {
  try {
    const { unreadOnly = false, type = null, limit = 50 } = filters;
    
    console.log('📬 Fetching notifications...');
    
    const params = {
      limit,
      ...(unreadOnly && { unreadOnly: true }),
      ...(type && { type })
    };
    
    const response = await api.get('/notifications', { params });
    
    if (response.data.authError) {
      return {
        success: false,
        message: 'Authentication required',
        authError: true,
        notifications: []
      };
    }
    
    const notifications = response.data.notifications || response.data.data || [];
    
    console.log('✅ Fetched notifications:', {
      count: notifications.length,
      unread: notifications.filter(n => !n.read).length
    });
    
    return {
      success: true,
      notifications,
      unreadCount: notifications.filter(n => !n.read).length
    };
    
  } catch (error) {
    console.error('❌ Error fetching notifications:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch notifications',
      notifications: []
    };
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    console.log('✓ Marking notification as read:', notificationId);
    
    const response = await api.put(`/notifications/${notificationId}/read`);
    
    if (response.data.authError) {
      return {
        success: false,
        message: 'Authentication required',
        authError: true
      };
    }
    
    console.log('✅ Notification marked as read');
    return {
      success: true,
      ...response.data
    };
    
  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    return {
      success: false,
      message: error.message || 'Failed to mark notification as read'
    };
  }
};

/**
 * Mark all notifications as read
 */
export const markAllNotificationsAsRead = async () => {
  try {
    console.log('✓ Marking all notifications as read...');
    
    const response = await api.put('/notifications/read-all');
    
    if (response.data.authError) {
      return {
        success: false,
        message: 'Authentication required',
        authError: true
      };
    }
    
    console.log('✅ All notifications marked as read');
    return {
      success: true,
      ...response.data
    };
    
  } catch (error) {
    console.error('❌ Error marking all notifications as read:', error);
    return {
      success: false,
      message: error.message || 'Failed to mark all notifications as read'
    };
  }
};

/**
 * Delete a notification
 */
export const deleteNotification = async (notificationId) => {
  try {
    console.log('🗑️ Deleting notification:', notificationId);
    
    const response = await api.delete(`/notifications/${notificationId}`);
    
    if (response.data.authError) {
      return {
        success: false,
        message: 'Authentication required',
        authError: true
      };
    }
    
    console.log('✅ Notification deleted');
    return {
      success: true,
      ...response.data
    };
    
  } catch (error) {
    console.error('❌ Error deleting notification:', error);
    return {
      success: false,
      message: error.message || 'Failed to delete notification'
    };
  }
};

/**
 * Get unread notification count
 */
export const getUnreadCount = async () => {
  try {
    const response = await api.get('/notifications/unread-count');
    
    if (response.data.authError) {
      return {
        success: false,
        count: 0,
        authError: true
      };
    }
    
    return {
      success: true,
      count: response.data.count || 0
    };
    
  } catch (error) {
    console.error('❌ Error fetching unread count:', error);
    return {
      success: false,
      count: 0,
      message: error.message
    };
  }
};

// Alias for backward compatibility
export const getNotifications = fetchNotifications;

// Export all functions
export default {
  sendExpenseNotification,
  fetchNotifications,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getUnreadCount
};