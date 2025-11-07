import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  CreditCard, 
  PiggyBank, 
  Tags, 
  Split,
  DollarSign, 
  Users, 
  BarChart3, 
  FileText, 
  Settings, 
  User,
  Calendar // ⬅️ added Calendar icon
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <ul>
        <li>
          <NavLink to="/dashboard">
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/transactions">
            <CreditCard size={18} />
            <span>Transactions</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/budgets">
            <PiggyBank size={18} />
            <span>Budgets</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/categories">
            <Tags size={18} />
            <span>Categories</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/debts">
            <DollarSign size={18} />
            <span>Debts</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/friends">
            <Users size={18} />
            <span>Friends</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/split-expense">
            <Split size={18} />
            <span>Split Expense</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/analytics">
            <BarChart3 size={18} />
            <span>Analytics</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/reports">
            <FileText size={18} />
            <span>Reports</span>
          </NavLink>
        </li>

        {/* 📅 New Calendar Menu Item */}
        <li>
          <NavLink to="/calendar">
            <Calendar size={18} />
            <span>Calendar</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/settings">
            <Settings size={18} />
            <span>Settings</span>
          </NavLink>
        </li>
        <li>
          <NavLink to="/profile">
            <User size={18} />
            <span>Profile</span>
          </NavLink>
        </li>
      </ul>
    </aside>
  );
};

export default Sidebar;
