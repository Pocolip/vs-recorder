import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { KeyRound, AlertCircle, CheckCircle, ArrowLeft, Check } from 'lucide-react';
import { authApi } from '../services/api';
import { Footer } from '../components';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState(false);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setValidationError('No reset token provided. Please request a new password reset.');
        setValidating(false);
        return;
      }

      try {
        const response = await authApi.validateResetToken(token);
        if (response.success) {
          setTokenValid(true);
        } else {
          setValidationError(response.message || 'Invalid or expired reset link.');
        }
      } catch (err) {
        setValidationError('Invalid or expired reset link. Please request a new password reset.');
      } finally {
        setValidating(false);
      }
    };

    validateToken();
  }, [token]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError(null);
  };

  const validateForm = () => {
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setLoading(true);

    try {
      await authApi.resetPassword({
        token,
        newPassword: formData.password,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const passwordsMatch = formData.password && formData.confirmPassword &&
    formData.password === formData.confirmPassword;

  // Loading state while validating token
  if (validating) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
            <p className="text-gray-400">Validating reset link...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Invalid token state
  if (validationError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent mb-2">
                VS Recorder
              </h1>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-8 text-center">
              <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-400 text-sm text-left">{validationError}</p>
              </div>
              <Link
                to="/forgot-password"
                className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                Request new reset link
              </Link>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-slate-900 flex flex-col">
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo/Title */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent mb-2">
              VS Recorder
            </h1>
            <p className="text-gray-400">Create a new password</p>
          </div>

          {/* Card */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-8">
            {success ? (
              /* Success State */
              <div className="text-center">
                <div className="mb-6 bg-emerald-900/20 border border-emerald-500/50 rounded-lg p-4 flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <p className="text-emerald-400 text-sm text-left">
                    Your password has been reset successfully. You can now log in with your new password.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Go to Login
                </Link>
              </div>
            ) : (
              /* Form State */
              <>
                {error && (
                  <div className="mb-6 bg-red-900/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* New Password */}
                  <div>
                    <label
                      htmlFor="password"
                      className="block text-sm font-medium text-gray-300 mb-2"
                    >
                      New Password
                    </label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                      placeholder="Enter new password"
                      required
                      autoComplete="new-password"
                      disabled={loading}
                      minLength={6}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Must be at least 6 characters
                    </p>
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium text-gray-300 mb-2"
                    >
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        id="confirmPassword"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`w-full px-4 py-3 bg-slate-700/50 border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 transition-colors ${
                          passwordsMatch
                            ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500'
                            : 'border-slate-600 focus:border-emerald-500 focus:ring-emerald-500'
                        }`}
                        placeholder="Confirm new password"
                        required
                        autoComplete="new-password"
                        disabled={loading}
                      />
                      {passwordsMatch && (
                        <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-400" />
                      )}
                    </div>
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
                        <span>Resetting...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="h-5 w-5" />
                        <span>Reset Password</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Back to Login Link */}
                <div className="mt-6 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-gray-300 text-sm transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to login
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ResetPasswordPage;
