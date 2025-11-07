import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import CurrencyManager from '../utils/currencyManager';
import './Settings.css';


const SettingsPage = () => {
  const { user } = useAuth(); // Get user from AuthContext
  
  const [settings, setSettings] = useState({
    currency: 'INR',
    theme: 'light',
    budgetLimit: 50000,
    lowBalanceAlert: true,
    lowBalanceThreshold: 5000
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get token from user object
  const getToken = () => {
    // Try multiple sources for the token
    return user?.token || 
           sessionStorage.getItem('token') || 
           localStorage.getItem('token') || 
           localStorage.getItem('authToken');
  };

  // Load settings from database on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = getToken();
      
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      const response = await fetch('http://localhost:4000/api/settings', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to load settings');
      }

      const loadedSettings = await response.json();
      
      // Merge with existing settings
      const mergedSettings = {
        ...settings,
        ...loadedSettings
      };
      
      setSettings(mergedSettings);
      
      // Apply theme immediately after loading
      if (loadedSettings.theme) {
        applyTheme(loadedSettings.theme);
      }
      
      // 🆕 UPDATE CURRENCY CACHE
      if (loadedSettings.currency) {
        CurrencyManager.cachedCurrency = loadedSettings.currency;
        CurrencyManager.cachedSymbol = CurrencyManager.getSymbol(loadedSettings.currency);
        console.log('💰 Settings.jsx updated currency cache:', loadedSettings.currency, CurrencyManager.cachedSymbol);
      }
      
    } catch (error) {
      console.error('Error loading settings:', error);
      setError(error.message);
      // Keep default settings if loading fails
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    
    try {
      const token = getToken();
      
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // Save settings to database
      const response = await fetch('http://localhost:4000/api/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save settings');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      
      // 🆕 CLEAR CURRENCY CACHE so other pages fetch fresh currency
      CurrencyManager.clearCache();
      console.log('💰 Currency cache cleared after settings save');
      
    } catch (error) {
      console.error('Error saving settings:', error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    
    // Apply theme immediately for better UX
    if (key === 'theme') {
      applyTheme(value);
    }
  };

  // Apply theme to document
  const applyTheme = (theme) => {
    const root = document.documentElement;
    
    // Remove all theme classes first
    root.classList.remove('dark-theme', 'light-theme');
    
    if (theme === 'dark') {
      root.classList.add('dark-theme');
    } else if (theme === 'light') {
      root.classList.add('light-theme');
    } else if (theme === 'auto') {
      // Auto theme based on system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark-theme');
      } else {
        root.classList.add('light-theme');
      }
    }
    
    console.log('Theme applied:', theme, 'Classes:', root.className);
  };

  // Apply theme on mount and when settings change
  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  // Listen for system theme changes when in auto mode
  useEffect(() => {
    if (settings.theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = () => {
        applyTheme('auto');
      };
      
      mediaQuery.addEventListener('change', handleChange);
      
      return () => {
        mediaQuery.removeEventListener('change', handleChange);
      };
    }
  }, [settings.theme]);

  if (loading) {
    return (
      <div className="settings-page">
        <div className="settings-container">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-container">
        
        {/* Header */}
        <div className="settings-header">
          <div className="header-content">
            <div className="header-icon">
              <i className="icon-settings"></i>
            </div>
            <div className="header-text">
              <h1 className="page-title">Settings</h1>
              <p className="page-subtitle">Customize your expense tracking experience</p>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert error">
            <div className="alert-icon">⚠️</div>
            <span className="alert-text">{error}</span>
          </div>
        )}

        {/* Success Message */}
        {saved && (
          <div className="alert success">
            <div className="alert-icon">✓</div>
            <span className="alert-text">Settings saved successfully!</span>
          </div>
        )}

        {/* Settings Sections */}
        <div className="settings-grid">
          
          {/* General Settings */}
          <div className="settings-card">
            <div className="card-header">
              <div className="card-icon general">
                <i className="icon-user"></i>
              </div>
              <h3 className="card-title">General</h3>
            </div>
            <div className="card-content">
              <div className="setting-item">
                <div className="setting-label">
                  <label>Currency</label>
                  <span className="setting-desc">Default currency for expenses</span>
                </div>
                <select 
                  className="setting-select"
                  value={settings.currency}
                  onChange={(e) => updateSetting('currency', e.target.value)}
                >
                  <option value="INR">₹ Indian Rupee</option>
                  <option value="USD">$ US Dollar</option>
                  <option value="EUR">€ Euro</option>
                  <option value="GBP">£ British Pound</option>
                  <option value="JPY">¥ Japanese Yen</option>
                  <option value="CAD">C$ Canadian Dollar</option>
                  <option value="AUD">A$ Australian Dollar</option>
                  <option value="CHF">Fr Swiss Franc</option>
                  <option value="CNY">¥ Chinese Yuan</option>
                  <option value="SEK">kr Swedish Krona</option>
                  <option value="NZD">NZ$ New Zealand Dollar</option>
                </select>
              </div>

              <div className="setting-item">
                <div className="setting-label">
                  <label>Theme</label>
                  <span className="setting-desc">Choose your preferred theme</span>
                </div>
                <div className="theme-options">
                  <label className={`theme-option ${settings.theme === 'light' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="theme" 
                      value="light"
                      checked={settings.theme === 'light'}
                      onChange={(e) => updateSetting('theme', e.target.value)}
                    />
                    <span className="theme-circle light"></span>
                    Light
                  </label>
                  <label className={`theme-option ${settings.theme === 'dark' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="theme" 
                      value="dark"
                      checked={settings.theme === 'dark'}
                      onChange={(e) => updateSetting('theme', e.target.value)}
                    />
                    <span className="theme-circle dark"></span>
                    Dark
                  </label>
                  <label className={`theme-option ${settings.theme === 'auto' ? 'active' : ''}`}>
                    <input 
                      type="radio" 
                      name="theme" 
                      value="auto"
                      checked={settings.theme === 'auto'}
                      onChange={(e) => updateSetting('theme', e.target.value)}
                    />
                    <span className="theme-circle auto"></span>
                    Auto
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Budget Settings */}
          <div className="settings-card">
            <div className="card-header">
              <div className="card-icon budget">
                <i className="icon-wallet"></i>
              </div>
              <h3 className="card-title">Budget & Alerts</h3>
            </div>
            <div className="card-content">
              <div className="setting-item">
                <div className="setting-label">
                  <label>Monthly Budget</label>
                  <span className="setting-desc">Set your monthly spending limit</span>
                </div>
                <div className="input-group">
                  <span className="input-prefix">{CurrencyManager.getSymbol(settings.currency)}</span>
                  <input 
                    type="number" 
                    className="setting-input"
                    value={settings.budgetLimit}
                    onChange={(e) => updateSetting('budgetLimit', Number(e.target.value))}
                    placeholder="50000"
                  />
                </div>
              </div>

              <div className="setting-item">
                <div className="setting-label">
                  <label>Low Balance Alert</label>
                  <span className="setting-desc">Get notified when balance is low</span>
                </div>
                <label className="toggle-switch">
                  <input 
                    type="checkbox"
                    checked={settings.lowBalanceAlert}
                    onChange={(e) => updateSetting('lowBalanceAlert', e.target.checked)}
                  />
                  <span className="slider"></span>
                </label>
              </div>

              {settings.lowBalanceAlert && (
                <div className="setting-item">
                  <div className="setting-label">
                    <label>Alert Threshold</label>
                    <span className="setting-desc">Alert when balance drops below</span>
                  </div>
                  <div className="input-group">
                    <span className="input-prefix">{CurrencyManager.getSymbol(settings.currency)}</span>
                    <input 
                      type="number" 
                      className="setting-input"
                      value={settings.lowBalanceThreshold}
                      onChange={(e) => updateSetting('lowBalanceThreshold', Number(e.target.value))}
                      placeholder="5000"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="settings-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => {
              const defaultSettings = {
                currency: 'INR',
                theme: 'light',
                budgetLimit: 50000,
                lowBalanceAlert: true,
                lowBalanceThreshold: 5000
              };
              setSettings(defaultSettings);
              applyTheme('light');
            }}
          >
            <i className="icon-refresh"></i>
            Reset Settings
          </button>
          <button 
            className={`btn btn-primary ${saving ? 'loading' : ''}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <i className="icon-loading"></i>
                Saving...
              </>
            ) : (
              <>
                <i className="icon-save"></i>
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;