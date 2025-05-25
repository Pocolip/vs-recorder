const updateReplay = async (replayId, updates) => {
    return await updateReplayStatus(replayId, updates);
};// src/services/StorageService.js - Fixed with explicit method references

console.log('📦 StorageService module loading...');

const STORAGE_KEYS = {
    TEAMS: 'vs_recorder_teams',
    REPLAYS: 'vs_recorder_replays',
    SETTINGS: 'vs_recorder_settings',
    STATS: 'vs_recorder_stats'
};

// Helper function to ensure Chrome Storage is available
const ensureChromeStorage = () => {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
        throw new Error('Chrome Storage API not available');
    }
};

// Individual functions instead of class methods to avoid binding issues
const getTeams = async () => {
    try {
        ensureChromeStorage();
        const result = await chrome.storage.local.get(STORAGE_KEYS.TEAMS);
        return result[STORAGE_KEYS.TEAMS] || {};
    } catch (error) {
        console.error('Failed to get teams:', error);
        return {};
    }
};

const getTeam = async (teamId) => {
    const teams = await getTeams();
    return teams[teamId] || null;
};

const saveTeam = async (teamData) => {
    try {
        ensureChromeStorage();
        const teams = await getTeams();
        teams[teamData.id] = teamData;
        await chrome.storage.local.set({ [STORAGE_KEYS.TEAMS]: teams });
        await updateStats();
        return teamData;
    } catch (error) {
        console.error('Failed to save team:', error);
        throw error;
    }
};

const addTeam = async (teamData) => {
    return await saveTeam(teamData);
};

const deleteTeam = async (teamId) => {
    try {
        ensureChromeStorage();
        const teams = await getTeams();
        delete teams[teamId];
        await chrome.storage.local.set({ [STORAGE_KEYS.TEAMS]: teams });

        // Also delete all replays for this team
        await deleteReplaysForTeam(teamId);

        await updateStats();
    } catch (error) {
        console.error('Failed to delete team:', error);
        throw error;
    }
};

// Replay functions
const getReplays = async () => {
    try {
        ensureChromeStorage();
        const result = await chrome.storage.local.get(STORAGE_KEYS.REPLAYS);
        return result[STORAGE_KEYS.REPLAYS] || {};
    } catch (error) {
        console.error('Failed to get replays:', error);
        return {};
    }
};

const getReplaysForTeam = async (teamId) => {
    const allReplays = await getReplays();
    const teamReplays = {};

    for (const [replayId, replay] of Object.entries(allReplays)) {
        if (replay.teamId === teamId) {
            teamReplays[replayId] = replay;
        }
    }

    return teamReplays;
};

const getReplay = async (replayId) => {
    const replays = await getReplays();
    return replays[replayId] || null;
};

const addReplay = async (replayData) => {
    try {
        ensureChromeStorage();
        const replays = await getReplays();
        replays[replayData.id] = replayData;
        await chrome.storage.local.set({ [STORAGE_KEYS.REPLAYS]: replays });
        await updateStats();
        return replayData;
    } catch (error) {
        console.error('Failed to add replay:', error);
        throw error;
    }
};

const updateReplayStatus = async (replayId, updates) => {
    try {
        ensureChromeStorage();
        const replays = await getReplays();
        if (replays[replayId]) {
            replays[replayId] = { ...replays[replayId], ...updates };
            await chrome.storage.local.set({ [STORAGE_KEYS.REPLAYS]: replays });

            // Only update stats if replay is completed
            if (updates.status === 'completed') {
                await updateStats();
            }

            return replays[replayId];
        }
        return null;
    } catch (error) {
        console.error('Failed to update replay status:', error);
        throw error;
    }
};

const deleteReplay = async (replayId) => {
    try {
        ensureChromeStorage();
        const replays = await getReplays();
        delete replays[replayId];
        await chrome.storage.local.set({ [STORAGE_KEYS.REPLAYS]: replays });
        await updateStats();
    } catch (error) {
        console.error('Failed to delete replay:', error);
        throw error;
    }
};

