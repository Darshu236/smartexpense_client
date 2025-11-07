// src/context/AuthContext.js - Updated with TokenManager
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import TokenManager from '../utils/tokenManager';

// Auth action types
const AUTH_ACTIONS = {
  LOGIN_START: 'LOGIN_START',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILURE: 'LOGIN_FAILURE',
  LOGOUT: 'LOGOUT',
  RESTORE_AUTH: 'RESTORE_AUTH',
  UPDATE_USER: 'UPDATE_USER'
};

// Initial state
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true, // Start with loading true to check stored auth
  error: null
};

// Auth reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.LOGIN_START:
      return {
        ...state,
        loading: true,
        error: null
      };
      
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null
      };
      
    case AUTH_ACTIONS.LOGIN_FAILURE:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload.error
      };
      
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null
      };
      
    case AUTH_ACTIONS.RESTORE_AUTH:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: !!(action.payload.user && action.payload.token),
        loading: false,
        error: null
      };
      
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload.user }
      };
      
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Restore authentication from localStorage on app start
  useEffect(() => {
    const restoreAuth = async () => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('🔄 AuthContext: Restoring authentication state...');
        }

        const token = TokenManager.getToken();
        const user = TokenManager.getUser();

        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 AuthContext: Stored auth data:', {
            hasToken: !!token,
            hasUser: !!user,
            tokenLength: token?.length || 0,
            userId: user?.id,
            userEmail: user?.email,
            isAuthenticated: TokenManager.isAuthenticated()
          });
        }

        if (token && user) {
          dispatch({
            type: AUTH_ACTIONS.RESTORE_AUTH,
            payload: { user, token }
          });
          
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ AuthContext: Authentication restored successfully');
          }
        } else {
          // Clear any incomplete auth data
          if (token || user) {
            if (process.env.NODE_ENV === 'development') {
              console.warn('⚠️ AuthContext: Incomplete auth data found, clearing...');
            }
            TokenManager.clearAuth();
          }
          
          dispatch({
            type: AUTH_ACTIONS.RESTORE_AUTH,
            payload: { user: null, token: null }
          });
        }
      } catch (error) {
        console.error('❌ AuthContext: Error restoring auth:', error);
        TokenManager.clearAuth();
        dispatch({
          type: AUTH_ACTIONS.RESTORE_AUTH,
          payload: { user: null, token: null }
        });
      }
    };

    restoreAuth();
  }, []);

  // Login function
  const login = async (user, token) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🚀 AuthContext: Login initiated', {
          hasUser: !!user,
          hasToken: !!token,
          userId: user?.id,
          userEmail: user?.email,
          tokenLength: token?.length || 0
        });
      }

      dispatch({ type: AUTH_ACTIONS.LOGIN_START });

      if (!user || !token) {
        throw new Error('User and token are required for login');
      }

      // Save to localStorage using TokenManager
      const saved = TokenManager.setAuthData(token, user);
      if (!saved) {
        throw new Error('Failed to save authentication data');
      }

      // Update context state
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user, token }
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ AuthContext: Login successful', {
          contextUpdated: true,
          storageSaved: saved,
          verifyToken: TokenManager.getToken() === token,
          verifyUser: !!TokenManager.getUser(),
          isAuthenticated: TokenManager.isAuthenticated()
        });
      }

    } catch (error) {
      console.error('❌ AuthContext: Login failed:', error);
      
      dispatch({
        type: AUTH_ACTIONS.LOGIN_FAILURE,
        payload: { error: error.message }
      });
      
      // Clear any partial auth data
      TokenManager.clearAuth();
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🚪 AuthContext: Logout initiated');
      }

      // Clear localStorage using TokenManager
      TokenManager.clearAuth();

      // Update context state
      dispatch({ type: AUTH_ACTIONS.LOGOUT });

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ AuthContext: Logout successful', {
          storageCleared: true,
          isAuthenticated: TokenManager.isAuthenticated()
        });
      }

    } catch (error) {
      console.error('❌ AuthContext: Logout error:', error);
      // Still dispatch logout even if there's an error
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  // Update user function
  const updateUser = async (userData) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔄 AuthContext: Updating user data:', userData);
      }

      const updatedUser = { ...state.user, ...userData };
      
      // Update localStorage
      TokenManager.setUser(updatedUser);
      
      // Update context state
      dispatch({
        type: AUTH_ACTIONS.UPDATE_USER,
        payload: { user: userData }
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ AuthContext: User updated successfully');
      }

    } catch (error) {
      console.error('❌ AuthContext: Update user failed:', error);
      throw error;
    }
  };

  // Check if user is authenticated
  const isAuthenticated = () => {
    return state.isAuthenticated && TokenManager.isAuthenticated();
  };

  // Get current auth status
  const getAuthStatus = () => {
    const contextAuth = state.isAuthenticated;
    const storageAuth = TokenManager.isAuthenticated();
    
    return {
      contextAuthenticated: contextAuth,
      storageAuthenticated: storageAuth,
      synchronized: contextAuth === storageAuth,
      user: state.user,
      token: state.token
    };
  };

  // Context value
  const value = {
    // State
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    error: state.error,
    
    // Functions
    login,
    logout,
    updateUser,
    getAuthStatus,
    
    // TokenManager utilities (for debugging)
    tokenManager: {
      getToken: TokenManager.getToken,
      getUser: TokenManager.getUser,
      clearAuth: TokenManager.clearAuth,
      isAuthenticated: TokenManager.isAuthenticated
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};

// HOC for protected routes
export const withAuth = (Component) => {
  return function AuthenticatedComponent(props) {
    const { isAuthenticated, loading } = useAuth();
    
    if (loading) {
      return <div>Loading...</div>; // Or your loading component
    }
    
    if (!isAuthenticated) {
      // Redirect to login or show unauthorized message
      return <div>Please log in to access this page.</div>;
    }
    
    return <Component {...props} />;
  };
};

export default AuthContext;