// src/context/PreferenceContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const PreferenceContext = createContext();

export const usePreferences = () => {
  const context = useContext(PreferenceContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferenceProvider');
  }
  return context;
};

// Export as preferenceContext to match your Transactions component import
export const preferenceContext = () => {
  const context = useContext(PreferenceContext);
  if (!context) {
    throw new Error('preferenceContext must be used within a PreferenceProvider');
  }
  return context;
};

export const PreferenceProvider = ({ children }) => {
  const [currency, setCurrency] = useState('INR');
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('en');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [isLoading, setIsLoading] = useState(true);

  // Available options
  const availableCurrencies = [
    { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' }
  ];

  const availableThemes = [
    { code: 'light', name: 'Light' },
    { code: 'dark', name: 'Dark' },
    { code: 'auto', name: 'System Default' }
  ];

  const availableLanguages = [
    { code: 'en', name: 'English' },
    { code: 'hi', name: 'Hindi' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' }
  ];

  const availableDateFormats = [
    { code: 'DD/MM/YYYY', name: 'DD/MM/YYYY' },
    { code: 'MM/DD/YYYY', name: 'MM/DD/YYYY' },
    { code: 'YYYY-MM-DD', name: 'YYYY-MM-DD' },
    { code: 'DD-MM-YYYY', name: 'DD-MM-YYYY' }
  ];

  // Initialize preferences from localStorage
  useEffect(() => {
    const initializePreferences = () => {
      try {
        const storedPreferences = localStorage.getItem('userPreferences');
        
        if (storedPreferences) {
          const preferences = JSON.parse(storedPreferences);
          
          // Set preferences with fallback to defaults
          setCurrency(preferences.currency || 'INR');
          setTheme(preferences.theme || 'light');
          setLanguage(preferences.language || 'en');
          setDateFormat(preferences.dateFormat || 'DD/MM/YYYY');
        } else {
          // Set default preferences based on user locale if available
          const userLocale = navigator.language || navigator.languages[0];
          
          if (userLocale.startsWith('en-US')) {
            setCurrency('USD');
            setDateFormat('MM/DD/YYYY');
          } else if (userLocale.startsWith('en-GB')) {
            setCurrency('GBP');
            setDateFormat('DD/MM/YYYY');
          } else if (userLocale.startsWith('hi')) {
            setCurrency('INR');
            setLanguage('hi');
          }
          
          // Save default preferences
          savePreferencesToStorage();
        }
      } catch (error) {
        console.error('Error initializing preferences:', error);
        // Use defaults if there's an error
      } finally {
        setIsLoading(false);
      }
    };

    initializePreferences();
  }, []);

  // Save preferences to localStorage
  const savePreferencesToStorage = () => {
    try {
      const preferences = {
        currency,
        theme,
        language,
        dateFormat,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem('userPreferences', JSON.stringify(preferences));
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };

  // Save preferences whenever they change
  useEffect(() => {
    if (!isLoading) {
      savePreferencesToStorage();
    }
  }, [currency, theme, language, dateFormat, isLoading]);

  // Update currency
  const updateCurrency = (newCurrency) => {
    if (availableCurrencies.find(c => c.code === newCurrency)) {
      setCurrency(newCurrency);
    } else {
      console.warn(`Invalid currency: ${newCurrency}`);
    }
  };

  // Update theme
  const updateTheme = (newTheme) => {
    if (availableThemes.find(t => t.code === newTheme)) {
      setTheme(newTheme);
      
      // Apply theme to document
      if (newTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else if (newTheme === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
      } else if (newTheme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
      }
    } else {
      console.warn(`Invalid theme: ${newTheme}`);
    }
  };

  // Update language
  const updateLanguage = (newLanguage) => {
    if (availableLanguages.find(l => l.code === newLanguage)) {
      setLanguage(newLanguage);
    } else {
      console.warn(`Invalid language: ${newLanguage}`);
    }
  };

  // Update date format
  const updateDateFormat = (newDateFormat) => {
    if (availableDateFormats.find(f => f.code === newDateFormat)) {
      setDateFormat(newDateFormat);
    } else {
      console.warn(`Invalid date format: ${newDateFormat}`);
    }
  };

  // Get currency symbol
  const getCurrencySymbol = (currencyCode = currency) => {
    const currencyInfo = availableCurrencies.find(c => c.code === currencyCode);
    return currencyInfo ? currencyInfo.symbol : '₹';
  };

  // Format amount with currency
  const formatAmount = (amount, currencyCode = currency, showSymbol = true) => {
    try {
      const numAmount = parseFloat(amount) || 0;
      const symbol = showSymbol ? getCurrencySymbol(currencyCode) : '';
      
      return `${symbol}${numAmount.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    } catch (error) {
      console.error('Error formatting amount:', error);
      return `${getCurrencySymbol(currencyCode)}0.00`;
    }
  };

  // Reset preferences to defaults
  const resetPreferences = () => {
    setCurrency('INR');
    setTheme('light');
    setLanguage('en');
    setDateFormat('DD/MM/YYYY');
    
    // Clear localStorage
    localStorage.removeItem('userPreferences');
  };

  // Bulk update preferences
  const updatePreferences = (newPreferences) => {
    try {
      if (newPreferences.currency) updateCurrency(newPreferences.currency);
      if (newPreferences.theme) updateTheme(newPreferences.theme);
      if (newPreferences.language) updateLanguage(newPreferences.language);
      if (newPreferences.dateFormat) updateDateFormat(newPreferences.dateFormat);
    } catch (error) {
      console.error('Error updating preferences:', error);
    }
  };

  const value = {
    // Current preferences
    currency,
    theme,
    language,
    dateFormat,
    isLoading,
    
    // Available options
    availableCurrencies,
    availableThemes,
    availableLanguages,
    availableDateFormats,
    
    // Update functions
    updateCurrency,
    updateTheme,
    updateLanguage,
    updateDateFormat,
    updatePreferences,
    resetPreferences,
    
    // Utility functions
    getCurrencySymbol,
    formatAmount
  };

  return (
    <PreferenceContext.Provider value={value}>
      {children}
    </PreferenceContext.Provider>
  );
};

// Export as PreferencesProvider (with 's') to match potential imports
export const PreferencesProvider = PreferenceProvider;

export default PreferenceContext;