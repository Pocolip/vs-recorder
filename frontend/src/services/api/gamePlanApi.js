import apiClient from './client';

/**
 * Game Plan API service
 * Handles tournament game planning operations
 */
export const gamePlanApi = {
  /**
   * Get all game plans for current user
   * @returns {Promise<Array>} List of game plans
   */
  getAll: () => apiClient.get('/api/game-plans'),

  /**
   * Get game plan by ID with all teams and compositions
   * @param {number} id - Game plan ID
   * @returns {Promise<Object>} Game plan with teams
   */
  getById: (id) => apiClient.get(`/api/game-plans/${id}`),

  /**
   * Get game plan for a specific team (returns null if none exists)
   * @param {number} teamId - Team ID
   * @returns {Promise<Object|null>} Game plan or null
   */
  getForTeam: async (teamId) => {
    try {
      return await apiClient.get(`/api/game-plans/for-team/${teamId}`);
    } catch (error) {
      // Return null if no game plan exists (404)
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Get or create game plan for a specific team
   * Creates a new game plan if one doesn't exist
   * @param {number} teamId - Team ID
   * @param {string} name - Optional name for the game plan
   * @returns {Promise<Object>} Game plan with teams
   */
  getOrCreateForTeam: (teamId, name) => {
    const params = name ? `?name=${encodeURIComponent(name)}` : '';
    return apiClient.post(`/api/game-plans/for-team/${teamId}${params}`);
  },

  /**
   * Create a new game plan
   * @param {Object} data - { teamId, name, notes }
   * @returns {Promise<Object>} Created game plan
   */
  create: (data) => apiClient.post('/api/game-plans', data),

  /**
   * Update game plan
   * @param {number} id - Game plan ID
   * @param {Object} updates - { name, notes }
   * @returns {Promise<Object>} Updated game plan
   */
  update: (id, updates) => apiClient.patch(`/api/game-plans/${id}`, updates),

  /**
   * Delete game plan
   * @param {number} id - Game plan ID
   * @returns {Promise<void>}
   */
  delete: (id) => apiClient.delete(`/api/game-plans/${id}`),

  // Opponent Teams within Game Plans

  /**
   * Get all opponent teams for a game plan
   * @param {number} gamePlanId - Game plan ID
   * @returns {Promise<Array>} List of opponent teams
   */
  getTeams: (gamePlanId) =>
    apiClient.get(`/api/game-plans/${gamePlanId}/teams`),

  /**
   * Add opponent team to game plan
   * @param {number} gamePlanId - Game plan ID
   * @param {Object} data - { pokepaste, playerName, notes }
   * @returns {Promise<Object>} Created opponent team
   */
  addTeam: (gamePlanId, data) =>
    apiClient.post(`/api/game-plans/${gamePlanId}/teams`, data),

  /**
   * Update opponent team
   * @param {number} gamePlanId - Game plan ID
   * @param {number} teamId - Opponent team ID
   * @param {Object} updates - { pokepaste, playerName, notes }
   * @returns {Promise<Object>} Updated opponent team
   */
  updateTeam: (gamePlanId, teamId, updates) =>
    apiClient.patch(`/api/game-plans/${gamePlanId}/teams/${teamId}`, updates),

  /**
   * Delete opponent team
   * @param {number} gamePlanId - Game plan ID
   * @param {number} teamId - Opponent team ID
   * @returns {Promise<void>}
   */
  deleteTeam: (gamePlanId, teamId) =>
    apiClient.delete(`/api/game-plans/${gamePlanId}/teams/${teamId}`),

  // Compositions (lead/back strategies)

  /**
   * Add composition to opponent team
   * @param {number} gamePlanId - Game plan ID
   * @param {number} teamId - Opponent team ID
   * @param {Object} composition - { lead1, lead2, back1, back2, notes }
   * @returns {Promise<Object>} Updated opponent team
   */
  addComposition: (gamePlanId, teamId, composition) =>
    apiClient.post(`/api/game-plans/${gamePlanId}/teams/${teamId}/compositions`, {
      composition,
    }),

  /**
   * Update composition at specific index
   * @param {number} gamePlanId - Game plan ID
   * @param {number} teamId - Opponent team ID
   * @param {number} index - Composition index
   * @param {Object} composition - { lead1, lead2, back1, back2, notes }
   * @returns {Promise<Object>} Updated opponent team
   */
  updateComposition: (gamePlanId, teamId, index, composition) =>
    apiClient.patch(`/api/game-plans/${gamePlanId}/teams/${teamId}/compositions`, {
      index,
      composition,
    }),

  /**
   * Delete composition at specific index
   * @param {number} gamePlanId - Game plan ID
   * @param {number} teamId - Opponent team ID
   * @param {number} index - Composition index
   * @returns {Promise<Object>} Updated opponent team
   */
  deleteComposition: (gamePlanId, teamId, index) =>
    apiClient.delete(
      `/api/game-plans/${gamePlanId}/teams/${teamId}/compositions/${index}`
    ),
};

export default gamePlanApi;
