// src/services/MatchService.js
import StorageService from './StorageService.js';
import ReplayService from './ReplayService.js';
import { cleanPokemonName } from '../utils/pokemonNameUtils.js';

class MatchService {
    static STORAGE_KEY = 'matches';

    /**
     * Get all matches
     */
    static async getAll() {
        const matches = await StorageService.get(this.STORAGE_KEY) || {};
        return matches;
    }

    /**
     * Get a single match by ID
     */
    static async getById(id) {
        const matches = await this.getAll();
        return matches[id] || null;
    }

    /**
     * Create or update match data
     */
    static async createOrUpdate(matchData) {
        const matches = await this.getAll();

        const match = {
            id: matchData.id, // Use the match ID from the replay data
            teamId: matchData.teamId,
            opponent: matchData.opponent,
            notes: matchData.notes || '',
            tags: matchData.tags || [],
            createdAt: matchData.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        matches[matchData.id] = match;
        await StorageService.set(this.STORAGE_KEY, matches);
        return match;
    }

    /**
     * Update match notes
     */
    static async updateNotes(matchId, notes) {
        const matches = await this.getAll();

        if (matches[matchId]) {
            matches[matchId].notes = notes;
            matches[matchId].updatedAt = new Date().toISOString();
            await StorageService.set(this.STORAGE_KEY, matches);
            return matches[matchId];
        }

        return null;
    }

    /**
     * Update match tags
     */
    static async updateTags(matchId, tags) {
        const matches = await this.getAll();

        if (matches[matchId]) {
            matches[matchId].tags = tags;
            matches[matchId].updatedAt = new Date().toISOString();
            await StorageService.set(this.STORAGE_KEY, matches);
            return matches[matchId];
        }

        return null;
    }

    /**
     * Delete a match by ID
     */
    static async delete(id) {
        const matches = await this.getAll();

        if (!matches[id]) {
            return false;
        }

        delete matches[id];
        await StorageService.set(this.STORAGE_KEY, matches);
        return true;
    }

    /**
     * Delete all matches for a team
     */
    static async deleteByTeamId(teamId) {
        const matches = await this.getAll();
        const matchIds = Object.keys(matches).filter(id => matches[id].teamId === teamId);

        for (const id of matchIds) {
            delete matches[id];
        }

        await StorageService.set(this.STORAGE_KEY, matches);
        return matchIds.length;
    }

    /**
     * Get matches for a specific team
     */
    static async getByTeamId(teamId) {
        const matches = await this.getAll();
        return Object.values(matches)
            .filter(match => match.teamId === teamId)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    /**
     * Get enhanced match data combining replay data with stored match data
     */
    static async getEnhancedMatches(teamId) {
        try {
            // Get Bo3 matches from replay service
            const replayMatches = await ReplayService.getBestOf3Matches(teamId);

            // Get stored match data
            const storedMatches = await this.getByTeamId(teamId);
            const storedMatchMap = new Map(storedMatches.map(m => [m.id, m]));

            // Combine the data
            const enhancedMatches = replayMatches.map(replayMatch => {
                const storedMatch = storedMatchMap.get(replayMatch.matchId);

                return {
                    // Core match data from replays
                    ...replayMatch,

                    // Additional data from storage (if exists)
                    notes: storedMatch?.notes || '',
                    tags: storedMatch?.tags || [],

                    // Metadata
                    hasStoredData: !!storedMatch,
                    lastNotesUpdate: storedMatch?.updatedAt || null
                };
            });

            return enhancedMatches;
        } catch (error) {
            console.error('Error getting enhanced matches:', error);
            return [];
        }
    }

    /**
     * Initialize match data from existing replays (useful for migration or refresh)
     */
    static async initializeFromReplays(teamId) {
        try {
            const replayMatches = await ReplayService.getBestOf3Matches(teamId);
            const results = [];

            for (const replayMatch of replayMatches) {
                // Check if match data already exists
                const existingMatch = await this.getById(replayMatch.matchId);

                if (!existingMatch) {
                    // Create new match data
                    const matchData = {
                        id: replayMatch.matchId,
                        teamId: teamId,
                        opponent: replayMatch.opponent,
                        notes: '',
                        tags: [],
                        createdAt: replayMatch.completedAt
                    };

                    const created = await this.createOrUpdate(matchData);
                    results.push(created);
                } else {
                    results.push(existingMatch);
                }
            }

            return results;
        } catch (error) {
            console.error('Error initializing matches from replays:', error);
            return [];
        }
    }

    /**
     * Get match statistics for a team
     */
    static async getMatchStats(teamId) {
        try {
            const matches = await this.getEnhancedMatches(teamId);

            const stats = {
                totalMatches: matches.length,
                completedMatches: matches.filter(m => m.isComplete).length,
                incompleteMatches: matches.filter(m => !m.isComplete).length,
                wins: matches.filter(m => m.matchResult === 'win').length,
                losses: matches.filter(m => m.matchResult === 'loss').length,
                winRate: 0,
                matchesWithNotes: matches.filter(m => m.notes && m.notes.trim()).length,
                matchesWithTags: matches.filter(m => m.tags && m.tags.length > 0).length
            };

            // Calculate win rate for completed matches only
            const completedWithResult = matches.filter(m =>
                m.isComplete && (m.matchResult === 'win' || m.matchResult === 'loss')
            );

            if (completedWithResult.length > 0) {
                stats.winRate = Math.round((stats.wins / completedWithResult.length) * 100);
            }

            return stats;
        } catch (error) {
            console.error('Error getting match stats:', error);
            return {
                totalMatches: 0,
                completedMatches: 0,
                incompleteMatches: 0,
                wins: 0,
                losses: 0,
                winRate: 0,
                matchesWithNotes: 0,
                matchesWithTags: 0
            };
        }
    }

    /**
     * Extract opponent Pokemon names from a match
     * @param {Object} match - Enhanced match object
     * @returns {Array<string>} Array of cleaned Pokemon names
     */
    static getOpponentPokemonFromMatch(match) {
        if (!match.games || match.games.length === 0) {
            return [];
        }

        // Get the first game's battle data (teams don't change within a match)
        const firstGame = match.games[0];
        if (!firstGame.battleData || !firstGame.battleData.teams || !firstGame.battleData.opponentPlayer) {
            return [];
        }

        const opponentTeam = firstGame.battleData.teams[firstGame.battleData.opponentPlayer] || [];

        // Clean and return the Pokemon names
        return opponentTeam.map(pokemon => cleanPokemonName(pokemon)).filter(name => name);
    }

    /**
     * Enhanced search matches by opponent name, notes, tags, AND opponent Pokemon
     */
    static async search(teamId, query) {
        const matches = await this.getEnhancedMatches(teamId);
        const lowerQuery = query.toLowerCase();

        return matches.filter(match => {
            // Build searchable text from existing fields
            const searchableText = [
                match.opponent || '',
                match.notes || '',
                ...(match.tags || [])
            ].join(' ').toLowerCase();

            // Check if basic text matches
            if (searchableText.includes(lowerQuery)) {
                return true;
            }

            // Check opponent Pokemon names
            const opponentPokemon = this.getOpponentPokemonFromMatch(match);
            const pokemonSearchText = opponentPokemon.join(' ').toLowerCase();

            // Also check display names (with spaces instead of hyphens)
            const pokemonDisplayText = opponentPokemon
                .map(name => name.replace(/-/g, ' '))
                .join(' ')
                .toLowerCase();

            return pokemonSearchText.includes(lowerQuery) || pokemonDisplayText.includes(lowerQuery);
        });
    }

    /**
     * Get unique opponent Pokemon across all matches for a team
     * Useful for building filter dropdowns or autocomplete
     */
    static async getUniqueOpponentPokemon(teamId) {
        const matches = await this.getEnhancedMatches(teamId);
        const pokemonSet = new Set();

        matches.forEach(match => {
            const opponentPokemon = this.getOpponentPokemonFromMatch(match);
            opponentPokemon.forEach(pokemon => pokemonSet.add(pokemon));
        });

        return Array.from(pokemonSet).sort();
    }

    /**
     * Get matches by result
     */
    static async getByResult(teamId, result) {
        const matches = await this.getEnhancedMatches(teamId);
        return matches.filter(match => match.matchResult === result);
    }

    /**
     * Get matches by completion status
     */
    static async getByCompletionStatus(teamId, isComplete) {
        const matches = await this.getEnhancedMatches(teamId);
        return matches.filter(match => match.isComplete === isComplete);
    }

    /**
     * Get recent matches (last N matches)
     */
    static async getRecent(teamId, limit = 10) {
        const matches = await this.getEnhancedMatches(teamId);
        return matches.slice(0, limit);
    }

    /**
     * Get unique opponents for a team
     */
    static async getUniqueOpponents(teamId) {
        const matches = await this.getEnhancedMatches(teamId);
        const opponents = new Set();

        matches.forEach(match => {
            if (match.opponent && !match.opponent.includes(' vs ')) {
                opponents.add(match.opponent);
            }
        });

        return Array.from(opponents).sort();
    }

    /**
     * Get all unique tags used across matches for a team
     */
    static async getUniqueTags(teamId) {
        const matches = await this.getByTeamId(teamId);
        const tags = new Set();

        matches.forEach(match => {
            if (match.tags) {
                match.tags.forEach(tag => tags.add(tag));
            }
        });

        return Array.from(tags).sort();
    }

    /**
     * Export match data for a team
     */
    static async exportMatchData(teamId) {
        const matches = await this.getEnhancedMatches(teamId);

        return {
            exportedAt: new Date().toISOString(),
            teamId,
            totalMatches: matches.length,
            matches: matches.map(match => ({
                matchId: match.matchId,
                opponent: match.opponent,
                matchResult: match.matchResult,
                seriesScore: match.seriesScore,
                isComplete: match.isComplete,
                notes: match.notes,
                tags: match.tags,
                completedAt: match.completedAt,
                gameResults: match.gameResults
            }))
        };
    }

    /**
     * Import match data (useful for backup restoration)
     */
    static async importMatchData(teamId, exportData) {
        try {
            const results = [];

            for (const matchData of exportData.matches) {
                const match = await this.createOrUpdate({
                    id: matchData.matchId,
                    teamId: teamId,
                    opponent: matchData.opponent,
                    notes: matchData.notes || '',
                    tags: matchData.tags || [],
                    createdAt: matchData.completedAt
                });

                results.push(match);
            }

            return {
                success: true,
                imported: results.length,
                matches: results
            };
        } catch (error) {
            console.error('Error importing match data:', error);
            return {
                success: false,
                error: error.message,
                imported: 0
            };
        }
    }

    /**
     * Cleanup orphaned match data (matches with no corresponding replays)
     */
    static async cleanupOrphanedMatches(teamId) {
        try {
            const storedMatches = await this.getByTeamId(teamId);
            const replayMatches = await ReplayService.getBestOf3Matches(teamId);
            const validMatchIds = new Set(replayMatches.map(m => m.matchId));

            const orphaned = storedMatches.filter(match => !validMatchIds.has(match.id));

            for (const orphan of orphaned) {
                await this.delete(orphan.id);
            }

            return {
                cleaned: orphaned.length,
                orphanedMatches: orphaned.map(m => ({ id: m.id, opponent: m.opponent }))
            };
        } catch (error) {
            console.error('Error cleaning up orphaned matches:', error);
            return { cleaned: 0, orphanedMatches: [] };
        }
    }
}

export default MatchService;