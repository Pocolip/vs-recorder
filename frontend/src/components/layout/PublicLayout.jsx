import React from 'react';

/**
 * Layout wrapper for public pages (landing, login, register)
 * Simple container with dark gradient background
 */
const PublicLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900">
      {children}
    </div>
  );
};

export default PublicLayout;
