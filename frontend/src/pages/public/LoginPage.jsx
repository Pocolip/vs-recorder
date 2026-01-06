import React from 'react';
import { Link } from 'react-router-dom';
import { LoginForm } from '@/components/forms';

const LoginPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 flex items-center justify-center px-4">
      <div className="card max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-emerald-500 mb-2">Welcome Back</h1>
          <p className="text-gray-400">Login to your VS Recorder account</p>
        </div>

        <LoginForm />

        {/* Links */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-gray-400 text-sm">
            Don't have an account?{' '}
            <Link to="/register" className="text-emerald-500 hover:text-emerald-400 font-medium">
              Register here
            </Link>
          </p>
          <Link
            to="/"
            className="block text-gray-500 hover:text-gray-400 text-sm"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
