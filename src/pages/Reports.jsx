import React, { useEffect, useState, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CSVLink } from 'react-csv';
import './Reports.css';
import CurrencyManager from '../utils/currencyManager';

const Reports = () => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [userCurrency, setUserCurrency] = useState('INR');
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  // Filter states
  const [filters, setFilters] = useState({
    month: '',
    category: '',
    type: '',
    startDate: '',
    endDate: '',
    searchTerm: ''
  });

  // Enhanced fetch with multiple fallback attempts
  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
       const { currency, symbol } = await CurrencyManager.fetchFromDB();
    setUserCurrency(currency);
    setCurrencySymbol(symbol);
    console.log('💰 Reports.jsx currency loaded:', currency, symbol);
    
    console.log('🔍 Starting transaction fetch...');
      console.log('🔍 Starting transaction fetch...');
      
      // Get auth token
      const token = localStorage.getItem('token') || 
                    localStorage.getItem('authToken') || 
                    sessionStorage.getItem('token') || 
                    sessionStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
      const url = `${API_BASE_URL}/transactions`;
      
      console.log('📡 Fetching from:', url);
      console.log('🔑 Auth token length:', token.length);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      console.log('📊 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error:', errorText);
        throw new Error(`Failed to fetch transactions: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('📦 Raw API Response:', data);
      
      // Try multiple possible data structures
      let transactionArray = [];
      
      if (Array.isArray(data)) {
        transactionArray = data;
      } else if (data.transactions && Array.isArray(data.transactions)) {
        transactionArray = data.transactions;
      } else if (data.data && Array.isArray(data.data)) {
        transactionArray = data.data;
      } else if (data.data && data.data.transactions && Array.isArray(data.data.transactions)) {
        transactionArray = data.data.transactions;
      }
      
      console.log('🔢 Transaction array length:', transactionArray.length);
      console.log('📋 First transaction:', transactionArray[0]);
      
      // Store debug info
      setDebugInfo({
        apiUrl: url,
        responseStatus: response.status,
        dataStructure: Object.keys(data),
        transactionCount: transactionArray.length,
        hasToken: !!token,
        tokenPreview: token.substring(0, 20) + '...'
      });

      // Process transactions
      const processedTransactions = transactionArray.map((tx, index) => ({
        _id: tx._id || tx.id || `temp-${index}`,
        title: tx.title || tx.description || 'Untitled',
        amount: Number(tx.amount) || 0,
        category: tx.category || 'Uncategorized',
        type: tx.type || 'expense',
        date: tx.date || tx.createdAt || new Date().toISOString(),
        createdAt: tx.createdAt || tx.date || new Date().toISOString(),
        paymentMode: tx.paymentMode || 'N/A',
        description: tx.description || tx.title || ''
      }));

      console.log('✅ Processed transactions:', processedTransactions.length);
      
      setTransactions(processedTransactions);
      setFilteredTransactions(processedTransactions);
      
    } catch (err) {
      console.error('❌ Error loading transactions:', err);
      setError(err.message || 'Failed to load transactions');
      setTransactions([]);
      setFilteredTransactions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Apply filters
  useEffect(() => {
    applyFilters();
  }, [filters, transactions]);

  const applyFilters = useCallback(() => {
    if (!Array.isArray(transactions)) {
      setFilteredTransactions([]);
      return;
    }

    let filtered = [...transactions];

    if (filters.month) {
      filtered = filtered.filter((tx) => {
        if (!tx.createdAt && !tx.date) return false;
        const txDate = new Date(tx.createdAt || tx.date);
        const txMonth = `${txDate.getFullYear()}-${String(txDate.getMonth() + 1).padStart(2, '0')}`;
        return txMonth === filters.month;
      });
    }

    if (filters.startDate && filters.endDate) {
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter((tx) => {
        if (!tx.createdAt && !tx.date) return false;
        const txDate = new Date(tx.createdAt || tx.date);
        return txDate >= startDate && txDate <= endDate;
      });
    }

    if (filters.category) {
      filtered = filtered.filter((tx) => 
        tx.category && tx.category.toLowerCase().includes(filters.category.toLowerCase())
      );
    }

    if (filters.type) {
      filtered = filtered.filter((tx) => tx.type === filters.type);
    }

    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter((tx) => 
        (tx.title && tx.title.toLowerCase().includes(searchLower)) ||
        (tx.description && tx.description.toLowerCase().includes(searchLower)) ||
        (tx.category && tx.category.toLowerCase().includes(searchLower))
      );
    }

    console.log(`🔍 Applied filters: ${filtered.length}/${transactions.length} transactions`);
    setFilteredTransactions(filtered);
  }, [filters, transactions]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const clearAllFilters = () => {
    setFilters({
      month: '',
      category: '',
      type: '',
      startDate: '',
      endDate: '',
      searchTerm: ''
    });
  };

  // Export to PDF
  const exportToPDF = () => {
    if (filteredTransactions.length === 0) {
      alert('No transactions to export');
      return;
    }

    try {
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text('Transaction Report', 14, 20);
      
      doc.setFontSize(12);
      let subtitle = 'All Transactions';
      if (filters.month) {
        subtitle = `Month: ${filters.month}`;
      } else if (filters.startDate && filters.endDate) {
        subtitle = `Period: ${filters.startDate} to ${filters.endDate}`;
      }
      doc.text(subtitle, 14, 30);
      
      const totalIncome = filteredTransactions
        .filter(tx => tx.type === 'income')
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      
      const totalExpenses = filteredTransactions
        .filter(tx => tx.type === 'expense')
        .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      
      const netAmount = totalIncome - totalExpenses;
      
      doc.text(`Total Income: ₹${totalIncome.toFixed(2)}`, 14, 40);
      doc.text(`Total Expenses: ₹${totalExpenses.toFixed(2)}`, 14, 47);
      doc.text(`Net Amount: ₹${netAmount.toFixed(2)}`, 14, 54);
      doc.text(`Total Transactions: ${filteredTransactions.length}`, 14, 61);

      const tableData = filteredTransactions.map(tx => [
        new Date(tx.createdAt || tx.date).toLocaleDateString('en-IN'),
        tx.title || 'No Title',
        `₹${Math.abs(tx.amount).toFixed(2)}`,
        tx.category || 'N/A',
        tx.type || 'N/A',
        tx.paymentMode || 'N/A'
      ]);

      autoTable(doc, {
        startY: 70,
        head: [['Date', 'Title', 'Amount', 'Category', 'Type', 'Payment Mode']],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });

      const timestamp = new Date().toISOString().split('T')[0];
      let filename = `transactions-report-${timestamp}`;
      if (filters.month) {
        filename += `-${filters.month}`;
      }
      filename += '.pdf';

      doc.save(filename);
      console.log('📄 PDF exported successfully:', filename);
      alert(`PDF exported successfully: ${filename}`);
      
    } catch (err) {
      console.error('❌ Error exporting PDF:', err);
      alert('Error generating PDF. Please try again.');
    }
  };

  // Prepare CSV data
  const prepareCSVData = () => {
    return filteredTransactions.map(tx => ({
      Date: new Date(tx.createdAt || tx.date).toLocaleDateString('en-IN'),
      Title: tx.title || '',
      Amount: Math.abs(tx.amount).toFixed(2),
      Category: tx.category || '',
      Type: tx.type || '',
      PaymentMode: tx.paymentMode || '',
      Description: tx.description || ''
    }));
  };

  const csvHeaders = [
    { label: 'Date', key: 'Date' },
    { label: 'Title', key: 'Title' },
    { label: 'Amount (₹)', key: 'Amount' },
    { label: 'Category', key: 'Category' },
    { label: 'Type', key: 'Type' },
    { label: 'Payment Mode', key: 'PaymentMode' },
    { label: 'Description', key: 'Description' }
  ];

  const getUniqueCategories = () => {
    return [...new Set(transactions.map(tx => tx.category).filter(Boolean))].sort();
  };

  const getUniqueTypes = () => {
    return [...new Set(transactions.map(tx => tx.type).filter(Boolean))].sort();
  };

  const calculateSummary = () => {
    const totalIncome = filteredTransactions
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    
    const totalExpenses = filteredTransactions
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
    
    return {
      totalIncome,
      totalExpenses,
      netAmount: totalIncome - totalExpenses,
      transactionCount: filteredTransactions.length
    };
  };

  const summary = calculateSummary();

  if (loading) {
    return (
      <div className="reports-container">
        <div className="reports-inner-wrapper">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p>Loading transactions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reports-container">
        <div className="reports-inner-wrapper">
          <div className="error-state">
            <h3>Error Loading Reports</h3>
            <p>{error}</p>
            <button onClick={loadTransactions} className="retry-btn">
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reports-container">
      <div className="reports-inner-wrapper">
        
        {/* Header */}
        <div className="reports-header">
          <h2>📊 Transaction Reports</h2>
          <button 
            onClick={loadTransactions} 
            className="refresh-btn"
            disabled={loading}
          >
            🔄 Refresh Data
          </button>
        </div>

        {/* Debug Info */}
        {transactions.length === 0 && debugInfo && (
          <div className="debug-info">
            <h3>🔧 Debug Information</h3>
            <div className="debug-info-grid">
              <p><strong>API URL:</strong> {debugInfo.apiUrl}</p>
              <p><strong>Response Status:</strong> {debugInfo.responseStatus}</p>
              <p><strong>Transaction Count:</strong> {debugInfo.transactionCount}</p>
              <p><strong>Has Auth Token:</strong> {debugInfo.hasToken ? 'Yes' : 'No'}</p>
              <p><strong>Data Structure:</strong> {debugInfo.dataStructure.join(', ')}</p>
            </div>
            <div className="debug-note">
              ℹ️ The API is responding but returning 0 transactions. 
              Please check if you have created any transactions in your database.
            </div>
          </div>
        )}

        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card income">
            <h4>Total Income</h4>
            <p>₹{summary.totalIncome.toFixed(2)}</p>
          </div>
          <div className="summary-card expense">
            <h4>Total Expenses</h4>
            <p>₹{summary.totalExpenses.toFixed(2)}</p>
          </div>
          <div className="summary-card net">
            <h4>Net Amount</h4>
            <p className={summary.netAmount >= 0 ? 'positive' : 'negative'}>
              ₹{summary.netAmount.toFixed(2)}
            </p>
          </div>
          <div className="summary-card count">
            <h4>Transactions</h4>
            <p>{summary.transactionCount}</p>
          </div>
        </div>

        {/* Filter Section */}
        <div className="filter-section">
          <h3>Filters</h3>
          <div className="filters-grid">
            <div className="filter-group">
              <label>Search:</label>
              <input
                type="text"
                placeholder="Search transactions..."
                value={filters.searchTerm}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
              />
            </div>
            
            <div className="filter-group">
              <label>Month:</label>
              <input
                type="month"
                value={filters.month}
                onChange={(e) => handleFilterChange('month', e.target.value)}
              />
            </div>
            
            <div className="filter-group">
              <label>Start Date:</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            
            <div className="filter-group">
              <label>End Date:</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            
            <div className="filter-group">
              <label>Category:</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
              >
                <option value="">All Categories</option>
                {getUniqueCategories().map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div className="filter-group">
              <label>Type:</label>
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <option value="">All Types</option>
                {getUniqueTypes().map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="filter-actions">
            <button onClick={clearAllFilters} className="clear-filters-btn">
              Clear All Filters
            </button>
          </div>
        </div>

        {/* Export Section */}
        <div className="export-section">
          <h3>Export Options</h3>
          <div className="export-controls">
            <button 
              onClick={exportToPDF} 
              className="export-btn pdf-btn"
              disabled={filteredTransactions.length === 0}
            >
              📄 Export PDF
            </button>
            
            <CSVLink
              data={prepareCSVData()}
              headers={csvHeaders}
              filename={`transactions-${new Date().toISOString().split('T')[0]}.csv`}
              className={`export-btn csv-btn ${filteredTransactions.length === 0 ? 'disabled' : ''}`}
              onClick={() => {
                if (filteredTransactions.length === 0) {
                  alert('No transactions to export');
                  return false;
                }
                console.log('📊 CSV export initiated');
                alert('CSV export started!');
              }}
            >
              📊 Export CSV
            </CSVLink>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="table-section">
          <h3>Transaction Details ({filteredTransactions.length} records)</h3>
          
          {filteredTransactions.length === 0 ? (
            <div className="no-data">
              <p>
                {transactions.length === 0 
                  ? 'No transactions found. Start by adding your first transaction!' 
                  : 'No transactions match the current filters.'}
              </p>
              {Object.values(filters).some(f => f) && (
                <button onClick={clearAllFilters} className="clear-filters-btn">
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="reports-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Title</th>
                    <th>Amount (₹)</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Payment Mode</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => (
                    <tr key={tx._id} className={`transaction-row ${tx.type}`}>
                      <td>
                        {new Date(tx.createdAt || tx.date).toLocaleDateString('en-IN')}
                      </td>
                      <td>{tx.title || 'No Title'}</td>
                      <td className={`amount ${tx.type}`}>
                        {tx.type === 'income' ? '+' : '-'}₹{Math.abs(tx.amount).toFixed(2)}
                      </td>
                      <td>{tx.category || 'N/A'}</td>
                      <td>
                        <span className={`type-badge ${tx.type}`}>
                          {tx.type || 'N/A'}
                        </span>
                      </td>
                      <td>{tx.paymentMode || 'N/A'}</td>
                      <td>{tx.description || tx.title || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;