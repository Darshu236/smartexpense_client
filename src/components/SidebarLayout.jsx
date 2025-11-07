// src/components/SidebarLayout.jsx
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const SidebarLayout = () => {
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-gray-800 text-white p-4">
        <h1 className="text-xl font-bold mb-4">💼 Expense Tracker</h1>
        <nav className="flex flex-col gap-2">
          <NavLink to="/" className={({ isActive }) => isActive ? 'font-bold' : ''}>
            Dashboard
          </NavLink>
        </nav>
      </aside>

      <main className="flex-1 p-6 overflow-auto bg-gray-100">
        <Outlet />
      </main>
    </div>
  );
};

export default SidebarLayout;
