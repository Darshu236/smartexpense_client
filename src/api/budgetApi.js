// api/budgetApi.js - API functions for budget CRUD operations
import axios from 'axios';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Enhanced logging utility
const log = {
  info: (message, ...args) => {
    if (DEBUG_MODE) console.log(`ℹ️ [BudgetAPI] ${message}`, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`⚠️ [BudgetAPI] ${message}`, ...args);
  },
  error: (message, ...args) => {
    console.error(`❌ [BudgetAPI] ${message}`, ...args);
  },
  success: (message, ...args) => {
    if (DEBUG_MODE) console.log(`✅ [BudgetAPI] ${message}`, ...args);
  }
};

// Enhanced token retrieval with fallback options
// Improved getAuthHeaders function for budgetApi.js and transactionApi.js
const getAuthHeaders = () => {
  // Try different token locations in order of preference
  const token = localStorage.getItem('token') || 
                localStorage.getItem('authToken') || 
                sessionStorage.getItem('token') || 
                sessionStorage.getItem('authToken');

  if (!token) {
    console.warn('No authentication token found');
    throw new Error('No authentication token found. Please log in again.');
  }

  // Validate token format (basic JWT check)
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.error('Invalid token format');
    localStorage.clear();
    sessionStorage.clear();
    throw new Error('Invalid token format. Please log in again.');
  }

  // Check if token is expired (client-side check)
  try {
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp && now > payload.exp) {
      console.error('Token is expired');
      localStorage.clear();
      sessionStorage.clear();
      throw new Error('Session expired. Please log in again.');
    }
  } catch (decodeError) {
    console.warn('Could not decode token payload:', decodeError);
    // Don't throw here as token might still be valid on server
  }

  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// Helper: get current month if not provided
const getCurrentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Enhanced error parsing with specific handling for different status codes
const parseErrorResponse = (error, context = '') => {
  const errorInfo = {
    context,
    message: 'Unknown error occurred',
    status: null,
    details: null,
    type: 'unknown'
  };

  if (error.response) {
    // Server responded with error status
    const { status, data, statusText } = error.response;
    errorInfo.status = status;
    errorInfo.type = 'server_error';
    
    // Try to extract meaningful error message
    let serverMessage = '';
    if (data) {
      if (typeof data === 'string') {
        serverMessage = data;
      } else if (data.message) {
        serverMessage = data.message;
      } else if (data.error) {
        serverMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
      } else if (data.errors && Array.isArray(data.errors)) {
        serverMessage = data.errors.join(', ');
      } else if (data.details) {
        serverMessage = typeof data.details === 'string' ? data.details : JSON.stringify(data.details);
      }
    }

    switch (status) {
      case 400:
        errorInfo.message = serverMessage || 'Invalid request data';
        errorInfo.type = 'validation_error';
        break;
      case 401:
        errorInfo.message = 'Authentication required. Please log in again.';
        errorInfo.type = 'auth_error';
        break;
      case 403:
        errorInfo.message = serverMessage || 'Access forbidden';
        errorInfo.type = 'auth_error';
        break;
      case 404:
        errorInfo.message = serverMessage || 'Resource not found';
        errorInfo.type = 'not_found';
        break;
      case 409:
        errorInfo.message = serverMessage || 'Conflict - resource already exists';
        errorInfo.type = 'conflict_error';
        break;
      case 422:
        errorInfo.message = serverMessage || 'Validation error';
        errorInfo.type = 'validation_error';
        break;
      case 500:
        errorInfo.message = 'Server error. Please try again later.';
        errorInfo.details = serverMessage;
        errorInfo.type = 'server_error';
        break;
      case 503:
        errorInfo.message = 'Service temporarily unavailable. Please try again later.';
        errorInfo.type = 'service_unavailable';
        break;
      default:
        errorInfo.message = serverMessage || statusText || `Server error (${status})`;
        break;
    }
    
    errorInfo.details = data;
  } else if (error.request) {
    // Request made but no response received
    errorInfo.message = 'Network error. Please check your connection and try again.';
    errorInfo.type = 'network_error';
    errorInfo.details = {
      request: {
        url: error.config?.url,
        method: error.config?.method,
        timeout: error.code === 'ECONNABORTED'
      }
    };
  } else {
    // Something else went wrong
    errorInfo.message = `Request setup error: ${error.message}`;
    errorInfo.type = 'request_error';
  }

  return errorInfo;
};

