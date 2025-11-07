// utils/authHandler.js - Enhanced authentication utilities for DebtManager
import TokenManager from './tokenManager';

export const AuthenticationHandler = {
  // Check current authentication status
  checkAuthStatus() {
    const token = TokenManager.getToken();
    const user = TokenManager.getUser();
    
    return {
      hasToken: !!token,
      hasUser: !!user,
      tokenExpired: this.isTokenExpired(token),
      user: user,
      token: token ? token.substring(0, 20) + '...' : null,
      fullToken: token
    };
  },

  // Check if token is expired
  isTokenExpired(token) {
    if (!token) return true;
    
    try {
      // Try to decode JWT token to check expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      console.warn('Could not decode token for expiration check:', error);
      return false; // Assume valid if we can't decode
    }
  },

  // Get all possible token locations
  getAllTokens() {
    return {
      localStorage: {
        authToken: localStorage.getItem('authToken'),
        token: localStorage.getItem('token'),
        jwt: localStorage.getItem('jwt')
      },
      sessionStorage: {
        authToken: sessionStorage.getItem('authToken'),
        token: sessionStorage.getItem('token'),
        jwt: sessionStorage.getItem('jwt')
      },
      tokenManager: TokenManager.getToken(),
      cookies: this.getCookieTokens()
    };
  },

  // Get tokens from cookies
  getCookieTokens() {
    const cookies = {};
    try {
      document.cookie.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && ['authToken', 'token', 'jwt'].includes(name)) {
          cookies[name] = value;
        }
      });
    } catch (error) {
      console.warn('Error reading cookies:', error);
    }
    return cookies;
  },

  // Clear authentication data
  clearAuth() {
    console.log('Clearing all authentication data...');
    
    // Clear TokenManager
    TokenManager.clearToken();
    TokenManager.clearUser();
    
    // Clear localStorage
    const localKeys = ['authToken', 'token', 'jwt', 'user', 'refreshToken'];
    localKeys.forEach(key => localStorage.removeItem(key));
    
    // Clear sessionStorage
    const sessionKeys = ['authToken', 'token', 'jwt', 'user', 'refreshToken'];
    sessionKeys.forEach(key => sessionStorage.removeItem(key));
    
    // Clear cookies (if possible)
    try {
      const cookiesToClear = ['authToken', 'token', 'jwt'];
      cookiesToClear.forEach(name => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });
    } catch (error) {
      console.warn('Could not clear cookies:', error);
    }
  },

  // Redirect to login with current page info
  redirectToLogin() {
    const currentPath = window.location.pathname;
    const loginUrl = `/login?redirect=${encodeURIComponent(currentPath)}`;
    console.log('Redirecting to login:', loginUrl);
    window.location.href = loginUrl;
  },

  // Handle authentication errors
  handleAuthError(error) {
    console.error('Authentication error:', error);
    
    // Clear potentially invalid tokens
    this.clearAuth();
    
    return {
      message: 'Your session has expired. Please log in again.',
      action: 'redirect',
      shouldRedirect: true,
      redirectUrl: '/login'
    };
  },

  // Debug authentication state
  debugAuth() {
    const status = this.checkAuthStatus();
    const allTokens = this.getAllTokens();
    
    console.group('🔐 Authentication Debug');
    console.log('Current Status:', status);
    console.log('All Available Tokens:', allTokens);
    console.log('User Data:', TokenManager.getUser());
    console.groupEnd();
    
    return { status, allTokens };
  },

  // Test authentication with backend
  async testAuth() {
    const status = this.checkAuthStatus();
    
    if (!status.hasToken) {
      return {
        success: false,
        error: 'No authentication token available',
        suggestion: 'User needs to log in'
      };
    }

    try {
      // Test with a simple authenticated endpoint
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${status.fullToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: 'Authentication valid',
          data
        };
      } else {
        return {
          success: false,
          error: `Authentication test failed: ${response.status}`,
          suggestion: response.status === 401 ? 'Token expired or invalid' : 'Server error'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Network error: ${error.message}`,
        suggestion: 'Check if backend server is running'
      };
    }
  },

  // Attempt to refresh token
  async refreshToken() {
    const refreshToken = localStorage.getItem('refreshToken') || 
                        sessionStorage.getItem('refreshToken');

    if (!refreshToken) {
      return {
        success: false,
        error: 'No refresh token available'
      };
    }

    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.token) {
          // Store new token
          localStorage.setItem('authToken', data.token);
          sessionStorage.setItem('authToken', data.token);
          TokenManager.setToken(data.token);
          
          if (data.user) {
            TokenManager.setUser(data.user);
          }

          return {
            success: true,
            message: 'Token refreshed successfully',
            token: data.token
          };
        }
      }

      return {
        success: false,
        error: `Refresh failed: ${response.status}`,
        shouldClearAuth: true
      };

    } catch (error) {
      return {
        success: false,
        error: `Refresh error: ${error.message}`,
        shouldClearAuth: true
      };
    }
  }
};

export default AuthenticationHandler;