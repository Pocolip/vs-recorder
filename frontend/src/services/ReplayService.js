// src/services/ReplayService.js
import { replayApi } from './api';

/**
 * Replay Service - wraps replayApi for backward compatibility
 * Backend handles all replay fetching and parsing via ShowdownService
 */
class ReplayService {
  /**
   * Get all replays (returns object with IDs as keys)
   * @returns {Promise<Object>} Replays object
   */
  static async getAll() {
    // Note: This method isn't typically used - getByTeamId is preferred
    console.warn('ReplayService.getAll() called - consider using getByTeamId instead');
    return {};
  }

  /**
   * Get a single replay by ID
   * @param {number} id - Replay ID
   * @returns {Promise<Object|null>} Replay with full battle log
   */
  static async getById(id) {
    try {
      return await replayApi.getById(id);
    } catch (error) {
      console.error('Error fetching replay:', error);
      return null;
    }
  }

  /**
   * Create replay from Showdown URL (backend handles fetching and parsing)
   * @param {number} teamId - Team ID
   * @param {string} url - Showdown replay URL
   * @param {string} notes - Optional notes
   * @returns {Promise<Object>} Created replay
   */
  static async createFromUrl(teamId, url, notes = '') {
    return await replayApi.createFromUrl(teamId, url, notes);
  }

  /**
   * Create replay manually with full data
   * @param {Object} replayData - Full replay data
   * @returns {Promise<Object>} Created replay
   */
  static async create(replayData) {
    const data = {
      url: replayData.url,
      battleLog: replayData.battleData?.raw || replayData.battleLog,
      opponent: replayData.opponent,
      result: replayData.result,
      gameNumber: replayData.battleData?.bestOf3?.gameNumber,
      notes: replayData.notes || '',
    };

    return await replayApi.create(replayData.teamId, data);
  }

  /**
   * Update an existing replay
   * @param {number} id - Replay ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object|null>} Updated replay
   */
  static async update(id, updates) {
    try {
      return await replayApi.update(id, updates);
    } catch (error) {
      console.error('Error updating replay:', error);
      return null;
    }
  }

  /**
   * Delete a replay by ID
   * @param {number} id - Replay ID
   * @returns {Promise<boolean>} True if deleted
   */
  static async delete(id) {
    try {
      await replayApi.delete(id);
      return true;
    } catch (error) {
      console.error('Error deleting replay:', error);
      return false;
    }
  }

  /**
   * Get replays as array (sorted by most recent)
   * @returns {Promise<Array>} Array of replays
   */
  static async getList() {
    console.warn('ReplayService.getList() called without teamId - use getByTeamId instead');
    return [];
  }

  /**
   * Get replays for a specific team
   * @param {number} teamId - Team ID
   * @returns {Promise<Array>} Array of replays
   */
  static async getByTeamId(teamId) {
    try {
      const replays = await replayApi.getByTeamId(teamId);
      return replays.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } catch (error) {
      console.error('Error fetching replays by team:', error);
      return [];
    }
  }

  /**
   * Get replays by result
   * @param {number} teamId - Team ID (required)
   * @param {string} result - "win" or "loss"
   * @returns {Promise<Array>} Filtered replays
   */
  static async getByResult(teamId, result) {
    if (!teamId) {
      console.error('teamId required for getByResult');
      return [];
    }
    try {
      return await replayApi.getByResult(teamId, result);
    } catch (error) {
      console.error('Error fetching replays by result:', error);
      return [];
    }
  }

  /**
   * Get replays by team and result (alias for getByResult)
   * @param {number} teamId - Team ID
   * @param {string} result - "win" or "loss"
   * @returns {Promise<Array>} Filtered replays
   */
  static async getByTeamIdAndResult(teamId, result) {
    return await this.getByResult(teamId, result);
  }

  /**
   * Check if replay exists
   * @param {number} id - Replay ID
   * @returns {Promise<boolean>} True if exists
   */
  static async exists(id) {
    const replay = await this.getById(id);
    return replay !== null;
  }

  /**
   * Check if replay URL already exists
   * @param {string} url - Replay URL
   * @returns {Promise<boolean>} True if exists
   */
  static async existsByUrl(url) {
    try {
      return await replayApi.checkExists(url);
    } catch (error) {
      console.error('Error checking replay URL:', error);
      return false;
    }
  }

