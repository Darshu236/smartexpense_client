// DebtManager.jsx - FIXED to use correct friend user ID

import React, { useState, useEffect } from 'react';
import enhancedDebtApiService from '../api/DebtApiService';
import { fetchFriends } from '../api/friendsApi';
import CurrencyManager from '../utils/currencyManager';
import './DebtManager.css';

const DebtManager = () => {
  const [activeTab, setActiveTab] = useState('owed-to-me');
  const [debtsOwedToMe, setDebtsOwedToMe] = useState([]);
  const [debtsOwedByMe, setDebtsOwedByMe] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [userCurrency, setUserCurrency] = useState('INR');
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  const [summary, setSummary] = useState({
    totalOwedToMe: 0,
    totalOwedByMe: 0,
    netBalance: 0,
    splitExpenseDebts: 0,
    manualDebts: 0
  });

  const [formData, setFormData] = useState({
    friendId: '',
    amount: '',
    description: '',
    type: 'owe-me',
    dueDate: ''
  });

  useEffect(() => {
     const loadCurrency = async () => {
    const { currency, symbol } = await CurrencyManager.fetchFromDB();
    setUserCurrency(currency);
    setCurrencySymbol(symbol);
    console.log('💰 DebtManager.jsx currency loaded:', currency, symbol);
  };
  loadCurrency();
    loadAllData();
  }, []);

  useEffect(() => {
    calculateSummary();
  }, [debtsOwedToMe, debtsOwedByMe]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading all debt data...');
      
      const [owedToMeRes, owedByMeRes, friendsRes] = await Promise.all([
        enhancedDebtApiService.fetchDebtsOwedToMe(),
        enhancedDebtApiService.fetchDebtsOwedByMe(),
        fetchFriends()
      ]);

      if (owedToMeRes.success) {
        console.log('✅ Debts owed to me:', owedToMeRes.debts.length);
        setDebtsOwedToMe((owedToMeRes.debts || []).filter(d => d.status === 'pending'));
      } else {
        console.error('❌ Failed to load debts owed to me:', owedToMeRes.message);
        showNotification('Failed to load debts owed to you', 'error');
      }

      if (owedByMeRes.success) {
        console.log('✅ Debts owed by me:', owedByMeRes.debts.length);
        setDebtsOwedByMe((owedByMeRes.debts || []).filter(d => d.status === 'pending'));
      } else {
        console.error('❌ Failed to load debts owed by me:', owedByMeRes.message);
        showNotification('Failed to load debts you owe', 'error');
      }

      if (friendsRes.success) {
        console.log('✅ Friends loaded:', friendsRes.friends.length);
        
        // FIXED: Log friend structure to debug
        console.log('🔍 Friend data structure:', friendsRes.friends);
        
        setFriends(friendsRes.friends || []);
      }

    } catch (error) {
      console.error('❌ Error loading debt data:', error);
      showNotification('Failed to load debt data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = () => {
    const owedToMeTotal = debtsOwedToMe
      .filter(d => d.status === 'pending')
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    const owedByMeTotal = debtsOwedByMe
      .filter(d => d.status === 'pending')
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    const splitExpenseCount = [
      ...debtsOwedToMe.filter(d => d.type === 'split'),
      ...debtsOwedByMe.filter(d => d.type === 'split')
    ].length;

    const manualDebtCount = [
      ...debtsOwedToMe.filter(d => d.type === 'manual'),
      ...debtsOwedByMe.filter(d => d.type === 'manual')
    ].length;

    setSummary({
      totalOwedToMe: owedToMeTotal,
      totalOwedByMe: owedByMeTotal,
      netBalance: owedToMeTotal - owedByMeTotal,
      splitExpenseDebts: splitExpenseCount,
      manualDebts: manualDebtCount
    });
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: '' });
    }, 5000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateDebt = async (e) => {
    e.preventDefault();
    
    if (!formData.friendId || !formData.amount || !formData.description) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    setActionLoading({ create: true });

    try {
      console.log('📝 Creating debt with friendId:', formData.friendId);
      
      const result = await enhancedDebtApiService.createManualDebt(formData);

      if (result.success) {
        showNotification('Debt created successfully!', 'success');
        setFormData({
          friendId: '',
          amount: '',
          description: '',
          type: 'owe-me',
          dueDate: ''
        });
        setShowCreateForm(false);
        await loadAllData();
      } else {
        showNotification(result.message || 'Failed to create debt', 'error');
      }
    } catch (error) {
      console.error('Error creating debt:', error);
      showNotification('Failed to create debt', 'error');
    } finally {
      setActionLoading({ create: false });
    }
  };

