import React from 'react';
import { useAuth } from '@/hooks';
import { AuthLayout } from '@/components/layout';

const DashboardPage = () => {
  const { user, logout } = useAuth();

  return (
    <AuthLayout>
      <div className="p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-emerald-500">My Teams</h1>
            <button onClick={logout} className="btn-danger">
              Logout
            </button>
          </div>

          <div className="card">
            <p className="text-gray-400 mb-4">
              Welcome, <span className="text-emerald-400 font-semibold">{user?.username}</span>!
            </p>
            <p className="text-gray-500">
              Dashboard with team grid/list view will be implemented in Phase 4
            </p>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default DashboardPage;
