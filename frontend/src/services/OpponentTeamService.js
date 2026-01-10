// src/services/OpponentTeamService.js
import StorageService from './StorageService.js';

/**
 * OpponentTeamService - Manages opponent teams for game planning
 * Each team has multiple opponent teams, each with multiple compositions (plans)
 */
class OpponentTeamService {
    static STORAGE_KEY = 'opponent_teams';

    /**
     * Storage structure:
     * {
     *   "opponent_teams": {
     *     "team123": {
     *       "opp1": {
     *         id: "opp1",
     *         teamId: "team123",
     *         pokepaste: "https://pokepast.es/abc123",
     *         notes: "Tournament opponent - John's team",
     *         compositions: [
     *           { lead1, lead2, back1, back2, notes }
     *         ],
     *         createdAt: "2025-01-08T...",
     *         updatedAt: "2025-01-08T..."
     *       }
     *     }
     *   }
     * }
     */

    /**
     * Get all opponent teams for a specific team
     * @param {string} teamId - The team ID
     * @returns {Promise<Array>} Array of opponent teams
     */
    static async getByTeamId(teamId) {
        try {
            const allData = await StorageService.get(this.STORAGE_KEY) || {};
            const teamData = allData[teamId] || {};

            // Convert object to array and sort by createdAt
            return Object.values(teamData).sort((a, b) =>
                new Date(b.createdAt) - new Date(a.createdAt)
            );
        } catch (error) {
            console.error(`Error getting opponent teams for team ${teamId}:`, error);
            return [];
        }
    }

    /**
     * Get a single opponent team by ID
     * @param {string} teamId - The team ID
     * @param {string} opponentTeamId - The opponent team ID
     * @returns {Promise<Object|null>} The opponent team or null
     */
    static async getById(teamId, opponentTeamId) {
        try {
            const allData = await StorageService.get(this.STORAGE_KEY) || {};
            return allData[teamId]?.[opponentTeamId] || null;
        } catch (error) {
            console.error(`Error getting opponent team ${opponentTeamId}:`, error);
            return null;
        }
    }

