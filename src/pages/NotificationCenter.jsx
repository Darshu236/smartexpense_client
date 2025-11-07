import React, { useState, useEffect, useRef } from 'react';
import { 
  fetchNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  getUnreadCount,
  deleteNotification
} from '../api/notificationApi';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'unread'
  const dropdownRef = useRef(null);

  // Load notifications on mount and set up polling
  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      loadUnreadCount();
      if (isOpen) {
        loadNotifications();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isOpen, filter]); // Added filter dependency

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const result = await fetchNotifications({ 
        limit: 50,
        unreadOnly: filter === 'unread'
      });
      if (result.success) {
        setNotifications(result.notifications || []);
        setUnreadCount(result.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const result = await getUnreadCount();
      if (result.success) {
        setUnreadCount(result.count || 0);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleBellClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      loadNotifications();
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read
    if (!notification.read) {
      await markNotificationAsRead(notification._id);
      
      // If on "unread" filter, remove the notification from view
      if (filter === 'unread') {
        setNotifications(prev => prev.filter(n => n._id !== notification._id));
      } else {
        // If on "all" filter, just mark as read
        setNotifications(prev =>
          prev.map(n =>
            n._id === notification._id ? { ...n, read: true } : n
          )
        );
      }
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
      setIsOpen(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const result = await markAllNotificationsAsRead();
      if (result.success) {
        // If on "unread" filter, clear all notifications
        if (filter === 'unread') {
          setNotifications([]);
        } else {
          // If on "all" filter, mark all as read
          setNotifications(prev =>
            prev.map(n => ({ ...n, read: true, readAt: new Date() }))
          );
        }
        
        // Set unread count to 0
        setUnreadCount(0);
        
        console.log('✅ All notifications marked as read locally');
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDeleteNotification = async (e, notificationId) => {
    e.stopPropagation();
    try {
      // Find the notification to check if it's unread
      const notificationToDelete = notifications.find(n => n._id === notificationId);
      const wasUnread = notificationToDelete && !notificationToDelete.read;
      
      const result = await deleteNotification(notificationId);
      if (result.success) {
        // Remove from local state immediately
        setNotifications(prev => prev.filter(n => n._id !== notificationId));
        
        // Update unread count if notification was unread
        if (wasUnread) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    // Reload will happen automatically due to useEffect dependency
  };

  const getNotificationIcon = (type) => {
    const icons = {
      expense_created: '💰',
      expense_updated: '📝',
      expense_deleted: '🗑️',
      payment_received: '✅',
      payment_reminder: '⏰',
      friend_request: '👥',
      friend_accepted: '🤝',
      group_invite: '👨‍👩‍👧‍👦',
      settlement_request: '💳',
      comment_added: '💬',
      mention: '🏷️'
    };
    return icons[type] || '🔔';
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return new Date(date).toLocaleDateString();
    }
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  const filteredNotifications = filter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={handleBellClick}
        style={{
          position: 'relative',
          padding: '8px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#4B5563',
          transition: 'color 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = '#111827'}
        onMouseLeave={(e) => e.currentTarget.style.color = '#4B5563'}
        aria-label="Notifications"
        title="Notifications"
      >
        <svg
          style={{ width: '24px', height: '24px' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '0',
            right: '0',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2px 6px',
            fontSize: '11px',
            fontWeight: 'bold',
            lineHeight: '1',
            color: 'white',
            backgroundColor: '#EF4444',
            borderRadius: '9999px',
            transform: 'translate(50%, -50%)',
            minWidth: '18px'
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          right: '0',
          marginTop: '8px',
          width: '384px',
          maxWidth: '90vw',
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          border: '1px solid #E5E7EB',
          zIndex: '50',
          maxHeight: '32rem',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideDown 0.2s ease-out'
        }}>
          {/* Header */}
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid #E5E7EB',
            backgroundColor: '#F9FAFB'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827',
                margin: '0'
              }}>
                Notifications
              </h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  style={{
                    fontSize: '13px',
                    color: '#2563EB',
                    fontWeight: '500',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '4px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#DBEAFE';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div style={{
              display: 'flex',
              gap: '8px'
            }}>
              <button
                onClick={() => handleFilterChange('all')}
                style={{
                  fontSize: '13px',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '500',
                  backgroundColor: filter === 'all' ? '#3B82F6' : '#F3F4F6',
                  color: filter === 'all' ? 'white' : '#6B7280',
                  transition: 'all 0.2s'
                }}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => handleFilterChange('unread')}
                style={{
                  fontSize: '13px',
                  padding: '4px 12px',
                  borderRadius: '16px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: '500',
                  backgroundColor: filter === 'unread' ? '#3B82F6' : '#F3F4F6',
                  color: filter === 'unread' ? 'white' : '#6B7280',
                  transition: 'all 0.2s'
                }}
              >
                Unread ({unreadCount})
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div style={{
            overflowY: 'auto',
            flex: '1',
            minHeight: '100px',
            maxHeight: '450px'
          }}>
            {loading ? (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '32px'
              }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #E5E7EB',
                  borderTopColor: '#3B82F6',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }}></div>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '48px 16px',
                color: '#6B7280'
              }}>
                <svg
                  style={{
                    width: '64px',
                    height: '64px',
                    marginBottom: '16px',
                    color: '#D1D5DB'
                  }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                <p style={{ fontSize: '14px', margin: '0' }}>
                  {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                </p>
              </div>
            ) : (
              <div>
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification._id}
                    onClick={() => handleNotificationClick(notification)}
                    style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #F3F4F6',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s',
                      backgroundColor: notification.read ? 'white' : '#EFF6FF',
                      position: 'relative'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = notification.read ? '#F9FAFB' : '#DBEAFE';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = notification.read ? 'white' : '#EFF6FF';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'start',
                      gap: '12px'
                    }}>
                      {/* Icon */}
                      <div style={{
                        flexShrink: '0',
                        marginTop: '2px',
                        fontSize: '24px'
                      }}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div style={{
                        flex: '1',
                        minWidth: '0'
                      }}>
                        {/* Sender info */}
                        {notification.senderId && (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            marginBottom: '4px'
                          }}>
                            {notification.senderId.profilePicture ? (
                              <img
                                src={notification.senderId.profilePicture}
                                alt={notification.senderId.name}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  objectFit: 'cover'
                                }}
                              />
                            ) : (
                              <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                backgroundColor: '#D1D5DB',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: '500',
                                color: '#4B5563'
                              }}>
                                {notification.senderId.name?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span style={{
                              fontSize: '13px',
                              fontWeight: '500',
                              color: '#111827'
                            }}>
                              {notification.senderId.name}
                            </span>
                          </div>
                        )}

                        {/* Title */}
                        <p style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#111827',
                          margin: '0 0 4px 0'
                        }}>
                          {notification.title}
                        </p>

                        {/* Message */}
                        <p style={{
                          fontSize: '13px',
                          color: '#6B7280',
                          margin: '0 0 8px 0',
                          lineHeight: '1.4',
                          display: '-webkit-box',
                          WebkitLineClamp: '2',
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden'
                        }}>
                          {notification.message}
                        </p>

                        {/* Time and actions */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                          }}>
                            <span style={{
                              fontSize: '12px',
                              color: '#9CA3AF'
                            }}>
                              {getTimeAgo(notification.createdAt)}
                            </span>
                            {!notification.read && (
                              <span style={{
                                width: '8px',
                                height: '8px',
                                backgroundColor: '#3B82F6',
                                borderRadius: '50%',
                                display: 'inline-block'
                              }}></span>
                            )}
                          </div>

                          {/* Delete button */}
                          <button
                            onClick={(e) => handleDeleteNotification(e, notification._id)}
                            style={{
                              padding: '4px 8px',
                              fontSize: '12px',
                              color: '#EF4444',
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              borderRadius: '4px',
                              opacity: '0.6',
                              transition: 'all 0.2s'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.opacity = '1';
                              e.currentTarget.style.backgroundColor = '#FEE2E2';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.opacity = '0.6';
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                            title="Delete notification"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Priority indicator */}
                      {notification.priority === 'high' && (
                        <div style={{ flexShrink: '0' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '500',
                            backgroundColor: '#FEE2E2',
                            color: '#991B1B'
                          }}>
                            High
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid #E5E7EB',
              backgroundColor: '#F9FAFB'
            }}>
              <button
                onClick={() => {
                  setIsOpen(false);
                  window.location.href = '/notifications';
                }}
                style={{
                  fontSize: '13px',
                  color: '#2563EB',
                  fontWeight: '500',
                  width: '100%',
                  textAlign: 'center',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#DBEAFE';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                View all notifications →
              </button>
            </div>
          )}
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Scrollbar styling */
        div::-webkit-scrollbar {
          width: 6px;
        }

        div::-webkit-scrollbar-track {
          background: #F3F4F6;
        }

        div::-webkit-scrollbar-thumb {
          background: #D1D5DB;
          border-radius: 3px;
        }

        div::-webkit-scrollbar-thumb:hover {
          background: #9CA3AF;
        }
      `}</style>
    </div>
  );
};

export default NotificationBell;