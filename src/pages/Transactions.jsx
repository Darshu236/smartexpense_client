import React, { useEffect, useState } from 'react';
import './Transactions.css';
import { useAuth } from '../context/AuthContext';
import { 
  getCategoriesForType, 
  getAllCategoryValues, 
  PAYMENT_MODES 
} from '../config/categoryConfig';
import CurrencyManager from '../utils/currencyManager';

const Transactions = () => {
  const { isAuthenticated, token, loading: authLoading, logout } = useAuth();
  const [userCurrency, setUserCurrency] = useState('INR');
  const [currencySymbol, setCurrencySymbol] = useState('₹');
  const currencySymbols = {
    'INR': '₹',
    'USD': '$',
    'EUR': '€',
    'JPY': '¥',
    'GBP': '£',
    'CAD': 'C$',
    'AUD': 'A$'
  };

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    title: '',
    amount: '',
    type: 'expense',
    category: 'Food',
    paymentMode: 'wallet'
  });
  
  // Get current categories based on selected type using config
  const getCurrentCategories = () => {
    return getCategoriesForType(form.type);
  };

  // Get all category values for validation
  const getAllCategories = () => {
    const expenseValues = getAllCategoryValues('expense');
    const incomeValues = getAllCategoryValues('income');
    return [...new Set([...expenseValues, ...incomeValues])];
  };

  // Enhanced API utility with better error handling
  const createAPI = () => {
    const API_BASE_URL = 'http://localhost:4000/api';
    
    const getAuthHeaders = () => {
      const authToken = token || localStorage.getItem('token');
      
      if (!authToken) {
        console.warn('No auth token found');
        return {
          'Content-Type': 'application/json',
        };
      }
      
      return {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      };
    };

    const handleResponse = async (response, context) => {
      let responseText = '';
      
      try {
        responseText = await response.text();
      } catch (textError) {
        console.error('Failed to read response text:', textError);
      }
    
      if (!response.ok) {
        let errorMessage = `Server Error (${response.status})`;
        
        if (responseText) {
          try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorData.error || errorData.details || errorMessage;
            
            if (Array.isArray(errorMessage)) {
              errorMessage = errorMessage.join(', ');
            }
          } catch (parseError) {
            errorMessage = responseText.length > 100 ? 
              responseText.substring(0, 100) + '...' : 
              responseText;
          }
        }

        if (response.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
          setTimeout(() => logout(), 1000);
        } else if (response.status === 403) {
          errorMessage = 'Access denied. You don\'t have permission for this action.';
        } else if (response.status === 404) {
          errorMessage = 'Resource not found. The server endpoint may not exist.';
        } else if (response.status >= 500) {
          errorMessage = `Server error (${response.status}): ${errorMessage}. Please check server logs and try again.`;
        }

        const error = new Error(errorMessage);
        error.status = response.status;
        error.response = { data: responseText };
        throw error;
      }

      if (!responseText) {
        return {};
      }

      try {
        return JSON.parse(responseText);
      } catch (parseError) {
        console.warn('Failed to parse response as JSON:', responseText);
        return { message: responseText };
      }
    };

    return {
      async get(endpoint) {
        try {
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'GET',
            headers: getAuthHeaders(),
          });
          return await handleResponse(response, `GET ${endpoint}`);
        } catch (error) {
          console.error(`❌ GET ${endpoint} failed:`, error);
          throw error;
        }
      },

      async post(endpoint, data) {
        try {
          
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
          });
          return await handleResponse(response, `POST ${endpoint}`);
        } catch (error) {
          console.error(`❌ POST ${endpoint} failed:`, error);
          throw error;
        }
      },

      async put(endpoint, data) {
        try {
          
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data),
          });
          return await handleResponse(response, `PUT ${endpoint}`);
        } catch (error) {
          console.error(`❌ PUT ${endpoint} failed:`, error);
          throw error;
        }
      },

      async delete(endpoint) {
        try {
          const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'DELETE',
            headers: getAuthHeaders(),
          });
          return await handleResponse(response, `DELETE ${endpoint}`);
        } catch (error) {
          console.error(`❌ DELETE ${endpoint} failed:`, error);
          throw error;
        }
      }
    };
  };

  const ensureAuthenticated = () => {
    if (!isAuthenticated || !token) {
      throw new Error('Please log in to access this feature');
    }
  };

  const fetchUserCurrency = async () => {
    try {
      ensureAuthenticated();
      const API = createAPI();
      const settings = await API.get('/settings');
      const currency = settings.currency || 'INR';
       
      return currency;
    } catch (error) {
      console.warn('Failed to fetch currency, using default:', error.message);
      return 'INR';
    }
  };

  const getTransactions = async () => {
    try {
      if (!isAuthenticated || !token) {
        setTransactions([]);
        return;
      }

      setLoading(true);
      setError('');
      
      const API = createAPI();
      const response = await API.get('/transactions');

      let transactionsData = [];
      if (Array.isArray(response)) {
        transactionsData = response;
      } else if (Array.isArray(response.transactions)) {
        transactionsData = response.transactions;
      } else if (Array.isArray(response.data)) {
        transactionsData = response.data;
      } else if (response.data && Array.isArray(response.data.transactions)) {
        transactionsData = response.data.transactions;
      } else {
        console.warn('Unexpected response structure:', response);
        transactionsData = [];
      }

      transactionsData.sort((a, b) => {
        const dateA = new Date(a.createdAt || a.date);
        const dateB = new Date(b.createdAt || b.date);
        return dateB - dateA;
      });

      setTransactions(transactionsData);
      
      
    } catch (error) {
      const errorMessage = error.message || 'Failed to fetch transactions';
      setError(errorMessage);
      setTransactions([]);
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (newType) => {
    const currentCategories = getCategoriesForType(newType);
    const currentCategoryValues = currentCategories.map(cat => cat.value);
    
    setForm(prevForm => ({
      ...prevForm,
      type: newType,
      category: currentCategoryValues.includes(prevForm.category) ? 
        prevForm.category : 
        (currentCategories[0]?.value || 'Other')
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      ensureAuthenticated();

      if (!form.title.trim()) {
        setError('Transaction title is required');
        return;
      }

      if (!form.amount || isNaN(form.amount) || parseFloat(form.amount) <= 0) {
        setError('Amount must be a positive number');
        return;
      }

      if (!form.category || form.category.trim() === '') {
        setError('Category is required');
        return;
      }

      const allCategories = getAllCategories();
      if (!allCategories.includes(form.category)) {
        setError(`Invalid category. Please select from the available options.`);
        return;
      }

      setIsSubmitting(true);

      const transactionData = {
        description: form.title.trim(),
        amount: parseFloat(form.amount),
        type: form.type,
        category: form.category,
        paymentMode: form.paymentMode,
        date: new Date().toISOString()
      };

      

      const API = createAPI();
      const result = await API.post('/transactions', transactionData);

      

      // Reset form with proper default category
      const defaultCategory = getCategoriesForType('expense')[0]?.value || 'Other';
      setForm({
        title: '',
        amount: '',
        type: 'expense',
        category: defaultCategory,
        paymentMode: 'wallet'
      });

      setSuccess('Transaction added successfully! 🎉');
      setTimeout(() => setSuccess(''), 5000);

      await getTransactions();
      
      // Dispatch event for budget component
      window.dispatchEvent(new Event('transactionUpdated'));
      
    } catch (error) {
      console.error('Transaction creation failed:', error);
      
      let errorMessage = 'Failed to add transaction';
      if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleDelete = async (id) => {
    if (!id) {
      setError('Invalid transaction ID');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      ensureAuthenticated();
      setLoading(true);
      
      const API = createAPI();
      await API.delete(`/transactions/${id}`);
      
      setSuccess('Transaction deleted successfully! 🗑️');
      setTimeout(() => setSuccess(''), 3000);
      
      await getTransactions();
      
      // Dispatch event for budget component
      window.dispatchEvent(new Event('transactionUpdated'));
      
    } catch (error) {
      console.error('Delete failed:', error);
      setError(error.message || 'Failed to delete transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id, updatedData) => {
    try {
      ensureAuthenticated();
      setLoading(true);
      
      const API = createAPI();
      await API.put(`/transactions/${id}`, updatedData);
      
      setSuccess('Transaction updated successfully! ✏️');
      setTimeout(() => setSuccess(''), 3000);
      
      await getTransactions();
      
      // Dispatch event for budget component
      window.dispatchEvent(new Event('transactionUpdated'));
      
    } catch (error) {
      console.error('Update failed:', error);
      setError(error.message || 'Failed to update transaction');
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    await getTransactions();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No Date';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Invalid Date';
      }
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.warn('Date formatting error:', error);
      return 'Invalid Date';
    }
  };

  const getTotalsByType = () => {
    const totals = transactions.reduce(
      (acc, tx) => {
        const amount = parseFloat(tx.amount) || 0;
        if (tx.type === 'income') {
          acc.income += amount;
        } else if (tx.type === 'expense') {
          acc.expense += amount;
        }
        return acc;
      },
      { income: 0, expense: 0 }
    );

    totals.balance = totals.income - totals.expense;
    return totals;
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated && token) {
      getTransactions();
    } else if (!authLoading && !isAuthenticated) {
      setTransactions([]);
    }
  }, [isAuthenticated, authLoading, token]);

  useEffect(() => {
    if (!authLoading && isAuthenticated && token) {
      const loadCurrency = async () => {
        const { currency, symbol } = await CurrencyManager.fetchFromDB();
      setUserCurrency(currency);
      setCurrencySymbol(symbol);
      console.log('💰 Transactions.jsx currency loaded:', currency, symbol);
    };
    loadCurrency();
  }
  }, [isAuthenticated, authLoading, token]);

  if (authLoading) {
    return (
      <div className="transactions-container">
        <div className="loading-msg">⏳ Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="transactions-container">
        <div className="auth-required">
          <h2>🔒 Authentication Required</h2>
          <p>Please log in to access your transactions.</p>
        </div>
      </div>
    );
  }

  const totals = getTotalsByType();
  const currentCategories = getCurrentCategories();

  return (
    <div className="transactions-container">
      <div className="transactions-header">
        <h2>📋 Transaction Management</h2>
        <p>Add new transactions and view your transaction history</p>
        

        {transactions.length > 0 && (
          <div className="summary-cards">
            <div className="card income-card">
              <h4>💰 Income</h4>
              <p>{currencySymbol}{totals.income.toFixed(2)}</p>
            </div>
            <div className="card expense-card">
              <h4>💸 Expenses</h4>
              <p>{currencySymbol}{totals.expense.toFixed(2)}</p>
            </div>
            <div className={`card balance-card ${totals.balance >= 0 ? 'positive' : 'negative'}`}>
              <h4>⚖️ Balance</h4>
              <p>{currencySymbol}{totals.balance.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>

      {error && <div className="alert error">⚠️ {error}</div>}
      {success && <div className="alert success">✅ {success}</div>}

      <div className="form-card">
        <h3>➕ Add New Transaction</h3>

        <form onSubmit={handleSubmit} className="transaction-form">
          <div className="form-fields">
            <input
              type="text"
              placeholder="Transaction Title *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              disabled={isSubmitting}
            />

            <input
              type="number"
              step="0.01"
              min="0.01"
              placeholder="Amount *"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
              disabled={isSubmitting}
            />

            <select
              value={form.type}
              onChange={(e) => handleTypeChange(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="expense">💸 Expense</option>
              <option value="income">💰 Income</option>
            </select>

            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
              disabled={isSubmitting}
            >
              {currentCategories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>

            <select
              value={form.paymentMode}
              onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
              disabled={isSubmitting}
            >
              {PAYMENT_MODES.map((mode) => (
                <option key={mode.value} value={mode.value}>
                  {mode.icon} {mode.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-actions">
            <button type="submit" className="add-btn" disabled={isSubmitting}>
              {isSubmitting ? '⏳ Adding...' : '➕ Add Transaction'}
            </button>
            <button type="button" className="refresh-btn" onClick={handleManualRefresh} disabled={loading}>
              {loading ? '⏳ Refreshing...' : '🔄 Refresh List'}
            </button>
          </div>
        </form>
      </div>

      <div className="transaction-table-container">
        <h3>📊 Transaction History ({transactions.length})</h3>

        {loading && transactions.length === 0 ? (
          <div className="loading-msg">⏳ Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="empty-msg">
            <div className="emoji">📄</div>
            <p>No transactions found</p>
            <small>Add your first transaction using the form above!</small>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="transaction-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Category</th>
                  <th>Payment</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th className="center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, index) => (
                  <tr key={tx._id || tx.id || index}>
                    <td>{tx.description || tx.title || 'No description'}</td>
                    <td className={tx.type === 'income' ? 'row-income' : 'row-expense'}>
                      {tx.type === 'income' ? '+' : '-'}
                      {currencySymbol}{(parseFloat(tx.amount) || 0).toFixed(2)}
                    </td>
                    <td><span className="badge category">{tx.category || 'Other'}</span></td>
                    <td className="capitalize">{tx.paymentMode || 'N/A'}</td>
                    <td><span className={`badge ${tx.type}`}>{tx.type || 'N/A'}</span></td>
                    <td className="date">{formatDate(tx.date || tx.createdAt)}</td>
                    <td className="center">
                      <button 
                        className="delete-btn" 
                        onClick={() => handleDelete(tx._id || tx.id)} 
                        disabled={loading}
                        title="Delete transaction"
                      >
                        {loading ? '⏳' : '🗑️'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;