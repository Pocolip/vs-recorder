// src/services/MatchService.js
import { matchApi } from './api';

/**
 * Match Service - wraps matchApi for backward compatibility
 * Backend automatically creates matches from Bo3 replays
 */
class MatchService {
  /**
   * Get all matches (returns object with IDs as keys)
   * @returns {Promise<Object>} Matches object
   */
  static async getAll() {
    console.warn('MatchService.getAll() called - use getByTeamId instead');
    return {};
  }

  /**
   * Get a single match by ID
   * @param {number} id - Match ID
   * @returns {Promise<Object|null>} Match with replays
   */
  static async getById(id) {
    try {
      return await matchApi.getById(id);
    } catch (error) {
      console.error('Error fetching match:', error);
      return null;
    }
  }

  /**
   * Create or update match (primarily for notes/tags)
   * @param {Object} matchData - { id, teamId, opponent, notes, tags }
   * @returns {Promise<Object>} Created/updated match
   */
  static async createOrUpdate(matchData) {
    try {
      if (!matchData.id) {
        // Creating new match
        return await matchApi.create({
          teamId: matchData.teamId,
          opponent: matchData.opponent,
          notes: matchData.notes || '',
          tags: matchData.tags || [],
        });
      } else {
        // Updating existing match
        return await matchApi.update(matchData.id, {
          opponent: matchData.opponent,
          notes: matchData.notes,
          tags: matchData.tags,
        });
      }
    } catch (error) {
      console.error('Error creating/updating match:', error);
      throw error;
    }
  }

  /**
   * Update match notes
   * @param {number} matchId - Match ID
   * @param {string} notes - Notes text
   * @returns {Promise<Object|null>} Updated match
   */
  static async updateNotes(matchId, notes) {
    try {
      return await matchApi.update(matchId, { notes });
    } catch (error) {
      console.error('Error updating match notes:', error);
      return null;
    }
  }

  /**
   * Update match tags
   * @param {number} matchId - Match ID
   * @param {Array<string>} tags - Tags array
   * @returns {Promise<Object|null>} Updated match
   */
  static async updateTags(matchId, tags) {
    try {
      return await matchApi.update(matchId, { tags });
    } catch (error) {
      console.error('Error updating match tags:', error);
      return null;
    }
  }

  /**
   * Delete a match by ID
   * @param {number} id - Match ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    try {
      await matchApi.delete(id);
      return true;
    } catch (error) {
      console.error('Error deleting match:', error);
      return false;
    }
  }

  /**
   * Get matches for a specific team
   * @param {number} teamId - Team ID
   * @returns {Promise<Array>} Array of matches
   */
  static async getByTeamId(teamId) {
    try {
      const matches = await matchApi.getByTeamId(teamId);
      return matches.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    } catch (error) {
      console.error('Error fetching matches by team:', error);
      return [];
    }
  }

  /**
   * Get enhanced match data with full replay details
   * @param {number} teamId - Team ID
   * @returns {Promise<Array>} Array of matches with replays
   */
  static async getEnhancedMatches(teamId) {
    try {
      const matches = await matchApi.getWithReplays(teamId);
      return matches.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    } catch (error) {
      console.error('Error fetching enhanced matches:', error);
      return [];
    }
  }

  /**
   * Get match statistics for a team
   * @param {number} teamId - Team ID
   * @returns {Promise<Object>} Match stats
   */
  static async getMatchStats(teamId) {
    try {
      const backendStats = await matchApi.getStats(teamId);

      // Map backend field names to frontend field names
      return {
        totalMatches: backendStats.totalMatches || 0,
        completeMatches: backendStats.completeMatches || 0,
        incompleteMatches: backendStats.incompleteMatches || 0,
        wins: backendStats.matchWins || 0,
        losses: backendStats.matchLosses || 0,
        winRate: backendStats.matchWinRate != null
          ? Math.round(backendStats.matchWinRate * 10) / 10  // Round to 1 decimal place
          : 0,
      };
    } catch (error) {
      console.error('Error getting match stats:', error);
      return {
        totalMatches: 0,
        completeMatches: 0,
        incompleteMatches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
      };
    }
  }

  /**
   * Search matches by opponent name, notes, tags
   * @param {number} teamId - Team ID
   * @param {string} query - Search query
   * @returns {Promise<Array>} Filtered matches
   */
  static async search(teamId, query) {
    const matches = await this.getByTeamId(teamId);
    const lowerQuery = query.toLowerCase();

    return matches.filter((match) => {
      const searchableText = [
        match.opponent || '',
        match.notes || '',
        ...(match.tags || []),
      ]
        .join(' ')
        .toLowerCase();

      return searchableText.includes(lowerQuery);
    });
  }

  /**
   * Get matches by result
   * @param {number} teamId - Team ID
   * @param {string} result - "win" or "loss"
   * @returns {Promise<Array>} Filtered matches
   */
  static async getByResult(teamId, result) {
    const matches = await this.getByTeamId(teamId);
    return matches.filter((match) => match.result === result);
  }