const deleteReplaysForTeam = async (teamId) => {
    try {
        ensureChromeStorage();
        const replays = await getReplays();
        const filteredReplays = {};

        for (const [replayId, replay] of Object.entries(replays)) {
            if (replay.teamId !== teamId) {
                filteredReplays[replayId] = replay;
            }
        }

        await chrome.storage.local.set({ [STORAGE_KEYS.REPLAYS]: filteredReplays });
    } catch (error) {
        console.error('Failed to delete replays for team:', error);
        throw error;
    }
};

// Stats functions
const getStats = async () => {
    try {
        ensureChromeStorage();
        const result = await chrome.storage.local.get(STORAGE_KEYS.STATS);
        return result[STORAGE_KEYS.STATS] || { totalTeams: 0, totalReplays: 0, overallWinRate: 0 };
    } catch (error) {
        console.error('Failed to get stats:', error);
        return { totalTeams: 0, totalReplays: 0, overallWinRate: 0 };
    }
};

const updateStats = async () => {
    try {
        ensureChromeStorage();
        const teams = await getTeams();
        const replays = await getReplays();

        const totalTeams = Object.keys(teams).length;
        const totalReplays = Object.keys(replays).length;

        // Calculate overall win rate from replays
        let totalWins = 0;
        let totalGames = 0;

        for (const replay of Object.values(replays)) {
            if (replay.parsedData && replay.parsedData.winner) {
                totalGames++;

                // Check if the current user won by comparing winner with player names
                const players = replay.parsedData.players || [];
                const winner = replay.parsedData.winner;

                // For now, assume user is always player 1 (p1) - we'll improve this later
                if (players.length >= 2 && winner === players[0].name) {
                    totalWins++;
                }
            }
        }

        const overallWinRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

        const stats = {
            totalTeams,
            totalReplays,
            overallWinRate,
            lastUpdated: new Date().toISOString()
        };

        await chrome.storage.local.set({ [STORAGE_KEYS.STATS]: stats });
        return stats;
    } catch (error) {
        console.error('Failed to update stats:', error);
    }
};

const getTeamStats = async (teamId) => {
    const teamReplays = await getReplaysForTeam(teamId);
    const replayArray = Object.values(teamReplays);

    let wins = 0;
    let totalGames = replayArray.length;

    for (const replay of replayArray) {
        if (replay.parsedData && replay.parsedData.winner) {
            const players = replay.parsedData.players || [];
            const winner = replay.parsedData.winner;

            // Simple win detection - improve this later
            if (players.length >= 2 && winner === players[0].name) {
                wins++;
            }
        }
    }

    return {
        totalGames,
        wins,
        losses: totalGames - wins,
        winRate: totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0,
        lastBattle: replayArray.length > 0
            ? Math.max(...replayArray.map(r => new Date(r.dateAdded).getTime()))
            : null
    };
};

// Settings functions
const getSettings = async () => {
    try {
        ensureChromeStorage();
        const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
        return result[STORAGE_KEYS.SETTINGS] || {
            autoImport: false,
            notifications: true,
            theme: 'dark'
        };
    } catch (error) {
        console.error('Failed to get settings:', error);
        return { autoImport: false, notifications: true, theme: 'dark' };
    }
};

const updateSettings = async (settings) => {
    try {
        ensureChromeStorage();
        await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
    } catch (error) {
        console.error('Failed to update settings:', error);
        throw error;
    }
};

// Utility functions
const clearAllData = async () => {
    try {
        ensureChromeStorage();
        await chrome.storage.local.clear();
        await initializeSampleData();
    } catch (error) {
        console.error('Failed to clear data:', error);
        throw new Error('Failed to clear data');
    }
};

