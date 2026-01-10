import apiClient from './client';

/**
 * Replay API service
 * Handles replay CRUD operations and parsing
 */
export const replayApi = {
  /**
   * Get replay by ID
   * @param {number} id - Replay ID
   * @returns {Promise<Object>} Replay data with full battle log
   */
  getById: (id) => apiClient.get(`/api/replays/${id}`),

  /**
   * Get all replays for a team
   * @param {number} teamId - Team ID
   * @returns {Promise<Array>} List of replays (summary)
   */
  getByTeamId: (teamId) => apiClient.get(`/api/replays?teamId=${teamId}`),

  /**
   * Create replay from Showdown URL
   * @param {number} teamId - Team ID
   * @param {string} url - Showdown replay URL
   * @param {string} notes - Optional notes
   * @returns {Promise<Object>} Created replay
   */
  createFromUrl: (teamId, url, notes = '') =>
    apiClient.post(`/api/replays/from-url?teamId=${teamId}`, { url, notes }),

  /**
   * Create replay manually (with full data)
   * @param {number} teamId - Team ID
   * @param {Object} data - Full replay data
   * @returns {Promise<Object>} Created replay
   */
  create: (teamId, data) => apiClient.post(`/api/replays?teamId=${teamId}`, data),

  /**
   * Update replay
   * @param {number} id - Replay ID
   * @param {Object} updates - { notes, opponent, result, date }
   * @returns {Promise<Object>} Updated replay
   */
  update: (id, updates) => apiClient.patch(`/api/replays/${id}`, updates),

  /**
   * Delete replay
   * @param {number} id - Replay ID
   * @returns {Promise<void>}
   */
  delete: (id) => apiClient.delete(`/api/replays/${id}`),

  /**
   * Get standalone replays (not in any match)
   * @param {number} teamId - Team ID
   * @returns {Promise<Array>} List of standalone replays
   */
  getStandalone: (teamId) =>
    apiClient.get(`/api/replays/standalone?teamId=${teamId}`),

  /**
   * Get replays by result
   * @param {number} teamId - Team ID
   * @param {string} result - "win" or "loss"
   * @returns {Promise<Array>} List of replays
   */
  getByResult: (teamId, result) =>
    apiClient.get(`/api/replays/result/${result}?teamId=${teamId}`),

  /**
   * Get replays by opponent
   * @param {number} teamId - Team ID
   * @param {string} opponent - Opponent name
   * @returns {Promise<Array>} List of replays
   */
  getByOpponent: (teamId, opponent) =>
    apiClient.get(`/api/replays/opponent/${opponent}?teamId=${teamId}`),

  /**
   * Associate replay with match
   * @param {number} replayId - Replay ID
   * @param {number} matchId - Match ID
   * @returns {Promise<Object>} Updated replay
   */
  associateWithMatch: (replayId, matchId) =>
    apiClient.put(`/api/replays/${replayId}/match`, { matchId }),

  /**
   * Dissociate replay from match
   * @param {number} replayId - Replay ID
   * @returns {Promise<Object>} Updated replay
   */
  dissociateFromMatch: (replayId) =>
    apiClient.delete(`/api/replays/${replayId}/match`),

  /**
   * Check if replay URL exists
   * @param {string} url - Replay URL
   * @returns {Promise<boolean>} True if exists
   */
  checkExists: (url) =>
    apiClient.get(`/api/replays/check/url?url=${encodeURIComponent(url)}`),
};

export default replayApi;
