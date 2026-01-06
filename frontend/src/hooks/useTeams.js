import { useState, useEffect, useCallback } from 'react';
import { teamApi } from '@/services/api';
import { useToast } from './';

/**
 * Custom hook for managing teams
 * @param {string} [regulation] - Optional regulation filter
 * @returns {Object} Teams state and actions
 */
export const useTeams = (regulation = null) => {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showError, showSuccess } = useToast();

  /**
   * Fetch teams from API
   */
  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = regulation ? await teamApi.getByRegulation(regulation) : await teamApi.getAll();
      setTeams(data);
    } catch (err) {
      console.error('Error fetching teams:', err);
      setError(err.message || 'Failed to load teams');
      showError('Failed to load teams. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [regulation, showError]);

  // Fetch teams on mount and when regulation changes
  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  /**
   * Create a new team
   * @param {Object} teamData - Team data
   * @returns {Promise<Object>} Created team
   */
  const createTeam = async (teamData) => {
    try {
      const newTeam = await teamApi.create(teamData);
      setTeams((prev) => [...prev, newTeam]);
      showSuccess(`Team "${newTeam.name}" created successfully!`);
      return newTeam;
    } catch (err) {
      console.error('Error creating team:', err);
      showError(err.message || 'Failed to create team');
      throw err;
    }
  };

  /**
   * Update a team
   * @param {number} id - Team ID
   * @param {Object} updates - Update data
   * @returns {Promise<Object>} Updated team
   */
  const updateTeam = async (id, updates) => {
    try {
      const updated = await teamApi.update(id, updates);
      setTeams((prev) => prev.map((t) => (t.id === id ? updated : t)));
      showSuccess('Team updated successfully!');
      return updated;
    } catch (err) {
      console.error('Error updating team:', err);
      showError(err.message || 'Failed to update team');
      throw err;
    }
  };

  /**
   * Delete a team
   * @param {number} id - Team ID
   * @param {string} name - Team name (for confirmation message)
   * @returns {Promise<void>}
   */
  const deleteTeam = async (id, name) => {
    try {
      await teamApi.delete(id);
      setTeams((prev) => prev.filter((t) => t.id !== id));
      showSuccess(`Team "${name}" deleted successfully`);
    } catch (err) {
      console.error('Error deleting team:', err);
      showError(err.message || 'Failed to delete team');
      throw err;
    }
  };

  /**
   * Refresh teams list
   */
  const refetch = () => {
    fetchTeams();
  };

  return {
    teams,
    loading,
    error,
    createTeam,
    updateTeam,
    deleteTeam,
    refetch,
  };
};
