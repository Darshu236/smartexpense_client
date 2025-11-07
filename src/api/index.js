// api/index.js - Main API Export File
// This file combines all API modules for easy importing

// Import all API modules
import authApi from './authApi';
import profileApi from './profileApi';
import friendsApi from './friendsApi';
import expenseApi from './expenseApi';
import debtApi from './debtApi';

// Export individual modules
export { default as authApi } from './authApi';
export { default as profileApi } from './profileApi';
export { default as friendsApi } from './friendsApi';
export { default as expenseApi } from './expenseApi';
export { default as debtApi } from './debtApi';

// Export individual functions for backward compatibility
export * from './authApi';
export * from './profileApi';
export * from './friendsApi';
export * from './expenseApi';
export * from './debtApi';

// Default export with all APIs combined
export default {
  auth: authApi,
  profile: profileApi,
  friends: friendsApi,
  expense: expenseApi,
  debt: debtApi
};
