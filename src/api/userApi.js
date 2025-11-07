// src/api/userApi.js - Fixed with rate limiting and better caching
import API from './api';

// Debug logging utility
const isDevelopment = process.env.NODE_ENV === 'development';

const debugLog = {
  info: (message, data = null) => {
    if (isDevelopment) console.log(`👤 User: ${message}`, data || '');
  },
  success: (message, data = null) => {
    if (isDevelopment) console.log(`✅ User: ${message}`, data || '');
  },
  warning: (message, data = null) => {
    if (isDevelopment) console.warn(`⚠️ User: ${message}`, data || '');
  },
  error: (message, error = null) => {
    console.error(`❌ User: ${message}`, {
      status: error?.response?.status,
      message: error?.response?.data?.message || error?.message,
      url: error?.config?.url,
      timestamp: new Date().toISOString()
    });
  }
};

// ==================== RATE LIMITING & CACHING ====================

// Enhanced cache with timestamps and request tracking
const cache = new Map();
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes (longer to reduce API calls)
const requestTracker = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_MINUTE = 10;

// Track API requests for rate limiting
const trackRequest = (endpoint) => {
  const now = Date.now();
  const key = endpoint;
  
  if (!requestTracker.has(key)) {
    requestTracker.set(key, []);
  }
  
  const requests = requestTracker.get(key);
  
  // Clean old requests outside the window
  const validRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
  
  // Check if we're hitting the limit
  if (validRequests.length >= MAX_REQUESTS_PER_MINUTE) {
    debugLog.warning(`Rate limit approaching for ${endpoint}. Requests: ${validRequests.length}/${MAX_REQUESTS_PER_MINUTE}`);
    return false;
  }
  
  // Add current request
  validRequests.push(now);
  requestTracker.set(key, validRequests);
  
  return true;
};

// Prevent concurrent requests to same endpoint
const activeRequests = new Map();

const setCachedData = (key, data) => {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
  debugLog.info(`Cached data for ${key}`);
};

const getCachedData = (key) => {
  const cached = cache.get(key);
  if (!cached) return null;

  if (Date.now() - cached.timestamp > CACHE_DURATION) {
    cache.delete(key);
    debugLog.info(`Cache expired for ${key}`);
    return null;
  }

  debugLog.info(`Cache hit for ${key}`);
  return cached.data;
};

const clearCachedData = (key) => {
  if (key) {
    cache.delete(key);
    debugLog.info(`Cache cleared for ${key}`);
  } else {
    cache.clear();
    debugLog.info('All cache cleared');
  }
};

// ==================== FRIENDS MANAGEMENT ====================

export const fetchFriends = async () => {
  const cacheKey = 'friends';
  
  try {
    // Check cache first
    const cached = getCachedData(cacheKey);
    if (cached) {
      return { friends: cached, success: true, fromCache: true };
    }

    // Check rate limit
    if (!trackRequest('/friends')) {
      debugLog.warning('Rate limit hit for friends endpoint, returning cached data');
      const fallback = getCachedData(cacheKey) || [];
      return { friends: fallback, success: false, fromCache: true, message: 'Rate limited' };
    }

    debugLog.info('Fetching friends...');
    const response = await API.get('/friends');
    const friends = response.data?.friends || response.data?.data || response.data || [];
    
    setCachedData(cacheKey, friends);
    debugLog.success(`Fetched ${friends.length} friends`);
    return { friends: Array.isArray(friends) ? friends : [], success: true };
  } catch (error) {
    debugLog.error('Error fetching friends', error);
    
    // Return cached friends if available
    const cached = getCachedData(cacheKey);
    if (cached) {
      debugLog.warning('Returning cached friends data');
      return { friends: cached, success: false, fromCache: true, message: 'Using cached data' };
    }

    return { friends: [], success: false, message: error.message };
  }
};

export const addFriend = async (friendId) => {
  try {
    if (!friendId) throw new Error('Friend ID required');
    
    // Check rate limit
    if (!trackRequest('/friends/add')) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    debugLog.info(`Adding friend: ${friendId}`);
    const response = await API.post('/friends/add', { friendId });
    debugLog.success('Friend added successfully');

    // Clear friends cache to force refresh
    clearCachedData('friends');

    return response.data;
  } catch (error) {
    debugLog.error('Error adding friend', error);
    throw new Error(getErrorMessage(error, 'Failed to add friend'));
  }
};

