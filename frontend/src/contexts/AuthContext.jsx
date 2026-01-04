import React, { createContext, useState, useEffect, useContext } from 'react';
import { authApi } from '@/services/api';

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auto-fetch current user on mount if token exists
  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        try {
          const currentUser = await authApi.getCurrentUser();
          setUser(currentUser);
          setError(null);
        } catch (err) {
          // Token is invalid, clear it
          console.error('Failed to fetch current user:', err);
          setToken(null);
          setUser(null);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token]);

  /**
   * Login user
   * @param {string} username
   * @param {string} password
   */
  const login = async (username, password) => {
    try {
      setError(null);
      const response = await authApi.login({ username, password });

      // Store token and user info
      setToken(response.token);
      setUser({
        id: response.userId,
        username: response.username,
        email: response.email,
      });

      localStorage.setItem('token', response.token);
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: response.userId,
          username: response.username,
          email: response.email,
        })
      );

      return response;
    } catch (err) {
      setError(err.message || 'Login failed');
      throw err;
    }
  };

  /**
   * Register new user
   * @param {Object} data - Registration data (username, email, password)
   */
  const register = async (data) => {
    try {
      setError(null);
      const response = await authApi.register(data);

      // Store token and user info
      setToken(response.token);
      setUser({
        id: response.userId,
        username: response.username,
        email: response.email,
      });

      localStorage.setItem('token', response.token);
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: response.userId,
          username: response.username,
          email: response.email,
        })
      );

      return response;
    } catch (err) {
      setError(err.message || 'Registration failed');
      throw err;
    }
  };

  /**
   * Logout user
   */
  const logout = () => {
    setToken(null);
    setUser(null);
    setError(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  /**
   * Update user data in state
   * @param {Object} updates - User data updates
   */
  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!user && !!token,
    login,
    logout,
    register,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to use auth context
 * @returns {Object} Auth context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
