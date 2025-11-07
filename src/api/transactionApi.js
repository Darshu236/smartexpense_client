// src/api/transactionApi.js - API functions for transaction CRUD operations
import axios from 'axios';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// Enhanced logging utility
const log = {
  info: (message, ...args) => {
    if (DEBUG_MODE) console.log(`ℹ️ [TransactionAPI] ${message}`, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`⚠️ [TransactionAPI] ${message}`, ...args);
  },
  error: (message, ...args) => {
    console.error(`❌ [TransactionAPI] ${message}`, ...args);
  },
  success: (message, ...args) => {
    if (DEBUG_MODE) console.log(`✅ [TransactionAPI] ${message}`, ...args);
  }
};

// Enhanced token retrieval with fallback options
const getAuthHeaders = () => {
  const token = localStorage.getItem('token') || 
                localStorage.getItem('authToken') || 
                sessionStorage.getItem('token') || 
                sessionStorage.getItem('authToken');

  if (!token) {
    console.warn('No authentication token found');
    throw new Error('No authentication token found. Please log in again.');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    console.error('Invalid token format');
    localStorage.clear();
    sessionStorage.clear();
    throw new Error('Invalid token format. Please log in again.');
  }

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
  }

  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// Enhanced error parsing
const parseErrorResponse = (error, context = '') => {
  const errorInfo = {
    context,
    message: 'Unknown error occurred',
    status: null,
    details: null,
    type: 'unknown'
  };

  if (error.response) {
    const { status, data, statusText } = error.response;
    errorInfo.status = status;
    errorInfo.type = 'server_error';
    
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
        errorInfo.message = serverMessage || 'Transaction not found';
        errorInfo.type = 'not_found';
        break;
      case 409:
        errorInfo.message = serverMessage || 'Conflict - transaction already exists';
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
      default:
        errorInfo.message = serverMessage || statusText || `Server error (${status})`;
        break;
    }
    
    errorInfo.details = data;
  } else if (error.request) {
    errorInfo.message = 'Network error. Please check your connection and try again.';
    errorInfo.type = 'network_error';
  } else {
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

  const config = {
    method: method.toLowerCase(),
    url: fullUrl,
    headers: getAuthHeaders(),
    timeout: options.timeout || 15000,
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
    
    log.success(`[${requestId}] ${method.toUpperCase()} request successful (${duration}ms)`);
    
    return response;
  } catch (error) {
    const errorInfo = parseErrorResponse(error, `${method.toUpperCase()} ${fullUrl}`);
    
    log.error(`[${requestId}] ${method.toUpperCase()} request failed:`, errorInfo);

    if (errorInfo.type === 'auth_error') {
      localStorage.removeItem('token');
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('authToken');
    }

    const enhancedError = new Error(errorInfo.message);
    enhancedError.type = errorInfo.type;
    enhancedError.status = errorInfo.status;
    enhancedError.details = errorInfo.details;
    enhancedError.requestId = requestId;
    
    throw enhancedError;
  }
};

// Category definitions
const VALID_TYPES = ['income', 'expense'];

const EXPENSE_CATEGORIES = [
  'Food', 'Transport', 'Shopping', 'Entertainment', 'Healthcare',
  'Bills', 'Education', 'Travel', 'Investment', 'Other'
];

const INCOME_CATEGORIES = [
  'Salary', 'Freelance', 'Business', 'Investment', 'Bonus',
  'Gift', 'Refund', 'Side Hustle', 'Dividend', 'Other'
];

const VALID_CATEGORIES = [...new Set([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES])];

/**
 * Fetch all transactions
 * @param {object} filters - Optional filters (month, type, category)
 * @param {object} options - Additional request options
 * @returns {Promise} Raw API response (let consumers handle structure)
 */
export const fetchTransactions = async (filters = {}, options = {}) => {
  try {
    log.info('Fetching transactions from API...');
    
    const params = {};
    if (filters.month) params.month = filters.month;
    if (filters.type) params.type = filters.type;
    if (filters.category) params.category = filters.category;
    if (filters.startDate) params.startDate = filters.startDate;
    if (filters.endDate) params.endDate = filters.endDate;
    
    const response = await makeRequest('GET', '/transactions', null, params, options);
    
    log.info('API Response:', response.data);
    
    // Return the full response data so different pages can handle different structures
    return response.data;
  } catch (error) {
    log.error('Error in fetchTransactions:', error);
    throw error;
  }
};

/**
 * Create a new transaction
 * @param {object} payload - Transaction data
 * @param {object} options - Additional request options
 * @returns {Promise<object>} Created transaction object
 */
export const createTransaction = async (payload, options = {}) => {
  const { amount, description, title, category, type, date, paymentMode } = payload;

  // Validation
  if (!amount || isNaN(amount) || amount <= 0) {
    throw new Error('Amount must be a positive number');
  }

  if (!description && !title) {
    throw new Error('Transaction requires a description or title');
  }

  if (type && !VALID_TYPES.includes(type)) {
    throw new Error(`Type must be one of: ${VALID_TYPES.join(', ')}`);
  }

  // Category validation with auto-correction
  if (category) {
    if (type === 'expense' && !EXPENSE_CATEGORIES.includes(category)) {
      log.warn(`Invalid expense category "${category}", defaulting to "Other"`);
      payload.category = 'Other';
    } else if (type === 'income' && !INCOME_CATEGORIES.includes(category)) {
      log.warn(`Invalid income category "${category}", defaulting to "Other"`);
      payload.category = 'Other';
    } else if (!type && !VALID_CATEGORIES.includes(category)) {
      log.warn(`Invalid category "${category}", defaulting to "Other"`);
      payload.category = 'Other';
    }
  }

  try {
    log.info('Creating transaction:', payload);
    
    const response = await makeRequest('POST', '/transactions', payload, null, options);
    
    const createdTransaction = response.data?.transaction || response.data?.data || response.data;
    log.success('Transaction created successfully:', createdTransaction);
    
    // Dispatch event for other components to listen to
    window.dispatchEvent(new CustomEvent('transactionUpdated', { 
      detail: { action: 'created', transaction: createdTransaction } 
    }));
    
    return createdTransaction;
  } catch (error) {
    log.error('Failed to create transaction:', error);
    throw error;
  }
};

