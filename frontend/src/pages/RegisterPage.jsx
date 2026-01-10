import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts';
import { Footer } from '../components';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Clear errors when user starts typing
    if (error) setError(null);
    if (validationErrors[e.target.name]) {
      setValidationErrors({
        ...validationErrors,
        [e.target.name]: null,
      });
    }
  };

  const validateForm = () => {
    const errors = {};

    // Username validation
    if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      navigate('/'); // Redirect to home page
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent mb-2">
              VS Recorder
            </h1>
            <p className="text-gray-400">Create your account</p>
          </div>

          {/* Register Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-8">
            {error && (
              <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username */}
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-slate-700/50 border ${
                    validationErrors.username
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-600 focus:border-emerald-500 focus:ring-emerald-500'
                  } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors`}
                  placeholder="Choose a username"
                  required
                  autoComplete="username"
                  disabled={loading}
                />
                {validationErrors.username && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.username}</p>
                )}
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-slate-700/50 border ${
                    validationErrors.email
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-600 focus:border-emerald-500 focus:ring-emerald-500'
                  } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors`}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                  disabled={loading}
                />
                {validationErrors.email && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-slate-700/50 border ${
                    validationErrors.password
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-600 focus:border-emerald-500 focus:ring-emerald-500'
                  } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors`}
                  placeholder="Create a password"
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />
                {validationErrors.password && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-slate-700/50 border ${
                    validationErrors.confirmPassword
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-slate-600 focus:border-emerald-500 focus:ring-emerald-500'
                  } rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors`}
                  placeholder="Confirm your password"
                  required
                  autoComplete="new-password"
                  disabled={loading}
                />
                {validationErrors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-400">{validationErrors.confirmPassword}</p>
                )}
                {formData.confirmPassword &&
                  formData.password === formData.confirmPassword &&
                  !validationErrors.confirmPassword && (
                    <p className="mt-1 text-sm text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Passwords match
                    </p>
                  )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="h-5 w-5" />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </form>

            {/* Login Link */}
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default RegisterPage;
