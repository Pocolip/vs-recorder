import apiClient from './client';

/**
 * Match API service
 * Handles Bo3 match CRUD operations
 */
export const matchApi = {
  /**
   * Get match by ID
   * @param {number} id - Match ID
   * @returns {Promise<Object>} Match data with replays
   */
  getById: (id) => apiClient.get(`/api/matches/${id}`),

  /**
   * Get all matches for a team (summary without replays)
   * @param {number} teamId - Team ID
   * @returns {Promise<Array>} List of match summaries
   */
  getByTeamId: (teamId) => apiClient.get(`/api/matches?teamId=${teamId}`),

  /**
   * Get all matches for a team with full replay data
   * @param {number} teamId - Team ID
   * @returns {Promise<Array>} List of matches with replays
   */
  getWithReplays: (teamId) => apiClient.get(`/api/matches/with-replays?teamId=${teamId}`),

  /**
   * Create a new match
   * @param {Object} data - { teamId, opponent, notes, tags }
   * @returns {Promise<Object>} Created match
   */
  create: (data) => apiClient.post('/api/matches', data),

  /**
   * Update match
   * @param {number} id - Match ID
   * @param {Object} updates - { opponent, notes, tags }
   * @returns {Promise<Object>} Updated match
   */
  update: (id, updates) => apiClient.patch(`/api/matches/${id}`, updates),

  /**
   * Delete match
   * @param {number} id - Match ID
   * @returns {Promise<void>}
   */
  delete: (id) => apiClient.delete(`/api/matches/${id}`),

  /**
   * Add replay to match
   * @param {number} matchId - Match ID
   * @param {number} replayId - Replay ID
   * @returns {Promise<Object>} Updated match
   */
  addReplay: (matchId, replayId) =>
    apiClient.post(`/api/matches/${matchId}/replays`, { replayId }),

  /**
   * Remove replay from match
   * @param {number} matchId - Match ID
   * @param {number} replayId - Replay ID
   * @returns {Promise<Object>} Updated match
   */
  removeReplay: (matchId, replayId) =>
    apiClient.delete(`/api/matches/${matchId}/replays/${replayId}`),

  /**
   * Get match stats (win rate across all matches)
   * @param {number} teamId - Team ID
   * @returns {Promise<Object>} Match stats
   */
  getStats: (teamId) => apiClient.get(`/api/matches/stats/team?teamId=${teamId}`),

  /**
   * Get matches by opponent
   * @param {number} teamId - Team ID
   * @param {string} opponent - Opponent name
   * @returns {Promise<Array>} List of matches
   */
  getByOpponent: (teamId, opponent) =>
    apiClient.get(`/api/matches/opponent/${opponent}?teamId=${teamId}`),

  /**
   * Get matches by tag
   * @param {number} teamId - Team ID
   * @param {string} tag - Tag name
   * @returns {Promise<Array>} List of matches
   */
  getByTag: (teamId, tag) =>
    apiClient.get(`/api/matches/tag/${tag}?teamId=${teamId}`),
};

export default matchApi;
