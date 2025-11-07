// src/components/notifications/NotificationForm.jsx
import React, { useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';

const NotificationForm = ({ onSuccess }) => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { addNotification, error } = useNotifications();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      alert('Please fill in both title and message');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await addNotification({
        title: title.trim(),
        message: message.trim()
      });
      
      // Reset form
      setTitle('');
      setMessage('');
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
      
      alert('Notification created successfully!');
    } catch (err) {
      console.error('Failed to create notification:', err);
      alert('Failed to create notification. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="notification-form">
      <h2>Create New Notification</h2>
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title:</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter notification title"
            disabled={isSubmitting}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="message">Message:</label>
          <textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter notification message"
            rows={4}
            disabled={isSubmitting}
            required
          />
        </div>
        
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="submit-btn"
        >
          {isSubmitting ? 'Creating...' : 'Create Notification'}
        </button>
      </form>
    </div>
  );
};

export default NotificationForm;