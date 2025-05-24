// src/services/StorageService.js

class StorageService {
    // Storage keys
    static KEYS = {
        TEAMS: 'teams',
        REPLAYS: 'replays',
        SETTINGS: 'settings',
        STATS: 'stats'
    };

    // Initialize default data if none exists
    static async initialize() {
        try {
            const existingTeams = await this.getTeams();
            if (!existingTeams || existingTeams.length === 0) {
                await this.initializeDefaultData();
            }
        } catch (error) {
            console.error('Error initializing storage:', error);
        }
    }

    // Set up default sample data
    static async initializeDefaultData() {
        const defaultTeams = [
            {
                id: '1',
                name: 'Main VGC Team',
                format: 'VGC 2025',
                winRate: 68,
                gamesPlayed: 43,
                wins: 29,
                losses: 14,
                pokemon: '🐉🔥💧🌿⚡🧊',
                pokepaste: 'https://pokepast.es/ae3a60c6c5f40484',
                showdownUsers: ['YourUsername'],
                dateCreated: new Date().toISOString(),
                lastUsed: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
                isArchived: false,
                customTags: ['main', 'tournament']
            },
            {
                id: '2',
                name: 'Experimental Build',
                format: 'VGC 2025',
                winRate: 52,
                gamesPlayed: 23,
                wins: 12,
                losses: 11,
                pokemon: '🦅🌟🗿💎🌙👻',
                pokepaste: 'https://pokepast.es/example2',
                showdownUsers: ['YourUsername'],
                dateCreated: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
                lastUsed: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
                isArchived: false,
                customTags: ['experimental']
            },
            {
                id: '3',
                name: 'Tournament Team',
                format: 'VGC 2025',
                winRate: 74,
                gamesPlayed: 31,
                wins: 23,
                losses: 8,
                pokemon: '⚡🔥🌊🌿🌟💫',
                pokepaste: 'https://pokepast.es/example3',
                showdownUsers: ['YourUsername'],
                dateCreated: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
                lastUsed: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
                isArchived: false,
                customTags: ['tournament', 'competitive']
            }
        ];

        await this.setTeams(defaultTeams);

        // Initialize empty replays array
        await this.setReplays([]);

        // Initialize default settings
        const defaultSettings = {
            theme: 'dark',
            autoImport: false,
            notifications: true,
            defaultFormat: 'VGC 2025'
        };
        await this.setSettings(defaultSettings);
    }

    // Teams operations
    static async getTeams() {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.KEYS.TEAMS], (result) => {
                resolve(result[this.KEYS.TEAMS] || []);
            });
        });
    }

    static async setTeams(teams) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [this.KEYS.TEAMS]: teams }, () => {
                resolve();
            });
        });
    }

    static async getTeam(teamId) {
        const teams = await this.getTeams();
        return teams.find(team => team.id === teamId);
    }

    static async addTeam(team) {
        const teams = await this.getTeams();
        const newTeam = {
            ...team,
            id: Date.now().toString(), // Simple ID generation
            dateCreated: new Date().toISOString(),
            lastUsed: new Date().toISOString(),
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
            isArchived: false
        };
        teams.push(newTeam);
        await this.setTeams(teams);
        return newTeam;
    }

    static async updateTeam(teamId, updates) {
        const teams = await this.getTeams();
        const teamIndex = teams.findIndex(team => team.id === teamId);
        if (teamIndex !== -1) {
            teams[teamIndex] = { ...teams[teamIndex], ...updates };
            // Recalculate win rate if wins/losses updated
            if (updates.wins !== undefined || updates.losses !== undefined) {
                const team = teams[teamIndex];
                team.gamesPlayed = team.wins + team.losses;
                team.winRate = team.gamesPlayed > 0 ? Math.round((team.wins / team.gamesPlayed) * 100) : 0;
            }
            await this.setTeams(teams);
            return teams[teamIndex];
        }
        return null;
    }

    static async deleteTeam(teamId) {
        const teams = await this.getTeams();
        const filteredTeams = teams.filter(team => team.id !== teamId);
        await this.setTeams(filteredTeams);

        // Also delete associated replays
        const replays = await this.getReplays();
        const filteredReplays = replays.filter(replay => replay.teamId !== teamId);
        await this.setReplays(filteredReplays);
    }

    // Replays operations
    static async getReplays(teamId = null) {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.KEYS.REPLAYS], (result) => {
                const allReplays = result[this.KEYS.REPLAYS] || [];
                if (teamId) {
                    resolve(allReplays.filter(replay => replay.teamId === teamId));
                } else {
                    resolve(allReplays);
                }
            });
        });
    }

    static async setReplays(replays) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [this.KEYS.REPLAYS]: replays }, () => {
                resolve();
            });
        });
    }

    static async addReplay(replay) {
        const replays = await this.getReplays();
        const newReplay = {
            ...replay,
            id: Date.now().toString(),
            dateAdded: new Date().toISOString()
        };
        replays.push(newReplay);
        await this.setReplays(replays);
        return newReplay;
    }

    // Settings operations
    static async getSettings() {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.KEYS.SETTINGS], (result) => {
                resolve(result[this.KEYS.SETTINGS] || {});
            });
        });
    }

    static async setSettings(settings) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [this.KEYS.SETTINGS]: settings }, () => {
                resolve();
            });
        });
    }

    static async updateSettings(updates) {
        const currentSettings = await this.getSettings();
        const newSettings = { ...currentSettings, ...updates };
        await this.setSettings(newSettings);
        return newSettings;
    }

    // Stats operations
    static async getStats() {
        return new Promise((resolve) => {
            chrome.storage.local.get([this.KEYS.STATS], (result) => {
                resolve(result[this.KEYS.STATS] || {});
            });
        });
    }

    static async updateStats(stats) {
        return new Promise((resolve) => {
            chrome.storage.local.set({ [this.KEYS.STATS]: stats }, () => {
                resolve();
            });
        });
    }

    // Utility functions
    static formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
        return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
    }

    // Calculate overall stats from teams
    static async calculateOverallStats() {
        const teams = await this.getTeams();
        const activeTeams = teams.filter(team => !team.isArchived);

        const totalGames = activeTeams.reduce((sum, team) => sum + team.gamesPlayed, 0);
        const totalWins = activeTeams.reduce((sum, team) => sum + team.wins, 0);
        const overallWinRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

        return {
            overallWinRate,
            totalGames,
            activeTeams: activeTeams.length,
            totalTeams: teams.length
        };
    }

    // Export/Import functionality
    static async exportData() {
        const teams = await this.getTeams();
        const replays = await this.getReplays();
        const settings = await this.getSettings();

        return {
            teams,
            replays,
            settings,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
    }

    static async importData(data) {
        try {
            if (data.teams) await this.setTeams(data.teams);
            if (data.replays) await this.setReplays(data.replays);
            if (data.settings) await this.setSettings(data.settings);
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    // Clear all data
    static async clearAllData() {
        return new Promise((resolve) => {
            chrome.storage.local.clear(() => {
                resolve();
            });
        });
    }
}

export default StorageService;