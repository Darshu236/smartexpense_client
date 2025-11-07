// api/expenseApi.js - Expense Management API Functions

import API from './api';

// Create split expense
export const createSplitExpense = async (expenseData) => {
  try {
    console.log('💸 Creating split expense...');
    const response = await API.post('/split-expenses', expenseData);
    console.log('✅ Split expense created:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error creating split expense:', error.response?.data || error.message);
    throw error;
  }
};

// Get user's expenses
export const getUserExpenses = async () => {
  try {
    console.log('💰 Fetching user expenses...');
    const response = await API.get('/expenses');
    console.log('✅ Expenses fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching expenses:', error.response?.data || error.message);
    throw error;
  }
};

// Get expense by ID
export const getExpenseById = async (expenseId) => {
  try {
    console.log('📋 Fetching expense by ID:', expenseId);
    const response = await API.get(`/expenses/${expenseId}`);
    console.log('✅ Expense fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching expense:', error.response?.data || error.message);
    throw error;
  }
};

// Update expense
export const updateExpense = async (expenseId, expenseData) => {
  try {
    console.log('✏️ Updating expense:', expenseId);
    const response = await API.put(`/expenses/${expenseId}`, expenseData);
    console.log('✅ Expense updated:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error updating expense:', error.response?.data || error.message);
    throw error;
  }
};

// Delete expense
export const deleteExpense = async (expenseId) => {
  try {
    console.log('🗑️ Deleting expense:', expenseId);
    const response = await API.delete(`/expenses/${expenseId}`);
    console.log('✅ Expense deleted:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error deleting expense:', error.response?.data || error.message);
    throw error;
  }
};

// Scan bill image for amount detection
export const scanBill = async (billFile) => {
  try {
    console.log('🔍 Scanning bill image...');
    const formData = new FormData();
    formData.append('bill', billFile);
    
    const response = await API.post('/expenses/scan-bill', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    console.log('✅ Bill scanned successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error scanning bill:', error.response?.data || error.message);
    throw error;
  }
};

// Get expense categories
export const getExpenseCategories = async () => {
  try {
    console.log('📂 Fetching expense categories...');
    const response = await API.get('/expenses/categories');
    console.log('✅ Categories fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching categories:', error.response?.data || error.message);
    throw error;
  }
};

// Get expense statistics
export const getExpenseStats = async (timeRange = '30d') => {
  try {
    console.log('📊 Fetching expense statistics...');
    const response = await API.get('/expenses/stats', {
      params: { range: timeRange }
    });
    console.log('✅ Stats fetched:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Error fetching stats:', error.response?.data || error.message);
    throw error;
  }
};

export default {
  createSplitExpense,
  getUserExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  scanBill,
  getExpenseCategories,
  getExpenseStats
};