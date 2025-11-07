import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, AreaChart, Area, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
import CurrencyManager from '../utils/currencyManager';
import './Analytics.css';

// Configuration Constants
const CONFIG = {
  API_BASE_URL: 'http://localhost:4000/api',
  CHART_COLORS: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'],
  REFRESH_INTERVAL: 300000, // 5 minutes auto-refresh
};

// API Service Layer - Centralized API calls
class AnalyticsAPI {
  static getAuthHeaders() {
    const token = localStorage.getItem('token') || 
                  localStorage.getItem('authToken') || 
                  sessionStorage.getItem('token') || 
                  sessionStorage.getItem('authToken');

    if (!token) {
      throw new Error('Authentication required. Please log in.');
    }

    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  static async fetchTransactions() {
    const response = await fetch(`${CONFIG.API_BASE_URL}/transactions`, {
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      if (response.status === 401) throw new Error('Session expired. Please log in again.');
      throw new Error(`Failed to fetch transactions: ${response.status}`);
    }
    
    const data = await response.json();
    return data.transactions || [];
  }

  static async fetchBudgets(month) {
    const response = await fetch(`${CONFIG.API_BASE_URL}/budgets?month=${month}`, {
      headers: this.getAuthHeaders(),
    });
    
    if (!response.ok) {
      if (response.status === 401) throw new Error('Session expired. Please log in again.');
      throw new Error(`Failed to fetch budgets: ${response.status}`);
    }
    
    const data = await response.json();
    return data.budgets || data || [];
  }
}

// Data Processing Utilities
class DataProcessor {
  static validateTransaction(tx) {
    return tx.amount != null && 
           !isNaN(tx.amount) && 
           (tx.type === 'income' || tx.type === 'expense') &&
           (tx.date || tx.createdAt);
  }

  static getMonthKey(date) {
    if (!date) return null;
    return date.slice(0, 7);
  }

  static calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = values.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope;
  }

  static formatCurrency(amount, symbol = '₹') {
    if (amount === null || amount === undefined) return `${symbol}0`;
    return `${symbol}${Math.abs(amount).toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })}`;
  }

  static formatPercentage(value) {
    return `${Math.abs(value).toFixed(1)}%`;
  }

  static formatMonth(monthStr) {
    const date = new Date(monthStr + '-01');
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  }
}

// Analytics Engine - Core business logic
class AnalyticsEngine {
  constructor(transactions, budgets) {
    this.transactions = transactions;
    this.budgets = budgets;
    this.currentMonth = new Date().toISOString().slice(0, 7);
  }

  getCategoryMetrics(category, month = this.currentMonth) {
    const categoryTxs = this.transactions.filter(tx => 
      tx.category === category &&
      tx.type === 'expense' &&
      DataProcessor.getMonthKey(tx.date || tx.createdAt) === month
    );

    const totalSpent = categoryTxs.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const transactionCount = categoryTxs.length;
    const avgTransaction = transactionCount > 0 ? totalSpent / transactionCount : 0;

    return { totalSpent, transactionCount, avgTransaction, transactions: categoryTxs };
  }

  getCategoryTrends() {
    const trends = {};
    
    this.transactions.forEach(tx => {
      if (tx.type !== 'expense' || !tx.category || !tx.amount) return;
      
      const month = DataProcessor.getMonthKey(tx.date || tx.createdAt);
      if (!month) return;
      
      if (!trends[tx.category]) trends[tx.category] = {};
      if (!trends[tx.category][month]) trends[tx.category][month] = { amount: 0, count: 0 };
      
      trends[tx.category][month].amount += tx.amount;
      trends[tx.category][month].count += 1;
    });

    return trends;
  }

  predictSpending(category) {
    const categoryData = this.getCategoryTrends()[category];
    if (!categoryData) return null;

    const months = Object.keys(categoryData).sort();
    if (months.length < 2) return null;

    const recentMonths = months.slice(-6);
    const amounts = recentMonths.map(m => categoryData[m].amount);
    
    // Weighted moving average with trend adjustment
    let totalWeight = 0;
    let weightedSum = 0;
    
    amounts.forEach((amount, index) => {
      const weight = index + 1;
      weightedSum += amount * weight;
      totalWeight += weight;
    });

    const weightedAverage = weightedSum / totalWeight;
    const trend = DataProcessor.calculateTrend(amounts);
    
    return Math.max(0, Math.round(weightedAverage + (trend * amounts.length * 0.3)));
  }