export const removeFriend = async (friendId) => {
  try {
    if (!friendId) throw new Error('Friend ID required');
    
    // Check rate limit
    if (!trackRequest('/friends/remove')) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    debugLog.info(`Removing friend: ${friendId}`);
    const response = await API.delete(`/friends/${encodeURIComponent(friendId)}`);
    debugLog.success('Friend removed successfully');

    // Clear friends cache to force refresh
    clearCachedData('friends');

    return response.data;
  } catch (error) {
    debugLog.error('Error removing friend', error);
    throw new Error(getErrorMessage(error, 'Failed to remove friend'));
  }
};

// ==================== USER PROFILE ====================

// Normalize user object consistently
const normalizeUser = (raw) => {
  if (!raw) return null;
  return {
    id: raw.id || raw._id || raw.userId || null,
    name: raw.name || raw.fullName || raw.displayName || 'Unknown User',
    email: raw.email || raw.username || null,
    avatar: raw.avatar || raw.profilePic || raw.profileImage || null,
    role: raw.role || 'user',
    phone: raw.phone || raw.phoneNumber || null,
    createdAt: raw.createdAt || raw.created_at || null,
    updatedAt: raw.updatedAt || raw.updated_at || null,
    ...raw // Include any additional fields
  };
};

export const getUserProfile = async (forceRefresh = false) => {
  const cacheKey = 'user_profile';
  const endpoint = '/auth/me'; // Use only the primary endpoint

  try {
    // Check for active request to prevent duplicates
    if (activeRequests.has(endpoint)) {
      debugLog.info('Request already in progress, waiting...');
      return await activeRequests.get(endpoint);
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cached = getCachedData(cacheKey);
      if (cached) {
        debugLog.success('User profile loaded from cache');
        return { user: cached, success: true, fromCache: true };
      }
    }

    // Check localStorage as secondary cache
    if (!forceRefresh) {
      const stored = localStorage.getItem('user');
      if (stored) {
        try {
          const user = normalizeUser(JSON.parse(stored));
          if (user && user.id) {
            debugLog.success('User profile loaded from localStorage');
            setCachedData(cacheKey, user); // Update cache
            return { user, success: true, fromCache: true };
          }
        } catch (parseError) {
          debugLog.error('Failed to parse stored user data', parseError);
          localStorage.removeItem('user');
        }
      }
    }

    // Check rate limit before making API call
    if (!trackRequest(endpoint)) {
      debugLog.warning('Rate limit hit for user profile, using cached data');
      const fallback = getCachedData(cacheKey);
      if (fallback) {
        return { user: fallback, success: false, fromCache: true, message: 'Rate limited' };
      }
      // Return guest user if no cache available
      const guestUser = createGuestUser();
      return { user: guestUser, success: false, message: 'Rate limited', isGuest: true };
    }

    // Create promise for this request
    const requestPromise = (async () => {
      try {
        debugLog.info('Fetching user profile from server...');
        const response = await API.get(endpoint);
        
        const user = normalizeUser(response.data?.user || response.data);
        if (!user || !user.id) {
          throw new Error('Invalid user data received from server');
        }

        debugLog.success('User profile fetched successfully', user);

        // Cache the user data
        setCachedData(cacheKey, user);
        localStorage.setItem('user', JSON.stringify(user));

        return { user, success: true, fromCache: false };
      } finally {
        // Always clean up active request
        activeRequests.delete(endpoint);
      }
    })();

    // Store the promise to prevent duplicate requests
    activeRequests.set(endpoint, requestPromise);
    
    return await requestPromise;

  } catch (error) {
    // Clean up on error
    activeRequests.delete(endpoint);
    
    debugLog.error('Error fetching profile from server', error);

    // Try cached data first
    const cached = getCachedData(cacheKey);
    if (cached) {
      debugLog.success('Loaded user from cache after error');
      return { user: cached, success: true, fromCache: true };
    }

    // Fallback to localStorage
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const user = normalizeUser(JSON.parse(stored));
        if (user && user.id) {
          debugLog.success('Loaded user from localStorage after error');
          setCachedData(cacheKey, user);
          return { user, success: true, fromCache: true };
        }
      } catch (parseError) {
        debugLog.error('Failed to parse stored user data', parseError);
        localStorage.removeItem('user');
      }
    }

    // Create a guest user as last resort
    const guestUser = createGuestUser();
    debugLog.warning('Created guest user as fallback');
    return { user: guestUser, success: false, message: error.message, isGuest: true };
  }
};