    /**
     * Create a new opponent team
     * @param {string} teamId - The team ID
     * @param {Object} data - Opponent team data { pokepaste, notes }
     * @returns {Promise<Object>} The created opponent team
     */
    static async create(teamId, data) {
        try {
            const allData = await StorageService.get(this.STORAGE_KEY) || {};

            // Initialize team data if it doesn't exist
            if (!allData[teamId]) {
                allData[teamId] = {};
            }

            // Generate unique ID
            const opponentTeamId = `opp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Create opponent team object
            const opponentTeam = {
                id: opponentTeamId,
                teamId,
                pokepaste: data.pokepaste,
                notes: data.notes || '',
                compositions: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Store
            allData[teamId][opponentTeamId] = opponentTeam;
            await StorageService.set(this.STORAGE_KEY, allData);

            return opponentTeam;
        } catch (error) {
            console.error('Error creating opponent team:', error);
            throw error;
        }
    }

    /**
     * Update an opponent team
     * @param {string} teamId - The team ID
     * @param {string} opponentTeamId - The opponent team ID
     * @param {Object} updates - Fields to update { pokepaste?, notes? }
     * @returns {Promise<Object>} The updated opponent team
     */
    static async update(teamId, opponentTeamId, updates) {
        try {
            const allData = await StorageService.get(this.STORAGE_KEY) || {};

            if (!allData[teamId]?.[opponentTeamId]) {
                throw new Error(`Opponent team ${opponentTeamId} not found`);
            }

            // Update fields
            const opponentTeam = allData[teamId][opponentTeamId];
            if (updates.pokepaste !== undefined) {
                opponentTeam.pokepaste = updates.pokepaste;
            }
            if (updates.notes !== undefined) {
                opponentTeam.notes = updates.notes;
            }
            opponentTeam.updatedAt = new Date().toISOString();

            // Store
            await StorageService.set(this.STORAGE_KEY, allData);

            return opponentTeam;
        } catch (error) {
            console.error(`Error updating opponent team ${opponentTeamId}:`, error);
            throw error;
        }
    }

    /**
     * Delete an opponent team
     * @param {string} teamId - The team ID
     * @param {string} opponentTeamId - The opponent team ID
     * @returns {Promise<void>}
     */
    static async delete(teamId, opponentTeamId) {
        try {
            const allData = await StorageService.get(this.STORAGE_KEY) || {};

            if (allData[teamId]) {
                delete allData[teamId][opponentTeamId];

                // Clean up empty team data
                if (Object.keys(allData[teamId]).length === 0) {
                    delete allData[teamId];
                }

                await StorageService.set(this.STORAGE_KEY, allData);
            }
        } catch (error) {
            console.error(`Error deleting opponent team ${opponentTeamId}:`, error);
            throw error;
        }
    }

    /**
     * Delete all opponent teams for a team (cascade delete)
     * @param {string} teamId - The team ID
     * @returns {Promise<void>}
     */
    static async deleteByTeamId(teamId) {
        try {
            const allData = await StorageService.get(this.STORAGE_KEY) || {};

            if (allData[teamId]) {
                delete allData[teamId];
                await StorageService.set(this.STORAGE_KEY, allData);
            }
        } catch (error) {
            console.error(`Error deleting opponent teams for team ${teamId}:`, error);
            throw error;
        }
    }

    /**
     * Add a composition (plan) to an opponent team
     * @param {string} teamId - The team ID
     * @param {string} opponentTeamId - The opponent team ID
     * @param {Object} composition - Composition data { lead1, lead2, back1, back2, notes }
     * @returns {Promise<Object>} The updated opponent team
     */
    static async addComposition(teamId, opponentTeamId, composition) {
        try {
            const allData = await StorageService.get(this.STORAGE_KEY) || {};

            if (!allData[teamId]?.[opponentTeamId]) {
                throw new Error(`Opponent team ${opponentTeamId} not found`);
            }

            const opponentTeam = allData[teamId][opponentTeamId];

            // Add composition
            opponentTeam.compositions.push({
                lead1: composition.lead1,
                lead2: composition.lead2,
                back1: composition.back1,
                back2: composition.back2,
                notes: composition.notes || ''
            });

            opponentTeam.updatedAt = new Date().toISOString();

            // Store
            await StorageService.set(this.STORAGE_KEY, allData);

            return opponentTeam;
        } catch (error) {
            console.error(`Error adding composition to opponent team ${opponentTeamId}:`, error);
            throw error;
        }
    }

    /**
     * Update a composition by index
     * @param {string} teamId - The team ID
     * @param {string} opponentTeamId - The opponent team ID
     * @param {number} index - The composition index
     * @param {Object} composition - Updated composition data
     * @returns {Promise<Object>} The updated opponent team
     */
    static async updateComposition(teamId, opponentTeamId, index, composition) {
        try {
            const allData = await StorageService.get(this.STORAGE_KEY) || {};

            if (!allData[teamId]?.[opponentTeamId]) {
                throw new Error(`Opponent team ${opponentTeamId} not found`);
            }

            const opponentTeam = allData[teamId][opponentTeamId];

            if (index < 0 || index >= opponentTeam.compositions.length) {
                throw new Error(`Composition index ${index} out of bounds`);
            }

            // Update composition
            opponentTeam.compositions[index] = {
                lead1: composition.lead1,
                lead2: composition.lead2,
                back1: composition.back1,
                back2: composition.back2,
                notes: composition.notes || ''
            };

            opponentTeam.updatedAt = new Date().toISOString();

            // Store
            await StorageService.set(this.STORAGE_KEY, allData);

            return opponentTeam;
        } catch (error) {
            console.error(`Error updating composition at index ${index}:`, error);
            throw error;
        }
    }

    /**
     * Delete a composition by index
     * @param {string} teamId - The team ID
     * @param {string} opponentTeamId - The opponent team ID
     * @param {number} index - The composition index
     * @returns {Promise<Object>} The updated opponent team
     */
    static async deleteComposition(teamId, opponentTeamId, index) {
        try {
            const allData = await StorageService.get(this.STORAGE_KEY) || {};

            if (!allData[teamId]?.[opponentTeamId]) {
                throw new Error(`Opponent team ${opponentTeamId} not found`);
            }

            const opponentTeam = allData[teamId][opponentTeamId];

            if (index < 0 || index >= opponentTeam.compositions.length) {
                throw new Error(`Composition index ${index} out of bounds`);
            }

            // Remove composition
            opponentTeam.compositions.splice(index, 1);
            opponentTeam.updatedAt = new Date().toISOString();

            // Store
            await StorageService.set(this.STORAGE_KEY, allData);

            return opponentTeam;
        } catch (error) {
            console.error(`Error deleting composition at index ${index}:`, error);
            throw error;
        }
    }

    /**
     * Get count of opponent teams for a team
     * @param {string} teamId - The team ID
     * @returns {Promise<number>} Count of opponent teams
     */
    static async countByTeamId(teamId) {
        try {
            const teams = await this.getByTeamId(teamId);
            return teams.length;
        } catch (error) {
            console.error(`Error counting opponent teams for team ${teamId}:`, error);
            return 0;
        }
    }
}

export default OpponentTeamService;
