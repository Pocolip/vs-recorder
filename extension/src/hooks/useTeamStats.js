// src/hooks/useTeamStats.js
import { useState, useEffect } from 'react';
import ReplayService from '../services/ReplayService';
import { getResultStats } from '../utils/resultUtils';

/**
 * Custom hook for loading and managing team statistics
 * @param {string} teamId - The team ID to load stats for
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoLoad - Whether to automatically load stats on mount (default: true)
 * @param {boolean} options.refreshOnTeamChange - Whether to refresh when teamId changes (default: true)
 * @returns {Object} Team stats object with data, loading state, and helper functions
 */
export const useTeamStats = (teamId, options = {}) => {
    const {
        autoLoad = true,
        refreshOnTeamChange = true
    } = options;

    const [stats, setStats] = useState({
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        unknown: 0,
        winRate: 0,
        replays: []
    });
    const [loading, setLoading] = useState(autoLoad);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Load team statistics
    const loadStats = async (teamIdToLoad = teamId) => {
        if (!teamIdToLoad) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Fetch all replays for this team
            const replays = await ReplayService.getByTeamId(teamIdToLoad);

            // Extract results and calculate stats
            const results = replays.map(replay => replay.result);
            const resultStats = getResultStats(results);

            // Set comprehensive stats
            setStats({
                gamesPlayed: resultStats.total,
                wins: resultStats.wins,
                losses: resultStats.losses,
                unknown: resultStats.unknown,
                winRate: resultStats.winRate,
                replays: replays
            });

            setLastUpdated(new Date());
        } catch (err) {
            console.error('Error loading team stats:', err);
            setError(err.message || 'Failed to load team statistics');
        } finally {
            setLoading(false);
        }
    };

    // Refresh stats (useful after adding/removing replays)
    const refreshStats = () => {
        loadStats(teamId);
    };

    // Reset stats to initial state
    const resetStats = () => {
        setStats({
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            unknown: 0,
            winRate: 0,
            replays: []
        });
        setError(null);
        setLastUpdated(null);
    };

    // Auto-load on mount and teamId changes
    useEffect(() => {
        if (autoLoad && teamId) {
            loadStats(teamId);
        } else if (!teamId) {
            resetStats();
            setLoading(false);
        }
    }, [teamId, autoLoad]);

    // Additional derived stats that might be useful
    const derivedStats = {
        hasGames: stats.gamesPlayed > 0,
        winStreakPotential: stats.gamesPlayed > 0 && stats.losses === 0,
        perfectRecord: stats.gamesPlayed > 0 && stats.winRate === 100,
        needsMoreGames: stats.gamesPlayed < 5, // Arbitrary threshold for meaningful stats
        lossRate: stats.gamesPlayed > 0 ? Math.round((stats.losses / stats.gamesPlayed) * 100) : 0,
        unknownRate: stats.gamesPlayed > 0 ? Math.round((stats.unknown / stats.gamesPlayed) * 100) : 0,
        lastGameResult: stats.replays.length > 0 ? stats.replays[0]?.result : null, // Most recent game
        recentGames: stats.replays.slice(0, 5) // Last 5 games
    };

    return {
        // Core stats
        ...stats,

        // Derived/computed stats
        ...derivedStats,

        // State management
        loading,
        error,
        lastUpdated,

        // Actions
        loadStats,
        refreshStats,
        resetStats,

        // Utility functions
        isLoading: loading,
        hasError: !!error,
        isEmpty: stats.gamesPlayed === 0 && !loading,

        // For debugging/development
        _debug: {
            teamId,
            options,
            rawStats: stats
        }
    };
};

/**
 * Hook for loading multiple teams' stats at once
 * @param {Array<string>} teamIds - Array of team IDs
 * @returns {Object} Object with stats for each team and overall stats
 */
export const useMultipleTeamStats = (teamIds = []) => {
    const [allStats, setAllStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadAllStats = async () => {
        if (!teamIds || teamIds.length === 0) {
            setAllStats({});
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const statsPromises = teamIds.map(async (teamId) => {
                try {
                    const replays = await ReplayService.getByTeamId(teamId);
                    const results = replays.map(replay => replay.result);
                    const resultStats = getResultStats(results);

                    return {
                        teamId,
                        ...resultStats,
                        replays
                    };
                } catch (err) {
                    console.error(`Error loading stats for team ${teamId}:`, err);
                    return {
                        teamId,
                        wins: 0,
                        losses: 0,
                        unknown: 0,
                        total: 0,
                        winRate: 0,
                        replays: [],
                        error: err.message
                    };
                }
            });

            const allTeamStats = await Promise.all(statsPromises);

            // Convert array to object keyed by teamId
            const statsObject = {};
            allTeamStats.forEach(teamStats => {
                statsObject[teamStats.teamId] = teamStats;
            });

            setAllStats(statsObject);
        } catch (err) {
            console.error('Error loading multiple team stats:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAllStats();
    }, [teamIds.join(',')]); // Re-run when team IDs change

    // Calculate overall stats across all teams
    const overallStats = Object.values(allStats).reduce((acc, teamStats) => {
        acc.totalGames += teamStats.total || 0;
        acc.totalWins += teamStats.wins || 0;
        acc.totalLosses += teamStats.losses || 0;
        acc.totalUnknown += teamStats.unknown || 0;
        return acc;
    }, { totalGames: 0, totalWins: 0, totalLosses: 0, totalUnknown: 0 });

    overallStats.overallWinRate = overallStats.totalGames > 0
        ? Math.round((overallStats.totalWins / overallStats.totalGames) * 100)
        : 0;

    return {
        teamStats: allStats,
        overallStats,
        loading,
        error,
        refreshAll: loadAllStats,
        isEmpty: Object.keys(allStats).length === 0 && !loading
    };
};

/**
 * Hook for comparing two teams' stats
 * @param {string} teamId1 - First team ID
 * @param {string} teamId2 - Second team ID
 * @returns {Object} Comparison data and individual team stats
 */
export const useTeamComparison = (teamId1, teamId2) => {
    const team1Stats = useTeamStats(teamId1);
    const team2Stats = useTeamStats(teamId2);

    const comparison = {
        gamesPlayedDiff: team1Stats.gamesPlayed - team2Stats.gamesPlayed,
        winRateDiff: team1Stats.winRate - team2Stats.winRate,
        winsDiff: team1Stats.wins - team2Stats.wins,

        // Determine which team is "better" in various metrics
        betterWinRate: team1Stats.winRate > team2Stats.winRate ? 'team1' :
            team2Stats.winRate > team1Stats.winRate ? 'team2' : 'tie',
        moreGames: team1Stats.gamesPlayed > team2Stats.gamesPlayed ? 'team1' :
            team2Stats.gamesPlayed > team1Stats.gamesPlayed ? 'team2' : 'tie',
        moreWins: team1Stats.wins > team2Stats.wins ? 'team1' :
            team2Stats.wins > team1Stats.wins ? 'team2' : 'tie'
    };

    return {
        team1: team1Stats,
        team2: team2Stats,
        comparison,
        loading: team1Stats.loading || team2Stats.loading,
        error: team1Stats.error || team2Stats.error
    };
};