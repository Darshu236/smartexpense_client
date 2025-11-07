// DebtApiService.js - FIXED with better error handling
class EnhancedDebtApiService {
  constructor() {
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';
    this.baseURL = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
    this.enabledFeatures = {
      notifications: false,
      friends: true,
      debts: true,
      splitExpenses: true
    };
    this.debugMode = true;
    console.log('🔧 DebtApiService initialized with baseURL:', this.baseURL);
  }

  log(level, message, data = null) {
    if (!this.debugMode) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [EnhancedDebtAPI]`;
    
    const colors = {
      info: 'info',
      warn: 'warn', 
      error: 'error',
      success: 'log'
    };
    
    console[colors[level] || 'log'](`${prefix} ${message}`, data || '');
  }

  getAuthHeaders() {
    const possibleTokens = [
      localStorage.getItem('authToken'),
      sessionStorage.getItem('authToken'),
      localStorage.getItem('token'),
      sessionStorage.getItem('token'),
      localStorage.getItem('jwt'),
      sessionStorage.getItem('jwt')
    ].filter(Boolean);

    const token = possibleTokens[0];

    if (!token) {
      this.log('warn', 'No authentication token found');
      return {
        'Content-Type': 'application/json'
      };
    }

    const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    
    return {
      'Content-Type': 'application/json',
      'Authorization': authHeader
    };
  }

  async makeRequest(endpoint, options = {}) {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${this.baseURL}/api${cleanEndpoint}`;
    
    const requestOptions = {
      ...options,
      headers: {
        ...this.getAuthHeaders(),
        ...(options.headers || {})
      }
    };

    this.log('info', `Making request: ${options.method || 'GET'} ${cleanEndpoint}`);
    this.log('info', `Full URL: ${url}`);

    try {
      const response = await fetch(url, requestOptions);
      
      this.log('info', `Response status: ${response.status} ${response.statusText}`);
      
      return await this.handleResponse(response, { method: options.method, endpoint: cleanEndpoint });
    } catch (error) {
      this.log('error', `Network request failed for ${cleanEndpoint}`, {
        errorMessage: error.message,
        errorType: error.name,
        url: url
      });
      throw error;
    }
  }

  async handleResponse(response, originalRequest = {}) {
    const method = originalRequest.method || 'GET';
    const endpoint = originalRequest.endpoint || 'unknown';
    
    const contentType = response.headers.get('content-type');
    
    if (response.status === 401) {
      this.log('error', 'Authentication failed');
      throw new Error('Authentication required. Please log in again.');
    }
    
    // FIXED: Better handling of 404 errors
    if (response.status === 404) {
      const responseText = await response.text();
      
      // Check if it's HTML (route not found on server)
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        this.log('error', `Server route not found: ${method} ${endpoint}`);
        throw new Error(`Server route not found: ${method} /api${endpoint}. The backend route may not be registered.`);
      }
      
      // It's JSON - parse it for the actual error message
      try {
        const errorData = JSON.parse(responseText);
        this.log('warn', `Resource not found: ${errorData.message || 'Unknown error'}`);
        throw new Error(errorData.message || 'Resource not found');
      } catch (parseError) {
        this.log('warn', `404 error parsing failed`);
        throw new Error(`Resource not found: ${endpoint}`);
      }
    }
    
    if (!response.ok) {
      let errorData = { message: `HTTP Error ${response.status}` };
      
      try {
        const responseText = await response.text();
        
        try {
          errorData = JSON.parse(responseText);
        } catch (jsonError) {
          if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
            errorData = { 
              message: `Server error (${response.status}): The backend returned an HTML page.`,
              status: response.status,
              statusText: response.statusText,
              isHtml: true
            };
          } else {
            errorData = { 
              message: responseText || `HTTP Error ${response.status}`,
              status: response.status,
              statusText: response.statusText
            };
          }
        }
      } catch (textError) {
        this.log('warn', 'Could not read response body', textError);
      }
      