const getStorageUsage = async () => {
    try {
        ensureChromeStorage();
        const result = await chrome.storage.local.getBytesInUse();
        return {
            used: result,
            percentage: Math.round((result / chrome.storage.local.QUOTA_BYTES) * 100)
        };
    } catch (error) {
        console.error('Failed to get storage usage:', error);
        return { used: 0, percentage: 0 };
    }
};

// Sample data initialization
const initializeSampleData = async () => {
    try {
        ensureChromeStorage();

        const sampleTeams = {
            'team_1': {
                id: 'team_1',
                name: 'Reg I Restricteds',
                description: 'My main team for VGC 2025 Regulation I',
                pokepaste: 'https://pokepast.es/ae3a60c6c5f40484',
                showdownUsernames: ['YourUsername'],
                format: 'VGC 2025 Reg I',
                tags: ['Restricteds', 'Main'],
                dateCreated: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                isArchived: false
            }
        };

        const sampleStats = {
            totalTeams: 1,
            totalReplays: 0,
            overallWinRate: 0,
            lastUpdated: new Date().toISOString()
        };

        const sampleSettings = {
            autoImport: false,
            notifications: true,
            theme: 'dark'
        };

        await Promise.all([
            chrome.storage.local.set({ [STORAGE_KEYS.TEAMS]: sampleTeams }),
            chrome.storage.local.set({ [STORAGE_KEYS.REPLAYS]: {} }),
            chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: sampleSettings }),
            chrome.storage.local.set({ [STORAGE_KEYS.STATS]: sampleStats })
        ]);
    } catch (error) {
        console.error('Failed to initialize sample data:', error);
        throw error;
    }
};

// Initialize function
const initialize = async () => {
    try {
        const teams = await getTeams();
        if (Object.keys(teams).length === 0) {
            await initializeSampleData();
        }
    } catch (error) {
        console.error('Failed to initialize storage:', error);
    }
};

// Export/import functions
const exportData = async () => {
    try {
        const [teams, replays, settings, stats] = await Promise.all([
            getTeams(),
            getReplays(),
            getSettings(),
            getStats()
        ]);

        return {
            version: '1.0',
            exportDate: new Date().toISOString(),
            data: {
                teams,
                replays,
                settings,
                stats
            }
        };
    } catch (error) {
        console.error('Failed to export data:', error);
        throw new Error('Failed to export data');
    }
};

const importData = async (importData) => {
    try {
        ensureChromeStorage();

        if (!importData.data) {
            throw new Error('Invalid import data format');
        }

        const { teams, replays, settings, stats } = importData.data;

        await Promise.all([
            chrome.storage.local.set({ [STORAGE_KEYS.TEAMS]: teams || {} }),
            chrome.storage.local.set({ [STORAGE_KEYS.REPLAYS]: replays || {} }),
            chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings || {} }),
            chrome.storage.local.set({ [STORAGE_KEYS.STATS]: stats || {} })
        ]);

        // Recalculate stats after import
        await updateStats();

        return true;
    } catch (error) {
        console.error('Failed to import data:', error);
        throw new Error('Failed to import data');
    }
};

// Create the service object
const StorageService = {
    // Constants
    STORAGE_KEYS,

    // Team methods
    getTeams,
    getTeam,
    saveTeam,
    addTeam,
    deleteTeam,

    // Replay methods
    getReplays,
    getReplaysForTeam,
    getReplay,
    addReplay,
    updateReplay,
    updateReplayStatus,
    deleteReplay,
    deleteReplaysForTeam,

    // Stats methods
    getStats,
    updateStats,
    getTeamStats,

    // Settings methods
    getSettings,
    updateSettings,

    // Utility methods
    initialize,
    clearAllData,
    getStorageUsage,
    exportData,
    importData
};

console.log('✅ StorageService created with methods:', Object.keys(StorageService));

// Export the service with both named and default exports
export { StorageService };
export default StorageService;