// Enhanced API request wrapper
const makeRequest = async (method, url, data = null, params = null, options = {}) => {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  const requestId = Math.random().toString(36).substr(2, 9);
  
  log.info(`[${requestId}] Starting ${method.toUpperCase()} request to: ${fullUrl}`);
  if (params) log.info(`[${requestId}] Query params:`, params);
  if (data) log.info(`[${requestId}] Request data:`, data);

  const config = {
    method: method.toLowerCase(),
    url: fullUrl,
    headers: getAuthHeaders(),
    timeout: options.timeout || 15000, // 15 second timeout
    ...options
  };

  if (params) config.params = params;
  if (data && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
    config.data = data;
  }

  try {
    const startTime = Date.now();
    const response = await axios(config);
    const duration = Date.now() - startTime;
    
    log.success(`[${requestId}] ${method.toUpperCase()} request successful (${duration}ms):`, {
      status: response.status,
      dataSize: JSON.stringify(response.data).length
    });
    
    return response;
  } catch (error) {
    const errorInfo = parseErrorResponse(error, `${method.toUpperCase()} ${fullUrl}`);
    
    log.error(`[${requestId}] ${method.toUpperCase()} request failed:`, {
      ...errorInfo,
      url: fullUrl,
      params,
      requestData: data
    });

    // Handle auth errors
    if (errorInfo.type === 'auth_error') {
      // Clear tokens and potentially redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('authToken');
      
      // You can dispatch a logout action here if using Redux
      // store.dispatch(logout());
    }

    // Create enhanced error object
    const enhancedError = new Error(errorInfo.message);
    enhancedError.type = errorInfo.type;
    enhancedError.status = errorInfo.status;
    enhancedError.details = errorInfo.details;
    enhancedError.requestId = requestId;
    
    throw enhancedError;
  }
};

// Budget API functions with enhanced error handling

/**
 * Fetch budgets for a specific month
 * @param {string} month - Month in YYYY-MM format
 * @param {object} options - Additional request options
 * @returns {Promise<Array>} Array of budget objects
 */
export const fetchBudgets = async (month = null, options = {}) => {
  try {
    const safeMonth = month || getCurrentMonth();
    log.info(`Fetching budgets for month: ${safeMonth}`);
    
    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(safeMonth)) {
      throw new Error('Invalid month format. Expected YYYY-MM');
    }

    const response = await makeRequest('GET', '/budgets', null, { month: safeMonth }, options);
    
    // Handle different response structures
    let budgets = [];
    if (response.data) {
      if (Array.isArray(response.data.data)) {
        budgets = response.data.data;
      } else if (Array.isArray(response.data)) {
        budgets = response.data;
      } else if (response.data.budgets && Array.isArray(response.data.budgets)) {
        budgets = response.data.budgets;
      }
    }

    // Validate and sanitize budget data
    const validatedBudgets = budgets.map((budget, index) => {
      try {
        return {
          _id: budget._id || budget.id || `temp-${index}`,
          id: budget.id || budget._id || `temp-${index}`,
          category: budget.category || 'Unknown Category',
          type: budget.type || 'expense',
          monthlyLimit: Number(budget.monthlyLimit) || 0,
          spent: Number(budget.spent) || 0,
          month: budget.month || safeMonth,
          color: budget.color || '#3B82F6',
          description: budget.description || '',
          createdAt: budget.createdAt || new Date().toISOString(),
          updatedAt: budget.updatedAt || new Date().toISOString()
        };
      } catch (err) {
        log.warn(`Invalid budget data at index ${index}:`, budget, err);
        return null;
      }
    }).filter(Boolean);

    log.success(`Successfully fetched ${validatedBudgets.length} budgets for ${safeMonth}`);
    return validatedBudgets;

  } catch (error) {
    log.error('Failed to fetch budgets:', error);
    throw error;
  }
};

/**
 * Create a new budget
 * @param {object} budgetData - Budget data
 * @param {object} options - Additional request options
 * @returns {Promise<object>} Created budget object
 */