      this.log('error', `Request failed: ${method} ${endpoint}`, errorData);
      throw new Error(this.getHumanReadableError(response.status, errorData));
    }
    
    try {
      const responseText = await response.text();
      
      if (!responseText || responseText.trim() === '') {
        this.log('warn', 'Empty response body');
        return { success: true, message: 'Operation completed successfully' };
      }
      
      if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
        this.log('error', 'Server returned HTML instead of JSON');
        throw new Error('Server configuration error: Received HTML instead of JSON.');
      }
      
      const data = JSON.parse(responseText);
      this.log('success', `Request completed: ${method} ${endpoint}`);
      return data;
    } catch (parseError) {
      if (parseError.message.includes('HTML')) {
        throw parseError;
      }
      this.log('error', 'Failed to parse response as JSON', parseError);
      throw new Error('Invalid response format from server');
    }
  }

  getHumanReadableError(status, errorData) {
    const message = errorData.message || errorData.error || `Server error: ${status}`;
    
    if (errorData.isHtml) {
      return message;
    }
    
    switch (status) {
      case 400:
        return message; // Return the actual message (like "Friend not found")
      case 401:
        return 'Authentication required. Please log in again.';
      case 403:
        return 'Access forbidden. You may not have permission for this action.';
      case 404:
        return message; // Return the actual message
      case 409:
        return `Conflict: ${message}`;
      case 422:
        return `Validation error: ${message}`;
      case 500:
        return `Internal server error. Please try again.`;
      default:
        return message;
    }
  }

  async fetchDebtsOwedToMe() {
    try {
      this.log('info', 'Fetching debts owed to current user');
      
      const response = await this.makeRequest('/debts/owed-to-me', { 
        method: 'GET' 
      });
      
      if (response.success !== false) {
        const debts = response.debts || response.data || [];
        this.log('success', `Fetched ${debts.length} debts owed to user`);
        
        return {
          success: true,
          debts: debts,
          count: debts.length,
          totalAmount: debts.reduce((sum, debt) => sum + (debt.amount || 0), 0)
        };
      } else {
        throw new Error(response.message || 'Failed to fetch debts owed to me');
      }

    } catch (error) {
      this.log('error', 'Error fetching debts owed to me', error);
      return {
        success: false,
        message: error.message,
        debts: [],
        authError: error.message.includes('Authentication') || error.message.includes('401')
      };
    }
  }

  async fetchDebtsOwedByMe() {
    try {
      this.log('info', 'Fetching debts owed by current user');
      
      const response = await this.makeRequest('/debts/owed-by-me', { 
        method: 'GET' 
      });
      
      if (response.success !== false) {
        const debts = response.debts || response.data || [];
        this.log('success', `Fetched ${debts.length} debts owed by user`);
        
        return {
          success: true,
          debts: debts,
          count: debts.length,
          totalAmount: debts.reduce((sum, debt) => sum + (debt.amount || 0), 0)
        };
      } else {
        throw new Error(response.message || 'Failed to fetch debts owed by me');
      }

    } catch (error) {
      this.log('error', 'Error fetching debts owed by me', error);
      return {
        success: false,
        message: error.message,
        debts: [],
        authError: error.message.includes('Authentication') || error.message.includes('401')
      };
    }
  }

  async createManualDebt(debtData) {
    try {
      const validationErrors = this.validateDebtData(debtData);
      if (validationErrors.length > 0) {
        throw new Error(`Validation failed: ${validationErrors.join(', ')}`);
      }

      const transformedData = {
        friendId: debtData.friendId,
        friendEmail: debtData.friendEmail || null,
        amount: parseFloat(debtData.amount),
        description: debtData.description.trim(),
        type: debtData.type,
        dueDate: debtData.dueDate || null
      };

      this.log('info', 'Creating debt with data:', {
        friendId: transformedData.friendId,
        amount: transformedData.amount,
        type: transformedData.type,
        description: transformedData.description
      });
      
      const result = await this.makeRequest('/debts', {
        method: 'POST',
        body: JSON.stringify(transformedData)
      });
      
      if (result.success !== false) {
        this.log('success', 'Debt created successfully', { debtId: result.debt?._id });
        return {
          success: true,
          debt: result.debt || result,
          message: result.message || 'Debt created successfully'
        };
      } else {
        throw new Error(result.message || 'Failed to create debt');
      }
      
    } catch (error) {
      this.log('error', 'Debt creation failed', error.message);
      return {
        success: false,
        message: error.message
      };
    }
  }

