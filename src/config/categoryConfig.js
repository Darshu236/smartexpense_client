// src/config/categoryConfig.js
// Centralized category configuration for the entire app

export const EXPENSE_CATEGORIES = [
  { value: 'Food', label: 'Food & Dining', icon: '🍔', color: '#ef4444' },
  { value: 'Transport', label: 'Transport', icon: '🚗', color: '#3b82f6' },
  { value: 'Shopping', label: 'Shopping', icon: '🛍️', color: '#8b5cf6' },
  { value: 'Entertainment', label: 'Entertainment', icon: '🎬', color: '#ec4899' },
  { value: 'Healthcare', label: 'Healthcare', icon: '🏥', color: '#10b981' },
  { value: 'Bills', label: 'Bills & Utilities', icon: '📄', color: '#f59e0b' },
  { value: 'Education', label: 'Education', icon: '📚', color: '#06b6d4' },
  { value: 'Travel', label: 'Travel', icon: '✈️', color: '#14b8a6' },
  { value: 'Rent', label: 'Rent', icon: '🏠', color: '#6366f1' },
  { value: 'Loan', label: 'Loan Payment', icon: '💳', color: '#f43f5e' },
  { value: 'Investment', label: 'Investment', icon: '📈', color: '#059669' },
  { value: 'Other', label: 'Other', icon: '📦', color: '#64748b' }
];

export const INCOME_CATEGORIES = [
  { value: 'Salary', label: 'Salary', icon: '💼', color: '#10b981' },
  { value: 'Freelance', label: 'Freelance', icon: '💻', color: '#3b82f6' },
  { value: 'Business', label: 'Business', icon: '🏢', color: '#8b5cf6' },
  { value: 'Investment', label: 'Investment Returns', icon: '📊', color: '#059669' },
  { value: 'Bonus', label: 'Bonus', icon: '🎁', color: '#f59e0b' },
  { value: 'Gift', label: 'Gift', icon: '🎀', color: '#ec4899' },
  { value: 'Refund', label: 'Refund', icon: '↩️', color: '#06b6d4' },
  { value: 'Side Hustle', label: 'Side Hustle', icon: '🚀', color: '#14b8a6' },
  { value: 'Dividend', label: 'Dividend', icon: '💰', color: '#10b981' },
  { value: 'Other', label: 'Other Income', icon: '💵', color: '#64748b' }
];

// Get categories based on type
export const getCategoriesForType = (type) => {
  return type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
};

// Get category details
export const getCategoryDetails = (categoryValue, type = 'expense') => {
  const categories = getCategoriesForType(type);
  return categories.find(cat => cat.value === categoryValue) || 
         { value: categoryValue, label: categoryValue, icon: '📦', color: '#64748b' };
};

// Get all unique category values
export const getAllCategoryValues = (type = 'expense') => {
  return getCategoriesForType(type).map(cat => cat.value);
};

// Validate if a category exists
export const isValidCategory = (categoryValue, type = 'expense') => {
  return getAllCategoryValues(type).includes(categoryValue);
};

// Payment modes
export const PAYMENT_MODES = [
  { value: 'cash', label: 'Cash', icon: '💵' },
  { value: 'bank', label: 'Bank Transfer', icon: '🏦' },
  { value: 'card', label: 'Credit/Debit Card', icon: '💳' },
  { value: 'wallet', label: 'Digital Wallet', icon: '📱' },
  { value: 'upi', label: 'UPI', icon: '📲' },
  { value: 'other', label: 'Other', icon: '📦' }
];

export default {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  getCategoriesForType,
  getCategoryDetails,
  getAllCategoryValues,
  isValidCategory,
  PAYMENT_MODES
};