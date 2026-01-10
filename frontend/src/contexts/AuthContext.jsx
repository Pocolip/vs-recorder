import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

/**
 * AuthProvider - Manages authentication state
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check if user is authenticated on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        try {
          // Verify token is still valid by fetching current user
          const currentUser = await authApi.getCurrentUser();
          setUser(currentUser);
        } catch (err) {
          // Token expired or invalid - clear storage
          console.error('Auth verification failed:', err);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  /**
   * Register a new user
   * @param {Object} credentials - { username, email, password }
   */
  const register = async (credentials) => {
    try {
      setError(null);
      const response = await authApi.register(credentials);

      // Store token and user
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response));

      setUser(response);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Login user
   * @param {Object} credentials - { username, password }
   */
  const login = async (credentials) => {
    try {
      setError(null);
      const response = await authApi.login(credentials);

      // Store token and user
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response));

      setUser(response);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  /**
   * Logout user
   */
  const logout = () => {
    authApi.logout();
    setUser(null);
    setError(null);
  };

  /**
   * Update user profile
   * @param {Object} updates - Profile updates
   */
  const updateProfile = async (updates) => {
    try {
      setError(null);
      const updatedUser = await authApi.updateProfile(updates);

      // Update stored user
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      return updatedUser;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to access auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
