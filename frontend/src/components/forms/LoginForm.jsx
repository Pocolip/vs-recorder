import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '@/hooks';
import { validateLoginForm } from '@/utils/validators';
import { Spinner } from '@/components/common';

/**
 * Login form component with validation
 */
const LoginForm = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    const validation = validateLoginForm(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    // Clear errors and start loading
    setErrors({});
    setLoading(true);

    try {
      await login(formData.username, formData.password);
      showSuccess('Login successful! Welcome back.');
      // Navigate to dashboard (will be handled by routing)
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      showError(error.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Username field */}
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
          Username
        </label>
        <input
          type="text"
          id="username"
          name="username"
          value={formData.username}
          onChange={handleChange}
          className={`input ${errors.username ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
          placeholder="Enter your username"
          disabled={loading}
          autoComplete="username"
        />
        {errors.username && (
          <p className="mt-1 text-sm text-red-400">{errors.username}</p>
        )}
      </div>

      {/* Password field */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
          Password
        </label>
        <input
          type="password"
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          className={`input ${errors.password ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
          placeholder="Enter your password"
          disabled={loading}
          autoComplete="current-password"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-400">{errors.password}</p>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full btn-primary flex items-center justify-center gap-2"
      >
        {loading && <Spinner size="sm" />}
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
};

export default LoginForm;
