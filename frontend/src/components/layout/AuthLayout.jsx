import React from 'react';
import Sidebar from './Sidebar';

/**
 * Layout wrapper for authenticated pages
 * Includes sidebar navigation
 */
const AuthLayout = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-gray-900 to-slate-900">
      <Sidebar />
      <main className="flex-1 ml-64">
        {children}
      </main>
    </div>
  );
};

export default AuthLayout;
