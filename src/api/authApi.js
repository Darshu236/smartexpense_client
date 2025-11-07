// src/api/authApi.js - Enhanced with 2FA support (Fixed)
import API from './api.js';

// Debug logging utility
const isDevelopment = process.env.NODE_ENV === 'development';

const debugLog = {
  info: (message, data = null) => {
    if (isDevelopment) {
      data ? console.log(`📋 Auth: ${message}`, data) : console.log(`📋 Auth: ${message}`);
    }
  },
  success: (message, data = null) => {
    if (isDevelopment) {
      data ? console.log(`✅ Auth: ${message}`, data) : console.log(`✅ Auth: ${message}`);
    }
  },
  error: (message, error = null) => {
    // Always log errors (critical for auth)
    if (error) {
      console.error(`❌ Auth: ${message}`, error.response?.data || error.message);
    } else {
      console.error(`❌ Auth: ${message}`);
    }
  }
};

// Centralized error handler
const handleError = (message, error) => {
  debugLog.error(message, error);
  const normalized = {
    status: error.response?.status,
    data: error.response?.data,
    code: error.code,
    message: error.response?.data?.error || error.response?.data?.message || error.message || message
  };
  throw normalized;
};

// ==============================
// USER ID MANAGEMENT
// ==============================

export const checkUserIdAvailability = async (userId) => {
  try {
    debugLog.info('Checking User ID availability...', { userId });
    const response = await API.post('/auth/check-userid', { userId });
    debugLog.success('User ID availability checked', response.data);
    return response.data;
  } catch (error) {
    handleError('Failed to check User ID availability', error);
  }
};

export const suggestUserId = async (name, preferredUsername = null) => {
  try {
    debugLog.info('Requesting User ID suggestion...', { name, preferredUsername });
    const response = await API.post('/auth/suggest-userid', {
      name,
      preferredUsername
    });
    debugLog.success('User ID suggestion received', response.data);
    return response.data;
  } catch (error) {
    handleError('Failed to get User ID suggestion', error);
  }
};

// ==============================
// EXISTING AUTH FUNCTIONS (Updated for compatibility)
// ==============================

