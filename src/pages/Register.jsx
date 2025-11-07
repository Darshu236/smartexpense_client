// Register.jsx - Simplified version without 2FA
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, checkUserIdAvailability } from '../api/authApi';
import './Register.css';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    preferredUsername: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [generatedUserId, setGeneratedUserId] = useState('');
  const [userIdAvailable, setUserIdAvailable] = useState(null);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear specific error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Generate preview userId when name or preferred username changes
    if (name === 'name' || name === 'preferredUsername') {
      generateUserIdPreview(
        name === 'name' ? value : formData.name, 
        name === 'preferredUsername' ? value : formData.preferredUsername
      );
    }
  };

  // Generate userId preview
  const generateUserIdPreview = (name, preferred) => {
    let baseUsername = preferred || name;
    if (baseUsername) {
      const cleanUsername = baseUsername
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 15);
      
      if (cleanUsername.length >= 3) {
        setGeneratedUserId(`${cleanUsername}@myexpense`);
        setUserIdAvailable(null);
      } else {
        setGeneratedUserId('');
      }
    } else {
      setGeneratedUserId('');
    }
  };

  // Check if userId is available
  const checkUserIdStatus = async () => {
    if (!generatedUserId) return;
    
    try {
      setIsLoading(true);
      const result = await checkUserIdAvailability(generatedUserId);
      setUserIdAvailable(result.available);
      
      if (!result.available) {
        setMessage('This User ID is already taken. Try a different username.');
      } else {
        setMessage('');
      }
    } catch (error) {
      console.error('Error checking User ID availability:', error);
      setUserIdAvailable(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Validate form data
  const validateForm = () => {
    const newErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address';
      }
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Check if User ID is available (if generated)
    if (generatedUserId && userIdAvailable === false) {
      newErrors.preferredUsername = 'This username is not available';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle registration
  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      console.log('🔐 Attempting registration with:', {
        name: formData.name,
        email: formData.email,
        userId: generatedUserId
      });

      const response = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || null,
        userId: generatedUserId || undefined
      });
      
      console.log('✅ Registration response:', response);

      // Verify token and user are stored
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');
      
      console.log('🔍 Storage verification:', {
        hasToken: !!storedToken,
        hasUser: !!storedUser,
        tokenLength: storedToken?.length,
        userPreview: storedUser ? JSON.parse(storedUser).userId : 'none'
      });

      if (!storedToken || !storedUser) {
        console.error('❌ Token or user not stored properly!');
        throw new Error('Registration data not saved. Please try again.');
      }

      setMessage(`Registration successful! Your User ID: ${response.user.userId}`);
      
      // Clear form
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        preferredUsername: ''
      });
      
      // Redirect after success
      setTimeout(() => {
        console.log('🔄 Redirecting to dashboard...');
        navigate('/dashboard');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Registration failed:', error);
      setMessage(error.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="step-content">
        <h2 className="step-title">Create Your Account</h2>
        
        {message && (
          <div className={`message ${message.includes('taken') || message.includes('failed') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}

        <form onSubmit={handleRegister}>
          {/* Name Field */}
          <div className="form-group">
            <label htmlFor="name">Full Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? 'error' : ''}
              placeholder="Enter your full name"
              disabled={isLoading}
              required
            />
            {errors.name && <small className="error-text">{errors.name}</small>}
          </div>

          {/* Preferred Username */}
          <div className="form-group">
            <label htmlFor="preferredUsername">Preferred Username (Optional)</label>
            <input
              type="text"
              id="preferredUsername"
              name="preferredUsername"
              value={formData.preferredUsername}
              onChange={handleChange}
              className={errors.preferredUsername ? 'error' : ''}
              placeholder="Choose a username"
              disabled={isLoading}
            />
            {errors.preferredUsername && <small className="error-text">{errors.preferredUsername}</small>}
            
            {generatedUserId && (
              <div className="userid-preview">
                <div className="userid-display">
                  <span className="userid-label">
                    Your User ID: <strong className="userid-value">{generatedUserId}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={checkUserIdStatus}
                    disabled={isLoading}
                    className="check-availability-btn"
                  >
                    Check Availability
                  </button>
                </div>
                {userIdAvailable !== null && (
                  <span className={`availability-status ${userIdAvailable ? 'available' : 'unavailable'}`}>
                    {userIdAvailable ? '✓ Available' : '✗ Not Available'}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Email Field */}
          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              placeholder="Enter your email address"
              disabled={isLoading}
              required
            />
            {errors.email && <small className="error-text">{errors.email}</small>}
          </div>

          {/* Phone Field (Optional) */}
          <div className="form-group">
            <label htmlFor="phone">Phone Number (Optional)</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={errors.phone ? 'error' : ''}
              placeholder="+1234567890 (international format)"
              disabled={isLoading}
            />
            {errors.phone && <small className="error-text">{errors.phone}</small>}
          </div>

          {/* Password Field */}
          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? 'error' : ''}
              placeholder="Enter password (min 6 characters)"
              disabled={isLoading}
              required
            />
            {errors.password && <small className="error-text">{errors.password}</small>}
          </div>

          {/* Confirm Password Field */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={errors.confirmPassword ? 'error' : ''}
              placeholder="Confirm your password"
              disabled={isLoading}
              required
            />
            {errors.confirmPassword && <small className="error-text">{errors.confirmPassword}</small>}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`submit-btn ${isLoading ? 'loading' : ''}`}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
      </div>

      {/* Login Link */}
      <div className="auth-footer">
        <p>
          Already have an account?{' '}
          <a href="/login" className="auth-link">
            Sign in here
          </a>
        </p>
      </div>
    </div>
  );
};

export default Register;