  getBudgetStatus(category, spent) {
    const budget = this.budgets.find(b => b.category === category);
    if (!budget) return { status: 'no-budget', utilization: 0, remaining: 0, budget: 0 };

    const utilization = (spent / budget.monthlyLimit) * 100;
    const remaining = budget.monthlyLimit - spent;

    let status = 'safe';
    if (utilization >= 100) status = 'exceeded';
    else if (utilization >= 85) status = 'danger';
    else if (utilization >= 70) status = 'warning';
    else if (utilization >= 50) status = 'caution';

    return { status, utilization, remaining, budget: budget.monthlyLimit };
  }

  getMonthOverMonthChange(category) {
    const currentDate = new Date();
    const currentMonth = currentDate.toISOString().slice(0, 7);
    
    const previousDate = new Date(currentDate);
    previousDate.setMonth(previousDate.getMonth() - 1);
    const previousMonth = previousDate.toISOString().slice(0, 7);

    const currentSpent = this.getCategoryMetrics(category, currentMonth).totalSpent;
    const previousSpent = this.getCategoryMetrics(category, previousMonth).totalSpent;
    
    if (previousSpent === 0) return currentSpent > 0 ? 100 : 0;
    
    return ((currentSpent - previousSpent) / previousSpent) * 100;
  }

  getMonthlyTrendData() {
    const monthlyData = {};
    
    this.transactions.forEach(tx => {
      if (tx.type !== 'expense') return;
      const month = DataProcessor.getMonthKey(tx.date || tx.createdAt);
      if (!month) return;
      
      if (!monthlyData[month]) {
        monthlyData[month] = { month, total: 0, count: 0 };
      }
      
      monthlyData[month].total += tx.amount || 0;
      monthlyData[month].count += 1;
    });
    
    return Object.values(monthlyData)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-12)
      .map(item => ({
        ...item,
        monthLabel: DataProcessor.formatMonth(item.month)
      }));
  }

  getTopCategories(limit = 8) {
    const categories = {};
    
    this.transactions.forEach(tx => {
      if (tx.type !== 'expense' || !tx.category) return;
      if (!categories[tx.category]) categories[tx.category] = 0;
      categories[tx.category] += tx.amount || 0;
    });

    return Object.entries(categories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([category, spent]) => ({ category, spent }));
  }

  getSummaryMetrics() {
    const expenses = this.transactions.filter(tx => tx.type === 'expense');
    const totalExpenses = expenses.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    
    const categories = new Set(expenses.map(tx => tx.category).filter(Boolean));
    
    const budgetsWithSpending = this.budgets.filter(b => {
      const spent = this.getCategoryMetrics(b.category).totalSpent;
      return spent > 0;
    });

    const avgUtilization = budgetsWithSpending.length > 0
      ? budgetsWithSpending.reduce((sum, b) => {
          const spent = this.getCategoryMetrics(b.category).totalSpent;
          return sum + (spent / b.monthlyLimit) * 100;
        }, 0) / budgetsWithSpending.length
      : 0;

    return {
      totalExpenses,
      transactionCount: expenses.length,
      categoryCount: categories.size,
      avgUtilization: Math.round(avgUtilization),
      activeBudgets: budgetsWithSpending.length
    };
  }
}

