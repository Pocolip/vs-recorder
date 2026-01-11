import apiClient from './client';

/**
 * Export/Import API service
 * Handles team export code generation, export retrieval, and imports
 */
export const exportApi = {
  /**
   * Preview export data for a team (without generating code)
   * @param {number} teamId - Team ID
   * @param {Object} options - Export options
   * @param {boolean} options.includeReplays - Include replays
   * @param {boolean} options.includeReplayNotes - Include replay notes
   * @param {boolean} options.includeMatchNotes - Include match notes
   * @param {boolean} options.includeOpponentPlans - Include opponent plans
   * @returns {Promise<Object>} Export data preview
   */
  previewExport: (teamId, options = {}) =>
    apiClient.post(`/api/teams/${teamId}/export`, options),

  /**
   * Generate a share code for a team export
   * @param {number} teamId - Team ID
   * @param {Object} options - Export options
   * @returns {Promise<Object>} { code, teamName, createdAt, expiresAt, isExisting }
   */
  generateCode: (teamId, options = {}) =>
    apiClient.post(`/api/teams/${teamId}/export/code`, options),

  /**
   * Get export data by share code (public endpoint)
   * @param {string} code - 6-character share code
   * @returns {Promise<Object>} Export data
   */
  getByCode: (code) => apiClient.get(`/api/export/${code.toUpperCase()}`),

  /**
   * Get rate limit status for current user
   * @returns {Promise<Object>} { codesCreatedToday, dailyLimit, remaining, resetsAt }
   */
  getRateLimitStatus: () => apiClient.get('/api/export/rate-limit'),

  /**
   * Get all exports created by current user
   * @returns {Promise<Array>} List of export summaries
   */
  getMyExports: () => apiClient.get('/api/export/my-exports'),

  /**
   * Delete an export code
   * @param {number} exportId - Export ID
   * @returns {Promise<void>}
   */
  deleteExport: (exportId) => apiClient.delete(`/api/export/${exportId}`),

  /**
   * Import a team from a share code
   * @param {string} code - 6-character share code
   * @returns {Promise<Object>} Import result
   */
  importFromCode: (code) =>
    apiClient.post('/api/import/code', { code: code.toUpperCase() }),

  /**
   * Import a team from JSON data
   * @param {string} jsonData - JSON export data as string
   * @returns {Promise<Object>} Import result
   */
  importFromJson: (jsonData) =>
    apiClient.post('/api/import/json', { jsonData }),
};

export default exportApi;