/**
 * Update an existing transaction
 * @param {string} id - Transaction ID
 * @param {object} payload - Updated transaction data
 * @param {object} options - Additional request options
 * @returns {Promise<object>} Updated transaction object
 */
export const updateTransaction = async (id, payload, options = {}) => {
  if (!id) throw new Error('Transaction ID is required');

  try {
    log.info(`Updating transaction ${id}:`, payload);
    
    const response = await makeRequest('PUT', `/transactions/${id}`, payload, null, options);
    
    const updatedTransaction = response.data?.transaction || response.data?.data || response.data;
    log.success('Transaction updated successfully:', updatedTransaction);
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('transactionUpdated', { 
      detail: { action: 'updated', transaction: updatedTransaction } 
    }));
    
    return updatedTransaction;
  } catch (error) {
    log.error(`Failed to update transaction ${id}:`, error);
    throw error;
  }
};

/**
 * Delete a transaction
 * @param {string} id - Transaction ID
 * @param {object} options - Additional request options
 * @returns {Promise<boolean>} Success status
 */
export const deleteTransactionApi = async (id, options = {}) => {
  if (!id) throw new Error('Transaction ID is required');
  
  try {
    log.info(`Deleting transaction ${id}`);
    
    await makeRequest('DELETE', `/transactions/${id}`, null, null, options);
    
    log.success(`Transaction ${id} deleted successfully`);
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('transactionUpdated', { 
      detail: { action: 'deleted', transactionId: id } 
    }));
    
    return true;
  } catch (error) {
    log.error(`Failed to delete transaction ${id}:`, error);
    throw error;
  }
};

/**
 * Get transaction summary/statistics
 * @param {object} filters - Date range and other filters
 * @param {object} options - Additional request options
 * @returns {Promise<object>} Transaction summary
 */
export const getTransactionSummary = async (filters = {}, options = {}) => {
  try {
    log.info('Fetching transaction summary with filters:', filters);
    
    const params = {
      month: filters.month || '',
      startDate: filters.startDate || '',
      endDate: filters.endDate || '',
      type: filters.type || ''
    };
    
    // Remove empty parameters
    Object.keys(params).forEach(key => {
      if (!params[key]) delete params[key];
    });
    
    const response = await makeRequest('GET', '/transactions/summary', null, params, options);
    
    const summary = response.data?.data || response.data || {};
    log.success('Transaction summary fetched successfully:', summary);
    
    return summary;
  } catch (error) {
    log.error('Failed to fetch transaction summary:', error);
    throw error;
  }
};

/**
 * Bulk delete transactions
 * @param {Array<string>} ids - Array of transaction IDs
 * @param {object} options - Additional request options
 * @returns {Promise<object>} Deletion result
 */
export const bulkDeleteTransactions = async (ids, options = {}) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('Transaction IDs array is required and cannot be empty');
  }
  
  try {
    log.info(`Bulk deleting ${ids.length} transactions`);
    
    const response = await makeRequest('POST', '/transactions/bulk-delete', { ids }, null, options);
    
    log.success(`Successfully deleted ${ids.length} transactions`);
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('transactionUpdated', { 
      detail: { action: 'bulk-deleted', transactionIds: ids } 
    }));
    
    return response.data;
  } catch (error) {
    log.error('Failed to bulk delete transactions:', error);
    throw error;
  }
};

/**
 * Search transactions
 * @param {object} searchCriteria - Search parameters
 * @param {object} options - Additional request options
 * @returns {Promise<Array>} Array of matching transactions
 */
export const searchTransactions = async (searchCriteria = {}, options = {}) => {
  try {
    log.info('Searching transactions with criteria:', searchCriteria);
    
    const params = {
      q: searchCriteria.query || '',
      type: searchCriteria.type || '',
      category: searchCriteria.category || '',
      minAmount: searchCriteria.minAmount || '',
      maxAmount: searchCriteria.maxAmount || '',
      startDate: searchCriteria.startDate || '',
      endDate: searchCriteria.endDate || '',
      paymentMode: searchCriteria.paymentMode || '',
      page: searchCriteria.page || 1,
      limit: searchCriteria.limit || 50
    };
    
    // Remove empty parameters
    Object.keys(params).forEach(key => {
      if (params[key] === '' || params[key] === null || params[key] === undefined) {
        delete params[key];
      }
    });
    
    const response = await makeRequest('GET', '/transactions/search', null, params, options);
    
    const results = response.data?.data || response.data || [];
    log.success(`Found ${results.length} transactions matching criteria`);
    
    return Array.isArray(results) ? results : [];
  } catch (error) {
    log.error('Failed to search transactions:', error);
    throw error;
  }
};

// Export categories and utilities
export { 
  EXPENSE_CATEGORIES, 
  INCOME_CATEGORIES, 
  VALID_CATEGORIES,
  VALID_TYPES,
  log as transactionApiLog,
  getAuthHeaders,
  parseErrorResponse
};