// Main Analytics Component
const Analytics = () => {
  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('current');
  const [userCurrency, setUserCurrency] = useState('INR');
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  const engine = useMemo(() => 
    new AnalyticsEngine(transactions, budgets),
    [transactions, budgets]
  );

  const loadData = useCallback(async (showRefreshIndicator = false) => {
  const { currency, symbol } = await CurrencyManager.fetchFromDB();
  setUserCurrency(currency);
  setCurrencySymbol(symbol);
  console.log('💰 Analytics.jsx currency loaded:', currency, symbol);
    if (showRefreshIndicator) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    setError(null);

    try {
      const [transactionData, budgetData] = await Promise.all([
        AnalyticsAPI.fetchTransactions(),
        AnalyticsAPI.fetchBudgets(new Date().toISOString().slice(0, 7))
      ]);

      const validTransactions = (transactionData || []).filter(DataProcessor.validateTransaction);

      setTransactions(validTransactions);
      setBudgets(Array.isArray(budgetData) ? budgetData : []);
      setLastFetchTime(new Date());

    } catch (err) {
      console.error('Analytics Error:', err);
      setError(err.message || 'Failed to load analytics data. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    
    const interval = setInterval(() => loadData(true), CONFIG.REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [loadData]);

  const summaryMetrics = useMemo(() => engine.getSummaryMetrics(), [engine]);
  const monthlyTrend = useMemo(() => engine.getMonthlyTrendData(), [engine]);
  const topCategories = useMemo(() => engine.getTopCategories(), [engine]);
  const categoryTrends = useMemo(() => engine.getCategoryTrends(), [engine]);
  const allCategories = useMemo(() => Object.keys(categoryTrends).sort(), [categoryTrends]);

  const pieChartData = useMemo(() => {
    return topCategories.map(item => ({
      name: item.category,
      value: item.spent
    }));
  }, [topCategories]);

  if (loading) {
    return (
      <div className="analytics-container">
        <div className="analytics-loading">
          <div className="loading-spinner"></div>
          <h3>Loading Analytics</h3>
          <p>Analyzing your financial data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-container">
        <div className="analytics-error">
          <div className="error-icon">⚠️</div>
          <h3>Unable to Load Analytics</h3>
          <p>{error}</p>
          <button className="retry-button" onClick={() => loadData()}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (allCategories.length === 0) {
    return (
      <div className="analytics-container">
        <div className="analytics-empty">
          <div className="empty-icon">📊</div>
          <h3>No Data Available</h3>
          <p>Start adding transactions to unlock powerful analytics and insights.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-container">
      {/* Enhanced Header */}
      <header className="analytics-header">
        <div className="header-content">
          <h1 className="analytics-title">Financial Analytics Dashboard</h1>
          <p className="analytics-subtitle">
            AI-powered insights and predictive analytics for smarter financial decisions
          </p>
          {lastFetchTime && (
            <p className="last-updated">
              Last updated: {lastFetchTime.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="header-actions">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className={`refresh-button ${refreshing ? 'refreshing' : ''}`}
          >
            <span className="refresh-icon">🔄</span>
            {refreshing ? 'Updating...' : 'Refresh Data'}
          </button>
        </div>
      </header>

      {/* Enhanced Summary Cards with Icons */}
      <div className="summary-cards">
        <div className="summary-card total-expenses">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <h3>Total Expenses</h3>
            <div className="card-value">
                {DataProcessor.formatCurrency(summaryMetrics.totalExpenses, currencySymbol)}
            </div>
            <div className="card-subtitle">
              {summaryMetrics.transactionCount} transactions • All time
            </div>
          </div>
        </div>

        <div className="summary-card active-categories">
          <div className="card-icon">📋</div>
          <div className="card-content">
            <h3>Active Categories</h3>
            <div className="card-value">{summaryMetrics.categoryCount}</div>
            <div className="card-subtitle">With spending activity</div>
          </div>
        </div>

        <div className="summary-card budget-utilization">
          <div className="card-icon">🎯</div>
          <div className="card-content">
            <h3>Budget Utilization</h3>
            <div className="card-value">{summaryMetrics.avgUtilization}%</div>
            <div className="card-subtitle">
              Across {summaryMetrics.activeBudgets} active budgets
            </div>
          </div>
        </div>

        <div className="summary-card tracking-period">
          <div className="card-icon">📅</div>
          <div className="card-content">
            <h3>Data Coverage</h3>
            <div className="card-value">{monthlyTrend.length}</div>
            <div className="card-subtitle">Months of data analyzed</div>
          </div>
        </div>
      </div>

      {/* Enhanced Charts Section */}
      <div className="charts-section">
        {/* Monthly Spending Trend */}
        <div className="chart-card full-width">
          <h2 className="chart-title">📈 Monthly Spending Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis 
                dataKey="monthLabel" 
                stroke="#666" 
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="#666"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value) => DataProcessor.formatCurrency(value)}
                contentStyle={{ 
                  background: '#fff', 
                  border: '1px solid #ddd', 
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="total" 
                stroke="#667eea" 
                fill="#667eea" 
                fillOpacity={0.3} 
                name="Total Expenses" 
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Spending Bar Chart */}
        <div className="chart-card">
          <h2 className="chart-title">📊 Spending by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topCategories}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis 
                dataKey="category" 
                stroke="#666" 
                angle={-45} 
                textAnchor="end" 
                height={100}
                style={{ fontSize: '11px' }}
              />
              <YAxis 
                stroke="#666"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value) => DataProcessor.formatCurrency(value)}
                contentStyle={{ 
                  background: '#fff', 
                  border: '1px solid #ddd', 
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
              <Legend />
              <Bar dataKey="spent" fill="#FF6B6B" name="Amount Spent" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Category Distribution Pie Chart */}
        <div className="chart-card">
          <h2 className="chart-title">🥧 Category Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={CONFIG.CHART_COLORS[index % CONFIG.CHART_COLORS.length]} 
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value) => DataProcessor.formatCurrency(value)}
                contentStyle={{ 
                  background: '#fff', 
                  border: '1px solid #ddd', 
                  borderRadius: '8px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Enhanced Analytics Table */}
      <div className="analytics-table-container">
        <div className="table-header">
          <h2>📋 Detailed Category Analysis</h2>
          <div className="table-filters">
            <select 
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="timeframe-select"
            >
              <option value="current">Current Month</option>
              <option value="previous">Previous Month</option>
            </select>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="analytics-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Spent</th>
                <th>Budget</th>
                <th>Status</th>
                <th>Transactions</th>
                <th>Avg/Transaction</th>
                <th>MoM Change</th>
                <th>Predicted Next Month</th>
              </tr>
            </thead>
            <tbody>
              {allCategories.map(category => {
                const metrics = engine.getCategoryMetrics(category, selectedTimeframe === 'current' ? engine.currentMonth : (() => {
                  const date = new Date();
                  date.setMonth(date.getMonth() - 1);
                  return date.toISOString().slice(0, 7);
                })());
                const budgetStatus = engine.getBudgetStatus(category, metrics.totalSpent);
                const momChange = engine.getMonthOverMonthChange(category);
                const prediction = engine.predictSpending(category);

                return (
                  <tr key={category} className={`table-row ${budgetStatus.status}`}>
                    <td className="category-cell">
                      <span className="category-name">{category}</span>
                    </td>
                    
                    <td className="amount-cell">
                      <div className="amount-info">
                        <span className="amount">
                          {DataProcessor.formatCurrency(metrics.totalSpent)}
                        </span>
                        {budgetStatus.status !== 'no-budget' && (
                          <span className="utilization">
                            {Math.round(budgetStatus.utilization)}% utilized
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="budget-cell">
                      {budgetStatus.status !== 'no-budget' ? (
                        <div className="budget-info">
                          <span className="budget-amount">
                            {DataProcessor.formatCurrency(budgetStatus.budget)}
                          </span>
                          <span className="remaining">
                            {budgetStatus.remaining >= 0 
                              ? `${DataProcessor.formatCurrency(budgetStatus.remaining)} remaining`
                              : `${DataProcessor.formatCurrency(Math.abs(budgetStatus.remaining))} over budget`
                            }
                          </span>
                        </div>
                      ) : (
                        <span className="no-budget">No budget set</span>
                      )}
                    </td>

                    <td className={`status-cell ${budgetStatus.status}`}>
                      <div className="status-badge">
                        {budgetStatus.status === 'safe' && '✅ On Track'}
                        {budgetStatus.status === 'caution' && '⚠️ Moderate'}
                        {budgetStatus.status === 'warning' && '🟡 Warning'}
                        {budgetStatus.status === 'danger' && '🟠 Alert'}
                        {budgetStatus.status === 'exceeded' && '🔴 Exceeded'}
                        {budgetStatus.status === 'no-budget' && '➖ No Budget'}
                      </div>
                    </td>

                    <td className="transactions-cell">
                      <div className="transaction-info">
                        <span className="count">{metrics.transactionCount}</span>
                        <span className="label">transactions</span>
                      </div>
                    </td>

                    <td className="avg-cell">
                      {DataProcessor.formatCurrency(metrics.avgTransaction)}
                    </td>

                    <td className="change-cell">
                      {momChange !== null && momChange !== 0 ? (
                        <div className={`change-indicator ${momChange >= 0 ? 'increase' : 'decrease'}`}>
                          <span className="change-arrow">
                            {momChange >= 0 ? '↗️' : '↘️'}
                          </span>
                          <span className="change-value">
                            {DataProcessor.formatPercentage(momChange)}
                          </span>
                        </div>
                      ) : (
                        <span className="no-data">No change</span>
                      )}
                    </td>

                    <td className="prediction-cell">
                      {prediction !== null ? (
                        <div className="prediction-info">
                          <span className="predicted-amount">
                            {DataProcessor.formatCurrency(prediction)}
                          </span>
                          <span className="prediction-label">AI predicted</span>
                        </div>
                      ) : (
                        <span className="insufficient-data">Insufficient data</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Analytics;