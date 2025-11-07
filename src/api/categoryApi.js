// src/api/categoryApi.js - Enhanced version with better auth handling
import axios from 'axios';
import TokenManager from '../utils/tokenManager';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

// Enhanced logging utility
const log = {
  info: (message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`ℹ️ [CategoryAPI] ${message}`, ...args);
    }
  },
  error: (message, ...args) => {
    console.error(`❌ [CategoryAPI] ${message}`, ...args);
  },
  success: (message, ...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [CategoryAPI] ${message}`, ...args);
    }
  },
  warn: (message, ...args) => {
    console.warn(`⚠️ [CategoryAPI] ${message}`, ...args);
  }
};

// Get auth headers with validation using TokenManager
const getAuthHeaders = () => {
  const token = TokenManager.getToken();
  
  if (!token) {
    log.warn('No authentication token found');
    return { 'Content-Type': 'application/json' };
  }

  // Basic token validation (check if it's not empty and looks like a JWT)
  if (token.length < 10 || !token.includes('.')) {
    log.warn('Token appears to be invalid format');
    return { 'Content-Type': 'application/json' };
  }

  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
};

// Enhanced error handler that properly categorizes errors
const handleApiError = (error, url, requestId) => {
  const status = error.response?.status;
  const message = error.response?.data?.error || error.message;
  
  log.error(`[${requestId}] Request failed:`, {
    url,
    status,
    message,
    type: error.name
  });

  // Handle different types of errors
  if (status === 401) {
    log.warn('Authentication error - token may be expired');
    // Clear potentially invalid tokens using TokenManager
    TokenManager.clearAuth();
    throw new Error(`Authentication failed: ${message}`);
  }
  
  if (status === 403) {
    throw new Error(`Access denied: ${message}`);
  }
  
  if (status === 404) {
    throw new Error(`Resource not found: ${message}`);
  }
  
  if (status === 409) {
    throw new Error(`Conflict: ${message}`);
  }
  
  if (status >= 500) {
    throw new Error(`Server error: ${message}`);
  }
  
  if (error.code === 'ECONNABORTED') {
    throw new Error('Request timeout - please check your connection');
  }
  
  if (error.code === 'ERR_NETWORK') {
    throw new Error('Network error - please check your internet connection');
  }
  
  // Generic error
  throw new Error(message || 'An unexpected error occurred');
};

// Enhanced API request wrapper with retry logic
const makeRequest = async (method, url, data = null, params = null, retryCount = 0) => {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  const requestId = Math.random().toString(36).substr(2, 9);
  
  log.info(`[${requestId}] ${method.toUpperCase()} ${fullUrl}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`);
  if (params) log.info(`[${requestId}] Params:`, params);
  if (data) log.info(`[${requestId}] Data:`, data);

  const config = {
    method: method.toLowerCase(),
    url: fullUrl,
    headers: getAuthHeaders(),
    timeout: 15000,
  };

  if (params) config.params = params;
  if (data && ['post', 'put', 'patch'].includes(method.toLowerCase())) {
    config.data = data;
  }

  try {
    const startTime = Date.now();
    const response = await axios(config);
    const duration = Date.now() - startTime;
    
    log.success(`[${requestId}] Success (${duration}ms)`, { 
      status: response.status, 
      dataLength: JSON.stringify(response.data || {}).length 
    });
    return response;
    
  } catch (error) {
    // Retry logic for network errors (but not auth errors)
    if (retryCount < 2 && 
        (error.code === 'ECONNABORTED' || 
         error.code === 'ERR_NETWORK' || 
         (error.response?.status >= 500 && error.response?.status < 600))) {
      
      log.warn(`[${requestId}] Retrying request (attempt ${retryCount + 1})`);
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      return makeRequest(method, url, data, params, retryCount + 1);
    }
    
    handleApiError(error, fullUrl, requestId);
  }
};

// Category API functions with enhanced error handling
const CategoryAPI = {
  // List all categories with health check
  list: async () => {
    try {
      log.info('Fetching categories list');
      const response = await makeRequest('GET', '/categories');
      
      let categories = [];
      if (response.data?.data && Array.isArray(response.data.data)) {
        categories = response.data.data;
      } else if (Array.isArray(response.data)) {
        categories = response.data;
      } else {
        log.warn('Unexpected response format:', response.data);
        throw new Error('Invalid response format from server');
      }

      log.success(`Fetched ${categories.length} categories`);
      return categories;
    } catch (error) {
      log.error('Failed to fetch categories:', error.message);
      throw error;
    }
  },

  // Create new category with validation
  create: async (payload) => {
    try {
      log.info('Creating category:', payload);
      
      // Client-side validation
      if (!payload.name || typeof payload.name !== 'string' || payload.name.trim() === '') {
        throw new Error('Category name is required and cannot be empty');
      }

      if (payload.type && !['need', 'want'].includes(payload.type)) {
        throw new Error('Category type must be either "need" or "want"');
      }

      const cleanPayload = {
        name: payload.name.trim(),
        type: payload.type || 'need',
        color: payload.color || '#8884d8',
        icon: payload.icon || 'Tag',
        monthlyBudget: Number(payload.monthlyBudget || 0),
        keywords: Array.isArray(payload.keywords) ? payload.keywords : []
      };

      // Validate budget
      if (cleanPayload.monthlyBudget < 0) {
        throw new Error('Monthly budget cannot be negative');
      }

      const response = await makeRequest('POST', '/categories', cleanPayload);
      
      log.success('Category created successfully');
      return response.data?.data || response.data;
    } catch (error) {
      log.error('Failed to create category:', error.message);
      throw error;
    }
  },

  // Update category with validation
  update: async (id, payload) => {
    try {
      log.info(`Updating category ${id}:`, payload);
      
      if (!id || typeof id !== 'string') {
        throw new Error('Valid category ID is required');
      }

      const cleanPayload = {};
      
      if (payload.name !== undefined) {
        if (typeof payload.name !== 'string' || payload.name.trim() === '') {
          throw new Error('Category name cannot be empty');
        }
        cleanPayload.name = payload.name.trim();
      }
      
      if (payload.type !== undefined) {
        if (!['need', 'want'].includes(payload.type)) {
          throw new Error('Category type must be either "need" or "want"');
        }
        cleanPayload.type = payload.type;
      }
      
      if (payload.color !== undefined) cleanPayload.color = payload.color;
      if (payload.icon !== undefined) cleanPayload.icon = payload.icon;
      
      if (payload.monthlyBudget !== undefined) {
        const budget = Number(payload.monthlyBudget || 0);
        if (budget < 0) {
          throw new Error('Monthly budget cannot be negative');
        }
        cleanPayload.monthlyBudget = budget;
      }
      
      if (payload.keywords !== undefined) {
        cleanPayload.keywords = Array.isArray(payload.keywords) ? payload.keywords : [];
      }

      if (Object.keys(cleanPayload).length === 0) {
        throw new Error('No valid update data provided');
      }

      const response = await makeRequest('PUT', `/categories/${id}`, cleanPayload);
      
      log.success('Category updated successfully');
      return response.data?.data || response.data;
    } catch (error) {
      log.error('Failed to update category:', error.message);
      throw error;
    }
  },

  // Remove (archive) category
  remove: async (id) => {
    try {
      log.info(`Removing category ${id}`);
      
      if (!id || typeof id !== 'string') {
        throw new Error('Valid category ID is required');
      }

      const response = await makeRequest('DELETE', `/categories/${id}`);
      
      log.success('Category removed successfully');
      return response.data?.data || response.data;
    } catch (error) {
      log.error('Failed to remove category:', error.message);
      throw error;
    }
  },

  // Get category insights with fallback handling
  insights: async (month) => {
    try {
      log.info(`Fetching category insights for month: ${month}`);
      
      if (!month || !/^\d{4}-\d{2}$/.test(month)) {
        throw new Error('Month parameter is required in YYYY-MM format');
      }

      const response = await makeRequest('GET', '/categories/insights', null, { month });
      
      const data = response.data || {};
      const insights = data.insights || [];
      const top = data.top || [];

      log.success(`Fetched insights for ${insights.length} categories`);
      
      return {
        insights: insights,
        top: top,
        month: data.month || month,
        metadata: data.metadata || {}
      };
    } catch (error) {
      log.error('Failed to fetch category insights:', error.message);
      
      // For server errors, return empty structure to prevent UI crashes
      if (error.message.includes('Server error')) {
        log.warn('Server error - returning empty insights to prevent UI crash');
        return {
          insights: [],
          top: [],
          month: month,
          metadata: { error: error.message }
        };
      }
      
      throw error;
    }
  },

  // Suggest category based on description with graceful failure
  suggest: async (description) => {
    try {
      log.info(`Getting category suggestion for: "${description}"`);
      
      if (!description || typeof description !== 'string') {
        throw new Error('Description is required and must be a string');
      }

      const response = await makeRequest('GET', '/categories/suggest', null, { description });
      
      const suggestion = response.data?.suggestion || null;
      
      if (suggestion) {
        log.success(`Found category suggestion: ${suggestion.name}`);
      } else {
        log.info('No category suggestion found');
      }
      
      return suggestion;
    } catch (error) {
      log.error('Failed to get category suggestion:', error.message);
      
      // Return null on error instead of throwing to prevent UI crashes
      log.warn('Returning null suggestion due to error');
      return null;
    }
  },

  // Health check method for testing authentication
  healthCheck: async () => {
    try {
      log.info('Performing health check');
      const response = await makeRequest('GET', '/categories/health');
      log.success('Health check passed');
      return response.data;
    } catch (error) {
      log.error('Health check failed:', error.message);
      throw error;
    }
  }
};

export default CategoryAPI;