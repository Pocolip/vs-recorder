import apiClient from './client';

/**
 * Authentication API service
 * Handles login, registration, and user management
 */
export const authApi = {
  /**
   * Register a new user
   * @param {Object} data - { username, email, password }
   * @returns {Promise<Object>} User data with token
   */
  register: (data) => apiClient.post('/api/auth/register', data),

  /**
   * Login user
   * @param {Object} credentials - { username, password }
   * @returns {Promise<Object>} User data with token
   */
  login: (credentials) => apiClient.post('/api/auth/login', credentials),

  /**
   * Get current user info
   * @returns {Promise<Object>} Current user data
   */
  getCurrentUser: () => apiClient.get('/api/auth/me'),

  /**
   * Update user profile
   * @param {Object} updates - User updates
   * @returns {Promise<Object>} Updated user data
   */
  updateProfile: (updates) => apiClient.patch('/api/auth/me', updates),

  /**
   * Change password
   * @param {Object} data - { currentPassword, newPassword }
   * @returns {Promise<void>}
   */
  changePassword: (data) => apiClient.post('/api/auth/change-password', data),

  /**
   * Logout (client-side - clear token)
   */
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

export default authApi;