export const createBudget = async (budgetData, options = {}) => {
  try {
    log.info('Creating new budget:', budgetData);

    // Validate required fields
    if (!budgetData.category || !budgetData.category.trim()) {
      throw new Error('Budget category is required');
    }
    if (!budgetData.monthlyLimit || budgetData.monthlyLimit <= 0) {
      throw new Error('Monthly limit must be greater than 0');
    }
    if (!budgetData.month) {
      throw new Error('Budget month is required');
    }

    // Sanitize and prepare data
    const sanitizedData = {
      category: budgetData.category.trim(),
      type: budgetData.type || 'expense',
      monthlyLimit: Number(budgetData.monthlyLimit),
      month: budgetData.month,
      color: budgetData.color || '#3B82F6',
      description: budgetData.description?.trim() || '',
      spent: 0 // Initialize spent amount
    };

    const response = await makeRequest('POST', '/budgets', sanitizedData, null, options);
    
    const createdBudget = response.data?.data || response.data;
    log.success('Budget created successfully:', createdBudget);
    
    return createdBudget;

  } catch (error) {
    log.error('Failed to create budget:', error);
    throw error;
  }
};

/**
 * Update an existing budget
 * @param {string} budgetId - Budget ID
 * @param {object} budgetData - Updated budget data
 * @param {object} options - Additional request options
 * @returns {Promise<object>} Updated budget object
 */
export const updateBudgetApi = async (budgetId, budgetData, options = {}) => {
  try {
    log.info(`Updating budget ${budgetId}:`, budgetData);

    if (!budgetId) {
      throw new Error('Budget ID is required');
    }

    // Validate fields if provided
    if (budgetData.category !== undefined && (!budgetData.category || !budgetData.category.trim())) {
      throw new Error('Budget category cannot be empty');
    }
    if (budgetData.monthlyLimit !== undefined && budgetData.monthlyLimit <= 0) {
      throw new Error('Monthly limit must be greater than 0');
    }

    // Sanitize data (only include fields that are being updated)
    const sanitizedData = {};
    if (budgetData.category !== undefined) {
      sanitizedData.category = budgetData.category.trim();
    }
    if (budgetData.type !== undefined) {
      sanitizedData.type = budgetData.type;
    }
    if (budgetData.monthlyLimit !== undefined) {
      sanitizedData.monthlyLimit = Number(budgetData.monthlyLimit);
    }
    if (budgetData.color !== undefined) {
      sanitizedData.color = budgetData.color;
    }
    if (budgetData.description !== undefined) {
      sanitizedData.description = budgetData.description?.trim() || '';
    }

    const response = await makeRequest('PUT', `/budgets/${budgetId}`, sanitizedData, null, options);
    
    const updatedBudget = response.data?.data || response.data;
    log.success('Budget updated successfully:', updatedBudget);
    
    return updatedBudget;

  } catch (error) {
    log.error(`Failed to update budget ${budgetId}:`, error);
    throw error;
  }
};

/**
 * Delete a budget
 * @param {string} budgetId - Budget ID
 * @param {object} options - Additional request options
 * @returns {Promise<boolean>} Success status
 */
export const deleteBudgetApi = async (budgetId, options = {}) => {
  try {
    log.info(`Deleting budget ${budgetId}`);

    if (!budgetId) {
      throw new Error('Budget ID is required');
    }

    await makeRequest('DELETE', `/budgets/${budgetId}`, null, null, options);
    
    log.success(`Budget ${budgetId} deleted successfully`);
    return true;

  } catch (error) {
    log.error(`Failed to delete budget ${budgetId}:`, error);
    throw error;
  }
};

/**
 * Update budget spent amount
 * @param {string} budgetId - Budget ID
 * @param {number} spentAmount - New spent amount
 * @param {object} options - Additional request options
 * @returns {Promise<object>} Updated budget object
 */
export const updateBudgetSpent = async (budgetId, spentAmount, options = {}) => {
  try {
    log.info(`Updating spent amount for budget ${budgetId}: ${spentAmount}`);

    if (!budgetId) {
      throw new Error('Budget ID is required');
    }
    if (spentAmount < 0) {
      throw new Error('Spent amount cannot be negative');
    }

    const response = await makeRequest(
      'PATCH', 
      `/budgets/${budgetId}/spent`, 
      { spent: Number(spentAmount) }, 
      null, 
      options
    );
    
    const updatedBudget = response.data?.data || response.data;
    log.success('Budget spent amount updated successfully:', updatedBudget);
    
    return updatedBudget;

  } catch (error) {
    log.error(`Failed to update spent amount for budget ${budgetId}:`, error);
    throw error;
  }
};

