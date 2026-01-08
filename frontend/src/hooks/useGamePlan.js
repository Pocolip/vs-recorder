import { useState, useEffect, useCallback } from 'react';
import { gamePlanApi } from '../services/api';

/**
 * Custom hook for managing a single game plan with teams and compositions
 * @param {number} gamePlanId - Game plan ID
 * @returns {Object} Game plan state and methods
 */
export const useGamePlan = (gamePlanId) => {
  const [gamePlan, setGamePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchGamePlan = useCallback(async () => {
    if (!gamePlanId) {
      setLoading(false);
      setGamePlan(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await gamePlanApi.getById(gamePlanId);
      setGamePlan(data);
    } catch (err) {
      console.error('Failed to load game plan:', err);
      setError(err.message || 'Failed to load game plan');
      setGamePlan(null);
    } finally {
      setLoading(false);
    }
  }, [gamePlanId]);

  useEffect(() => {
    fetchGamePlan();
  }, [fetchGamePlan]);

  // Opponent Team Management

  const addTeam = async (teamData) => {
    try {
      const updatedPlan = await gamePlanApi.addTeam(gamePlanId, teamData);
      setGamePlan(updatedPlan);
      return updatedPlan;
    } catch (err) {
      console.error('Failed to add team:', err);
      throw err;
    }
  };

  const updateTeam = async (teamId, updates) => {
    try {
      const updatedPlan = await gamePlanApi.updateTeam(gamePlanId, teamId, updates);
      setGamePlan(updatedPlan);
      return updatedPlan;
    } catch (err) {
      console.error('Failed to update team:', err);
      throw err;
    }
  };

  const deleteTeam = async (teamId) => {
    try {
      await gamePlanApi.deleteTeam(gamePlanId, teamId);
      // Remove team from local state
      setGamePlan((prev) => ({
        ...prev,
        teams: prev.teams.filter((team) => team.id !== teamId),
      }));
    } catch (err) {
      console.error('Failed to delete team:', err);
      throw err;
    }
  };

  // Composition Management

  const addComposition = async (teamId, composition) => {
    try {
      const updatedPlan = await gamePlanApi.addComposition(gamePlanId, teamId, composition);
      setGamePlan(updatedPlan);
      return updatedPlan;
    } catch (err) {
      console.error('Failed to add composition:', err);
      throw err;
    }
  };

  const updateComposition = async (teamId, index, composition) => {
    try {
      const updatedPlan = await gamePlanApi.updateComposition(
        gamePlanId,
        teamId,
        index,
        composition
      );
      setGamePlan(updatedPlan);
      return updatedPlan;
    } catch (err) {
      console.error('Failed to update composition:', err);
      throw err;
    }
  };

  const deleteComposition = async (teamId, index) => {
    try {
      const updatedPlan = await gamePlanApi.deleteComposition(gamePlanId, teamId, index);
      setGamePlan(updatedPlan);
      return updatedPlan;
    } catch (err) {
      console.error('Failed to delete composition:', err);
      throw err;
    }
  };

  return {
    gamePlan,
    loading,
    error,
    refetch: fetchGamePlan,

    // Team methods
    addTeam,
    updateTeam,
    deleteTeam,

    // Composition methods
    addComposition,
    updateComposition,
    deleteComposition,

    // Computed properties
    hasTeams: gamePlan?.teams?.length > 0,
    teamCount: gamePlan?.teams?.length || 0,
  };
};

export default useGamePlan;
