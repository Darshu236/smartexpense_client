// api/profileApi.js - User Profile API Functions

import API from './api';

// Get detailed user profile
export const getUserProfile = async () => {
  try {
    console.log('👤 Fetching user profile...');
    const response = await API.get('/users/profile');
    console.log('✅ User profile fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching user profile:', error.response?.data || error.message);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (profileData) => {
  try {
    console.log('✏️ Updating user profile...');
    const response = await API.put('/users/profile', profileData);
    console.log('✅ Profile updated successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error updating profile:', error.response?.data || error.message);
    throw error;
  }
};

// Upload profile picture
export const uploadProfilePicture = async (file) => {
  try {
    console.log('📸 Uploading profile picture...');
    const formData = new FormData();
    formData.append('profilePicture', file);
    
    const response = await API.post('/users/profile/picture', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    console.log('✅ Profile picture uploaded:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error uploading profile picture:', error.response?.data || error.message);
    throw error;
  }
};

// Delete user account
export const deleteUserAccount = async (password) => {
  try {
    console.log('🗑️ Deleting user account...');
    const response = await API.delete('/users/profile', { 
      data: { password } 
    });
    console.log('✅ User account deleted:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error deleting account:', error.response?.data || error.message);
    throw error;
  }
};

// Check if user ID is available
export const checkUserIdAvailability = async (userId) => {
  try {
    console.log('🔍 Checking userId availability:', userId);
    const response = await API.get(`/users/check-userid/${userId}`);
    console.log('✅ UserId availability checked:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error checking userId:', error.response?.data || error.message);
    throw error;
  }
};

export default {
  getUserProfile,
  updateUserProfile,
  uploadProfilePicture,
  deleteUserAccount,
  checkUserIdAvailability
};