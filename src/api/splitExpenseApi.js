// client/src/api/splitExpenseApi.js - Fixed version with proper error handling
import axios from 'axios';

// Get base URL from environment or default to localhost
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken') || 
                localStorage.getItem('token') || 
                sessionStorage.getItem('authToken') ||
                sessionStorage.getItem('token');
                
  if (token) {
    config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
  }
  
  console.log('API Request:', {
    method: config.method?.toUpperCase(),
    url: config.url,
    hasAuth: !!token,
    tokenPreview: token ? `${token.substring(0, 20)}...` : 'none'
  });
  
  return config;
});

// Enhanced error handling
api.interceptors.response.use(
  (response) => {
    console.log('API Success:', {
      method: response.config.method?.toUpperCase(),
      url: response.config.url,
      status: response.status
    });
    return response;
  },
  (error) => {
    console.warn('API Error:', {
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url,
      status: error.response?.status,
      message: error.response?.data?.message || error.message
    });
    
    if (error.response?.status === 401) {
      console.warn('Authentication failed - token may be expired');
      
      return Promise.resolve({
        data: {
          success: false,
          authError: true,
          message: 'Authentication required for split expenses',
          status: 401
        }
      });
    }
    
    // For other errors, return structured response
    return Promise.resolve({
      data: {
        success: false,
        message: error.response?.data?.message || error.message,
        status: error.response?.status || 500,
        authError: false,
        validationErrors: error.response?.data?.validationErrors || []
      }
    });
  }
);

// ============================
// Split Expense API Functions
// ============================

/**
 * Create a new split expense
 */
