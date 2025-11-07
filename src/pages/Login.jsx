// src/components/Login.jsx - Updated with TokenManager
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import authAPI from '../api/authApi';
import TokenManager from '../utils/tokenManager';
import './Auth.css';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
    if (debugInfo) setDebugInfo(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setDebugInfo(null);

    try {
      if (!formData.email.trim() || !formData.password.trim()) {
        setError('Please enter both email and password');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('Please enter a valid email address');
        return;
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('🚀 Starting login process...');
      }

      const res = await authAPI.login({
        email: formData.email.trim().toLowerCase(),
        password: formData.password
      });

      if (process.env.NODE_ENV === 'development') {
        console.log('📥 Login API response:', {
          hasToken: !!res.token,
          tokenLength: res.token?.length || 0,
          hasUser: !!res.user,
          userId: res.user?.id,
          userEmail: res.user?.email
        });
      }

      if (!res.token || !res.user) {
        throw new Error('Invalid response from server: missing token or user data');
      }

      // 🔥 Use TokenManager for consistent token/user storage
      const authSaved = TokenManager.setAuthData(res.token, res.user);
      
      if (!authSaved) {
        throw new Error('Failed to save authentication data');
      }

      // 🔥 VERIFY TOKEN WAS SAVED
      const savedToken = TokenManager.getToken();
      const savedUser = TokenManager.getUser();
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Post-Login Verification:', {
          loginResponse: !!res,
          tokenInResponse: !!res?.token,
          tokenSavedToStorage: !!savedToken,
          userSavedToStorage: !!savedUser,
          tokenLength: savedToken?.length || 0,
          tokensMatch: res.token === savedToken,
          isAuthenticated: TokenManager.isAuthenticated()
        });
      }

      if (!savedToken) {
        throw new Error('Authentication failed - token not saved to storage');
      }

      // Update auth context
      login(res.user, res.token);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Login successful, navigating to dashboard...');
      }
      
      navigate('/dashboard');
    } catch (err) {
      console.error('💥 Login failed:', err);
      
      const debugDetails = {
        errorType: err.constructor.name,
        message: err.message,
        status: err.status || err.response?.status,
        code: err.code,
        responseData: err.response?.data,
        requestURL: err.config?.url,
        serverMessage: err.response?.data?.message || err.response?.data?.error,
        timestamp: new Date().toISOString(),
        tokenInStorage: !!TokenManager.getToken(),
        userInStorage: !!TokenManager.getUser()
      };
      
      if (process.env.NODE_ENV === 'development') {
        setDebugInfo(debugDetails);
      }

      // Enhanced error handling
      if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
        setError('Cannot connect to server. Please check if the backend is running on port 4000.');
      } else if (err.code === 'ECONNABORTED') {
        setError('Request timeout. Please try again.');
      } else if (err.status === 401 || err.response?.status === 401) {
        const responseMessage = err.response?.data?.error || err.response?.data?.message;
        setError(responseMessage ? `Authentication failed: ${responseMessage}` : 'Invalid email or password.');
        // Clear any potentially corrupted auth data
        TokenManager.clearAuth();
      } else if (err.status === 500 || err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else if (err.status === 404 || err.response?.status === 404) {
        setError('Login endpoint not found. Please check server configuration.');
      } else {
        setError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <form onSubmit={handleSubmit} className="auth-form">
        <h2>Login</h2>

        {error && <div className="auth-error" role="alert">{error}</div>}

        {process.env.NODE_ENV === 'development' && debugInfo && (
          <details style={{ marginBottom: '1rem', fontSize: '12px' }}>
            <summary style={{ cursor: 'pointer', color: '#666' }}>🔍 Debug Information</summary>
            <pre style={{
              background: '#f5f5f5',
              padding: '10px',
              borderRadius: '4px',
              overflow: 'auto',
              maxHeight: '200px',
              fontSize: '11px'
            }}>
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </details>
        )}

        {/* Development helper */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ 
            fontSize: '11px', 
            color: '#666', 
            marginBottom: '10px',
            padding: '5px',
            background: '#f0f0f0',
            borderRadius: '3px'
          }}>
          </div>
        )}

        <div className="form-group">
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={loading}
            autoComplete="email"
            autoFocus
          />
        </div>

        <div className="form-group">
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={loading}
            autoComplete="current-password"
          />
        </div>

        <button type="submit" disabled={loading || !formData.email.trim() || !formData.password.trim()}>
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <div className="auth-footer">
          <Link to="/forgot-password">Forgot Password?</Link>
          <span>Don't have an account? <Link to="/register">Register</Link></span>
        </div>
      </form>
    </div>
  );
};

export default Login;