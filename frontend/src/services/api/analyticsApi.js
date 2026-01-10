import apiClient from './client';

/**
 * Analytics API service
 * Handles usage stats, matchup stats, and move analysis
 */
export const analyticsApi = {
  /**
   * Get usage statistics
   * @param {number} teamId - Team ID
   * @returns {Promise<Object>} Usage stats response with pokemonStats array
   */
  getUsageStats: (teamId) =>
    apiClient.get(`/api/teams/${teamId}/analytics/usage`),

  /**
   * Get matchup statistics
   * @param {number} teamId - Team ID
   * @returns {Promise<Object>} Matchup stats response with bestMatchups and worstMatchups arrays
   */
  getMatchupStats: (teamId) =>
    apiClient.get(`/api/teams/${teamId}/analytics/matchups`),

  /**
   * Get move usage statistics
   * @param {number} teamId - Team ID
   * @returns {Promise<Object>} Move usage response with pokemonMoves array
   */
  getMoveUsage: (teamId) =>
    apiClient.get(`/api/teams/${teamId}/analytics/moves`),

  /**
   * Get custom matchup analysis
   * @param {number} teamId - Team ID
   * @param {Array<string>} opponentPokemon - List of opponent Pokemon names
   * @returns {Promise<Object>} Custom matchup analysis
   */
  getCustomMatchup: (teamId, opponentPokemon) =>
    apiClient.post(`/api/teams/${teamId}/analytics/matchups/custom`, {
      opponentPokemon,
    }),
};

export default analyticsApi;
