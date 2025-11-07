// Centralized Currency Manager
class CurrencyManager {
  static currencySymbols = {
    'INR': '₹',
    'USD': '$',
    'EUR': '€',
    'JPY': '¥',
    'GBP': '£',
    'CAD': 'C$',
    'AUD': 'A$',
    'CHF': 'Fr',
    'CNY': '¥',
    'SEK': 'kr',
    'NZD': 'NZ$'
  };

  static cachedCurrency = null;
  static cachedSymbol = null;

  static async fetchFromDB() {
    try {
      const token = localStorage.getItem('token') || 
                    localStorage.getItem('authToken') || 
                    sessionStorage.getItem('token') || 
                    sessionStorage.getItem('authToken');
      
      console.log('💰 Fetching currency from DB...');
      
      if (!token) {
        console.warn('⚠️ No auth token, using default INR');
        return { currency: 'INR', symbol: '₹' };
      }

      const response = await fetch('http://localhost:4000/api/settings', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error('❌ Settings fetch failed:', response.status);
        return { currency: 'INR', symbol: '₹' };
      }

      const settings = await response.json();
      const currency = settings.currency || 'INR';
      const symbol = this.currencySymbols[currency] || '₹';
      
      // Cache it
      this.cachedCurrency = currency;
      this.cachedSymbol = symbol;
      
      console.log('✅ Currency fetched from DB:', currency, symbol);
      
      return { currency, symbol };
      
    } catch (error) {
      console.error('❌ Currency fetch error:', error);
      return { currency: 'INR', symbol: '₹' };
    }
  }

  static getCached() {
    if (this.cachedCurrency && this.cachedSymbol) {
      console.log('📦 Using cached currency:', this.cachedCurrency);
      return { 
        currency: this.cachedCurrency, 
        symbol: this.cachedSymbol 
      };
    }
    return null;
  }

  static clearCache() {
    this.cachedCurrency = null;
    this.cachedSymbol = null;
    console.log('🗑️ Currency cache cleared');
  }

  static getSymbol(currency) {
    return this.currencySymbols[currency] || '₹';
  }
}

export default CurrencyManager;