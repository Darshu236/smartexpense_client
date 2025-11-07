import React, { useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { PreferencesProvider } from './context/preferenceProvider';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Categories from './pages/Categories';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import BudgetManager from './pages/Budgets';
import SettingsPage from './pages/Settings.jsx';
import SplitExpense from './pages/SplitExpense';
import FriendsPage from './pages/FriendsPage';
import NotificationCenter from './pages/NotificationCenter.jsx';
import DebtManagementPage from './pages/DebtManager.jsx';
import Profile from './pages/Profile';
import CalendarView from './components/CalendarView';

// Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';

import './App.css';

// 🔒 Layout for protected pages
const ProtectedLayout = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        {/* ⬇️ Routed protected pages render here */}
        <Outlet />
      </div>
    </div>
  );
};

const App = () => {
  const location = useLocation();

  // ✅ Global error silencer for browser extensions
  useEffect(() => {
    const handleUnhandledRejection = (event) => {
      if (
        event.reason?.message?.includes('message channel closed') ||
        event.reason?.message?.includes('listener indicated an asynchronous response')
      ) {
        event.preventDefault();
        console.log('🔇 Ignored extension error:', event.reason.message);
        return;
      }
      console.error('Unhandled promise rejection:', event.reason);
    };

    const handleError = (event) => {
      if (
        event.filename?.includes('extension') ||
        event.message?.includes('extension') ||
        event.filename?.includes('contents.')
      ) {
        event.preventDefault();
        console.log('🔇 Ignored extension script error:', event.message);
        return;
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    // 🔹 Wrap everything in PreferencesProvider so currency/theme applies app-wide
    <PreferencesProvider>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        {/* Protected Routes */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/budgets" element={<BudgetManager />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/debts" element={<DebtManagementPage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/split-expense" element={<SplitExpense />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications/:id" element={<NotificationCenter
           />} />

          {/* 📅 NEW Calendar Page */}
          <Route path="/calendar" element={<CalendarView />} />
        </Route>
      </Routes>
    </PreferencesProvider>
  );
};

export default App;
