import React from 'react';
import { Link } from 'react-router-dom';

const RegisterPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 flex items-center justify-center px-4">
      <div className="card max-w-md w-full">
        <h1 className="text-3xl font-bold text-emerald-500 mb-6 text-center">Register</h1>
        <p className="text-gray-400 text-center mb-8">
          Registration form will be implemented in Phase 3
        </p>
        <div className="text-center">
          <Link to="/" className="text-emerald-500 hover:text-emerald-400">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
