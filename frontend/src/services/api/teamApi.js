import apiClient from './client';

/**
 * Team API endpoints
 */
export const teamApi = {
  /**
   * Get all teams for the current user
   * @returns {Promise<Array>} List of team summaries
   */
  getAll: () => apiClient.get('/api/teams'),

  /**
   * Get team by ID
   * @param {number} id - Team ID
   * @returns {Promise<Object>} Team details
   */
  getById: (id) => apiClient.get(`/api/teams/${id}`),

  /**
   * Get teams by regulation
   * @param {string} regulation - Regulation name
   * @returns {Promise<Array>} List of teams
   */
  getByRegulation: (regulation) => apiClient.get(`/api/teams/regulation/${regulation}`),

  /**
   * Create new team
   * @param {Object} data - Team data
   * @param {string} data.name - Team name
   * @param {string} data.pokepaste - Pokepaste URL or content
   * @param {string} data.regulation - Regulation name
   * @param {string[]} [data.showdownUsernames] - Optional showdown usernames
   * @returns {Promise<Object>} Created team
   */
  create: (data) => apiClient.post('/api/teams', data),

  /**
   * Update team
   * @param {number} id - Team ID
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated team
   */
  update: (id, data) => apiClient.patch(`/api/teams/${id}`, data),

  /**
   * Delete team
   * @param {number} id - Team ID
   * @returns {Promise<void>}
   */
  delete: (id) => apiClient.delete(`/api/teams/${id}`),

  /**
   * Get team statistics
   * @param {number} id - Team ID
   * @returns {Promise<Object>} Team stats (wins, losses, winRate, totalGames)
   */
  getStats: (id) => apiClient.get(`/api/teams/${id}/stats`),

  /**
   * Add showdown username to team
   * @param {number} id - Team ID
   * @param {string} username - Showdown username
   * @returns {Promise<Object>} Updated team
   */
  addShowdownUsername: (id, username) =>
    apiClient.post(`/api/teams/${id}/showdown-usernames`, { username }),

  /**
   * Remove showdown username from team
   * @param {number} id - Team ID
   * @param {string} username - Showdown username
   * @returns {Promise<Object>} Updated team
   */
  removeShowdownUsername: (id, username) =>
    apiClient.delete(`/api/teams/${id}/showdown-usernames/${username}`),
};
