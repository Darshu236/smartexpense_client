import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { TokenManager } from '../utils/tokenManager';
import API from '../api/api';

const AuthDebugger = () => {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [debugInfo, setDebugInfo] = useState({});
  const [testCredentials, setTestCredentials] = useState({
    email: 'test@example.com',
    password: 'password123'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const refreshDebugInfo = () => {
    try {
      const token = TokenManager.getToken();
      const userData = TokenManager.getUser();
      const validation = token ? TokenManager.validateToken(token) : null;
      
      setDebugInfo({
        // Storage inspection
        localStorage_token: localStorage.getItem('token'),
        localStorage_user: localStorage.getItem('user'),
        
        // TokenManager state
        tokenManager_token: token,
        tokenManager_user: userData,
        tokenManager_isAuth: TokenManager.isAuthenticated(),
        
        // Token validation
        token_validation: validation,
        
        // AuthContext state
        authContext_user: user,
        authContext_isAuth: isAuthenticated,
        
        // Storage keys inspection
        all_localStorage_keys: Object.keys(localStorage),
        auth_related_keys: Object.keys(localStorage).filter(key => 
          key.toLowerCase().includes('token') || 
          key.toLowerCase().includes('user') || 
          key.toLowerCase().includes('auth')
        ),
        
        // Timestamp
        debug_timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error refreshing debug info:', error);
      setMessage(`Error refreshing debug info: ${error.message}`);
    }
  };

  useEffect(() => {
    refreshDebugInfo();
    
    // Refresh debug info every 2 seconds
    const interval = setInterval(refreshDebugInfo, 2000);
    return () => clearInterval(interval);
  }, [user, isAuthenticated]);

  const testLogin = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      console.log('Testing login with:', testCredentials);
      
      // Direct API call to test login
      const response = await API.post('/auth/login', testCredentials);
      console.log('Login response:', response.data);
      
      if (response.data.token && response.data.user) {
        // Test TokenManager directly
        console.log('Setting auth data via TokenManager...');
        const saved = TokenManager.setAuthData(response.data.token, response.data.user);
        console.log('Auth data saved:', saved);
        
        // Also try via AuthContext
        console.log('Testing AuthContext login...');
        await login(testCredentials.email, testCredentials.password);
        
        setMessage('Test login successful!');
        refreshDebugInfo();
      } else {
        setMessage('Login response missing token or user');
      }
    } catch (error) {
      console.error('Test login error:', error);
      setMessage(`Test login failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testDirectTokenSet = () => {
    try {
      console.log('Testing direct token storage...');
      
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2NzU5YjI4ZTNjYzQ2NzAwMTJhNjk4YzQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3MzM4Mzk0NTUsImV4cCI6MTczNDQ0NDI1NX0.test_signature';
      const testUser = {
        id: '6759b28e3cc4670012a698c4',
        _id: '6759b28e3cc4670012a698c4',
        email: 'test@example.com',
        name: 'Test User'
      };
      
      // Test direct localStorage
      localStorage.setItem('token', testToken);
      localStorage.setItem('user', JSON.stringify(testUser));
      
      // Test TokenManager
      const tokenSaved = TokenManager.setToken(testToken);
      const userSaved = TokenManager.setUser(testUser);
      
      console.log('Direct storage results:', { tokenSaved, userSaved });
      setMessage(`Direct storage test: token=${tokenSaved}, user=${userSaved}`);
      refreshDebugInfo();
    } catch (error) {
      console.error('Error in direct token set:', error);
      setMessage(`Error setting test token: ${error.message}`);
    }
  };

  const clearAllAuth = () => {
    try {
      console.log('Clearing all auth data...');
      
      // Clear via TokenManager
      TokenManager.clearAuth();
      
      // Clear via AuthContext
      logout();
      
      // Direct localStorage clear
      const authKeys = Object.keys(localStorage).filter(key => 
        key.toLowerCase().includes('token') || 
        key.toLowerCase().includes('user') || 
        key.toLowerCase().includes('auth')
      );
      
      authKeys.forEach(key => localStorage.removeItem(key));
      
      setMessage('All auth data cleared');
      refreshDebugInfo();
    } catch (error) {
      console.error('Error clearing auth:', error);
      setMessage(`Error clearing auth: ${error.message}`);
    }
  };

  const testAPICall = async () => {
    setLoading(true);
    setMessage('');
    
    try {
      console.log('Testing authenticated API call...');
      const response = await API.get('/friends');
      console.log('API call response:', response.data);
      setMessage('API call successful!');
    } catch (error) {
      console.error('API call error:', error);
      setMessage(`API call failed: ${error.response?.status} ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const migrateTokens = () => {
    try {
      console.log('Running token migration...');
      const migrated = TokenManager.migrateTokens();
      setMessage(`Token migration: ${migrated ? 'completed' : 'no tokens found to migrate'}`);
      refreshDebugInfo();
    } catch (error) {
      console.error('Error in token migration:', error);
      setMessage(`Token migration error: ${error.message}`);
    }
  };

  // Only render in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      right: 0, 
      width: '400px', 
      height: '100vh', 
      backgroundColor: '#1a1a1a', 
      color: '#fff', 
      padding: '20px', 
      overflowY: 'auto',
      zIndex: 9999,
      fontFamily: 'monospace',
      fontSize: '12px',
      borderLeft: '2px solid #333'
    }}>
      <h3 style={{ margin: '0 0 20px 0', color: '#4CAF50' }}>Auth Debugger</h3>
      
      {/* Controls */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={refreshDebugInfo} 
          style={{ 
            padding: '8px 12px', 
            margin: '2px', 
            backgroundColor: '#333', 
            color: '#fff', 
            border: 'none', 
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          Refresh
        </button>
        
        <button 
          onClick={clearAllAuth}
          style={{ 
            padding: '8px 12px', 
            margin: '2px', 
            backgroundColor: '#d32f2f', 
            color: '#fff', 
            border: 'none', 
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          Clear Auth
        </button>
        
        <button 
          onClick={testDirectTokenSet}
          style={{ 
            padding: '8px 12px', 
            margin: '2px', 
            backgroundColor: '#ff9800', 
            color: '#fff', 
            border: 'none', 
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          Set Test Token
        </button>
        
        <button 
          onClick={migrateTokens}
          style={{ 
            padding: '8px 12px', 
            margin: '2px', 
            backgroundColor: '#9c27b0', 
            color: '#fff', 
            border: 'none', 
            cursor: 'pointer',
            fontSize: '11px'
          }}
        >
          Migrate Tokens
        </button>
        
        <button 
          onClick={testAPICall}
          disabled={loading}
          style={{ 
            padding: '8px 12px', 
            margin: '2px', 
            backgroundColor: loading ? '#666' : '#2196F3', 
            color: '#fff', 
            border: 'none', 
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '11px'
          }}
        >
          {loading ? 'Testing...' : 'Test API'}
        </button>
      </div>

      {/* Test Login */}
      <div style={{ marginBottom: '20px', padding: '10px', backgroundColor: '#333' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#FFC107' }}>Test Login</h4>
        <input
          type="email"
          value={testCredentials.email}
          onChange={(e) => setTestCredentials(prev => ({ ...prev, email: e.target.value }))}
          placeholder="Email"
          style={{ 
            width: '100%', 
            padding: '4px', 
            margin: '2px 0', 
            backgroundColor: '#555', 
            color: '#fff', 
            border: '1px solid #777',
            fontSize: '11px'
          }}
        />
        <input
          type="password"
          value={testCredentials.password}
          onChange={(e) => setTestCredentials(prev => ({ ...prev, password: e.target.value }))}
          placeholder="Password"
          style={{ 
            width: '100%', 
            padding: '4px', 
            margin: '2px 0', 
            backgroundColor: '#555', 
            color: '#fff', 
            border: '1px solid #777',
            fontSize: '11px'
          }}
        />
        <button 
          onClick={testLogin}
          disabled={loading}
          style={{ 
            width: '100%',
            padding: '8px', 
            margin: '5px 0', 
            backgroundColor: loading ? '#666' : '#4CAF50', 
            color: '#fff', 
            border: 'none', 
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '11px'
          }}
        >
          {loading ? 'Testing...' : 'Test Login'}
        </button>
      </div>

      {/* Message */}
      {message && (
        <div style={{ 
          padding: '8px', 
          margin: '10px 0', 
          backgroundColor: message.includes('failed') || message.includes('Error') ? '#d32f2f' : '#4CAF50',
          borderRadius: '4px',
          fontSize: '11px'
        }}>
          {message}
        </div>
      )}

      {/* Debug Info */}
      <div style={{ marginTop: '20px' }}>
        <h4 style={{ margin: '0 0 10px 0', color: '#FFC107' }}>Debug Info</h4>
        <pre style={{ 
          backgroundColor: '#2a2a2a', 
          padding: '10px', 
          fontSize: '10px', 
          whiteSpace: 'pre-wrap', 
          wordBreak: 'break-all',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default AuthDebugger;