import React, { useState, useEffect, useRef } from "react";
import { Bell, ChevronDown, LogOut, User, X, Settings, MoreVertical, Lock } from "lucide-react";
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification 
} from '../api/notificationApi';
import { getUserProfile as getUserProfileAPI, getStoredUser } from '../api/userApi';
import { logout } from '../api/authApi';

const Navbar = () => {
  const [notifications, setNotifications] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Generate avatar URL based on user name or initials
  const generateAvatarUrl = (name, userId) => {
    if (!name) return `https://ui-avatars.com/api/?name=User&background=667eea&color=fff&size=100`;
    
    const initials = name.split(' ').map(word => word[0]).join('').substring(0, 2).toUpperCase();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=667eea&color=fff&size=100&bold=true`;
  };

  // Fetch user profile using the centralized API
  const fetchUserProfile = async () => {
    setProfileLoading(true);
    try {
      console.log('📄 Fetching user profile...');
      
      // First, try to get from API (will use cache if available)
      const response = await getUserProfileAPI(false);
      
      if (response.success && response.user) {
        const userData = response.user;
        
        const profile = {
          name: userData.name || userData.fullName || 'User',
          email: userData.email || '',
          userId: userData.userId || userData.id || userData._id || 'Unknown',
          phone: userData.phone || userData.phoneNumber || '',
          avatar: userData.avatar || 
                  userData.profileImage || 
                  generateAvatarUrl(userData.name || 'User', userData.userId || userData.id || 'Unknown')
        };

        console.log('✅ User profile loaded:', profile);
        setUserProfile(profile);
        return;
      }

      // Fallback to stored user if API fails
      const storedUser = getStoredUser();
      if (storedUser) {
        const profile = {
          name: storedUser.name || storedUser.fullName || 'User',
          email: storedUser.email || '',
          userId: storedUser.userId || storedUser.id || storedUser._id || 'Unknown',
          phone: storedUser.phone || storedUser.phoneNumber || '',
          avatar: storedUser.avatar || 
                  storedUser.profileImage || 
                  generateAvatarUrl(storedUser.name || 'User', storedUser.userId || storedUser.id || 'Unknown')
        };
        
        console.log('✅ User profile loaded from storage:', profile);
        setUserProfile(profile);
        return;
      }

      // Last resort: create a default profile
      throw new Error('Unable to load user profile');

    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
      
      // Try one more time to get stored user
      const storedUser = getStoredUser();
      if (storedUser) {
        const profile = {
          name: storedUser.name || 'User',
          email: storedUser.email || '',
          userId: storedUser.userId || storedUser.id || 'Unknown',
          phone: storedUser.phone || '',
          avatar: generateAvatarUrl(storedUser.name || 'User', storedUser.userId || 'Unknown')
        };
        setUserProfile(profile);
      } else {
        // Set a fallback profile
        setUserProfile({
          name: 'User',
          email: '',
          userId: 'Unknown',
          avatar: generateAvatarUrl('User', 'Unknown'),
          phone: ''
        });
        
        // Show error if it's a connection issue
        if (error.message?.includes('Failed to fetch') || error.message?.includes('Network')) {
          setError('Unable to connect to server. Using cached data.');
          setTimeout(() => setError(null), 5000);
        }
      }
    } finally {
      setProfileLoading(false);
    }
  };

  // Fetch notifications from database
  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔔 Fetching notifications from database...');
      const response = await getNotifications();
      
      if (!response.success) {
        if (response.authError) {
          setError('Please log in to view notifications');
          setNotifications([]);
          return;
        }
        throw new Error(response.message || 'Failed to fetch notifications');
      }
      
      const notificationsArray = response.notifications || [];
      console.log('✅ Notifications fetched:', notificationsArray.length);
      
      const transformedNotifications = notificationsArray.map(notification => ({
        id: notification._id || notification.id,
        title: notification.title || notification.message?.substring(0, 30) || 'Notification',
        message: notification.message,
        time: notification.createdAt ? getTimeAgo(notification.createdAt) : 'Just now',
        timestamp: notification.createdAt,
        read: notification.read || notification.isRead || false,
        type: notification.type || 'info',
        icon: getNotificationIcon(notification.type),
        data: notification.data || notification.metadata || {}
      }));
      
      setNotifications(transformedNotifications);
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      
      // Don't show error for connection issues if we have cached notifications
      if (notifications.length === 0) {
        setError(error.message || 'Failed to load notifications');
      }
      
      if (notifications.length === 0) {
        setNotifications([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchUserProfile();
    fetchNotifications();
    
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (notificationId) => {
    try {
      console.log(`📖 Marking notification ${notificationId} as read...`);
      await markNotificationAsRead(notificationId);
      
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      
      console.log('✅ Notification marked as read');
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      setError('Failed to mark notification as read');
      setTimeout(() => setError(null), 3000);
    }
  };

  const markAllAsRead = async () => {
    try {
      console.log('📖 Marking all notifications as read...');
      await markAllNotificationsAsRead();
      
      setNotifications(prev => 
        prev.map(n => ({ ...n, read: true }))
      );
      
      console.log('✅ All notifications marked as read');
    } catch (error) {
      console.error('❌ Error marking all notifications as read:', error);
      setError('Failed to mark all notifications as read');
      
      setTimeout(() => {
        setError(null);
        fetchNotifications();
      }, 3000);
    }
  };

  const deleteNotificationHandler = async (notificationId) => {
    try {
      console.log(`🗑️ Deleting notification ${notificationId}...`);
      await deleteNotification(notificationId);
      
      setNotifications(prev => 
        prev.filter(n => n.id !== notificationId)
      );
      
      console.log('✅ Notification deleted');
    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      setError('Failed to delete notification');
      
      setTimeout(() => {
        setError(null);
        fetchNotifications();
      }, 3000);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      case 'reminder': return '🔔';
      case 'error': return '❌';
      case 'expense_split': return '💰';
      default: return '📱';
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now - time) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return time.toLocaleDateString();
  };

  const handleNotificationClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }

    if (notification.type === 'expense_split' && notification.data?.splitExpenseId) {
      console.log('Navigate to expense:', notification.data.splitExpenseId);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('Logging out...');
      await logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API fails
      localStorage.clear();
      window.location.href = '/login';
    }
  };

  const handleChangePassword = () => {
    console.log('Change password...');
    // Navigate to change password page
    window.location.href = '/change-password';
  };

  const handleAvatarError = (e) => {
    e.target.src = generateAvatarUrl(userProfile?.name || 'User', userProfile?.userId || 'Unknown');
  };

  if (profileLoading || !userProfile) {
    return (
      <div style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
        <style>{`
          .navbar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 70px;
            padding: 0 32px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: white;
            border-bottom: 1px solid #e5e7eb;
            z-index: 1000;
          }
          .loading-indicator {
            display: flex;
            align-items: center;
            gap: 8px;
            color: #6b7280;
            font-size: 14px;
          }
          .spinner {
            width: 16px;
            height: 16px;
            border: 2px solid #e5e7eb;
            border-top: 2px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
        <nav className="navbar">
          <div className="navbar-brand">
            <h1>Smart Expense Tracker</h1>
          </div>
          <div className="loading-indicator">
            <div className="spinner"></div>
            Loading profile...
          </div>
        </nav>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 70px;
          padding: 0 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: white;
          border-bottom: 1px solid #e5e7eb;
          z-index: 1000;
        }

        .navbar-brand h1 {
          font-size: 20px;
          font-weight: 600;
          color: #667eea;
        }

        .navbar-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .notification-btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: transparent;
          border: none;
          color: #6b7280;
          cursor: pointer;
          transition: all 0.2s ease;
          border-radius: 8px;
        }

        .notification-btn:hover {
          background: #f3f4f6;
          color: #374151;
        }

        .notification-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          background: #ef4444;
          color: white;
          border-radius: 50%;
          min-width: 18px;
          height: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
        }

        .profile-wrapper {
          position: relative;
        }

        .profile-trigger {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 6px 12px;
          border-radius: 8px;
          transition: all 0.2s;
          background: transparent;
          border: none;
        }

        .profile-trigger:hover {
          background: #f3f4f6;
        }

        .profile-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #e5e7eb;
          transition: border-color 0.2s;
        }

        .profile-trigger:hover .profile-avatar {
          border-color: #667eea;
        }

        .profile-text {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
          max-width: 100px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .chevron {
          color: #9ca3af;
          transition: transform 0.2s;
        }

        .profile-trigger.open .chevron {
          transform: rotate(180deg);
        }

        .profile-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 320px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          overflow: hidden;
          z-index: 1001;
          animation: slideDown 0.2s ease-out;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .profile-card {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 24px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .profile-card::before {
          content: '';
          position: absolute;
          top: -50%;
          right: -30%;
          width: 150px;
          height: 150px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 50%;
        }

        .profile-avatar-large {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid rgba(255, 255, 255, 0.3);
          margin: 0 auto 16px auto;
          display: block;
          position: relative;
          z-index: 2;
        }

        .profile-name {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 4px;
          position: relative;
          z-index: 2;
          word-break: break-word;
        }

        .profile-id {
          font-size: 14px;
          opacity: 0.9;
          font-weight: 500;
          position: relative;
          z-index: 2;
          word-break: break-word;
        }

        .profile-details {
          padding: 20px 24px;
          background: #f8fafc;
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
        }

        .detail-row:last-child {
          border-bottom: none;
        }

        .detail-label {
          color: #6b7280;
          font-weight: 500;
          min-width: 80px;
        }

        .detail-value {
          color: #374151;
          font-weight: 600;
          text-align: right;
          max-width: 180px;
          word-break: break-word;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .profile-actions {
          padding: 12px;
          background: white;
        }

        .profile-action {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 16px;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: #374151;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          margin-bottom: 4px;
        }

        .profile-action:hover {
          background: #f3f4f6;
        }

        .profile-action:last-child {
          margin-bottom: 0;
        }

        .profile-action.logout {
          color: #dc2626;
        }

        .profile-action.logout:hover {
          background: #fef2f2;
        }

        .notification-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 400px;
          max-height: 500px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          overflow: hidden;
          animation: slideDown 0.2s ease-out;
          z-index: 1001;
        }

        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #f3f4f6;
          background: #f8fafc;
        }

        .dropdown-title {
          font-size: 16px;
          font-weight: 600;
          color: #374151;
        }

        .header-actions {
          display: flex;
          gap: 8px;
        }

        .header-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .mark-all-btn {
          background: #667eea;
          color: white;
        }

        .mark-all-btn:hover {
          background: #5a67d8;
        }

        .mark-all-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .close-btn {
          background: #f3f4f6;
          color: #6b7280;
          padding: 6px;
          border-radius: 6px;
        }

        .close-btn:hover {
          background: #e5e7eb;
        }

        .notification-list {
          max-height: 400px;
          overflow-y: auto;
        }

        .notification-item {
          padding: 16px 20px;
          border-bottom: 1px solid #f3f4f6;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .notification-item:hover {
          background: #f8fafc;
        }

        .notification-item:last-child {
          border-bottom: none;
        }

        .notification-item.unread {
          background: #eff6ff;
          border-left: 3px solid #3b82f6;
        }

        .notification-content {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .notification-main {
          flex: 1;
        }

        .notification-title {
          font-weight: 600;
          font-size: 14px;
          color: #111827;
          margin-bottom: 4px;
        }

        .notification-message {
          font-size: 13px;
          color: #6b7280;
          line-height: 1.4;
        }

        .notification-time {
          font-size: 12px;
          color: #9ca3af;
          white-space: nowrap;
          margin-left: 16px;
        }

        .empty-state {
          padding: 40px 20px;
          text-align: center;
          color: #6b7280;
        }

        .empty-title {
          font-size: 16px;
          font-weight: 500;
          margin-bottom: 4px;
          color: #374151;
        }

        .empty-message {
          font-size: 14px;
        }

        .loading-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          color: #6b7280;
          font-size: 14px;
          gap: 8px;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid #e5e7eb;
          border-top: 2px solid #667eea;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .error-toast {
          position: fixed;
          top: 80px;
          right: 32px;
          background: #fee2e2;
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid #fecaca;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          z-index: 1002;
          animation: slideInRight 0.3s ease-out;
        }

        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @media (max-width: 768px) {
          .navbar {
            padding: 0 20px;
          }
          
          .notification-dropdown {
            width: calc(100vw - 40px);
            right: 20px;
            left: 20px;
          }
          
          .profile-dropdown {
            width: calc(100vw - 40px);
            right: 20px;
          }

          .profile-text {
            display: none;
          }
        }
      `}</style>

      {error && (
        <div className="error-toast">
          {error}
        </div>
      )}

      <nav className="navbar">
        <div className="navbar-brand">
          <h1>Smart Expense Tracker</h1>
        </div>

        <div className="navbar-right">
          <div className="notification-wrapper" ref={notifRef}>
            <button
              className="notification-btn"
              onClick={() => {
                setNotifOpen(!notifOpen);
                if (!notifOpen) {
                  fetchNotifications();
                }
              }}
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="notification-badge">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="notification-dropdown">
                <div className="dropdown-header">
                  <h3 className="dropdown-title">Notifications</h3>
                  <div className="header-actions">
                    {unreadCount > 0 && (
                      <button 
                        className="header-btn mark-all-btn" 
                        onClick={markAllAsRead}
                        disabled={loading}
                      >
                        Mark all read
                      </button>
                    )}
                    <button className="header-btn close-btn" onClick={() => setNotifOpen(false)}>
                      <X size={14} />
                    </button>
                  </div>
                </div>

                <div className="notification-list">
                  {loading && notifications.length === 0 ? (
                    <div className="loading-indicator">
                      <div className="spinner"></div>
                      Loading notifications...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-title">No notifications</div>
                      <div className="empty-message">You're all caught up!</div>
                    </div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`notification-item ${!notification.read ? 'unread' : ''}`}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className="notification-content">
                          <div className="notification-main">
                            <div className="notification-title">{notification.title}</div>
                            <div className="notification-message">{notification.message}</div>
                          </div>
                          <div className="notification-time">{notification.time}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="profile-wrapper" ref={dropdownRef}>
            <button 
              className={`profile-trigger ${dropdownOpen ? 'open' : ''}`}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              <img 
                src={userProfile.avatar} 
                alt={`${userProfile.name}'s avatar`} 
                className="profile-avatar"
                onError={handleAvatarError}
              />
              <span className="profile-text">{userProfile.name}</span>
              <ChevronDown size={16} className="chevron" />
            </button>

            {dropdownOpen && (
              <div className="profile-dropdown">
                <div className="profile-card">
                  <img 
                    src={userProfile.avatar} 
                    alt={`${userProfile.name}'s avatar`} 
                    className="profile-avatar-large"
                    onError={handleAvatarError}
                  />
                  <div className="profile-name">{userProfile.name}</div>
                  <div className="profile-id">{userProfile.userId}</div>
                </div>
                
                <div className="profile-details">
                  {userProfile.email && (
                    <div className="detail-row">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value" title={userProfile.email}>
                        {userProfile.email}
                      </span>
                    </div>
                  )}
                  {userProfile.phone && (
                    <div className="detail-row">
                      <span className="detail-label">Phone:</span>
                      <span className="detail-value">{userProfile.phone}</span>
                    </div>
                  )}
                </div>
                
                <div className="profile-actions">
                  <button className="profile-action" onClick={handleChangePassword}>
                    <Lock size={16} />
                    Change Password
                  </button>
                  <button className="profile-action logout" onClick={handleLogout}>
                    <LogOut size={16} />
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;