const handleMarkAsPaid = async (debtId) => {
  // Optional: Ask for payment method
  const paymentMethods = ['cash', 'bank_transfer', 'upi', 'credit_card', 'other'];
  const selectedMethod = prompt(
    'Payment method (optional):\n' +
    '1. Cash\n' +
    '2. Bank Transfer\n' +
    '3. UPI\n' +
    '4. Credit Card\n' +
    '5. Other\n' +
    'Enter 1-5 or press Cancel to skip'
  );

  let paymentMethod = null;
  if (selectedMethod) {
    const index = parseInt(selectedMethod) - 1;
    if (index >= 0 && index < paymentMethods.length) {
      paymentMethod = paymentMethods[index];
    }
  }

  setActionLoading(prev => ({ ...prev, [`pay-${debtId}`]: true }));

  try {
    const result = await enhancedDebtApiService.markDebtAsPaid(debtId, paymentMethod);

    if (result.success) {
      showNotification(
        `✅ Payment recorded! ${paymentMethod ? `Method: ${paymentMethod}` : ''}`,
        'success'
      );
      await loadAllData();
    } else {
      showNotification(result.message || 'Failed to mark debt as paid', 'error');
    }
  } catch (error) {
    console.error('Error marking debt as paid:', error);
    showNotification('Failed to mark debt as paid', 'error');
  } finally {
    setActionLoading(prev => ({ ...prev, [`pay-${debtId}`]: false }));
  }
};


  const handleDeleteDebt = async (debtId, description) => {
    if (!window.confirm(`Delete debt: "${description}"?`)) return;

    setActionLoading(prev => ({ ...prev, [`delete-${debtId}`]: true }));

    try {
      const result = await enhancedDebtApiService.deleteDebt(debtId);

      if (result.success) {
        showNotification('Debt deleted successfully', 'success');
        await loadAllData();
      } else {
        showNotification(result.message || 'Failed to delete debt', 'error');
      }
    } catch (error) {
      console.error('Error deleting debt:', error);
      showNotification('Failed to delete debt', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [`delete-${debtId}`]: false }));
    }
  };

  const handleSendReminder = async (debtId) => {
    setActionLoading(prev => ({ ...prev, [`remind-${debtId}`]: true }));

    try {
      const result = await enhancedDebtApiService.sendPaymentReminder(debtId);

      if (result.success) {
        showNotification('💬 Payment reminder sent!', 'success');
      } else {
        showNotification(result.message || 'Failed to send reminder', 'error');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      showNotification('Failed to send reminder', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [`remind-${debtId}`]: false }));
    }
  };

  const formatCurrency = (amount) => {
  return `${currencySymbol}${parseFloat(amount || 0).toFixed(2)}`;
};

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Unknown date';
    }
  };

  // FIXED: Helper function to get the correct friend user ID
  const getFriendUserId = (friend) => {
    // Try different possible ID fields
    return friend.friendUser?._id || friend.friendUserId || friend.userId || friend._id;
  };

  const DebtCard = ({ debt, viewMode }) => {
    const isSplitExpense = debt.type === 'split';
    const otherUser = viewMode === 'owed-to-me' 
      ? (debt.debtor?.name || debt.debtor?.email || 'Unknown User')
      : (debt.creditor?.name || debt.creditor?.email || 'Unknown User');

    return (
      <div className={`debt-card debt-${debt.status} ${isSplitExpense ? 'debt-split' : ''}`}>
        <div className="debt-main-content">
          <div className="debt-header">
            <div className="debt-title-section">
              <h4 className="debt-description">
                {isSplitExpense && <span className="split-icon">📊</span>}
                {debt.description}
              </h4>
              {isSplitExpense && (
                <span className="debt-type-badge split-badge">Split Expense</span>
              )}
            </div>
            <div className="debt-amount-section">
              <div className="debt-amount">
                {formatCurrency(debt.amount)}
                <span className={`status-icon status-${debt.status}`}>
                  {debt.status === 'paid' ? '✓' : debt.status === 'pending' ? '⏱' : '⚠'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="debt-meta">
            <div className="debt-participant">
              <span>👤</span>
              <span>{otherUser}</span>
            </div>
            
            <div className="debt-date">
              <span>🕒</span>
              <span>{formatDate(debt.createdAt)}</span>
            </div>

            {isSplitExpense && debt.metadata?.splitType && (
              <div className="debt-category">
                <span>📋</span>
                <span>{debt.metadata.splitType === 'equal' ? 'Equal Split' : 'Custom Split'}</span>
              </div>
            )}
          </div>

          {isSplitExpense && debt.metadata?.originalAmount && (
            <div className="split-expense-details">
              <div className="detail-item">
                <span className="detail-label">Total Expense:</span>
                <span className="detail-value">{formatCurrency(debt.metadata.originalAmount)}</span>
              </div>
            </div>
          )}

          {debt.dueDate && debt.status === 'pending' && (
            <div className={`due-date-info ${new Date(debt.dueDate) < new Date() ? 'overdue' : ''}`}>
              <span>⚠</span>
              <span>
                {new Date(debt.dueDate) < new Date() 
                  ? `Overdue since ${formatDate(debt.dueDate)}`
                  : `Due by ${formatDate(debt.dueDate)}`
                }
              </span>
            </div>
          )}
        </div>
        
        <div className="debt-actions">
          {debt.status === 'pending' && viewMode === 'owed-by-me' && (
            <button
              className="btn btn-small btn-success"
              onClick={() => handleMarkAsPaid(debt._id)}
              disabled={actionLoading[`pay-${debt._id}`]}
              title="Mark as paid"
            >
              {actionLoading[`pay-${debt._id}`] ? '⏳' : '✅ Pay'}
            </button>
          )}

          {debt.status === 'pending' && viewMode === 'owed-to-me' && (
            <button
              className="btn btn-small btn-secondary"
              onClick={() => handleSendReminder(debt._id)}
              disabled={actionLoading[`remind-${debt._id}`]}
              title="Send payment reminder"
            >
              {actionLoading[`remind-${debt._id}`] ? '⏳' : '🔔 Remind'}
            </button>
          )}

          {!isSplitExpense && (
            <button
              className="btn btn-small btn-danger"
              onClick={() => handleDeleteDebt(debt._id, debt.description)}
              disabled={actionLoading[`delete-${debt._id}`]}
              title="Delete debt"
            >
              {actionLoading[`delete-${debt._id}`] ? '⏳' : '🗑️'}
            </button>
          )}

          {isSplitExpense && (
            <div className="split-expense-note" title="This debt was created from a split expense">
              <span>📊 From Split</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const currentDebts = activeTab === 'owed-to-me' ? debtsOwedToMe : debtsOwedByMe;
  const viewMode = activeTab === 'owed-to-me' ? 'owed-to-me' : 'owed-by-me';

  if (loading) {
    return (
      <div className="debt-manager-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading debts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="debt-manager-container">
      {notification.show && (
        <div className={`notification ${notification.type}`}>
          <span>{notification.message}</span>
          <button onClick={() => setNotification({ show: false, message: '', type: '' })}>×</button>
        </div>
      )}

      <div className="debt-manager-header">
        <h1>💳 Debt Manager</h1>
        <p>Track what you owe and what others owe you</p>
      </div>

      <div className="summary-cards">
        <div className="summary-card green">
          <div className="summary-icon">↑</div>
          <div className="summary-content">
            <p className="summary-label">You'll Get</p>
            <h3 className="summary-value">{formatCurrency(summary.totalOwedToMe)}</h3>
            <small>{debtsOwedToMe.filter(d => d.status === 'pending').length} pending</small>
          </div>
        </div>
        
        <div className="summary-card red">
          <div className="summary-icon">↓</div>
          <div className="summary-content">
            <p className="summary-label">You Owe</p>
            <h3 className="summary-value">{formatCurrency(summary.totalOwedByMe)}</h3>
            <small>{debtsOwedByMe.filter(d => d.status === 'pending').length} pending</small>
          </div>
        </div>
        
        <div className="summary-card blue">
          <div className="summary-icon">≈</div>
          <div className="summary-content">
            <p className="summary-label">Net Balance</p>
            <h3 className="summary-value">{formatCurrency(summary.netBalance)}</h3>
            <small>
              {summary.splitExpenseDebts} from splits, {summary.manualDebts} manual
            </small>
          </div>
        </div>
      </div>

      <div className="action-buttons">
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          {showCreateForm ? '✕ Cancel' : '➕ Add Manual Debt'}
        </button>
        <button 
          className="btn btn-secondary"
          onClick={loadAllData}
          disabled={loading}
        >
          🔄 Refresh
        </button>
      </div>

      {showCreateForm && (
        <div className="create-debt-form">
          <h3>Create Manual Debt</h3>
          <form onSubmit={handleCreateDebt}>
            <div className="form-group">
              <label>Friend *</label>
              <select
                name="friendId"
                value={formData.friendId}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a friend</option>
                {friends.map(friend => {
                  const userId = getFriendUserId(friend);
                  const displayName = friend.name || friend.friendUser?.name || 'Unknown';
                  const displayEmail = friend.email || friend.friendUser?.email || '';
                  
                  console.log('🔍 Dropdown option:', { 
                    displayName, 
                    displayEmail, 
                    userId,
                    rawFriend: friend 
                  });
                  
                  return (
                    <option key={friend._id} value={userId}>
                      {displayName} {displayEmail && `(${displayEmail})`}
                    </option>
                  );
                })}
              </select>
              {friends.length === 0 && (
                <small style={{ color: '#999', marginTop: '5px', display: 'block' }}>
                  No friends found. Add friends first to create debts.
                </small>
              )}
            </div>

            <div className="form-group">
              <label>Amount *</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                required
              />
            </div>

            <div className="form-group">
              <label>Description *</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="What is this debt for?"
                required
              />
            </div>

            <div className="form-group">
              <label>Type *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                required
              >
                <option value="owe-me">They owe me</option>
                <option value="i-owe">I owe them</option>
              </select>
            </div>

            <div className="form-group">
              <label>Due Date (Optional)</label>
              <input
                type="date"
                name="dueDate"
                value={formData.dueDate}
                onChange={handleInputChange}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-success"
              disabled={actionLoading.create || friends.length === 0}
            >
              {actionLoading.create ? 'Creating...' : '✨ Create Debt'}
            </button>
          </form>
        </div>
      )}

      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'owed-to-me' ? 'active' : ''}`}
          onClick={() => setActiveTab('owed-to-me')}
        >
          💰 Owed to Me ({debtsOwedToMe.length})
        </button>
        <button 
          className={`tab ${activeTab === 'owed-by-me' ? 'active' : ''}`}
          onClick={() => setActiveTab('owed-by-me')}
        >
          💸 I Owe ({debtsOwedByMe.length})
        </button>
      </div>

      <div className="debts-section">
        {currentDebts.length === 0 ? (
          <div className="empty-state">
            <p>
              {activeTab === 'owed-to-me' 
                ? 'No one owes you money right now!' 
                : "You don't owe anyone money right now!"}
            </p>
          </div>
        ) : (
          <div className="debts-grid">
            {currentDebts.map(debt => (
              <DebtCard
                key={debt._id}
                debt={debt}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DebtManager;