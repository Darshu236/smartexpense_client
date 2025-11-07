// src/pages/Profile.jsx
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './Profile.css';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { token } = useAuth();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    dateOfBirth: '',
    occupation: '',
    bio: ''
  });

  // Security: Validate token before making requests
const getAuthConfig = useCallback(() => {
  if (!token) throw new Error('Authentication token not found');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
}, [token]);

  // Form validation
  const validateForm = useCallback(() => {
    const errors = {};
    
    if (!editForm.name?.trim()) {
      errors.name = 'Full name is required';
    } else if (editForm.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editForm.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(editForm.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
    
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!editForm.phone?.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(editForm.phone.replace(/[\s\-\(\)]/g, ''))) {
      errors.phone = 'Please enter a valid phone number';
    }
    
    if (!editForm.address.city?.trim()) {
      errors.city = 'City is required';
    }
    
    if (editForm.dateOfBirth) {
      const birthDate = new Date(editForm.dateOfBirth);
      const today = new Date();
      const minDate = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
      const maxDate = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
      
      if (birthDate > maxDate) {
        errors.dateOfBirth = 'Must be at least 13 years old';
      } else if (birthDate < minDate) {
        errors.dateOfBirth = 'Please enter a valid birth date';
      }
    }
    
    if (editForm.bio && editForm.bio.length > 500) {
      errors.bio = 'Bio must not exceed 500 characters';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  }, [editForm]);

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError('');
      
      const config = getAuthConfig();
      const response = await axios.get('http://localhost:4000/api/auth/me', config);
      
      const userData = response.data;
      console.log('📝 Raw user data from API:', userData); // Debug log
      
      // Handle different response structures
      const user = userData.user || userData.data || userData;
      console.log('👤 Processed user object:', user); // Debug log
      console.log('🆔 User ID fields check:', {
        _id: user._id,
        userId: user.userId,
        id: user.id
      }); // Debug log
      
      setUser(user);
      populateEditForm(user);
      
      // Check if profile is incomplete (first-time setup)
      const isIncomplete = !user.phone || !user.address?.city || !user.dateOfBirth;
      if (isIncomplete) {
        setIsFirstTimeSetup(true);
        setIsEditing(true);
      }
      
    } catch (err) {
      console.error('Error fetching profile:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        // Redirect to login page
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else {
        setError(err.response?.data?.message || 'Failed to load profile data');
      }
    } finally {
      setLoading(false);
    }
  };

  const populateEditForm = useCallback((userData) => {
    setEditForm({
      name: userData.name || '',
      email: userData.email || '',
      phone: userData.phone || '',
      address: {
        street: userData.address?.street || '',
        city: userData.address?.city || '',
        state: userData.address?.state || '',
        zipCode: userData.address?.zipCode || '',
        country: userData.address?.country || ''
      },
      dateOfBirth: userData.dateOfBirth ? userData.dateOfBirth.split('T')[0] : '',
      occupation: userData.occupation || '',
      bio: userData.bio || ''
    });
    setValidationErrors({});
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      showNotification('Please fix the errors below', 'error');
      return;
    }
    
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const config = getAuthConfig();
      
      // Get user ID with better error handling
      const userId = user?._id || user?.userId || user?.id;
      console.log('🔍 Looking for user ID in:', user); // Debug log
      console.log('🆔 Found user ID:', userId); // Debug log
      
      if (!userId) {
        console.error('❌ No user ID found in user object:', user);
        throw new Error('User ID not found. The user data may be incomplete. Please refresh the page and try again.');
      }
      
      // Clean and sanitize form data
      const cleanedForm = {
        ...editForm,
        name: editForm.name.trim(),
        email: editForm.email.trim().toLowerCase(),
        phone: editForm.phone.trim(),
        occupation: editForm.occupation?.trim() || undefined,
        bio: editForm.bio?.trim() || undefined,
        address: {
          street: editForm.address.street?.trim() || undefined,
          city: editForm.address.city.trim(),
          state: editForm.address.state?.trim() || undefined,
          zipCode: editForm.address.zipCode?.trim() || undefined,
          country: editForm.address.country || undefined
        }
      };
      
      console.log('📤 Sending update request:', {
        url: `http://localhost:4000/api/users/${userId}`,
        data: cleanedForm
      }); // Debug log
      
      const response = await axios.put(
        `http://localhost:4000/api/users/${userId}`,
        cleanedForm,
        config
      );

      console.log('✅ Profile update response:', response.data); // Debug log
      
      const updatedUser = response.data.user || response.data;
      setUser(updatedUser);
      setIsEditing(false);
      setIsFirstTimeSetup(false);
      setSuccess('Profile updated successfully!');
      
      // Auto-hide success message
      setTimeout(() => setSuccess(''), 5000);
      
    } catch (err) {
      console.error('❌ Error updating profile:', err);
      console.error('📋 Error details:', {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else if (err.response?.status === 403) {
        setError('You do not have permission to update this profile.');
      } else if (err.response?.status === 404) {
        setError('User not found. Please refresh the page and try again.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to update profile');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = useCallback((field, value, nested = null) => {
    if (nested) {
      setEditForm(prev => ({
        ...prev,
        [nested]: {
          ...prev[nested],
          [field]: value
        }
      }));
    } else {
      setEditForm(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear specific validation error when user starts typing
    if (validationErrors[field] || (nested && validationErrors[nested])) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        if (nested) delete newErrors[nested];
        return newErrors;
      });
    }
  }, [validationErrors]);

  const copyUserId = useCallback(async () => {
    const userId = user?._id || user?.userId || user?.id;
    console.log('📋 Copying user ID:', userId); // Debug log
    
    if (userId) {
      try {
        await navigator.clipboard.writeText(userId);
        showNotification('Friend code copied to clipboard!', 'success');
      } catch (err) {
        console.log('📋 Clipboard API failed, using fallback'); // Debug log
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = userId;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Friend code copied!', 'success');
      }
    } else {
      console.error('❌ No user ID available to copy');
      showNotification('Unable to copy friend code. Please refresh the page.', 'error');
    }
  }, [user]);

  const showNotification = useCallback((message, type = 'success') => {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.className = `notification notification--${type}`;
    
    document.body.appendChild(notification);
    
    // Auto-remove notification
    setTimeout(() => {
      if (notification.parentNode) {
        notification.classList.add('notification--fade-out');
        setTimeout(() => notification.remove(), 300);
      }
    }, 4000);
  }, []);

  const handleCancel = useCallback(() => {
    if (isFirstTimeSetup) {
      // For first-time setup, we might want to show a confirmation
      if (window.confirm('Are you sure you want to skip profile setup? You can complete it later.')) {
        setIsEditing(false);
        setIsFirstTimeSetup(false);
      }
    } else {
      populateEditForm(user);
      setIsEditing(false);
      setValidationErrors({});
    }
  }, [isFirstTimeSetup, user, populateEditForm]);

  if (loading) {
    return (
      <div className="profile-container">
        <div className="profile-loading">
          <div className="loading-spinner"></div>
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (error && !user) {
    return (
      <div className="profile-container">
        <div className="profile-error">
          <div className="error-icon">⚠️</div>
          <h2>Unable to Load Profile</h2>
          <p>{error}</p>
          <button onClick={fetchUserProfile} className="btn btn--primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-header__content">
            <div className="profile-avatar">
              <span className="profile-avatar__text">
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
              <div className="profile-avatar__status"></div>
            </div>
            <div className="profile-header__info">
              <h1>{isFirstTimeSetup ? 'Complete Your Profile' : 'My Profile'}</h1>
              <p className="profile-subtitle">
                {isFirstTimeSetup 
                  ? 'Please complete your profile to get started' 
                  : 'Manage your account information and settings'
                }
              </p>
            </div>
          </div>
          
          {!isFirstTimeSetup && !isEditing && (
            <button 
              className="btn btn--secondary btn--icon"
              onClick={() => setIsEditing(true)}
              disabled={loading}
            >
              <span>✏️</span>
              Edit Profile
            </button>
          )}
        </div>

        {error && (
          <div className="alert alert--error">
            <span className="alert__icon">⚠️</span>
            {error}
          </div>
        )}
        
        {success && (
          <div className="alert alert--success">
            <span className="alert__icon">✅</span>
            {success}
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleUpdateProfile} className="profile-form" noValidate>
            {/* Basic Information Section */}
            <div className="form-section">
              <h3 className="section-title">
                <span className="section-icon">👤</span>
                Basic Information
              </h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name" className="form-label">
                    Full Name <span className="required">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    className={`form-input ${validationErrors.name ? 'form-input--error' : ''}`}
                    value={editForm.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Enter your full name"
                    maxLength="100"
                    required
                  />
                  {validationErrors.name && (
                    <span className="form-error">{validationErrors.name}</span>
                  )}
                </div>
                
                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    Email Address <span className="required">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    className={`form-input ${validationErrors.email ? 'form-input--error' : ''}`}
                    value={editForm.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter your email address"
                    maxLength="254"
                    required
                  />
                  {validationErrors.email && (
                    <span className="form-error">{validationErrors.email}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="phone" className="form-label">
                    Phone Number <span className="required">*</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    className={`form-input ${validationErrors.phone ? 'form-input--error' : ''}`}
                    value={editForm.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    maxLength="20"
                    required
                  />
                  {validationErrors.phone && (
                    <span className="form-error">{validationErrors.phone}</span>
                  )}
                </div>
                
                <div className="form-group">
                  <label htmlFor="dateOfBirth" className="form-label">Date of Birth</label>
                  <input
                    id="dateOfBirth"
                    type="date"
                    className={`form-input ${validationErrors.dateOfBirth ? 'form-input--error' : ''}`}
                    value={editForm.dateOfBirth}
                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                    max={new Date(new Date().getFullYear() - 13, new Date().getMonth(), new Date().getDate()).toISOString().split('T')[0]}
                  />
                  {validationErrors.dateOfBirth && (
                    <span className="form-error">{validationErrors.dateOfBirth}</span>
                  )}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="occupation" className="form-label">Occupation</label>
                  <input
                    id="occupation"
                    type="text"
                    className="form-input"
                    value={editForm.occupation}
                    onChange={(e) => handleInputChange('occupation', e.target.value)}
                    placeholder="e.g., Software Engineer, Teacher"
                    maxLength="100"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="bio" className="form-label">Bio</label>
                <textarea
                  id="bio"
                  className={`form-textarea ${validationErrors.bio ? 'form-input--error' : ''}`}
                  value={editForm.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell us a bit about yourself..."
                  rows="4"
                  maxLength="500"
                />
                <div className="form-help">
                  {editForm.bio.length}/500 characters
                </div>
                {validationErrors.bio && (
                  <span className="form-error">{validationErrors.bio}</span>
                )}
              </div>
            </div>

            {/* Address Information Section */}
            <div className="form-section">
              <h3 className="section-title">
                <span className="section-icon">📍</span>
                Address Information
              </h3>
              
              <div className="form-group">
                <label htmlFor="street" className="form-label">Street Address</label>
                <input
                  id="street"
                  type="text"
                  className="form-input"
                  value={editForm.address.street}
                  onChange={(e) => handleInputChange('street', e.target.value, 'address')}
                  placeholder="123 Main Street, Apt 4B"
                  maxLength="255"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="city" className="form-label">
                    City <span className="required">*</span>
                  </label>
                  <input
                    id="city"
                    type="text"
                    className={`form-input ${validationErrors.city ? 'form-input--error' : ''}`}
                    value={editForm.address.city}
                    onChange={(e) => handleInputChange('city', e.target.value, 'address')}
                    placeholder="New York"
                    maxLength="100"
                    required
                  />
                  {validationErrors.city && (
                    <span className="form-error">{validationErrors.city}</span>
                  )}
                </div>
                
                <div className="form-group">
                  <label htmlFor="state" className="form-label">State/Province</label>
                  <input
                    id="state"
                    type="text"
                    className="form-input"
                    value={editForm.address.state}
                    onChange={(e) => handleInputChange('state', e.target.value, 'address')}
                    placeholder="NY"
                    maxLength="100"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="zipCode" className="form-label">ZIP/Postal Code</label>
                  <input
                    id="zipCode"
                    type="text"
                    className="form-input"
                    value={editForm.address.zipCode}
                    onChange={(e) => handleInputChange('zipCode', e.target.value, 'address')}
                    placeholder="10001"
                    maxLength="20"
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="country" className="form-label">Country</label>
                  <select
                    id="country"
                    className="form-select"
                    value={editForm.address.country}
                    onChange={(e) => handleInputChange('country', e.target.value, 'address')}
                  >
                    <option value="">Select Country</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="IN">India</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                    <option value="JP">Japan</option>
                    <option value="BR">Brazil</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Form Actions */}
            <div className="form-actions">
              <button 
                type="submit" 
                disabled={saving} 
                className="btn btn--primary btn--loading"
              >
                {saving && <span className="btn-spinner"></span>}
                {saving 
                  ? (isFirstTimeSetup ? 'Setting up...' : 'Saving...') 
                  : (isFirstTimeSetup ? 'Complete Setup' : 'Save Changes')
                }
              </button>
              
              <button 
                type="button" 
                onClick={handleCancel}
                className="btn btn--secondary"
                disabled={saving}
              >
                {isFirstTimeSetup ? 'Skip for Now' : 'Cancel'}
              </button>
            </div>
          </form>
        ) : (
          <div className="profile-display">
{/* Friend Code Section */}
            <div className="info-section info-section--highlight">
              <div className="section-header">
                <h3 className="section-title">
                  <span className="section-icon">🔗</span>
                  Friend Code
                </h3>
                <button className="btn btn--ghost btn--small" onClick={copyUserId}>
                  📋 Copy
                </button>
              </div>
              <div className="friend-code">
                <code className="friend-code__text">
                  {user?.userId || user?.id || user?._id || 'ID not available'}
                </code>
              </div>
              <p className="section-description">
                Share this unique code with friends to connect and split expenses together
              </p>
            </div>

            {/* Basic Information */}
            <div className="info-section">
              <h3 className="section-title">
                <span className="section-icon">👤</span>
                Basic Information
              </h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Full Name</label>
                  <span>{user?.name || 'Not provided'}</span>
                </div>
                
                <div className="info-item">
                  <label>Email Address</label>
                  <span>{user?.email || 'Not provided'}</span>
                </div>
                
                <div className="info-item">
                  <label>Phone Number</label>
                  <span>{user?.phone || 'Not provided'}</span>
                </div>
                
                <div className="info-item">
                  <label>Date of Birth</label>
                  <span>
                    {user?.dateOfBirth 
                      ? new Date(user.dateOfBirth).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'Not provided'
                    }
                  </span>
                </div>
                
                <div className="info-item">
                  <label>Occupation</label>
                  <span>{user?.occupation || 'Not provided'}</span>
                </div>
              </div>
              
              {user?.bio && (
                <div className="info-item info-item--full">
                  <label>Bio</label>
                  <p className="bio-text">{user.bio}</p>
                </div>
              )}
            </div>

            {/* Address Information */}
            {(user?.address?.city || user?.address?.street) && (
              <div className="info-section">
                <h3 className="section-title">
                  <span className="section-icon">📍</span>
                  Address
                </h3>
                <div className="address-display">
                  {user.address.street && <div className="address-line">{user.address.street}</div>}
                  <div className="address-line">
                    {[
                      user.address.city,
                      user.address.state,
                      user.address.zipCode
                    ].filter(Boolean).join(', ')}
                  </div>
                  {user.address.country && <div className="address-line">{user.address.country}</div>}
                </div>
              </div>
            )}

            {/* Account Information */}
            <div className="info-section">
              <h3 className="section-title">
                <span className="section-icon">⚙️</span>
                Account Details
              </h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Member Since</label>
                  <span>
                    {user?.createdAt || user?.registrationDate
                      ? new Date(user.createdAt || user.registrationDate).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'N/A'
                    }
                  </span>
                </div>
                
                <div className="info-item">
                  <label>Account Status</label>
                  <span className="status-badge status-badge--active">Active</span>
                </div>
                
                <div className="info-item">
                  <label>Last Updated</label>
                  <span>
                    {user?.updatedAt 
                      ? new Date(user.updatedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : 'N/A'
                    }
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;