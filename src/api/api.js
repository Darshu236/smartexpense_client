// api/api.js - Fixed Base API Client with Proper Error Handling
import axios from 'axios';
import TokenManager from '../utils/tokenManager';

// Create axios instance
const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:4000/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - add auth headers
API.interceptors.request.use(
  (config) => {
    const token = TokenManager.getToken();
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🚀 API Request:', {
          method: config.method?.toUpperCase(),
          url: config.url,
          hasAuth: !!token,
          tokenLength: token.length
        });
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('🚀 API Request (no auth):', {
          method: config.method?.toUpperCase(),
          url: config.url
        });
      }
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - handle auth errors PROPERLY
API.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ API Response:', {
        status: response.status,
        url: response.config.url,
        success: response.data?.success
      });
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    const config = error.config;
    const data = error.response?.data;
    
    console.error('❌ API Response Error:', {
      status,
      url: config?.url,
      method: config?.method?.toUpperCase(),
      message: data?.message || error.message,
      authError: data?.authError
    });
    
    // ONLY redirect on ACTUAL authentication errors
    // Don't redirect on successful responses or other errors
    if (status === 401 && data?.message?.toLowerCase().includes('unauthorized')) {
      console.log('🚨 Actual auth error detected - clearing tokens');
      TokenManager.clearAuth();
      
      // Add the authError flag to the error object
      error.isAuthError = true;
      
      // Only redirect if not already on login page
      if (!window.location.pathname.includes('/login')) {
        console.log('🔄 Redirecting to login...');
        setTimeout(() => {
          window.location.href = '/login';
        }, 1000);
      }
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('🌐 Network error - server may be down');
      error.message = 'Network error - please check your connection and try again';
    }
    
    return Promise.reject(error);
  }
);

// Helper function to check API health
export const checkApiHealth = async () => {
  try {
    const response = await API.get('/health');
    return {
      success: true,
      data: response.data,
      status: response.status
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: error.response?.status
    };
  }
};

// Helper function to test authentication
export const testAuth = async () => {
  try {
    const response = await API.get('/auth/verify');
    return {
      success: true,
      data: response.data,
      authenticated: true
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: error.response?.status,
      authenticated: false
    };
  }
};

// Helper function to verify token before making requests
export const verifyTokenBeforeRequest = () => {
  const token = TokenManager.getToken();
  
  if (!token) {
    console.log('❌ No token found - user needs to login');
    return false;
  }
  
  // Check if user data exists
  const user = TokenManager.getUser();
  if (!user) {
    console.log('❌ No user data found - incomplete authentication');
    return false;
  }
  
  const validation = TokenManager.validateToken(token);
  
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 Token validation:', {
      valid: validation.valid,
      reason: validation.reason,
      expiresAt: validation.expiresAt,
      user: user.name || user.email
    });
  }
  
  // Allow request even if token is expired - let backend handle it
  // Backend will return proper 401 if token is truly invalid
  return !!token;
};

export default API;