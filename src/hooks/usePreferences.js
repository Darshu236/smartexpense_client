import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const usePreferences = () => {
  const [preferences, setPreferences] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchPreferences = () => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE_URL}/preferences`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setPreferences(data.preferences || {}))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPreferences();
  }, []);

  const updatePreferences = async (newPrefs) => {
    setSaving(true);
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE_URL}/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(newPrefs),
    });
    setPreferences(newPrefs);
    setSaving(false);
  };

  const resetPreferences = async () => {
    const token = localStorage.getItem('token');
    await fetch(`${API_BASE_URL}/preferences/reset`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchPreferences();
  };

  return { preferences, updatePreferences, resetPreferences, loading, saving };
};
