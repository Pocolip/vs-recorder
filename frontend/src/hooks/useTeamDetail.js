import { useState, useEffect, useCallback } from 'react';
import { teamApi, replayApi, matchApi } from '@/services/api';
import { useToast } from '@/contexts';

/**
 * Custom hook for fetching and managing team detail data
 * Fetches team info, stats, replays, and matches
 * @param {number} teamId - Team ID
 * @returns {Object} Team detail data and methods
 */
export const useTeamDetail = (teamId) => {
  const [team, setTeam] = useState(null);
  const [stats, setStats] = useState(null);
  const [replays, setReplays] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showError, showSuccess } = useToast();

  const fetchTeamData = useCallback(async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      const [teamData, statsData] = await Promise.all([
        teamApi.getById(teamId),
        teamApi.getStats(teamId),
      ]);

      setTeam(teamData);
      setStats(statsData);

      // Extract replays and matches from team data
      if (teamData.replays) {
        setReplays(teamData.replays);
      }
      if (teamData.matches) {
        setMatches(teamData.matches);
      }
    } catch (err) {
      console.error('Error fetching team data:', err);
      showError('Failed to load team data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [teamId, showError]);

  useEffect(() => {
    fetchTeamData();
  }, [fetchTeamData]);

  /**
   * Add a replay from URL
   * @param {string} url - Showdown replay URL
   * @param {string} notes - Optional notes
   */
  const addReplay = async (url, notes = '') => {
    try {
      const newReplay = await replayApi.createFromUrl(teamId, url, notes);
      setReplays((prev) => [...prev, newReplay]);
      showSuccess('Replay added successfully!');
      // Refetch stats to update win rate
      const updatedStats = await teamApi.getStats(teamId);
      setStats(updatedStats);
      return newReplay;
    } catch (err) {
      console.error('Error adding replay:', err);
      showError(err.message || 'Failed to add replay. Please check the URL and try again.');
      throw err;
    }
  };

  /**
   * Update replay notes
   * @param {number} replayId - Replay ID
   * @param {Object} updates - Update data
   */
  const updateReplay = async (replayId, updates) => {
    try {
      const updatedReplay = await replayApi.update(replayId, updates);
      setReplays((prev) =>
        prev.map((r) => (r.id === replayId ? updatedReplay : r))
      );
      showSuccess('Replay updated successfully!');
      return updatedReplay;
    } catch (err) {
      console.error('Error updating replay:', err);
      showError('Failed to update replay.');
      throw err;
    }
  };

  /**
   * Delete a replay
   * @param {number} replayId - Replay ID
   */
  const deleteReplay = async (replayId) => {
    try {
      await replayApi.delete(replayId);
      setReplays((prev) => prev.filter((r) => r.id !== replayId));
      showSuccess('Replay deleted successfully!');
      // Refetch stats to update win rate
      const updatedStats = await teamApi.getStats(teamId);
      setStats(updatedStats);
    } catch (err) {
      console.error('Error deleting replay:', err);
      showError('Failed to delete replay.');
      throw err;
    }
  };

  /**
   * Create a new match (Bo3)
   * @param {Object} matchData - Match data (opponentName, notes)
   */
  const createMatch = async (matchData) => {
    try {
      const newMatch = await matchApi.create({
        ...matchData,
        teamId,
      });
      setMatches((prev) => [...prev, newMatch]);
      showSuccess('Match created successfully!');
      return newMatch;
    } catch (err) {
      console.error('Error creating match:', err);
      showError('Failed to create match.');
      throw err;
    }
  };

  /**
   * Update match details
   * @param {number} matchId - Match ID
   * @param {Object} updates - Update data
   */
  const updateMatch = async (matchId, updates) => {
    try {
      const updatedMatch = await matchApi.update(matchId, updates);
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? updatedMatch : m))
      );
      showSuccess('Match updated successfully!');
      return updatedMatch;
    } catch (err) {
      console.error('Error updating match:', err);
      showError('Failed to update match.');
      throw err;
    }
  };

  /**
   * Delete a match
   * @param {number} matchId - Match ID
   */
  const deleteMatch = async (matchId) => {
    try {
      await matchApi.delete(matchId);
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
      showSuccess('Match deleted successfully!');
    } catch (err) {
      console.error('Error deleting match:', err);
      showError('Failed to delete match.');
      throw err;
    }
  };

  /**
   * Add a replay to a match
   * @param {number} matchId - Match ID
   * @param {number} replayId - Replay ID
   */
  const addReplayToMatch = async (matchId, replayId) => {
    try {
      const updatedMatch = await matchApi.addReplay(matchId, replayId);
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? updatedMatch : m))
      );
      showSuccess('Replay added to match!');
      return updatedMatch;
    } catch (err) {
      console.error('Error adding replay to match:', err);
      showError('Failed to add replay to match.');
      throw err;
    }
  };

  /**
   * Remove a replay from a match
   * @param {number} matchId - Match ID
   * @param {number} replayId - Replay ID
   */
  const removeReplayFromMatch = async (matchId, replayId) => {
    try {
      const updatedMatch = await matchApi.removeReplay(matchId, replayId);
      setMatches((prev) =>
        prev.map((m) => (m.id === matchId ? updatedMatch : m))
      );
      showSuccess('Replay removed from match!');
      return updatedMatch;
    } catch (err) {
      console.error('Error removing replay from match:', err);
      showError('Failed to remove replay from match.');
      throw err;
    }
  };

  return {
    team,
    stats,
    replays,
    matches,
    loading,
    addReplay,
    updateReplay,
    deleteReplay,
    createMatch,
    updateMatch,
    deleteMatch,
    addReplayToMatch,
    removeReplayFromMatch,
    refetch: fetchTeamData,
  };
};

export default useTeamDetail;
