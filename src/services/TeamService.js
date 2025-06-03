// src/services/TeamsService.js
import StorageService from './StorageService.js';

class TeamsService {
    static STORAGE_KEY = 'teams';

    /**
     * Get all teams
     */
    static async getAll() {
        const teams = await StorageService.get(this.STORAGE_KEY) || {};
        return teams;
    }

    /**
     * Get a single team by ID
     */
    static async getById(id) {
        const teams = await this.getAll();
        return teams[id] || null;
    }

    /**
     * Create a new team
     */
    static async create(teamData) {
        const teams = await this.getAll();
        const id = Date.now().toString();

        const team = {
            id,
            name: teamData.name,
            description: teamData.description || '',
            pokepaste: teamData.pokepaste,
            format: teamData.format || 'VGC 2025',
            showdownUsernames: teamData.showdownUsernames || [],
            tags: teamData.tags || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        teams[id] = team;
        await StorageService.set(this.STORAGE_KEY, teams);
        return team;
    }

    /**
     * Update an existing team
     */
    static async update(id, updates) {
        const teams = await this.getAll();

        if (!teams[id]) {
            return null;
        }

        teams[id] = {
            ...teams[id],
            ...updates,
            id, // Ensure ID doesn't get overwritten
            updatedAt: new Date().toISOString()
        };

        await StorageService.set(this.STORAGE_KEY, teams);
        return teams[id];
    }

    /**
     * Delete a team by ID
     */
    static async delete(id) {
        const teams = await this.getAll();

        if (!teams[id]) {
            return false;
        }

        delete teams[id];
        await StorageService.set(this.STORAGE_KEY, teams);
        return true;
    }

    /**
     * Get teams as array (sorted by most recently updated)
     */
    static async getList() {
        const teams = await this.getAll();
        return Object.values(teams).sort((a, b) =>
            new Date(b.updatedAt) - new Date(a.updatedAt)
        );
    }

    /**
     * Search teams by name or tags
     */
    static async search(query) {
        const teams = await this.getList();
        const lowerQuery = query.toLowerCase();

        return teams.filter(team =>
            team.name.toLowerCase().includes(lowerQuery) ||
            team.description.toLowerCase().includes(lowerQuery) ||
            team.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        );
    }

    /**
     * Get teams by format
     */
    static async getByFormat(format) {
        const teams = await this.getList();
        return teams.filter(team => team.format === format);
    }

    /**
     * Check if team exists
     */
    static async exists(id) {
        const team = await this.getById(id);
        return team !== null;
    }
}

export default TeamsService;