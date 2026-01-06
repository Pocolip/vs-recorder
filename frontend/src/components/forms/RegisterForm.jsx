import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, useToast } from '@/hooks';
import { validateRegisterForm } from '@/utils/validators';
import { Spinner } from '@/components/common';

/**
 * Registration form component with validation
 */
const RegisterForm = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { showSuccess, showError } = useToast();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
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
    const validation = validateRegisterForm(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    // Clear errors and start loading
    setErrors({});
    setLoading(true);

    try {
      // Prepare data for API (exclude confirmPassword)
      const { confirmPassword, ...registrationData } = formData;
      await register(registrationData);
      showSuccess('Registration successful! Welcome to VS Recorder.');
      // Navigate to dashboard (will be handled by routing)
      navigate('/dashboard');
    } catch (error) {
      console.error('Registration error:', error);
      // Handle specific error messages from backend
      if (error.message?.includes('username')) {
        setErrors({ username: 'This username is already taken' });
      } else if (error.message?.includes('email')) {
        setErrors({ email: 'This email is already registered' });
      } else {
        showError(error.message || 'Registration failed. Please try again.');
      }
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
          placeholder="Choose a username"
          disabled={loading}
          autoComplete="username"
        />
        {errors.username && (
          <p className="mt-1 text-sm text-red-400">{errors.username}</p>
        )}
      </div>

      {/* Email field */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className={`input ${errors.email ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
          placeholder="Enter your email"
          disabled={loading}
          autoComplete="email"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-400">{errors.email}</p>
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
          placeholder="Create a password (min 6 characters)"
          disabled={loading}
          autoComplete="new-password"
        />
        {errors.password && (
          <p className="mt-1 text-sm text-red-400">{errors.password}</p>
        )}
      </div>

      {/* Confirm Password field */}
      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
          Confirm Password
        </label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          className={`input ${errors.confirmPassword ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
          placeholder="Confirm your password"
          disabled={loading}
          autoComplete="new-password"
        />
        {errors.confirmPassword && (
          <p className="mt-1 text-sm text-red-400">{errors.confirmPassword}</p>
        )}
      </div>

      {/* Submit button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full btn-primary flex items-center justify-center gap-2"
      >
        {loading && <Spinner size="sm" />}
        {loading ? 'Creating account...' : 'Register'}
      </button>
    </form>
  );
};

export default RegisterForm;
