// src/services/TeamService.js
import { teamApi } from './api';

/**
 * Team Service - wraps teamApi for backward compatibility
 * Uses backend API instead of local storage
 */
class TeamService {
  /**
   * Get all teams for current user
   * @returns {Promise<Object>} Teams object with team IDs as keys
   */
  static async getAll() {
    const teams = await teamApi.getAll();
    // Convert array to object with IDs as keys for backward compatibility
    return teams.reduce((acc, team) => {
      acc[team.id] = team;
      return acc;
    }, {});
  }

  /**
   * Get a single team by ID
   * @param {number} id - Team ID
   * @returns {Promise<Object|null>} Team object or null
   */
  static async getById(id) {
    try {
      return await teamApi.getById(id);
    } catch (error) {
      console.error('Error fetching team:', error);
      return null;
    }
  }

  /**
   * Create a new team
   * @param {Object} teamData - { name, pokepaste, regulation, showdownUsernames }
   * @returns {Promise<Object>} Created team
   */
  static async create(teamData) {
    const data = {
      name: teamData.name,
      pokepaste: teamData.pokepaste,
      regulation: teamData.regulation || 'VGC 2025 Regulation F',
      showdownUsernames: teamData.showdownUsernames || [],
    };

    return await teamApi.create(data);
  }

  /**
   * Update an existing team
   * @param {number} id - Team ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object|null>} Updated team or null
   */
  static async update(id, updates) {
    try {
      // Map 'format' to 'regulation' if present
      const data = { ...updates };
      if (data.format) {
        data.regulation = data.format;
        delete data.format;
      }

      return await teamApi.update(id, data);
    } catch (error) {
      console.error('Error updating team:', error);
      return null;
    }
  }

  /**
   * Delete a team by ID
   * @param {number} id - Team ID
   * @returns {Promise<boolean>} True if deleted, false otherwise
   */
  static async delete(id) {
    try {
      await teamApi.delete(id);
      return true;
    } catch (error) {
      console.error('Error deleting team:', error);
      return false;
    }
  }

  /**
   * Get teams as array (sorted by most recently updated)
   * @returns {Promise<Array>} Array of teams
   */
  static async getList() {
    const teams = await teamApi.getAll();
    return teams.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt);
      const dateB = new Date(b.updatedAt || b.createdAt);
      return dateB - dateA;
    });
  }

  /**
   * Search teams by name
   * @param {string} query - Search query
   * @returns {Promise<Array>} Filtered teams
   */
  static async search(query) {
    const teams = await this.getList();
    const lowerQuery = query.toLowerCase();

    return teams.filter((team) =>
      team.name.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get teams by format/regulation
   * @param {string} format - Format/regulation name
   * @returns {Promise<Array>} Filtered teams
   */
  static async getByFormat(format) {
    try {
      return await teamApi.getByRegulation(format);
    } catch (error) {
      console.error('Error fetching teams by format:', error);
      return [];
    }
  }

  /**
   * Check if team exists
   * @param {number} id - Team ID
   * @returns {Promise<boolean>} True if exists
   */
  static async exists(id) {
    const team = await this.getById(id);
    return team !== null;
  }

  /**
   * Get team stats
   * @param {number} id - Team ID
   * @returns {Promise<Object>} Team stats
   */
  static async getStats(id) {
    try {
      return await teamApi.getStats(id);
    } catch (error) {
      console.error('Error fetching team stats:', error);
      return null;
    }
  }
}

export default TeamService;
