import apiClient from './client';

/**
 * TeamMember API service
 * Handles team member CRUD operations (per-pokemon notes)
 */
export const teamMemberApi = {
  /**
   * Get all team members for a team
   * @param {number} teamId - Team ID
   * @returns {Promise<Array>} List of team members
   */
  getByTeamId: (teamId) => apiClient.get(`/api/team-members?teamId=${teamId}`),

  /**
   * Create a team member
   * @param {number} teamId - Team ID
   * @param {Object} data - { pokemonName, slot, notes }
   * @returns {Promise<Object>} Created team member
   */
  create: (teamId, data) => apiClient.post(`/api/team-members?teamId=${teamId}`, data),

  /**
   * Update a team member (notes)
   * @param {number} id - Team member ID
   * @param {Object} updates - { notes }
   * @returns {Promise<Object>} Updated team member
   */
  update: (id, updates) => apiClient.patch(`/api/team-members/${id}`, updates),

  /**
   * Delete a team member
   * @param {number} id - Team member ID
   * @returns {Promise<void>}
   */
  delete: (id) => apiClient.delete(`/api/team-members/${id}`),
};

export default teamMemberApi;