export const register = async (userData) => {
  try {
    debugLog.info('Registering new user (traditional)...', { ...userData, password: '[HIDDEN]' });
    const response = await API.post('/auth/register', userData);
    
    // Save token immediately after successful registration
    if (response.data && response.data.token) {
      const { token, user } = response.data;
      // Use consistent token key with the API client
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    
    debugLog.success('User registered successfully', response.data);
    return response.data;
  } catch (error) {
    handleError('Registration error', error);
  }
};

export const login = async (credentials) => {
  try {
    debugLog.info('Logging in user...', { email: credentials.email });
    const response = await API.post('/auth/login', credentials);
    
    // Save token immediately after successful login
    if (response.data && response.data.token) {
      const { token, user } = response.data;
      
      // Use consistent token key with the API client
      localStorage.setItem('authToken', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      // Verify token was saved
      const savedToken = localStorage.getItem('authToken');
      debugLog.success('User logged in successfully', {
        message: response.data.message,
        user: user,
        tokenSaved: !!savedToken
      });
    }
    
    return response.data;
  } catch (error) {
    handleError('Login error', error);
  }
};

export const getCurrentUser = async () => {
  try {
    debugLog.info('Fetching current user...');
    const response = await API.get('/auth/me');
    debugLog.success('Current user fetched', response.data);
    return response.data;
  } catch (error) {
    handleError('Error fetching current user', error);
  }
};

export const getUserProfile = async () => {
  try {
    debugLog.info('Fetching user profile...');
    const response = await API.get('/auth/me');
    debugLog.success('User profile fetched', response.data);
    return response.data;
  } catch (error) {
    handleError('Error fetching user profile', error);
  }
};

export const logout = async () => {
  try {
    debugLog.info('Logging out user...');
    
    // Try to call server logout endpoint
    try {
      const response = await API.post('/auth/logout');
      debugLog.success('Server logout successful');
    } catch (serverError) {
      debugLog.error('Server logout failed, proceeding with local logout', serverError);
    }
    
    // Clear local storage regardless of server response - use consistent token key
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    debugLog.success('User logged out successfully (local cleanup complete)');
    return { success: true, message: 'Logged out successfully' };
  } catch (error) {
    // Even if everything fails, clear local storage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    handleError('Logout error', error);
  }
};

export const changePassword = async (passwordData) => {
  try {
    debugLog.info('Changing user password...');
    const response = await API.put('/auth/change-password', passwordData);
    debugLog.success('Password changed successfully');
    return response.data;
  } catch (error) {
    handleError('Password change error', error);
  }
};

export const requestPasswordReset = async (email) => {
  try {
    debugLog.info('Requesting password reset...', { email });
    const response = await API.post('/auth/forgot-password', { email });
    debugLog.success('Password reset email sent');
    return response.data;
  } catch (error) {
    handleError('Password reset request error', error);
  }
};

export const resetPassword = async (token, newPassword) => {
  try {
    debugLog.info('Resetting password with token...');
    const response = await API.post('/auth/reset-password', { token, password: newPassword });
    debugLog.success('Password reset successful');
    return response.data;
  } catch (error) {
    handleError('Password reset error', error);
  }
};

export const sendVerificationEmail = async () => {
  try {
    debugLog.info('Sending verification email...');
    const response = await API.post('/auth/send-verification');
    debugLog.success('Verification email sent');
    return response.data;
  } catch (error) {
    handleError('Error sending verification email', error);
  }
};

export const verifyEmail = async (token) => {
  try {
    debugLog.info('Verifying email token...');
    const response = await API.post('/auth/verify-email', { token });
    debugLog.success('Email verified');
    return response.data;
  } catch (error) {
    handleError('Error verifying email', error);
  }
};

export const refreshToken = async () => {
  try {
    debugLog.info('Refreshing auth token...');
    const response = await API.post('/auth/refresh-token');
    
    // Update stored token if new one is provided - use consistent token key
    if (response.data?.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    
    debugLog.success('Token refreshed');
    return response.data;
  } catch (error) {
    handleError('Token refresh error', error);
  }
};

export const checkEmailExists = async (email) => {
  try {
    debugLog.info('Checking if email exists...', { email });
    const response = await API.post('/auth/check-email', { email });
    debugLog.success('Email check completed');
    return response.data;
  } catch (error) {
    handleError('Email check error', error);
  }
};

export const updateProfile = async (profileData) => {
  try {
    debugLog.info('Updating user profile...');
    const response = await API.put('/auth/profile', profileData);
    
    // Update stored user data if profile update includes user info
    if (response.data?.user) {
      const existingUser = JSON.parse(localStorage.getItem('user') || '{}');
      const updatedUser = { ...existingUser, ...response.data.user };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
    
    debugLog.success('Profile updated successfully');
    return response.data;
  } catch (error) {
    handleError('Profile update error', error);
  }
};

export const deleteAccount = async (password) => {
  try {
    debugLog.info('Deleting user account...');
    const response = await API.delete('/auth/account', { data: { password } });
    
    // Clear local data after successful account deletion - use consistent token key
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    
    debugLog.success('Account deleted successfully');
    return response.data;
  } catch (error) {
    handleError('Account deletion error', error);
  }
};



export const getStoredUser = () => {
  try {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    debugLog.error('Error parsing stored user data', error);
    localStorage.removeItem('user');
    return null;
  }
};

export const clearAuthData = () => {
  // Use consistent token key with the API client
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
  debugLog.info('Auth data cleared');
};

// Legacy compatibility functions (for components that might still use old function names)
export const loginUser = login;
export const registerUser = register;
export const logoutUser = logout;
export const verifyToken = getCurrentUser;

// ==============================
// DEFAULT EXPORT
// ==============================
const authApi = {
  
  // User ID Management
  checkUserIdAvailability,
  suggestUserId,
  
  // Traditional Auth
  register,
  login,
  logout,
  
  // Legacy compatibility
  loginUser,
  registerUser,
  logoutUser,
  verifyToken,
  
  // User Management
  getCurrentUser,
  getUserProfile,
  updateProfile,
  
  // Password Management
  changePassword,
  requestPasswordReset,
  resetPassword,
  
  // Email Verification
  sendVerificationEmail,
  verifyEmail,
  
  // Token Management
  refreshToken,
  
  // Utilities
  checkEmailExists,
  deleteAccount,
  getStoredUser,
  clearAuthData
};

export default authApi;

export const authUtils = {
  getStoredUser,
  clearAuthData
};