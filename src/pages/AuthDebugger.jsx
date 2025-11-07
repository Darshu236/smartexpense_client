import React, { useState } from 'react';
import TokenManager from '../utils/tokenManager.js';
import { testFriendsAuth } from '../api/friendsApi.js';

const AuthDebugger = () => {
  const [debugInfo, setDebugInfo] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const runDebug = () => {
    const info = TokenManager.debugAuthState();
    const token = TokenManager.getToken();
    const user = TokenManager.getUser();
    
    let tokenDecoded = null;
    if (token) {
      tokenDecoded = TokenManager.decodeToken(token);
    }
    
    setDebugInfo({
      ...info,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'No token',
      decodedToken: tokenDecoded,
      user: user
    });
  };

  const testAuth = async () => {
    setLoading(true);
    try {
      const result = await testFriendsAuth();
      setTestResult(result);
    } catch (error) {
      setTestResult({
        success: false,
        message: error.message,
        error: true
      });
    } finally {
      setLoading(false);
    }
  };

  const clearAuth = () => {
    TokenManager.clearAuth();
    setDebugInfo(null);
    setTestResult(null);
    alert('Auth data cleared. Please refresh the page and log in again.');
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      background: 'white', 
      border: '2px solid #ccc', 
      padding: '20px', 
      borderRadius: '8px',
      maxWidth: '400px',
      maxHeight: '80vh',
      overflow: 'auto',
      zIndex: 9999,
      fontSize: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    }}>
      <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Auth Debugger</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <button 
          onClick={runDebug}
          style={{ 
            padding: '8px 12px', 
            marginRight: '10px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Check Auth State
        </button>
        
        <button 
          onClick={testAuth}
          disabled={loading}
          style={{ 
            padding: '8px 12px', 
            marginRight: '10px',
            background: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? 'Testing...' : 'Test API'}
        </button>
        
        <button 
          onClick={clearAuth}
          style={{ 
            padding: '8px 12px',
            background: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear Auth
        </button>
      </div>

      {debugInfo && (
        <div style={{ 
          background: '#f8f9fa', 
          padding: '10px', 
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: '#495057' }}>Auth State:</h4>
          <div><strong>Has Token:</strong> {debugInfo.hasToken ? 'Yes' : 'No'}</div>
          <div><strong>Has User:</strong> {debugInfo.hasUser ? 'Yes' : 'No'}</div>
          <div><strong>Token Valid:</strong> {debugInfo.tokenValid ? 'Yes' : 'No'}</div>
          <div><strong>Is Authenticated:</strong> {debugInfo.isAuthenticated ? 'Yes' : 'No'}</div>
          
          {debugInfo.user && (
            <div style={{ marginTop: '10px' }}>
              <strong>User Data:</strong>
              <div>ID: {debugInfo.user._id || 'Missing'}</div>
              <div>UserID: {debugInfo.user.userId || 'Missing'}</div>
              <div>Email: {debugInfo.user.email || 'Missing'}</div>
              <div>Name: {debugInfo.user.name || 'Missing'}</div>
            </div>
          )}
          
          {debugInfo.decodedToken && (
            <div style={{ marginTop: '10px' }}>
              <strong>Token Data:</strong>
              <div>User ID: {debugInfo.decodedToken.userId || debugInfo.decodedToken.id || debugInfo.decodedToken.sub || 'Missing'}</div>
              <div>Email: {debugInfo.decodedToken.email || 'Missing'}</div>
              <div>Expires: {debugInfo.decodedToken.exp ? new Date(debugInfo.decodedToken.exp * 1000).toLocaleString() : 'Missing'}</div>
            </div>
          )}
        </div>
      )}

      {testResult && (
        <div style={{ 
          background: testResult.success ? '#d4edda' : '#f8d7da',
          color: testResult.success ? '#155724' : '#721c24',
          padding: '10px', 
          borderRadius: '4px',
          border: testResult.success ? '1px solid #c3e6cb' : '1px solid #f5c6cb'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>API Test Result:</h4>
          <div><strong>Success:</strong> {testResult.success ? 'Yes' : 'No'}</div>
          <div><strong>Message:</strong> {testResult.message}</div>
          {testResult.authError && <div><strong>Auth Error:</strong> Yes</div>}
          {testResult.status && <div><strong>Status:</strong> {testResult.status}</div>}
        </div>
      )}

      <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '15px' }}>
        <strong>Instructions:</strong><br/>
        1. Click "Check Auth State" to see current authentication status<br/>
        2. Click "Test API" to test friends API endpoint<br/>
        3. If issues persist, click "Clear Auth" and log in again
      </div>
    </div>
  );
};

export default AuthDebugger;