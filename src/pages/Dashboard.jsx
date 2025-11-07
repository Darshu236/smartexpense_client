import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, BarChart, Bar, ResponsiveContainer } from 'recharts';
import { AlertTriangle, TrendingUp, DollarSign, CreditCard, Calendar, Plus, Search, Filter, User, Settings } from 'lucide-react';
import './Dashboard.css';
import TokenManager from '../utils/tokenManager';
import CurrencyManager from '../utils/currencyManager';

const ExpenseTracker = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [forecast, setForecast] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [user, setUser] = useState(null);
  const [userBudget, setUserBudget] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  // API call helper function
const makeAPICall = async (endpoint) => {
  try {
    const token = TokenManager.getToken(); // Use TokenManager instead
    console.log('🔍 Dashboard API Call Debug:', {
      endpoint,
      tokenExists: !!token,
      tokenLength: token?.length || 0,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'NO_TOKEN'
    });
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    const response = await fetch(`http://localhost:4000/api${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API call to ${endpoint} failed:`, error);
    throw error;
  }
};

const fetchUserCurrency = async () => {
  const { currency, symbol } = await CurrencyManager.fetchFromDB();
  console.log('💰 Dashboard.jsx currency loaded:', currency, symbol);
  return currency;
};

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Load user currency
        const currency = await fetchUserCurrency();
        setUserCurrency(currency);
        setCurrencySymbol(currencySymbols[currency] || '₹');

        // Load user data
        let userData = TokenManager.getUser(); // NEW - use TokenManager
        if (userData) {
          setUser(userData);
        }
        
        if (!userData) {
          try {
            userData = await makeAPICall('/auth/me');
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
          } catch (err) {
            console.error('Failed to load user data:', err);
          }
        }
        
        // Load budget data
        try {
          const currentMonth = new Date().toISOString().slice(0, 7);
          const budgetData = await makeAPICall(`/budgets?month=${currentMonth}`);
          
          if (budgetData && Array.isArray(budgetData) && budgetData.length > 0) {
            const currentBudget = budgetData.find(b => b.is_active) || budgetData[0];
            setUserBudget(currentBudget);
          } else if (budgetData && !Array.isArray(budgetData)) {
            setUserBudget(budgetData);
          }
        } catch (err) {
          console.error('Failed to load budget data:', err);
          setUserBudget(null);
        }
        
        // Load transactions
        try {
          const transactionsData = await makeAPICall('/transactions');
          let transactions = [];
          
          if (Array.isArray(transactionsData)) {
            transactions = transactionsData;
          } else if (transactionsData?.data && Array.isArray(transactionsData.data)) {
            transactions = transactionsData.data;
          } else if (transactionsData?.transactions && Array.isArray(transactionsData.transactions)) {
            transactions = transactionsData.transactions;
          }
          
          setAllTransactions(transactions);
          
          // Separate expenses and income
          const expenseTransactions = transactions.filter(transaction => {
            // Multiple ways to identify expenses
            if (transaction.type) {
              return transaction.type.toLowerCase() === 'expense';
            }
            if (transaction.hasOwnProperty('is_income')) {
              return !transaction.is_income;
            }
            if (transaction.transaction_type) {
              return transaction.transaction_type.toLowerCase() === 'expense';
            }
            // If amount is negative, consider it expense (some systems use negative for expenses)
            if (parseFloat(transaction.amount || 0) < 0) {
              return true;
            }
            // Default assumption - if no clear indicator, check if it has expense-like categories
            const expenseCategories = ['food', 'dining', 'transportation', 'entertainment', 'shopping', 'bills', 'utilities', 'healthcare', 'education'];
            if (transaction.category) {
              return expenseCategories.some(cat => transaction.category.toLowerCase().includes(cat));
            }
            return false; // If unclear, don't assume it's an expense
          });

          const incomeTransactions = transactions.filter(transaction => {
            // Multiple ways to identify income
            if (transaction.type) {
              return transaction.type.toLowerCase() === 'income';
            }
            if (transaction.hasOwnProperty('is_income')) {
              return transaction.is_income;
            }
            if (transaction.transaction_type) {
              return transaction.transaction_type.toLowerCase() === 'income';
            }
            // If amount is positive and not identified as expense, could be income
            const expenseCategories = ['food', 'dining', 'transportation', 'entertainment', 'shopping', 'bills', 'utilities', 'healthcare', 'education'];
            if (transaction.category && !expenseCategories.some(cat => transaction.category.toLowerCase().includes(cat))) {
              return parseFloat(transaction.amount || 0) > 0;
            }
            return false;
          });
          
          setExpenses(expenseTransactions);
          setIncome(incomeTransactions);
          
          if (transactions.length > 0) {
            // Calculate totals
            const totalSpent = expenseTransactions.reduce((sum, transaction) => {
              return sum + Math.abs(parseFloat(transaction.amount || 0));
            }, 0);

            const totalIncome = incomeTransactions.reduce((sum, transaction) => {
              return sum + Math.abs(parseFloat(transaction.amount || 0));
            }, 0);
            
            const categorySpending = expenseTransactions.reduce((acc, transaction) => {
              const category = transaction.category || 'Other';
              acc[category] = (acc[category] || 0) + Math.abs(parseFloat(transaction.amount || 0));
              return acc;
            }, {});

            setDashboardData({
              total_spent: totalSpent,
              total_income: totalIncome,
              net_balance: totalIncome - totalSpent,
              total_transactions: transactions.length,
              expense_transactions: expenseTransactions.length,
              income_transactions: incomeTransactions.length,
              category_spending: categorySpending
            });
            
            // Detect anomalies in expenses only
            if (expenseTransactions.length > 0) {
              const amounts = expenseTransactions.map(t => Math.abs(parseFloat(t.amount || 0)));
              const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
              const threshold = avgAmount * 2;
              
              const detectedAnomalies = expenseTransactions
                .filter(transaction => Math.abs(parseFloat(transaction.amount || 0)) > threshold)
                .map(transaction => ({
                  date: transaction.date || transaction.created_at || transaction.createdAt,
                  total_spent: Math.abs(parseFloat(transaction.amount || 0)),
                  transaction_count: 1,
                  anomaly_score: Math.abs(parseFloat(transaction.amount || 0)) > threshold * 1.5 ? 'High' : 'Medium',
                  title: transaction.title || transaction.description || 'Unnamed transaction'
                }));
              
              setAnomalies(detectedAnomalies);
            }
            
            // Generate recommendations
            const recommendations = [];
            const budgetAmount = userBudget?.amount || userBudget?.monthly_budget || 0;
            
            if (budgetAmount > 0) {
              const budgetUsed = (totalSpent / budgetAmount) * 100;
              
              if (budgetUsed > 80) {
                recommendations.push({
                  type: 'budget_alert',
                  message: `You've used ${budgetUsed.toFixed(1)}% of your budget. Consider reducing expenses.`,
                  priority: 'high'
                });
              } else if (budgetUsed > 60) {
                recommendations.push({
                  type: 'budget_warning',
                  message: `You've used ${budgetUsed.toFixed(1)}% of your budget. Monitor your spending closely.`,
                  priority: 'medium'
                });
              }
            }
            
            // Check for high category spending
            const highestCategory = Object.entries(categorySpending)
              .sort(([,a], [,b]) => b - a)[0];
            
            if (highestCategory && budgetAmount > 0) {
              const categoryPercentage = (highestCategory[1] / budgetAmount) * 100;
              if (categoryPercentage > 30) {
                recommendations.push({
                  type: 'high_spending_alert',
                  category: highestCategory[0],
                  message: `You've spent ${categoryPercentage.toFixed(1)}% of your budget on ${highestCategory[0]}. Consider reducing expenses in this category.`,
                  priority: 'high'
                });
              }
            }
            
            setRecommendations(recommendations);
            
          } else {
            setDashboardData({
              total_spent: 0,
              total_income: 0,
              net_balance: 0,
              total_transactions: 0,
              expense_transactions: 0,
              income_transactions: 0,
              category_spending: {}
            });
            setAnomalies([]);
            setRecommendations([]);
          }
        } catch (err) {
          console.error('Failed to load transactions:', err);
          setDashboardData({
            total_spent: 0,
            total_income: 0,
            net_balance: 0,
            total_transactions: 0,
            expense_transactions: 0,
            income_transactions: 0,
            category_spending: {}
          });
          setAnomalies([]);
          setRecommendations([]);
        }

        // Load forecast data
        try {
          const forecastData = await makeAPICall('/forecast');
          setForecast(forecastData);
        } catch (err) {
          console.error('Failed to load forecast:', err);
          setForecast(null);
        }

      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setError('Failed to load dashboard data. Please try refreshing the page.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const categoryColors = {
    'Food & Dining': '#FF6B6B',
    'Transportation': '#4ECDC4',
    'Entertainment': '#45B7D1',
    'Shopping': '#96CEB4',
    'Bills & Utilities': '#FECA57',
    'Education': '#A8E6CF',
    'Healthcare': '#FFB6C1',
    'Salary': '#90EE90',
    'Freelance': '#87CEEB',
    'Investment': '#DDA0DD',
    'Other': '#D3D3D3'
  };

  const formatCurrency = (amount, currency = userCurrency) => {
    const symbol = currencySymbols[currency] || '₹';
    return `${symbol}${parseFloat(amount || 0).toFixed(2)}`;
  };

  const Dashboard = () => {
    if (error) {
      return (
        <div className="error-container">
          <AlertTriangle className="error-icon" />
          <div className="error-text">{error}</div>
          <button onClick={() => window.location.reload()} className="retry-btn">
            Retry
          </button>
        </div>
      );
    }

    if (!dashboardData) {
      return (
        <div className="loading-container">
          <div className="loading-text">Loading dashboard data...</div>
        </div>
      );
    }

    const pieData = Object.entries(dashboardData.category_spending).map(([category, amount]) => ({
      name: category,
      value: amount,
      color: categoryColors[category] || '#8884d8'
    }));

    const forecastChartData = forecast?.forecast_dates?.map((date, index) => ({
      date: new Date(date).toLocaleDateString(),
      amount: forecast.forecast_values[index]
    })) || [];

    const budgetAmount = userBudget?.amount || userBudget?.monthly_budget || 0;

    return (
      <div className="dashboard-container">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">Total Spent</p>
                <p className="stat-value">{formatCurrency(dashboardData.total_spent)}</p>
              </div>
              <DollarSign className="stat-icon blue" />
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">Total Income</p>
                <p className="stat-value">{formatCurrency(dashboardData.total_income)}</p>
              </div>
              <TrendingUp className="stat-icon green" />
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">Net Balance</p>
                <p className={`stat-value ${dashboardData.net_balance >= 0 ? 'positive' : 'negative'}`}>
                  {formatCurrency(dashboardData.net_balance)}
                </p>
              </div>
              <CreditCard className="stat-icon purple" />
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-content">
              <div className="stat-info">
                <p className="stat-label">Budget Used</p>
                <p className="stat-value">
                  {budgetAmount > 0 
                    ? Math.round((dashboardData.total_spent / budgetAmount) * 100) 
                    : 0}%
                </p>
              </div>
              <AlertTriangle className="stat-icon orange" />
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="secondary-stats">
          <div className="secondary-stat">
            <span className="secondary-label">Expense Transactions:</span>
            <span className="secondary-value">{dashboardData.expense_transactions}</span>
          </div>
          <div className="secondary-stat">
            <span className="secondary-label">Income Transactions:</span>
            <span className="secondary-value">{dashboardData.income_transactions}</span>
          </div>
          <div className="secondary-stat">
            <span className="secondary-label">Total Transactions:</span>
            <span className="secondary-value">{dashboardData.total_transactions}</span>
          </div>
          <div className="secondary-stat">
            <span className="secondary-label">Anomalies:</span>
            <span className="secondary-value">{anomalies.length}</span>
          </div>
        </div>

        {/* Charts */}
        {pieData.length > 0 ? (
          <div className="charts-grid">
            <div className="chart-card">
              <h3 className="chart-title">Spending by Category</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {forecastChartData.length > 0 && (
              <div className="chart-card">
                <h3 className="chart-title">Expense Forecast</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={forecastChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state">
            <DollarSign className="empty-icon" />
            <h3>No transactions yet</h3>
            <p>Start adding expenses to see your dashboard analytics</p>
            <button 
              onClick={() => setActiveTab('expenses')} 
              className="add-first-expense-btn"
            >
              <Plus className="btn-icon" />
              Add Your First Expense
            </button>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="recommendations-card">
            <h3 className="recommendations-title">AI Recommendations</h3>
            <div className="recommendations-list">
              {recommendations.map((rec, index) => (
                <div key={index} className={`recommendation-item ${rec.priority}`}>
                  <p className="recommendation-text">{rec.message}</p>
                  {rec.category && <span className="recommendation-category">Category: {rec.category}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const ExpenseList = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    
    const displayTransactions = typeFilter === 'income' ? income : 
                               typeFilter === 'expense' ? expenses : 
                               [...expenses, ...income];
    
    const filteredTransactions = displayTransactions.filter(transaction => {
      const title = transaction.title || transaction.description || '';
      const matchesSearch = title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !categoryFilter || transaction.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    const categories = [...new Set(allTransactions.map(t => t.category).filter(Boolean))];

    return (
      <div className="expenses-container">
        <div className="expenses-header">
          <h2 className="expenses-title">Transactions</h2>
          <button className="add-expense-btn" onClick={() => {
            window.location.href = '/transactions';
          }}>
            <Plus className="btn-icon" />
            Add Transaction
          </button>
        </div>

        {/* Filters */}
        {allTransactions.length > 0 && (
          <div className="filters-card">
            <div className="filters-content">
              <div className="search-container">
                <Search className="search-icon" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="filter-container">
                <Filter className="filter-icon" />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Types</option>
                  <option value="expense">Expenses</option>
                  <option value="income">Income</option>
                </select>
              </div>
              <div className="filter-container">
                <Filter className="filter-icon" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Transaction List */}
        <div className="expense-list-card">
          {filteredTransactions.length === 0 ? (
            <div className="no-expenses">
              {allTransactions.length === 0 
                ? "No transactions found. Add your first transaction to get started!"
                : "No transactions found matching your criteria."
              }
            </div>
          ) : (
            <div className="expense-list">
              {filteredTransactions.map((transaction, index) => {
                const isExpense = expenses.includes(transaction);
                const isAnomaly = anomalies.some(a => 
                  a.date === transaction.date && 
                  a.total_spent === Math.abs(parseFloat(transaction.amount))
                );
                
                return (
                  <div key={transaction._id || transaction.id || index} className="expense-item">
                    <div className="expense-content">
                      <div className="expense-left">
                        <div className={`expense-indicator ${isAnomaly ? 'anomaly' : isExpense ? 'expense' : 'income'}`}></div>
                        <div className="expense-details">
                          <h3 className="expense-title">{transaction.title || transaction.description || 'Unnamed transaction'}</h3>
                          <div className="expense-meta">
                            <span>{transaction.category || 'Other'}</span>
                            <span className="meta-separator">•</span>
                            <span>{transaction.date ? new Date(transaction.date).toLocaleDateString() : new Date(transaction.created_at || transaction.createdAt).toLocaleDateString()}</span>
                            <span className="meta-separator">•</span>
                            <span className="payment-mode">{transaction.payment_mode || transaction.paymentMode || 'Unknown'}</span>
                            <span className="meta-separator">•</span>
                            <span className={`transaction-type ${isExpense ? 'expense-type' : 'income-type'}`}>
                              {isExpense ? 'Expense' : 'Income'}
                            </span>
                            {isAnomaly && (
                              <>
                                <span className="meta-separator">•</span>
                                <span className="anomaly-label">Anomaly</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className={`expense-amount ${isExpense ? 'expense-amount-red' : 'income-amount-green'}`}>
                        {isExpense ? '-' : '+'}{formatCurrency(Math.abs(transaction.amount))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const Analytics = () => {
    const categoryData = dashboardData ? Object.entries(dashboardData.category_spending).map(([name, amount]) => ({
      name,
      amount
    })) : [];

    if (categoryData.length === 0) {
      return (
        <div className="analytics-container">
          <h2 className="analytics-title">Analytics</h2>
          <div className="empty-state">
            <TrendingUp className="empty-icon" />
            <h3>No data to analyze</h3>
            <p>Add some transactions to see detailed analytics</p>
          </div>
        </div>
      );
    }

    return (
      <div className="analytics-container">
        <h2 className="analytics-title">Analytics</h2>

        {/* Category Spending Chart */}
        <div className="analytics-card">
          <h3 className="analytics-subtitle">Category Spending Analysis</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={categoryData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="amount" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Anomalies */}
        {anomalies.length > 0 && (
          <div className="anomalies-card">
            <h3 className="anomalies-title">
              <AlertTriangle className="anomalies-icon" />
              Spending Anomalies
            </h3>
            <div className="anomalies-list">
              {anomalies.map((anomaly, index) => (
                <div key={index} className="anomaly-item">
                  <div className="anomaly-content">
                    <div className="anomaly-details">
                      <p className="anomaly-title">Unusual spending detected</p>
                      <p className="anomaly-description">
                        {formatCurrency(anomaly.total_spent)} spent on {new Date(anomaly.date).toLocaleDateString()}
                        {anomaly.title && ` - ${anomaly.title}`}
                      </p>
                    </div>
                    <span className={`anomaly-badge ${anomaly.anomaly_score.toLowerCase()}`}>
                      {anomaly.anomaly_score} Risk
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Forecast */}
        {forecast && (
          <div className="forecast-card">
            <h3 className="forecast-title">Expense Forecast</h3>
            <div className="forecast-summary">
              <p className="forecast-text">
                Predicted spending for next {forecast.forecast_dates?.length || 0} days: 
                <span className="forecast-amount">{formatCurrency(forecast.total_forecast || 0)}</span>
              </p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={forecast.forecast_dates?.map((date, index) => ({
                date: new Date(date).toLocaleDateString(),
                amount: forecast.forecast_values[index]
              })) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Line type="monotone" dataKey="amount" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
    { id: 'expenses', label: 'Transactions', icon: DollarSign },
    { id: 'analytics', label: 'Analytics', icon: BarChart }
  ];

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app">
      {/* Header */}
      <header className="app-header">
        <div className="header-container">
          <div className="header-content">
            <div className="header-left">
              <h1 className="app-title">AI Expense Tracker</h1>
              {user && <p className="welcome-text">Welcome back, {user.username || user.name || 'User'}</p>}
            </div>
            <div className="header-right">
              {userBudget && (
                <div className="budget-info">
                  <p className="budget-label">Monthly Budget</p>
                  <p className="budget-amount">{formatCurrency(userBudget.amount || userBudget.monthly_budget)}</p>
                </div>
              )}
              <User className="user-icon" />
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="app-nav">
        <div className="nav-container">
          <div className="nav-tabs">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <Icon className="nav-icon" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="app-main">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'expenses' && <ExpenseList />}
        {activeTab === 'analytics' && <Analytics />}
      </main>
    </div>
  );
};

export default ExpenseTracker;