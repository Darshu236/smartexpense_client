import React, { useEffect, useState } from 'react';
import API from '../api/api';
import './DashboardCards.css';
import BudgetSuggestions from './BudgetSuggestions';

const DashboardCards = () => {
  const [transactions, setTransactions] = useState([]);
  const [predicted, setPredicted] = useState(0);
  const [categories, setCategories] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await API.get('/transactions');
        const data = res.data;
        setTransactions(data);

        const income = data.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
        const expense = data.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
        setPredicted(Math.round(expense * 1.1)); // simple forecast

        // Category-wise expense breakdown
        const categoryMap = {};
        data.forEach((t) => {
          if (t.type === 'expense') {
            categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
          }
        });
        setCategories(categoryMap);

      } catch (err) {
        console.error('Failed to fetch transactions', err);
      }
    };

    fetchData();
  }, []);

  const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = income - expense;
  const savingRate = income ? ((balance / income) * 100).toFixed(1) : 0;
  const budget = income * 0.8; // assuming 80% of income is the monthly budget

  return (
    <div className="dashboard-cards">
      <div className="card"><h4>Total Balance</h4><p>₹{balance}</p></div>
      <div className="card"><h4>Total Income</h4><p>₹{income}</p></div>
      <div className="card"><h4>Total Expenses</h4><p>₹{expense}</p></div>
      <div className="card"><h4>Budget Usage</h4><p>{expense && income ? ((expense / income) * 100).toFixed(1) : 0}%</p></div>
      <div className="card"><h4>Prediction</h4><p>Next month: ₹{predicted}</p></div>
      <div className="card"><h4>Alerts</h4><p>{expense > income * 0.9 ? '⚠️ High Spending!' : '✅ Stable'}</p></div>
      <div className="card"><h4>Finance Score</h4><p>{savingRate}% Saved</p></div>

      {/* ✅ Monthly Budget Progress */}
      <div className="card">
        <h4>Budget Progress</h4>
        <div className="progress-bar">
          <div className="progress" style={{ width: `${(expense / budget) * 100}%`, background: '#4ade80' }}>
            {(expense / budget * 100).toFixed(1)}%
          </div>
        </div>
        <small>Budget: ₹{budget.toFixed(0)}</small>
      </div>

      {/* ✅ Expense by Category */}
      <div className="card">
        <h4>Spending by Category</h4>
        <ul>
          {Object.entries(categories).map(([cat, amt]) => (
            <li key={cat}>
              {cat}: ₹{amt}
            </li>
          ))}
        </ul>
      </div>

      {/* ✅ Smart Suggestions */}
      <div className="card">
        <h4>Smart Suggestions</h4>
        <BudgetSuggestions />
      </div>
    </div>
  );
};

export default DashboardCards;