async markDebtAsPaid(debtId, paymentMethod = null) {
  try {
    this.log('info', `Marking debt as paid: ${debtId}`);
    
    const body = paymentMethod ? { paymentMethod } : {};
    
    const result = await this.makeRequest(`/debts/${debtId}/mark-paid`, { 
      method: 'PATCH',
      body: JSON.stringify(body)
    });
    
    if (result.success !== false) {
      this.log('success', 'Debt marked as paid successfully');
      return {
        success: true,
        debt: result.debt,
        message: result.message || 'Debt marked as paid'
      };
    } else {
      throw new Error(result.message || 'Failed to mark debt as paid');
    }
  } catch (error) {
    this.log('error', 'Error marking debt as paid', error);
    return {
      success: false,
      message: error.message
    };
  }
}

  async deleteDebt(debtId) {
    try {
      this.log('info', `Deleting debt: ${debtId}`);
      
      const result = await this.makeRequest(`/debts/${debtId}`, { 
        method: 'DELETE' 
      });
      
      if (result.success !== false) {
        this.log('success', 'Debt deleted successfully');
        return {
          success: true,
          message: result.message || 'Debt deleted successfully'
        };
      } else {
        throw new Error(result.message || 'Failed to delete debt');
      }
    } catch (error) {
      this.log('error', 'Error deleting debt', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async sendPaymentReminder(debtId, message = 'Payment reminder') {
    try {
      this.log('info', `Sending payment reminder for debt: ${debtId}`);
      
      const result = await this.makeRequest(`/debts/${debtId}/remind`, {
        method: 'POST',
        body: JSON.stringify({ message })
      });
      
      if (result.success !== false) {
        this.log('success', 'Payment reminder sent successfully');
        return {
          success: true,
          message: result.message || 'Payment reminder sent'
        };
      } else {
        throw new Error(result.message || 'Failed to send reminder');
      }
    } catch (error) {
      this.log('error', 'Error sending payment reminder', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async getDebtOverview() {
    try {
      this.log('info', 'Fetching debt overview');
      
      const result = await this.makeRequest('/debts/overview', { 
        method: 'GET' 
      });
      
      if (result.success !== false) {
        this.log('success', 'Debt overview fetched successfully');
        return {
          success: true,
          overview: result.overview || result,
          message: result.message || 'Overview fetched successfully'
        };
      } else {
        throw new Error(result.message || 'Failed to fetch debt overview');
      }
    } catch (error) {
      this.log('error', 'Error fetching debt overview', error);
      return {
        success: false,
        message: error.message,
        overview: null
      };
    }
  }

  validateDebtData(debtData) {
    const errors = [];
    
    if (!debtData.friendId && !debtData.friendEmail) {
      errors.push('Either friendId or friendEmail is required');
    }
    
    if (debtData.friendEmail && !debtData.friendEmail.includes('@')) {
      errors.push('Valid friend email is required');
    }
    
    if (!debtData.amount || isNaN(parseFloat(debtData.amount)) || parseFloat(debtData.amount) <= 0) {
      errors.push('Valid positive amount is required');
    }
    
    if (!debtData.description || debtData.description.trim().length === 0) {
      errors.push('Description is required');
    }
    
    if (!debtData.type || !['owe-me', 'i-owe'].includes(debtData.type)) {
      errors.push('Type must be either "owe-me" or "i-owe"');
    }
    
    const amount = parseFloat(debtData.amount);
    if (amount > 100000) {
      errors.push('Amount cannot exceed ₹100,000');
    }
    
    return errors;
  }

  getCurrentUser() {
    try {
      const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      this.log('warn', 'Error parsing stored user data', error);
      return null;
    }
  }

  checkAuthStatus() {
    const headers = this.getAuthHeaders();
    const user = this.getCurrentUser();
    
    return {
      hasToken: !!headers.Authorization && headers.Authorization !== 'undefined',
      hasUser: !!user,
      isAuthenticated: !!headers.Authorization && !!user,
      user: user,
      tokenPreview: headers.Authorization ? `${headers.Authorization.substring(0, 20)}...` : null
    };
  }

  clearAuthData() {
    const keys = ['authToken', 'token', 'jwt', 'user'];
    keys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    this.log('info', 'Authentication data cleared');
  }
}

const enhancedDebtApiService = new EnhancedDebtApiService();

if (typeof window !== 'undefined') {
  window.debtApiService = enhancedDebtApiService;
}

export default enhancedDebtApiService;