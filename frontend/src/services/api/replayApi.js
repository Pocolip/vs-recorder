import apiClient from './client';

/**
 * Replay API service
 * Handles replay CRUD operations and parsing
 */
export const replayApi = {
  /**
   * Get a single replay by ID
   * @param {number} id - Replay ID
   * @returns {Promise<Object>} Replay data
   */
  getById: (id) => apiClient.get(`/api/replays/${id}`),

  /**
   * Create a replay from a Showdown replay URL
   * @param {number} teamId - Team ID to associate replay with
   * @param {string} url - Showdown replay URL
   * @param {string} [notes] - Optional notes about the replay
   * @returns {Promise<Object>} Created replay data
   */
  createFromUrl: (teamId, url, notes = '') =>
    apiClient.post(`/api/replays/from-url?teamId=${teamId}`, { url, notes }),

  /**
   * Update replay details
   * @param {number} id - Replay ID
   * @param {Object} data - Update data (notes, etc.)
   * @returns {Promise<Object>} Updated replay data
   */
  update: (id, data) => apiClient.patch(`/api/replays/${id}`, data),

  /**
   * Delete a replay
   * @param {number} id - Replay ID
   * @returns {Promise<void>}
   */
  delete: (id) => apiClient.delete(`/api/replays/${id}`),
};

export default replayApi;
