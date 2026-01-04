import apiClient from './client';

/**
 * Authentication API endpoints
 */
export const authApi = {
  /**
   * Register a new user
   * @param {Object} data - Registration data
   * @param {string} data.username - Username (3-50 chars)
   * @param {string} data.email - Email address
   * @param {string} data.password - Password (min 6 chars)
   * @returns {Promise<Object>} Auth response with token and user info
   */
  register: (data) => apiClient.post('/api/auth/register', data),

  /**
   * Login user
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.username - Username
   * @param {string} credentials.password - Password
   * @returns {Promise<Object>} Auth response with token and user info
   */
  login: (credentials) => apiClient.post('/api/auth/login', credentials),

  /**
   * Get current authenticated user
   * @returns {Promise<Object>} Current user info
   */
  getCurrentUser: () => apiClient.get('/api/auth/me'),
};