/**
 * Get budget summary for a specific month
 * @param {string} month - Month in YYYY-MM format
 * @param {object} options - Additional request options
 * @returns {Promise<object>} Budget summary data
 */
export const getBudgetSummary = async (month = null, options = {}) => {
  try {
    const safeMonth = month || getCurrentMonth();
    log.info(`Fetching budget summary for month: ${safeMonth}`);

    const response = await makeRequest('GET', '/budgets/summary', null, { month: safeMonth }, options);
    
    const summary = response.data?.data || response.data || {};
    log.success('Budget summary fetched successfully:', summary);
    
    return {
      totalIncome: Number(summary.totalIncome) || 0,
      totalExpenses: Number(summary.totalExpenses) || 0,
      totalIncomeSpent: Number(summary.totalIncomeSpent) || 0,
      totalExpenseSpent: Number(summary.totalExpenseSpent) || 0,
      netBalance: Number(summary.netBalance) || 0,
      overBudgetCount: Number(summary.overBudgetCount) || 0,
      month: safeMonth,
      ...summary
    };

  } catch (error) {
    log.error('Failed to fetch budget summary:', error);
    throw error;
  }
};

/**
 * Bulk update multiple budgets
 * @param {Array} budgetUpdates - Array of budget update objects
 * @param {object} options - Additional request options
 * @returns {Promise<Array>} Array of updated budget objects
 */
export const bulkUpdateBudgets = async (budgetUpdates, options = {}) => {
  try {
    log.info(`Bulk updating ${budgetUpdates.length} budgets`);

    if (!Array.isArray(budgetUpdates) || budgetUpdates.length === 0) {
      throw new Error('Budget updates array is required and cannot be empty');
    }

    // Validate each update object
    budgetUpdates.forEach((update, index) => {
      if (!update.id && !update._id) {
        throw new Error(`Budget ID is required for update at index ${index}`);
      }
    });

    const response = await makeRequest('PATCH', '/budgets/bulk', { updates: budgetUpdates }, null, options);
    
    const updatedBudgets = response.data?.data || response.data || [];
    log.success(`Successfully bulk updated ${updatedBudgets.length} budgets`);
    
    return updatedBudgets;

  } catch (error) {
    log.error('Failed to bulk update budgets:', error);
    throw error;
  }
};

/**
 * Check API health status
 * @param {object} options - Additional request options
 * @returns {Promise<object>} API health status
 */
export const checkBudgetApiHealth = async (options = {}) => {
  try {
    const response = await makeRequest('GET', '/health', null, null, { 
      timeout: 5000, // Shorter timeout for health check
      ...options 
    });
    
    const healthData = response.data || {};
    log.success('API health check successful:', healthData);
    
    return {
      status: healthData.status || 'unknown',
      timestamp: healthData.timestamp || new Date().toISOString(),
      version: healthData.version || 'unknown',
      uptime: healthData.uptime || 0,
      ...healthData
    };

  } catch (error) {
    log.error('API health check failed:', error);
    return {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
      type: error.type || 'unknown'
    };
  }
};

/**
 * Search budgets by criteria
 * @param {object} searchCriteria - Search criteria
 * @param {object} options - Additional request options
 * @returns {Promise<Array>} Array of matching budgets
 */
export const searchBudgets = async (searchCriteria = {}, options = {}) => {
  try {
    log.info('Searching budgets with criteria:', searchCriteria);

    const params = {
      q: searchCriteria.query || '',
      category: searchCriteria.category || '',
      type: searchCriteria.type || '',
      month: searchCriteria.month || '',
      minLimit: searchCriteria.minLimit || '',
      maxLimit: searchCriteria.maxLimit || '',
      overBudget: searchCriteria.overBudget || '',
      page: searchCriteria.page || 1,
      limit: searchCriteria.limit || 50
    };

    // Remove empty parameters
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key];
      }
    });

    const response = await makeRequest('GET', '/budgets/search', null, params, options);
    
    const results = response.data?.data || response.data || [];
    log.success(`Found ${results.length} budgets matching criteria`);
    
    return Array.isArray(results) ? results : [];

  } catch (error) {
    log.error('Failed to search budgets:', error);
    throw error;
  }
};

// Export utility functions
export {
  log as budgetApiLog,
  getCurrentMonth,
  parseErrorResponse,
  getAuthHeaders
};