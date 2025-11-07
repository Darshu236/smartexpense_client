import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const usePreferences = () => {
  const [preferences, setPreferences] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get auth token from localStorage
  const getAuthToken = () => {
    return localStorage.getItem('token');
  };

  // Fetch preferences from API
  const fetchPreferences = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/preferences`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        }
        throw new Error(`Failed to fetch preferences: ${response.status}`);
      }

      const data = await response.json();
      setPreferences(data);
    } catch (err) {
      console.error('Error fetching preferences:', err);
      setError(err.message || 'Failed to fetch preferences');
      
      // Set default preferences on error
      setPreferences({
        currency: 'USD',
        language: 'en',
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          sms: false,
          marketing: false
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        dateFormat: 'MM/DD/YYYY',
        numberFormat: 'US'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save preferences to API
  const savePreferences = async (newPreferences) => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/preferences`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newPreferences)
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to save preferences: ${response.status}`);
      }

      const data = await response.json();
      setPreferences(data.preferences);
      return data.preferences;
    } catch (err) {
      console.error('Error saving preferences:', err);
      throw new Error(err.message || 'Failed to save preferences');
    }
  };

  // Reset preferences to defaults
  const resetPreferences = async () => {
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/preferences/reset`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to reset preferences: ${response.status}`);
      }

      const data = await response.json();
      setPreferences(data.preferences);
      return data.preferences;
    } catch (err) {
      console.error('Error resetting preferences:', err);
      throw new Error(err.message || 'Failed to reset preferences');
    }
  };

  // Load preferences on component mount
  useEffect(() => {
    fetchPreferences();
  }, []);

  return {
    preferences,
    isLoading,
    error,
    savePreferences,
    resetPreferences,
    refetchPreferences: fetchPreferences
  };
};