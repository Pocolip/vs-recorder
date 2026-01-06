import apiClient from './client';

/**
 * Match API service
 * Handles Bo3 match CRUD operations and replay associations
 */
export const matchApi = {
  /**
   * Get a single match by ID
   * @param {number} id - Match ID
   * @returns {Promise<Object>} Match data with associated replays
   */
  getById: (id) => apiClient.get(`/api/matches/${id}`),

  /**
   * Create a new match (Bo3 set)
   * @param {Object} data - Match data
   * @param {number} data.teamId - Team ID
   * @param {string} data.opponentName - Opponent's name
   * @param {string} [data.notes] - Optional match notes
   * @returns {Promise<Object>} Created match data
   */
  create: (data) => apiClient.post('/api/matches', data),

  /**
   * Update match details
   * @param {number} id - Match ID
   * @param {Object} data - Update data (opponentName, notes, etc.)
   * @returns {Promise<Object>} Updated match data
   */
  update: (id, data) => apiClient.patch(`/api/matches/${id}`, data),

  /**
   * Delete a match
   * @param {number} id - Match ID
   * @returns {Promise<void>}
   */
  delete: (id) => apiClient.delete(`/api/matches/${id}`),

  /**
   * Add a replay to a match
   * @param {number} matchId - Match ID
   * @param {number} replayId - Replay ID to add
   * @returns {Promise<Object>} Updated match data
   */
  addReplay: (matchId, replayId) =>
    apiClient.post(`/api/matches/${matchId}/replays/${replayId}`),

  /**
   * Remove a replay from a match
   * @param {number} matchId - Match ID
   * @param {number} replayId - Replay ID to remove
   * @returns {Promise<Object>} Updated match data
   */
  removeReplay: (matchId, replayId) =>
    apiClient.delete(`/api/matches/${matchId}/replays/${replayId}`),
};

export default matchApi;