  /**
   * Check if replay URL already exists for a specific team
   * @param {string} url - Replay URL
   * @param {number} teamId - Team ID
   * @returns {Promise<boolean>} True if exists for this team
   */
  static async existsByUrlForTeam(url, teamId) {
    try {
      const replays = await this.getByTeamId(teamId);
      return replays.some((replay) => replay.url === url);
    } catch (error) {
      console.error('Error checking replay URL for team:', error);
      return false;
    }
  }

  /**
   * Get replay count for a team
   * @param {number} teamId - Team ID
   * @returns {Promise<number>} Count of replays
   */
  static async getCountByTeamId(teamId) {
    const replays = await this.getByTeamId(teamId);
    return replays.length;
  }

  /**
   * Batch create replays from multiple URLs
   * @param {number} teamId - Team ID
   * @param {Array<string>} replayUrls - Array of replay URLs
   * @param {Function} progressCallback - Optional progress callback
   * @returns {Promise<Object>} { results: Array, errors: Array }
   */
  static async createManyFromUrls(teamId, replayUrls, progressCallback = null) {
    const results = [];
    const errors = [];

    for (let i = 0; i < replayUrls.length; i++) {
      const url = replayUrls[i].trim();
      if (!url) continue;

      try {
        const replay = await this.createFromUrl(teamId, url);
        results.push(replay);
      } catch (error) {
        errors.push({ url, error: error.message });
      }

      // Call progress callback if provided
      if (progressCallback) {
        progressCallback(i + 1, replayUrls.length, results.length, errors.length);
      }

      // Small delay to avoid overwhelming the API
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return { results, errors };
  }

  /**
   * Get standalone replays (not in any match)
   * @param {number} teamId - Team ID
   * @returns {Promise<Array>} Standalone replays
   */
  static async getStandaloneReplays(teamId) {
    try {
      return await replayApi.getStandalone(teamId);
    } catch (error) {
      console.error('Error fetching standalone replays:', error);
      return [];
    }
  }

  /**
   * Delete all replays for a team
   * @param {number} teamId - Team ID
   * @returns {Promise<number>} Number of deleted replays
   */
  static async deleteByTeamId(teamId) {
    try {
      const replays = await this.getByTeamId(teamId);
      let deletedCount = 0;

      for (const replay of replays) {
        const success = await this.delete(replay.id);
        if (success) deletedCount++;
      }

      return deletedCount;
    } catch (error) {
      console.error('Error deleting replays by team:', error);
      return 0;
    }
  }

  /**
   * Search replays by opponent name or notes
   * Note: Backend doesn't have a search endpoint, so we filter client-side
   * @param {number} teamId - Team ID
   * @param {string} query - Search query
   * @returns {Promise<Array>} Filtered replays
   */
  static async search(teamId, query) {
    const replays = await this.getByTeamId(teamId);
    const lowerQuery = query.toLowerCase();

    return replays.filter(
      (replay) =>
        (replay.opponent && replay.opponent.toLowerCase().includes(lowerQuery)) ||
        (replay.notes && replay.notes.toLowerCase().includes(lowerQuery)) ||
        (replay.url && replay.url.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get match summary text (e.g., "Won 2-0", "Lost 1-2")
   * @param {Object} match - Match object with replays
   * @returns {string} Summary text
   */
  static getMatchSummary(match) {
    if (!match || !match.replays || match.replays.length === 0) {
      return 'No games';
    }

    const wins = match.replays.filter(r => r.result === 'win').length;
    const losses = match.replays.filter(r => r.result === 'loss').length;

    // Determine overall match result
    const matchResult = match.matchResult || (wins > losses ? 'win' : losses > wins ? 'loss' : 'tie');

    if (matchResult === 'win') {
      return `Won ${wins}-${losses}`;
    } else if (matchResult === 'loss') {
      return `Lost ${losses}-${wins}`;
    } else {
      return `Tied ${wins}-${losses}`;
    }
  }

  /**
   * Get game-by-game results for a match
   * @param {Object} match - Match object with replays
   * @returns {Array} Array of game result objects
   */
  static getGameByGameResults(match) {
    if (!match || !match.replays || match.replays.length === 0) {
      return [];
    }

    // Sort replays by game number
    const sortedReplays = [...match.replays].sort((a, b) => {
      const aNum = a.gameNumber || 0;
      const bNum = b.gameNumber || 0;
      return aNum - bNum;
    });

    return sortedReplays.map((replay) => {
      const isWin = replay.result === 'win';
      return {
        gameNumber: replay.gameNumber || 1,
        displayResult: isWin ? 'Win' : 'Loss',
        resultClass: isWin ? 'text-green-400' : 'text-red-400',
        replayUrl: replay.url,
        replay: replay
      };
    });
  }
}

export default ReplayService;