  /**
   * Get matches by opponent
   * @param {number} teamId - Team ID
   * @param {string} opponent - Opponent name
   * @returns {Promise<Array>} Filtered matches
   */
  static async getByOpponent(teamId, opponent) {
    try {
      return await matchApi.getByOpponent(teamId, opponent);
    } catch (error) {
      console.error('Error fetching matches by opponent:', error);
      return [];
    }
  }

  /**
   * Get matches by tag
   * @param {number} teamId - Team ID
   * @param {string} tag - Tag name
   * @returns {Promise<Array>} Filtered matches
   */
  static async getByTag(teamId, tag) {
    try {
      return await matchApi.getByTag(teamId, tag);
    } catch (error) {
      console.error('Error fetching matches by tag:', error);
      return [];
    }
  }

  /**
   * Get recent matches (last N matches)
   * @param {number} teamId - Team ID
   * @param {number} limit - Number of matches to return
   * @returns {Promise<Array>} Recent matches
   */
  static async getRecent(teamId, limit = 10) {
    const matches = await this.getByTeamId(teamId);
    return matches.slice(0, limit);
  }

  /**
   * Get unique opponents for a team
   * @param {number} teamId - Team ID
   * @returns {Promise<Array<string>>} Array of unique opponent names
   */
  static async getUniqueOpponents(teamId) {
    const matches = await this.getByTeamId(teamId);
    const opponents = new Set();

    matches.forEach((match) => {
      if (match.opponent && !match.opponent.includes(' vs ')) {
        opponents.add(match.opponent);
      }
    });

    return Array.from(opponents).sort();
  }

  /**
   * Get all unique tags used across matches for a team
   * @param {number} teamId - Team ID
   * @returns {Promise<Array<string>>} Array of unique tags
   */
  static async getUniqueTags(teamId) {
    const matches = await this.getByTeamId(teamId);
    const tags = new Set();

    matches.forEach((match) => {
      if (match.tags) {
        match.tags.forEach((tag) => tags.add(tag));
      }
    });

    return Array.from(tags).sort();
  }

  /**
   * Delete all matches for a team
   * @param {number} teamId - Team ID
   * @returns {Promise<number>} Number of deleted matches
   */
  static async deleteByTeamId(teamId) {
    try {
      const matches = await this.getByTeamId(teamId);
      let deletedCount = 0;

      for (const match of matches) {
        const success = await this.delete(match.id);
        if (success) deletedCount++;
      }

      return deletedCount;
    } catch (error) {
      console.error('Error deleting matches by team:', error);
      return 0;
    }
  }

  /**
   * Add replay to match
   * @param {number} matchId - Match ID
   * @param {number} replayId - Replay ID
   * @returns {Promise<Object|null>} Updated match
   */
  static async addReplayToMatch(matchId, replayId) {
    try {
      return await matchApi.addReplay(matchId, replayId);
    } catch (error) {
      console.error('Error adding replay to match:', error);
      return null;
    }
  }

  /**
   * Remove replay from match
   * @param {number} matchId - Match ID
   * @param {number} replayId - Replay ID
   * @returns {Promise<Object|null>} Updated match
   */
  static async removeReplayFromMatch(matchId, replayId) {
    try {
      return await matchApi.removeReplay(matchId, replayId);
    } catch (error) {
      console.error('Error removing replay from match:', error);
      return null;
    }
  }

  // Legacy methods kept for backward compatibility but not implemented
  static async initializeFromReplays(teamId) {
    console.log('initializeFromReplays: Backend handles Bo3 match creation automatically');
    return [];
  }

  static async exportMatchData(teamId) {
    console.warn('exportMatchData: Not implemented - use backend export API');
    return {
      exportedAt: new Date().toISOString(),
      teamId,
      totalMatches: 0,
      matches: [],
    };
  }

  static async importMatchData(teamId, exportData) {
    console.warn('importMatchData: Not implemented - use backend import API');
    return { success: false, error: 'Not implemented', imported: 0 };
  }

  static async cleanupOrphanedMatches(teamId) {
    console.log('cleanupOrphanedMatches: Backend handles orphaned matches automatically');
    return { cleaned: 0, orphanedMatches: [] };
  }

  static getOpponentPokemonFromMatch(match) {
    // This would need battleLog parsing - backend handles this
    console.warn('getOpponentPokemonFromMatch: Not implemented - backend parses battle logs');
    return [];
  }

  static async getUniqueOpponentPokemon(teamId) {
    console.warn('getUniqueOpponentPokemon: Not implemented - backend handles analytics');
    return [];
  }

  static async getByCompletionStatus(teamId, isComplete) {
    const matches = await this.getByTeamId(teamId);
    return matches.filter((match) => match.isComplete === isComplete);
  }
}

export default MatchService;
