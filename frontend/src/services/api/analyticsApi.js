import apiClient from './client';

/**
 * Analytics API service
 * Handles team statistics, usage analysis, matchup data, and move analytics
 */
export const analyticsApi = {
  /**
   * Get usage statistics for a team
   * Shows how often each Pokemon was used and their win rates
   * @param {number} teamId - Team ID
   * @returns {Promise<Object[]>} Array of usage stats per Pokemon
   */
  getUsageStats: (teamId) =>
    apiClient.get(`/api/teams/${teamId}/analytics/usage`),

  /**
   * Get matchup statistics for a team
   * Shows performance against specific opponent Pokemon
   * @param {number} teamId - Team ID
   * @returns {Promise<Object[]>} Array of matchup stats
   */
  getMatchupStats: (teamId) =>
    apiClient.get(`/api/teams/${teamId}/analytics/matchups`),

  /**
   * Get move usage statistics for a team
   * Shows which moves were used most and their effectiveness
   * @param {number} teamId - Team ID
   * @returns {Promise<Object[]>} Array of move usage stats per Pokemon
   */
  getMoveStats: (teamId) =>
    apiClient.get(`/api/teams/${teamId}/analytics/moves`),

  /**
   * Get custom matchup analysis
   * Analyze performance against a specific set of opponent Pokemon
   * @param {number} teamId - Team ID
   * @param {string[]} opponentPokemon - Array of opponent Pokemon names
   * @returns {Promise<Object>} Custom matchup analysis
   */
  getCustomMatchup: (teamId, opponentPokemon) =>
    apiClient.post(`/api/teams/${teamId}/analytics/matchups/custom`, {
      opponentPokemon,
    }),
};

export default analyticsApi;
