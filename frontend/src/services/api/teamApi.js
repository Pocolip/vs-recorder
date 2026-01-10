import apiClient from './client';

/**
 * Team API service
 * Handles team CRUD operations
 */
export const teamApi = {
  /**
   * Get all teams for current user
   * @returns {Promise<Array>} List of teams
   */
  getAll: () => apiClient.get('/api/teams'),

  /**
   * Get team by ID
   * @param {number} id - Team ID
   * @returns {Promise<Object>} Team data with replays and matches
   */
  getById: (id) => apiClient.get(`/api/teams/${id}`),

  /**
   * Get teams by regulation
   * @param {string} regulation - Regulation name (e.g., "Regulation H")
   * @returns {Promise<Array>} List of teams
   */
  getByRegulation: (regulation) =>
    apiClient.get(`/api/teams/regulation/${regulation}`),

  /**
   * Create a new team
   * @param {Object} data - { name, pokepaste, regulation, showdownUsernames }
   * @returns {Promise<Object>} Created team
   */
  create: (data) => apiClient.post('/api/teams', data),

  /**
   * Update team
   * @param {number} id - Team ID
   * @param {Object} updates - Team updates
   * @returns {Promise<Object>} Updated team
   */
  update: (id, updates) => apiClient.patch(`/api/teams/${id}`, updates),

  /**
   * Delete team
   * @param {number} id - Team ID
   * @returns {Promise<void>}
   */
  delete: (id) => apiClient.delete(`/api/teams/${id}`),

  /**
   * Get team stats (win rate, games played, etc.)
   * @param {number} id - Team ID
   * @returns {Promise<Object>} Team stats
   */
  getStats: (id) => apiClient.get(`/api/teams/${id}/stats`),

  /**
   * Add Showdown username to team
   * @param {number} id - Team ID
   * @param {string} username - Showdown username
   * @returns {Promise<Object>} Updated team
   */
  addShowdownUsername: (id, username) =>
    apiClient.post(`/api/teams/${id}/showdown-usernames`, { username }),

  /**
   * Remove Showdown username from team
   * @param {number} id - Team ID
   * @param {string} username - Showdown username
   * @returns {Promise<Object>} Updated team
   */
  removeShowdownUsername: (id, username) =>
    apiClient.delete(`/api/teams/${id}/showdown-usernames/${username}`),
};

export default teamApi;