export const updateUserProfile = async (data) => {
  try {
    // Validate input data
    if (!data || typeof data !== 'object') {
      throw new Error('Valid user data is required');
    }

    const stored = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = data?.id || stored?.id;

    if (!userId) {
      throw new Error('User ID is required for profile update');
    }

    // Check rate limit
    if (!trackRequest('/users/update')) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    debugLog.info(`Updating profile for user: ${userId}`, data);
    const response = await API.put(`/users/${userId}`, data);
    const updated = normalizeUser(response.data?.user || response.data);

    if (!updated) {
      throw new Error('Invalid response from server');
    }

    // Update all caches
    setCachedData('user_profile', updated);
    localStorage.setItem('user', JSON.stringify(updated));

    debugLog.success('Profile updated successfully', updated);
    return { user: updated, success: true };
  } catch (error) {
    debugLog.error('Error updating profile', error);
    throw new Error(getErrorMessage(error, 'Failed to update profile'));
  }
};

export const getUserById = async (id) => {
  try {
    if (!id) throw new Error('User ID is required');

    // Check cache first
    const cacheKey = `user_${id}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      return cached;
    }

    // Check rate limit
    if (!trackRequest('/users/by-id')) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    debugLog.info(`Fetching user by ID: ${id}`);
    const response = await API.get(`/users/${encodeURIComponent(id)}`);
    const user = normalizeUser(response.data?.user || response.data);

    if (!user) {
      throw new Error('User not found or invalid data received');
    }

    // Cache the result
    setCachedData(cacheKey, user);

    debugLog.success(`User fetched: ${user.name}`);
    return user;
  } catch (error) {
    debugLog.error('Error fetching user by ID', error);
    throw new Error(getErrorMessage(error, 'Failed to fetch user'));
  }
};

// ==================== AUTH ====================

export const loginUser = async (credentials) => {
  try {
    if (!credentials || !credentials.email || !credentials.password) {
      throw new Error('Email and password are required');
    }

    debugLog.info('Attempting user login...');
    const response = await API.post('/auth/login', credentials);
    const { user, token } = response.data;

    if (!user || !token) {
      throw new Error('Invalid login response from server');
    }

    const normalized = normalizeUser(user);

    // Store authentication data
    if (normalized) {
      localStorage.setItem('user', JSON.stringify(normalized));
      setCachedData('user_profile', normalized);
    }
    if (token) localStorage.setItem('authToken', token);

    debugLog.success('Login successful', { userId: normalized?.id, name: normalized?.name });
    return { user: normalized, token, success: true };
  } catch (error) {
    debugLog.error('Login failed', error);
    throw new Error(getErrorMessage(error, 'Login failed'));
  }
};

export const registerUser = async (data) => {
  try {
    if (!data || !data.email || !data.password || !data.name) {
      throw new Error('Name, email and password are required');
    }

    debugLog.info('Attempting user registration...');
    const response = await API.post('/auth/register', data);
    const { user, token } = response.data;

    if (!user) {
      throw new Error('Invalid registration response from server');
    }

    const normalized = normalizeUser(user);

    // Store authentication data
    if (normalized) {
      localStorage.setItem('user', JSON.stringify(normalized));
      setCachedData('user_profile', normalized);
    }
    if (token) localStorage.setItem('authToken', token);

    debugLog.success('Registration successful', { userId: normalized?.id, name: normalized?.name });
    return { user: normalized, token, success: true };
  } catch (error) {
    debugLog.error('Registration failed', error);
    throw new Error(getErrorMessage(error, 'Registration failed'));
  }
};

export const logoutUser = async () => {
  try {
    debugLog.info('Logging out user...');

    // Try to call logout endpoint if available
    try {
      await API.post('/auth/logout');
    } catch (error) {
      debugLog.warning('Server logout endpoint failed, proceeding with local logout');
    }

    // Clear all local data
    clearUserData();
    debugLog.success('User logged out successfully');

    return { success: true };
  } catch (error) {
    debugLog.error('Error during logout', error);
    // Even if server logout fails, clear local data
    clearUserData();
    return { success: false, message: error.message };
  }
};

// ==================== UTILITIES ====================

export const isAuthenticated = () => {
  const token = localStorage.getItem('authToken');
  if (!token) return false;

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const isValid = !payload.exp || payload.exp > Date.now() / 1000;

    if (!isValid) {
      debugLog.warning('Token expired, clearing authentication data');
      clearUserData();
    }

    return isValid;
  } catch (error) {
    debugLog.error('Invalid token format', error);
    clearUserData();
    return false;
  }
};

export const getStoredUser = () => {
  try {
    const stored = localStorage.getItem('user');
    return stored ? normalizeUser(JSON.parse(stored)) : null;
  } catch (error) {
    debugLog.error('Error parsing stored user data', error);
    localStorage.removeItem('user');
    return null;
  }
};

export const clearUserData = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('authToken');
  clearCachedData('user_profile');
  clearCachedData('friends');
  // Clear all user-related cache
  cache.forEach((value, key) => {
    if (key.startsWith('user_')) {
      cache.delete(key);
    }
  });
  debugLog.info('User data cleared');
};

// ==================== HELPER FUNCTIONS ====================

// Extract meaningful error messages
const getErrorMessage = (error, defaultMessage = 'An error occurred') => {
  if (error?.response?.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  if (error?.message) {
    return error.message;
  }
  return defaultMessage;
};

// Create a guest user for offline mode
const createGuestUser = () => {
  return {
    id: 'guest',
    name: 'Guest User',
    email: 'guest@example.com',
    avatar: 'https://ui-avatars.com/api/?name=Guest&background=94a3b8&color=fff&size=100',
    role: 'guest',
    phone: null,
    isGuest: true
  };
};

// Validate user data structure
export const validateUserData = (userData) => {
  if (!userData || typeof userData !== 'object') {
    return { valid: false, errors: ['User data must be an object'] };
  }

  const errors = [];

  if (!userData.id && !userData._id) {
    errors.push('User ID is required');
  }

  if (!userData.name && !userData.fullName) {
    errors.push('User name is required');
  }

  if (userData.email && !isValidEmail(userData.email)) {
    errors.push('Invalid email format');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

// Simple email validation
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Health check for user API
export const checkUserAPIHealth = async () => {
  try {
    const response = await API.get('/health');
    return { healthy: true, data: response.data };
  } catch (error) {
    return { healthy: false, error: error.message };
  }
};

// Refresh user data (force refresh)
export const refreshUserProfile = async () => {
  debugLog.info('Force refreshing user profile...');
  return await getUserProfile(true);
};

// Get rate limit status
export const getRateLimitStatus = () => {
  const status = {};
  requestTracker.forEach((requests, endpoint) => {
    const now = Date.now();
    const validRequests = requests.filter(time => now - time < RATE_LIMIT_WINDOW);
    status[endpoint] = {
      requests: validRequests.length,
      limit: MAX_REQUESTS_PER_MINUTE,
      resetIn: RATE_LIMIT_WINDOW - (now - Math.max(...validRequests, now))
    };
  });
  return status;
};

// Export all functions
export default {
  // Friends
  fetchFriends,
  addFriend,
  removeFriend,

  // Profile
  getUserProfile,
  updateUserProfile,
  getUserById,
  refreshUserProfile,

  // Auth
  loginUser,
  registerUser,
  logoutUser,
  isAuthenticated,
  getStoredUser,
  clearUserData,

  // Utilities
  validateUserData,
  checkUserAPIHealth,
  createGuestUser,
  getRateLimitStatus
};