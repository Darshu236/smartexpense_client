// utils/tokenManager.js - FIXED VERSION with Better JWT Parsing
class TokenManager {
  static TOKEN_KEY = 'authToken';
  static USER_KEY = 'userData';
  
  // Store authentication data
  static setAuth(token, user) {
    return this.setAuthData(token, user);
  }
  
  static setAuthData(token, user) {
    try {
      if (!token || !user) {
        console.error('⚠️ TokenManager: Invalid auth data provided');
        return false;
      }
      
      // Ensure user has required fields
      const userData = {
        _id: user._id || user.id,
        userId: user.userId || user._id || user.id,
        email: user.email,
        name: user.name,
        profilePicture: user.profilePicture,
        ...user
      };
      
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
      
      console.log('✅ TokenManager: Auth data stored:', {
        _id: userData._id,
        userId: userData.userId,
        email: userData.email
      });
      
      return true;
    } catch (error) {
      console.error('❌ TokenManager: Failed to store auth data:', error);
      return false;
    }
  }
  
  // Get stored token
  static getToken() {
    try {
      const token = localStorage.getItem(this.TOKEN_KEY);
      return token || null;
    } catch (error) {
      console.error('❌ TokenManager: Failed to get token:', error);
      return null;
    }
  }
  
  // Get stored user data
  static getUser() {
    try {
      const userData = localStorage.getItem(this.USER_KEY);
      if (!userData) return null;
      
      const user = JSON.parse(userData);
      
      // Ensure user has both _id and userId
      if (user && !user.userId && user._id) {
        user.userId = user._id;
      }
      
      return user;
    } catch (error) {
      console.error('❌ TokenManager: Failed to get user data:', error);
      return null;
    }
  }
  
  // Clear all authentication data
  static clearAuth() {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      console.log('🗑️ TokenManager: Auth data cleared');
      return true;
    } catch (error) {
      console.error('❌ TokenManager: Failed to clear auth data:', error);
      return false;
    }
  }
  
  // Check if user is authenticated
  static isAuthenticated() {
    const token = this.getToken();
    const user = this.getUser();
    
    const authenticated = !!(token && user && (user._id || user.id));
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 TokenManager: Authentication check:', {
        hasToken: !!token,
        hasUser: !!user,
        hasUserId: !!(user && (user._id || user.id)),
        authenticated
      });
    }
    
    return authenticated;
  }
  
  // Decode JWT token (client-side parsing - not for security)
  static decodeToken(token) {
    try {
      if (!token) return null;
      
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch (error) {
      console.error('❌ TokenManager: Failed to decode token:', error);
      return null;
    }
  }
  
  // Validate token structure and expiration (client-side only)
  static validateToken(token) {
    try {
      if (!token) {
        return { valid: false, reason: 'No token provided' };
      }
      
      const decoded = this.decodeToken(token);
      if (!decoded) {
        return { valid: false, reason: 'Invalid token format' };
      }
      
      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (decoded.exp && decoded.exp < now) {
        return { 
          valid: false, 
          reason: 'Token expired',
          expiresAt: new Date(decoded.exp * 1000)
        };
      }
      
      // Check for user identifier
      const userIdField = decoded.userId || decoded.id || decoded.sub;
      if (!userIdField) {
        return { valid: false, reason: 'No user identifier in token' };
      }
      
      return { 
        valid: true, 
        decoded,
        expiresAt: decoded.exp ? new Date(decoded.exp * 1000) : null,
        userId: userIdField
      };
    } catch (error) {
      return { valid: false, reason: error.message };
    }
  }
  
  // Get user ID with fallbacks
  static getUserId() {
    const user = this.getUser();
    if (!user) return null;
    
    return user._id || user.userId || user.id;
  }
  
  // Check if token needs refresh (within 5 minutes of expiration)
  static needsRefresh() {
    const token = this.getToken();
    if (!token) return false;
    
    const validation = this.validateToken(token);
    if (!validation.valid) return true;
    
    if (validation.expiresAt) {
      const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
      const timeToExpiry = validation.expiresAt.getTime() - Date.now();
      return timeToExpiry < fiveMinutes;
    }
    
    return false;
  }
  
  // Debug function to log current auth state
  static debugAuthState() {
    const token = this.getToken();
    const user = this.getUser();
    const validation = token ? this.validateToken(token) : { valid: false };
    
    console.log('🔧 TokenManager Debug State:', {
      hasToken: !!token,
      tokenLength: token ? token.length : 0,
      user: user ? {
        _id: user._id,
        userId: user.userId,
        email: user.email,
        name: user.name
      } : null,
      tokenValidation: {
        valid: validation.valid,
        reason: validation.reason,
        expiresAt: validation.expiresAt
      },
      isAuthenticated: this.isAuthenticated(),
      needsRefresh: this.needsRefresh()
    });
    
    return {
      hasToken: !!token,
      hasUser: !!user,
      tokenValid: validation.valid,
      isAuthenticated: this.isAuthenticated()
    };
  }
}

export default TokenManager;