export const createSplitExpense = async (expenseData) => {
  try {
    console.log('Creating split expense:', JSON.stringify(expenseData, null, 2));
    
    const response = await api.post('/split-expenses', expenseData);
    
    if (response.data.authError) {
      console.warn('Split expense creation failed - authentication required');
      return {
        success: false,
        message: 'Authentication required to create split expenses',
        authError: true
      };
    }
    
    if (response.data.success === false) {
      return response.data;
    }
    
    console.log('Split expense created successfully:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('Split expense creation error:', error);
    return {
      success: false,
      message: error.message || 'Failed to create split expense',
      authError: false
    };
  }
};

/**
 * Fetch all split expenses for the authenticated user
 */
export const fetchSplitExpenses = async () => {
  try {
    console.log('Fetching split expenses...');
    
    const response = await api.get('/split-expenses');
    
    if (response.data.authError) {
      console.warn('Split expenses fetch failed - authentication required');
      return {
        success: false,
        message: 'Authentication required for split expenses',
        authError: true,
        expenses: []
      };
    }
    
    const expenses = response.data.expenses || response.data.data || response.data || [];
    
    console.log('Fetch split expenses response:', {
      success: true,
      count: expenses.length,
      expenses: expenses.slice(0, 2)
    });
    
    return {
      success: true,
      expenses: expenses,
      authError: false
    };
    
  } catch (error) {
    console.error('Fetch split expenses error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch split expenses',
      expenses: [],
      authError: false
    };
  }
};

/**
 * Get a specific split expense by ID
 */
export const getSplitExpenseById = async (expenseId) => {
  try {
    console.log('Fetching split expense by ID:', expenseId);
    
    const response = await api.get(`/split-expenses/${expenseId}`);
    
    if (response.data.authError) {
      return {
        success: false,
        message: 'Authentication required',
        authError: true
      };
    }
    
    console.log('Get split expense response:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('Get split expense error:', error);
    return {
      success: false,
      message: error.message || 'Failed to get split expense',
      authError: false
    };
  }
};

/**
 * Update a split expense
 */
export const updateSplitExpense = async (expenseId, updateData) => {
  try {
    console.log('Updating split expense:', expenseId, updateData);
    
    const response = await api.put(`/split-expenses/${expenseId}`, updateData);
    
    if (response.data.authError) {
      return {
        success: false,
        message: 'Authentication required',
        authError: true
      };
    }
    
    console.log('Update split expense response:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('Update split expense error:', error);
    return {
      success: false,
      message: error.message || 'Failed to update split expense',
      authError: false
    };
  }
};

/**
 * Delete a split expense
 */
export const deleteSplitExpense = async (expenseId) => {
  try {
    console.log('Deleting split expense:', expenseId);
    
    const response = await api.delete(`/split-expenses/${expenseId}`);
    
    if (response.data.authError) {
      return {
        success: false,
        message: 'Authentication required',
        authError: true
      };
    }
    
    console.log('Delete split expense response:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('Delete split expense error:', error);
    return {
      success: false,
      message: error.message || 'Failed to delete split expense',
      authError: false
    };
  }
};

/**
 * Get expense summary/dashboard for the user
 */
export const getExpenseSummary = async () => {
  try {
    console.log('Fetching expense summary...');
    
    const response = await api.get('/split-expenses/summary');
    
    if (response.data.authError) {
      return {
        success: false,
        message: 'Authentication required',
        authError: true
      };
    }
    
    console.log('Expense summary response:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('Get expense summary error:', error);
    return {
      success: false,
      message: error.message || 'Failed to get expense summary',
      authError: false
    };
  }
};

/**
 * Get balance with a specific friend
 */
export const getBalanceWithFriend = async (friendId) => {
  try {
    console.log('Fetching balance with friend:', friendId);
    
    const response = await api.get(`/split-expenses/balance/${friendId}`);
    
    if (response.data.authError) {
      return {
        success: false,
        message: 'Authentication required',
        authError: true
      };
    }
    
    console.log('Balance response:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('Get balance error:', error);
    return {
      success: false,
      message: error.message || 'Failed to get balance',
      authError: false
    };
  }
};

/**
 * Settle up with a friend
 */
export const settleWithFriend = async (friendId, settlementData) => {
  try {
    console.log('Settling with friend:', friendId, settlementData);
    
    const response = await api.post(`/split-expenses/settle/${friendId}`, settlementData);
    
    if (response.data.authError) {
      return {
        success: false,
        message: 'Authentication required',
        authError: true
      };
    }
    
    console.log('Settlement response:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('Settlement error:', error);
    return {
      success: false,
      message: error.message || 'Failed to record settlement',
      authError: false
    };
  }
};

// =====================
// Group API Functions
// =====================

/**
 * Fetch all groups for the authenticated user
 */
export const fetchGroups = async () => {
  try {
    console.log('Fetching groups...');
    
    const response = await api.get('/groups');
    
    if (response.data.authError) {
      return {
        success: false,
        message: 'Authentication required',
        authError: true,
        groups: []
      };
    }
    
    const groups = response.data.groups || response.data.data || [];
    console.log('Fetch groups response:', { success: true, count: groups.length });
    
    return {
      success: true,
      groups: groups,
      authError: false
    };
    
  } catch (error) {
    console.error('Fetch groups error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch groups',
      groups: [],
      authError: false
    };
  }
};

/**
 * Create a new group
 */
export const createGroup = async (groupData) => {
  try {
    console.log('Creating group with data:', groupData);
    
    const response = await api.post('/groups', groupData);
    
    if (response.data.authError) {
      return {
        success: false,
        message: 'Authentication required',
        authError: true
      };
    }
    
    console.log('Create group response:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('Create group error:', error);
    return {
      success: false,
      message: error.message || 'Failed to create group',
      authError: false
    };
  }
};

/**
 * Update a group
 */
export const updateGroup = async (groupId, updateData) => {
  try {
    console.log('Updating group:', groupId, updateData);
    
    const response = await api.put(`/groups/${groupId}`, updateData);
    
    if (response.data.authError) {
      return {
        success: false,
        message: 'Authentication required',
        authError: true
      };
    }
    
    console.log('Update group response:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('Update group error:', error);
    return {
      success: false,
      message: error.message || 'Failed to update group',
      authError: false
    };
  }
};

/**
 * Delete a group
 */
export const deleteGroup = async (groupId) => {
  try {
    console.log('Deleting group:', groupId);
    
    const response = await api.delete(`/groups/${groupId}`);
    
    if (response.data.authError) {
      return {
        success: false,
        message: 'Authentication required',
        authError: true
      };
    }
    
    console.log('Delete group response:', response.data);
    return response.data;
    
  } catch (error) {
    console.error('Delete group error:', error);
    return {
      success: false,
      message: error.message || 'Failed to delete group',
      authError: false
    };
  }
};

// =====================
// Debug Helper Functions
// =====================

/**
 * Debug authentication info
 */
export const debugAuthInfo = () => {
  const token = localStorage.getItem('authToken') || 
                localStorage.getItem('token') || 
                sessionStorage.getItem('authToken') ||
                sessionStorage.getItem('token');
  
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    } catch (e) {
      return {};
    }
  })();

  return {
    hasToken: !!token,
    tokenSource: token ? (
      localStorage.getItem('authToken') === token ? 'localStorage.authToken' :
      localStorage.getItem('token') === token ? 'localStorage.token' :
      sessionStorage.getItem('authToken') === token ? 'sessionStorage.authToken' :
      sessionStorage.getItem('token') === token ? 'sessionStorage.token' : 'unknown'
    ) : null,
    tokenPreview: token ? `${token.substring(0, 20)}...` : null,
    hasUser: !!user && !!Object.keys(user).length,
    userId: user.userId || user._id || null,
    userName: user.name || null,
    userEmail: user.email || null
  };
};

// Default export for convenience
export default {
  // Split expense functions
  createSplitExpense,
  fetchSplitExpenses,
  getSplitExpenseById,
  updateSplitExpense,
  deleteSplitExpense,
  getExpenseSummary,
  getBalanceWithFriend,
  settleWithFriend,
  
  // Group functions
  fetchGroups,
  createGroup,
  updateGroup,
  deleteGroup,
  
  // Debug functions
  debugAuthInfo
};