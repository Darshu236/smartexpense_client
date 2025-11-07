
// src/components/UsersList.jsx
import React from 'react';
import { useSocket } from '../context/SocketContext';

const UsersList = ({ onUserSelect, selectedUser }) => {
  const { onlineUsers, getUnreadCount, getTotalUnreadCount, isUserOnline } = useSocket();

  const totalUnread = getTotalUnreadCount();

  return (
    <div className="users-list">
      <div className="users-header">
        <h3>Contacts</h3>
        {totalUnread > 0 && (
          <span className="total-unread-badge">{totalUnread}</span>
        )}
      </div>
      
      <div className="users-container">
        {onlineUsers.length === 0 ? (
          <div className="no-users">
            <p>No users online</p>
          </div>
        ) : (
          onlineUsers.map(user => {
            const unreadCount = getUnreadCount(user.userId);
            const isOnline = isUserOnline(user.userId);
            const isSelected = selectedUser?.userId === user.userId;
            
            return (
              <div 
                key={user.userId}
                className={`user-item ${isSelected ? 'selected' : ''} ${isOnline ? 'online' : 'offline'}`}
                onClick={() => onUserSelect(user)}
              >
                <div className="user-avatar">
                  <span>{user.username?.charAt(0).toUpperCase() || '?'}</span>
                  <div className={`status-dot ${isOnline ? 'online' : 'offline'}`}></div>
                </div>
                
                <div className="user-info">
                  <div className="user-name">{user.username}</div>
                  <div className="user-status">
                    {isOnline ? 'Online' : `Last seen ${formatLastSeen(user.lastSeen)}`}
                  </div>
                </div>
                
                {unreadCount > 0 && (
                  <div className="unread-badge">{unreadCount}</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return 'recently';
  
  const now = new Date();
  const lastSeenDate = new Date(lastSeen);
  const diffInMinutes = Math.floor((now - lastSeenDate) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
  return `${Math.floor(diffInMinutes / 1440)}d ago`;
};

export default UsersList;