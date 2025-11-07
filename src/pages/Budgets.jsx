import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Edit2, Trash2, X, AlertTriangle, AlertCircle, Lock, TrendingDown } from 'lucide-react';
import { fetchBudgets, createBudget, updateBudgetApi, deleteBudgetApi } from '../api/budgetApi';
import { fetchTransactions } from '../api/transactionApi';
import CurrencyManager from '../utils/currencyManager';
import CategoryAPI from '../api/categoryApi';
import './Budgets.css';

const BudgetManager = () => {
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [currentMonth, setCurrentMonth] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [deletingBudget, setDeletingBudget] = useState(null);
  const [isOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [previousBudgets, setPreviousBudgets] = useState([]);
  const [userCurrency, setUserCurrency] = useState('INR');
  const [currencySymbol, setCurrencySymbol] = useState('{currencySymbol}');

  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const current = `${year}-${month}`;
    setSelectedMonth(current);
    setCurrentMonth(current);
    
    const loadCurrency = async () => {
    const { currency, symbol } = await CurrencyManager.fetchFromDB();
    setUserCurrency(currency);
    setCurrencySymbol(symbol);
    console.log('💰 Budgets.jsx currency loaded:', currency, symbol);
    };
    loadCurrency();
    
    fetchData(current);

    fetchData(current);
  }, []);

  useEffect(() => {
    if (selectedMonth) {
      fetchData(selectedMonth);
    }
  }, [selectedMonth]);

  useEffect(() => {
    const handleTransactionUpdate = () => {
      if (selectedMonth) {
        console.log('Transaction updated event received, refreshing budgets...');
        fetchData(selectedMonth);
      }
    };

    window.addEventListener('transactionUpdated', handleTransactionUpdate);
    return () => window.removeEventListener('transactionUpdated', handleTransactionUpdate);
  }, [selectedMonth]);

  const fetchData = async (month) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Fetching data for month:', month);
      
      const [budgetsData, transactionsData, categoriesData] = await Promise.all([
        fetchBudgets(month),
        fetchTransactions({ month }),
        CategoryAPI.list()
      ]);

      console.log('Budgets received:', budgetsData);
      console.log('Transactions received:', transactionsData);
      console.log('Categories received:', categoriesData);

      setBudgets(Array.isArray(budgetsData) ? budgetsData : []);
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      
      const txArray = Array.isArray(transactionsData) 
        ? transactionsData 
        : (transactionsData?.data || transactionsData?.transactions || []);
      
      console.log('Setting transactions:', txArray);
      setTransactions(txArray);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load data');
      setBudgets([]);
      setTransactions([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const [formData, setFormData] = useState({
    category: '',
    type: 'expense',
    monthlyLimit: '',
    color: '#3b82f6',
    description: ''
  });

  const getAvailableCategories = () => {
    return categories
      .filter(cat => cat.type === formData.type)
      .map(cat => ({
        value: cat.name,
        label: cat.name,
        icon: cat.icon || '📁',
        color: cat.color
      }));
  };

  const getMonthName = (monthStr) => {
    if (!monthStr) return '';
    const [year, month] = monthStr.split('-');
    const date = new Date(year, month - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const isCurrentOrFutureMonth = (monthStr) => {
    return monthStr >= currentMonth;
  };

  const canModifyMonth = isCurrentOrFutureMonth(selectedMonth);

  const calculateSpentAmount = (budget) => {
    const [year, month] = budget.month.split('-');
    const startDate = new Date(year, month - 1, 1);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(year, month, 0);
    endDate.setHours(23, 59, 59, 999);

    console.log('Calculating spent for budget:', {
      category: budget.category,
      type: budget.type,
      month: budget.month,
      dateRange: { 
        start: startDate.toISOString(), 
        end: endDate.toISOString() 
      },
      totalTransactions: transactions.length
    });

    const matchingTransactions = transactions.filter(t => {
      let tDate;
      const dateStr = t.date || t.createdAt;
      
      if (dateStr) {
        tDate = new Date(dateStr);
        if (isNaN(tDate.getTime())) {
          console.warn('Invalid transaction date:', dateStr);
          return false;
        }
      } else {
        console.warn('Transaction missing date:', t);
        return false;
      }

      const matchesCategory = t.category?.toLowerCase() === budget.category?.toLowerCase();
      const matchesType = t.type?.toLowerCase() === budget.type?.toLowerCase();
      const matchesDate = tDate >= startDate && tDate <= endDate;
      
      console.log('Transaction check:', {
        transaction: t.description || t.title,
        category: t.category,
        type: t.type,
        date: tDate.toISOString(),
        matchesCategory,
        matchesType,
        matchesDate
      });
      
      return matchesCategory && matchesType && matchesDate;
    });

    const spent = matchingTransactions.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);

    console.log('Total spent calculated:', {
      budget: budget.category,
      matchingTransactions: matchingTransactions.length,
      transactions: matchingTransactions.map(t => ({
        desc: t.description || t.title,
        amount: t.amount,
        date: t.date || t.createdAt,
        category: t.category
      })),
      totalSpent: spent
    });

    return spent;
  };

  const getBudgetStatus = (spent, limit) => {
    const percentage = (spent / limit) * 100;
    
    if (percentage >= 100) {
      return { 
        status: 'exceeded', 
        severity: 'danger',
        message: 'Budget exceeded!',
        icon: '🚨'
      };
    }
    if (percentage >= 90) {
      return { 
        status: 'critical', 
        severity: 'danger',
        message: `Critical: ${percentage.toFixed(0)}% used`,
        icon: '⚠️'
      };
    }
    if (percentage >= 85) {
      return { 
        status: 'high', 
        severity: 'warning',
        message: `Warning: ${percentage.toFixed(0)}% used`,
        icon: '⚡'
      };
    }
    if (percentage >= 75) {
      return { 
        status: 'moderate', 
        severity: 'caution',
        message: `Caution: ${percentage.toFixed(0)}% used`,
        icon: '📊'
      };
    }
    return { 
      status: 'healthy', 
      severity: 'normal',
      message: 'On track',
      icon: '✅'
    };
  };

  const showBudgetAlert = (budget, status) => {
    const percentage = ((budget.spent / budget.monthlyLimit) * 100).toFixed(1);
    const remaining = budget.monthlyLimit - budget.spent;
    
    let alertMessage = '';
    let alertType = 'info';
    
    if (status.severity === 'danger') {
      alertType = 'error';
      if (percentage >= 100) {
        alertMessage = `🚨 Budget Alert: Your "${budget.category}" budget has been exceeded by {currencySymbol}${Math.abs(remaining).toFixed(2)}!`;
      } else {
        alertMessage = `⚠️ Critical Alert: Your "${budget.category}" budget is ${percentage}% used ({currencySymbol}${remaining.toFixed(2)} remaining)`;
      }
    } else if (status.severity === 'warning') {
      alertType = 'warning';
      alertMessage = `⚡ Budget Warning: Your "${budget.category}" budget is ${percentage}% used ({currencySymbol}${remaining.toFixed(2)} remaining)`;
    } else if (status.severity === 'caution') {
      alertType = 'info';
      alertMessage = `📊 Budget Notice: Your "${budget.category}" budget is ${percentage}% used ({currencySymbol}${remaining.toFixed(2)} remaining)`;
    }
    
    if (alertMessage) {
      const alertDiv = document.createElement('div');
      alertDiv.className = `budget-toast budget-toast-${alertType}`;
      alertDiv.innerHTML = `
        <div class="toast-content">
          <span class="toast-icon">${status.icon}</span>
          <span class="toast-message">${alertMessage}</span>
        </div>
      `;
      alertDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 20px;
        background: ${alertType === 'error' ? 'linear-gradient(135deg, #fee 0%, #fdd 100%)' : alertType === 'warning' ? 'linear-gradient(135deg, #fff3cd 0%, #ffe69c 100%)' : 'linear-gradient(135deg, #d1ecf1 0%, #bee5eb 100%)'};
        border-left: 5px solid ${alertType === 'error' ? '#dc3545' : alertType === 'warning' ? '#ffc107' : '#0dcaf0'};
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        max-width: 420px;
        backdrop-filter: blur(10px);
      `;
      
      document.body.appendChild(alertDiv);
      
      setTimeout(() => {
        alertDiv.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => alertDiv.remove(), 300);
      }, 5000);
    }
  };

  const filteredBudgets = budgets
    .filter(b => b.month === selectedMonth)
    .map(budget => ({
      ...budget,
      spent: calculateSpentAmount(budget)
    }));

  const expenseBudgets = filteredBudgets.filter(b => b.type === 'expense');

  const totalExpenseBudget = expenseBudgets.reduce((sum, b) => sum + (b.monthlyLimit || 0), 0);
  const totalExpenseSpent = expenseBudgets.reduce((sum, b) => sum + b.spent, 0);

  const expensePercentage = totalExpenseBudget > 0 ? (totalExpenseSpent / totalExpenseBudget) * 100 : 0;

  const overBudgetCount = expenseBudgets.filter(b => b.spent > b.monthlyLimit).length;
  const allOnTrack = overBudgetCount === 0 && expenseBudgets.every(b => (b.spent / (b.monthlyLimit || 1)) <= 0.9);

  const monthTransactionCount = transactions.filter(t => {
    const [year, month] = selectedMonth.split('-');
    const tDate = new Date(t.date || t.createdAt);
    return tDate.getFullYear() === parseInt(year) && tDate.getMonth() + 1 === parseInt(month);
  }).length;

  useEffect(() => {
    if (filteredBudgets.length > 0 && previousBudgets.length > 0) {
      filteredBudgets.forEach(budget => {
        const previousBudget = previousBudgets.find(b => b._id === budget._id || b.id === budget.id);
        
        if (previousBudget && previousBudget.spent !== budget.spent) {
          const status = getBudgetStatus(budget.spent, budget.monthlyLimit);
          
          if (['warning', 'danger', 'caution'].includes(status.severity)) {
            showBudgetAlert(budget, status);
          }
        }
      });
    }
    
    setPreviousBudgets(filteredBudgets);
  }, [filteredBudgets.map(b => `${b._id || b.id}-${b.spent}`).join(',')]);

  const handleSubmit = async () => {
    if (!formData.category || !formData.monthlyLimit) {
      setError('Category and Monthly Limit are required');
      return;
    }

    const validCategory = categories.find(
      cat => cat.name === formData.category && cat.type === formData.type
    );
    if (!validCategory) {
      setError('Invalid category selected');
      return;
    }
    
    try {
      setError(null);
      const budgetData = {
        category: formData.category.trim(),
        type: formData.type,
        monthlyLimit: parseFloat(formData.monthlyLimit),
        month: selectedMonth,
        color: formData.color,
        description: formData.description.trim()
      };

      console.log('Saving budget:', budgetData);

      if (editingBudget) {
        await updateBudgetApi(editingBudget._id || editingBudget.id, budgetData);
        console.log('Budget updated successfully');
      } else {
        await createBudget(budgetData);
        console.log('Budget created successfully');
      }

      await fetchData(selectedMonth);
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      console.error('Error saving budget:', err);
      setError(err.message || 'Failed to save budget');
    }
  };

  const handleEdit = (budget) => {
    setEditingBudget(budget);
    setFormData({
      category: budget.category,
      type: budget.type,
      monthlyLimit: (budget.monthlyLimit || 0).toString(),
      color: budget.color || '#3b82f6',
      description: budget.description || ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = (budget) => {
    setDeletingBudget(budget);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    try {
      console.log('Deleting budget:', deletingBudget._id || deletingBudget.id);
      await deleteBudgetApi(deletingBudget._id || deletingBudget.id);
      console.log('Budget deleted successfully');
      
      await fetchData(selectedMonth);
      setIsDeleteModalOpen(false);
      setDeletingBudget(null);
    } catch (err) {
      console.error('Error deleting budget:', err);
      setError(err.message || 'Failed to delete budget');
    }
  };

  const resetForm = () => {
    const expenseCategories = categories.filter(cat => cat.type === 'expense');
    const defaultCategory = expenseCategories[0]?.name || 'Other';
    
    setFormData({
      category: defaultCategory,
      type: 'expense',
      monthlyLimit: '',
      color: '#3b82f6',
      description: ''
    });
    setEditingBudget(null);
  };

  const handleTypeChange = (newType) => {
    const filteredCategories = categories.filter(cat => cat.type === newType);
    const defaultCategory = filteredCategories[0]?.name || 'Other';
    
    setFormData(prevForm => ({
      ...prevForm,
      type: newType,
      category: defaultCategory
    }));
  };

  const getProgressStatus = (spent, limit) => {
    const percentage = (spent / limit) * 100;
    if (percentage >= 100) return 'danger';
    if (percentage >= 90) return 'danger';
    if (percentage >= 85) return 'warning';
    if (percentage >= 75) return 'caution';
    return 'normal';
  };
  const formatCurrency = (amount) => {
  return `${currencySymbol}${parseFloat(amount || 0).toFixed(2)}`;
  };
  if (loading) {
    return (
      <div className="budget-container">
        <div className="budget-wrapper">
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading budgets...</p>
          </div>
        </div>
      </div>
    );
  }

  const availableCategories = getAvailableCategories();

  return (
<div className="budget-container">
      <div className="budget-wrapper">
        {error && (
          <div className="error-banner">
            <div className="error-content">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
            <button className="retry-button" onClick={() => fetchData(selectedMonth)}>
              <span>Retry</span>
            </button>
          </div>
        )}

        <div className="budget-header">
          <div className="header-content">
            <div className="header-info">
              <div className="header-title">
                <Wallet size={32} />
                <h1 className="budget-title">Budget Manager</h1>
              </div>
              <p className="budget-subtitle">Smart financial planning and expense tracking</p>
              <div className={`connection-status ${isOnline ? 'online' : 'offline'}`}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isOnline ? '#10b981' : '#ef4444' }} />
                {isOnline ? 'Online' : 'Offline'}
              </div>
            </div>
            <div className="header-controls">
              <select 
                className="month-selector"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                {Array.from({ length: 24 }, (_, i) => {
                  const d = new Date();
                  d.setMonth(d.getMonth() - 12 + i);
                  const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                  return <option key={val} value={val}>{getMonthName(val)}</option>;
                })}
              </select>
              <button 
                className="add-button" 
                onClick={() => setIsModalOpen(true)}
                disabled={!canModifyMonth}
                style={{ opacity: canModifyMonth ? 1 : 0.6, cursor: canModifyMonth ? 'pointer' : 'not-allowed' }}
              >
                {canModifyMonth ? <Plus size={20} /> : <Lock size={20} />}
                {canModifyMonth ? 'Add Budget' : 'Past Month'}
              </button>
            </div>
          </div>
        </div>

        {!canModifyMonth && (
          <div className="alert-banner">
            <div className="alert-header">
              <Lock size={24} />
              <h3 className="alert-title">Viewing Historical Data</h3>
            </div>
            <p className="alert-message">
              You are viewing budget data for {getMonthName(selectedMonth)}. You cannot add or modify budgets for past months.
            </p>
          </div>
        )}

        <div className="summary-cards">
          <div className="summary-card expense">
            <div className="card-title">
              <TrendingDown size={16} style={{ display: 'inline', marginRight: '6px' }} />
              Total Expense Budget
            </div>
            <div className="card-amount">{currencySymbol}{totalExpenseBudget.toFixed(2)}</div>
            <div className="progress-bar-container" style={{ marginTop: '12px', height: '8px' }}>
              <div 
                className={`progress-bar ${getProgressStatus(totalExpenseSpent, totalExpenseBudget)}`}
                style={{ width: `${Math.min(expensePercentage, 100)}%` }} 
              />
            </div>
            <span className="card-sub-amount" style={{ color: expensePercentage >= 90 ? '#ef4444' : expensePercentage >= 85 ? '#f59e0b' : '#6b7280', fontWeight: '600' }}>
              {expensePercentage.toFixed(1)}% used ({currencySymbol}{totalExpenseSpent.toFixed(2)})
            </span>
          </div>
          
          <div className="summary-card spent">
            <div className="card-title">Transactions This Month</div>
            <div className="card-amount">{monthTransactionCount}</div>
            <span className="card-sub-amount">
              Total Activity: {currencySymbol}{totalExpenseSpent.toFixed(2)}
            </span>
          </div>
          
          <div className={`summary-card status ${allOnTrack ? 'good' : 'warning'}`}>
            <div className="card-title">Budget Status</div>
            <div className="card-amount" style={{ fontSize: '1.5rem' }}>
              {allOnTrack ? '✓ On Track' : `⚠ ${overBudgetCount} Over`}
            </div>
            <span className="card-sub-amount">
              {allOnTrack ? 'All budgets within limits' : `${overBudgetCount} budget(s) exceeded`}
            </span>
          </div>
        </div>

        {filteredBudgets.length === 0 ? (
          <div className="empty-state">
            <Wallet size={64} color="#9ca3af" />
            <h2 className="empty-title">No budgets yet</h2>
            <p className="empty-text">
              {canModifyMonth 
                ? `Create your first budget to start tracking your finances for ${getMonthName(selectedMonth)}`
                : `No budgets were set for ${getMonthName(selectedMonth)}`
              }
            </p>
            {canModifyMonth && (
              <button className="create-first-button" onClick={() => setIsModalOpen(true)}>
                <Plus size={20} />
                Create Your First Budget
              </button>
            )}
          </div>
        ) : (
          <>
            {expenseBudgets.length > 0 && (
              <div className="budget-list">
                <div className="budget-list-header">
                  <h2 className="budget-list-title">
                    <TrendingDown size={24} style={{ display: 'inline', marginRight: '8px', color: '#ef4444' }} />
                    Expense Budgets
                  </h2>
                  <span className="budget-count">{expenseBudgets.length}</span>
                </div>
                <div className="budget-items">
                  {expenseBudgets.map(budget => {
                    const limit = budget.monthlyLimit || 0;
                    const percentage = limit > 0 ? (budget.spent / limit) * 100 : 0;
                    const status = getBudgetStatus(budget.spent, limit);
                    const remaining = limit - budget.spent;

                    return (
                      <div key={budget._id || budget.id} className="budget-item">
                        <div className="budget-item-header">
                          <div className="budget-info">
                            <div className="budget-color-indicator" style={{ background: budget.color }} />
                            <div className="budget-details">
                              <h3 className="budget-category">{budget.category}</h3>
                              <span className="budget-type expense">EXPENSE</span>
                            </div>
                          </div>
                          {canModifyMonth && (
                            <div className="budget-actions">
                              <button className="action-button edit" onClick={() => handleEdit(budget)}>
                                <Edit2 size={18} />
                              </button>
                              <button className="action-button delete" onClick={() => handleDelete(budget)}>
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                        </div>

                        <div className="progress-section">
                          <div className="progress-labels">
                            <span className="spent-label">
                              Spent: {currencySymbol}{budget.spent.toFixed(2)}
                              <span className={`percentage-badge ${status.severity}`}>
                                {percentage.toFixed(1)}%
                              </span>
                            </span>
                            <span className="budget-label">Budget: {currencySymbol}{limit.toFixed(2)}</span>
                          </div>
                          <div className="progress-bar-container">
                            <div 
                              className={`progress-bar ${status.severity}`}
                              style={{ 
                                width: `${Math.min(percentage, 100)}%`,
                                transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
                              }} 
                            >
                              {percentage >= 10 && (
                                <span className="progress-text">{percentage.toFixed(0)}%</span>
                              )}
                            </div>
                          </div>
                          <div className="progress-summary">
                            <span className={`status-badge ${status.severity}`}>
                              {status.icon} {status.message}
                            </span>
                            <span className={`remaining-amount ${remaining >= 0 ? 'positive' : 'negative'}`}>
                              {remaining >= 0 ? 'Remaining' : 'Over'}: {currencySymbol}{Math.abs(remaining).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        {status.severity === 'danger' && percentage >= 100 && (
                          <div className="budget-alert danger">
                            <AlertCircle size={16} />
                            <strong>Budget Exceeded!</strong>
                            <span>You've spent {currencySymbol}{Math.abs(remaining).toFixed(2)} over your budget limit.</span>
                          </div>
                        )}
                        
                        {status.severity === 'danger' && percentage >= 90 && percentage < 100 && (
                          <div className="budget-alert danger">
                            <AlertTriangle size={16} />
                            <strong>Critical Alert!</strong>
                            <span>Only {currencySymbol}{remaining.toFixed(2)} remaining ({(100-percentage).toFixed(1)}% left)</span>
                          </div>
                        )}
                        
                        {status.severity === 'warning' && (
                          <div className="budget-alert warning">
                            <AlertTriangle size={16} />
                            <strong>Warning!</strong>
                            <span>{percentage.toFixed(1)}% of budget used. {currencySymbol}{remaining.toFixed(2)} remaining.</span>
                          </div>
                        )}
                        
                        {status.severity === 'caution' && (
                          <div className="budget-alert caution">
                            <AlertCircle size={16} />
                            <span>Monitor spending: {percentage.toFixed(1)}% used</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {isModalOpen && canModifyMonth && (
        <div className="modal-overlay" onClick={() => { setIsModalOpen(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingBudget ? 'Edit Budget' : 'Create New Budget'}</h2>
              <button className="close-button" onClick={() => { setIsModalOpen(false); resetForm(); }}>
                <X size={24} />
              </button>
            </div>
            <div className="budget-form">
              <div className="form-group">
                <label>Type *</label>
                <select
                  className="form-select"
                  value={formData.type}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  disabled={!!editingBudget}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </div>

              <div className="form-group">
                <label>Category Name *</label>
                <select
                  className="form-select"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  disabled={!!editingBudget}
                >
                  {availableCategories.length > 0 ? (
                    availableCategories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.icon} {cat.label}
                      </option>
                    ))
                  ) : (
                    <option value="">No categories available</option>
                  )}
                </select>
                <small style={{ color: '#6b7280', marginTop: '4px', display: 'block' }}>
                  Categories are managed from the Category Management page
                </small>
              </div>

              <div className="form-group">
                <label>Monthly Limit ({currencySymbol}) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.monthlyLimit}
                  onChange={(e) => setFormData({ ...formData, monthlyLimit: e.target.value })}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label>Color</label>
                <div className="color-input-group">
                  <input
                    type="color"
                    className="color-input"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                  <div className="color-preview" style={{ background: formData.color }}>
                    {formData.color}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label>Description (Optional)</label>
                <textarea
                  className="form-textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add notes about this budget..."
                />
              </div>

              {editingBudget && (
                <div className="form-info">
                  <strong>Current Progress</strong>
                  <span className="current-spent">
                    {editingBudget.type === 'income' ? 'Received' : 'Spent'}: {currencySymbol}{calculateSpentAmount(editingBudget).toFixed(2)} of {currencySymbol}{(editingBudget.monthlyLimit || 0).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="cancel-button" onClick={() => { setIsModalOpen(false); resetForm(); }}>
                  Cancel
                </button>
                <button type="button" className="submit-button" onClick={handleSubmit}>
                  {editingBudget ? 'Update Budget' : 'Create Budget'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeleteModalOpen && deletingBudget && (
        <div className="modal-overlay" onClick={() => setIsDeleteModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Budget</h2>
              <button className="close-button" onClick={() => setIsDeleteModalOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="delete-content">
              <div className="delete-warning">
                <AlertTriangle size={48} />
                <h3>Are you sure you want to delete this budget?</h3>
              </div>

              <div className="budget-preview">
                <div className="preview-header">
                  <div className="budget-color-indicator" style={{ background: deletingBudget.color }} />
                  <div className="preview-details">
                    <h4>{deletingBudget.category}</h4>
                    <span className={`budget-type ${deletingBudget.type}`}>
                      {deletingBudget.type.toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="preview-stats">
                  <div className="stat">
                    <span className="stat-label">Budget Limit:</span>
                    <span className="stat-value">{currencySymbol}{(deletingBudget.monthlyLimit || 0).toFixed(2)}</span>
                  </div>
                  <div className="stat">
                    <span className="stat-label">{deletingBudget.type === 'income' ? 'Received' : 'Spent'}:</span>
                    <span className="stat-value">{currencySymbol}{calculateSpentAmount(deletingBudget).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="delete-consequences">
                <p><strong>⚠️ This action cannot be undone.</strong></p>
                <p>The budget will be deleted but your transactions will remain intact.</p>
              </div>

              <div className="form-actions">
                <button className="cancel-button" onClick={() => setIsDeleteModalOpen(false)}>
                  Cancel
                </button>
                <button className="delete-confirm-button" onClick={confirmDelete}>
                  Delete Budget
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetManager;