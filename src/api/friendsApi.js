// api/friendsApi.js - FIXED VERSION with Better Error Handling
import API, { verifyTokenBeforeRequest } from './api.js';
import TokenManager from '../utils/tokenManager.js';

// Helper function to handle API responses consistently
const handleApiResponse = (operation) => async (response) => {
  console.log(`👥 Friends API: ✅ ${operation} successful`);
  return {
    success: true,
    ...response.data
  };
};

// Helper function to handle API errors consistently  
const handleApiError = (operation) => (error) => {
  console.log(`👥 Friends API: ❌ ${operation} failed:`);
  console.log(error.response?.data || { status: error.response?.status, message: error.message });
  
  const status = error.response?.status;
  const data = error.response?.data;
  
  // Check for authentication errors
  if (status === 401 || data?.authError) {
    console.log('🚨 Auth error detected in friends API');
    return {
      success: false,
      authError: true,
      message: data?.message || 'Authentication failed',
      status
    };
  }
  
  // Handle other errors
  return {
    success: false,
    authError: false,
    message: data?.message || error.message || `${operation} failed`,
    status: status || 500
  };
};

// Pre-request validation
const validateRequest = (operation) => {
  // Check if user is authenticated before making request
  if (!verifyTokenBeforeRequest()) {
    console.log(`❌ ${operation} - No valid authentication`);
    return {
      success: false,
      authError: true,
      message: 'Authentication required'
    };
  }
  
  // Check if user data exists
  const user = TokenManager.getUser();
  if (!user || !user._id) {
    console.log(`❌ ${operation} - No user data found`);
    return {
      success: false,
      authError: true,
      message: 'User data not found - please log in again'
    };
  }
  
  console.log(`🔐 ${operation} - Auth validated for user:`, user.email);
  return { valid: true, user };
};

// Fetch user's friends
export const fetchFriends = async () => {
  try {
    console.log('👥 Friends API: 📞 Fetching friends...');
    
    // Validate authentication first
    const validation = validateRequest('Fetch friends');
    if (!validation.valid) {
      return validation;
    }
    
    const response = await API.get('/friends');
    return handleApiResponse('Fetch friends')(response);
    
  } catch (error) {
    return handleApiError('Fetch friends')(error);
  }
};

// Search for users
export const searchUsers = async (query) => {
  try {
    console.log('👥 Friends API: 🔍 Searching users:', query);
    
    // Validate authentication first
    const validation = validateRequest('Search users');
    if (!validation.valid) {
      return validation;
    }
    
    if (!query || query.trim().length < 2) {
      return {
        success: true,
        users: [],
        count: 0,
        message: 'Query too short'
      };
    }
    
    const response = await API.get('/friends/search', {
      params: { q: query.trim() }
    });
    
    return handleApiResponse('Search users')(response);
    
  } catch (error) {
    return handleApiError('Search users')(error);
  }
};

// Add a friend
export const addFriend = async (friendId) => {
  try {
    console.log('👥 Friends API: ➕ Adding friend:', friendId);
    
    // Validate authentication first
    const validation = validateRequest('Add friend');
    if (!validation.valid) {
      return validation;
    }
    
    if (!friendId) {
      return {
        success: false,
        message: 'Friend ID is required'
      };
    }
    
    const response = await API.post('/friends/add', {
      userId: friendId
    });
    
    return handleApiResponse('Add friend')(response);
    
  } catch (error) {
    return handleApiError('Add friend')(error);
  }
};

// Remove a friend
export const removeFriend = async (friendId) => {
  try {
    console.log('👥 Friends API: ➖ Removing friend:', friendId);
    
    // Validate authentication first
    const validation = validateRequest('Remove friend');
    if (!validation.valid) {
      return validation;
    }
    
    if (!friendId) {
      return {
        success: false,
        message: 'Friend ID is required'
      };
    }
    
    const response = await API.delete(`/friends/${friendId}`);
    return handleApiResponse('Remove friend')(response);
    
  } catch (error) {
    return handleApiError('Remove friend')(error);
  }
};

// Get friend suggestions
export const getFriendSuggestions = async () => {
  try {
    console.log('👥 Friends API: 💡 Getting friend suggestions...');
    
    // Validate authentication first
    const validation = validateRequest('Get friend suggestions');
    if (!validation.valid) {
      return validation;
    }
    
    const response = await API.get('/friends/suggestions');
    return handleApiResponse('Get friend suggestions')(response);
    
  } catch (error) {
    return handleApiError('Get friend suggestions')(error);
  }
};

// Get friend details
export const getFriendDetails = async (friendId) => {
  try {
    console.log('👥 Friends API: 👤 Getting friend details:', friendId);
    
    // Validate authentication first
    const validation = validateRequest('Get friend details');
    if (!validation.valid) {
      return validation;
    }
    
    if (!friendId) {
      return {
        success: false,
        message: 'Friend ID is required'
      };
    }
    
    const response = await API.get(`/friends/${friendId}`);
    return handleApiResponse('Get friend details')(response);
    
  } catch (error) {
    return handleApiError('Get friend details')(error);
  }
};

// Debug function to test authentication
export const testFriendsAuth = async () => {
  try {
    console.log('👥 Friends API: 🔧 Testing authentication...');
    
    const validation = validateRequest('Test auth');
    if (!validation.valid) {
      return validation;
    }
    
    const response = await API.get('/friends/debug/auth');
    return handleApiResponse('Test auth')(response);
    
  } catch (error) {
    return handleApiError('Test auth')(error);
  }
};