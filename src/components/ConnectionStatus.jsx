// src/components/ConnectionStatus.jsx
import React from 'react';

const ConnectionStatus = () => {
  const { isConnected } = useSocket();

  if (isConnected) return null;

  return (
    <div className="connection-status-banner">
      <div className="status-content">
        <span className="status-icon">⚠️</span>
        <span>Connecting to chat server...</span>
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
};

export default ConnectionStatus;