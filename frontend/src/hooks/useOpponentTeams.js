// src/hooks/useOpponentTeams.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { gamePlanApi } from '../services/api/gamePlanApi';

/**
 * Custom hook for managing opponent teams for a specific team.
 * Uses the backend GamePlan API for persistence.
 *
 * @param {string|number} teamId - The team ID to load opponent teams for
 * @param {Object} options - Configuration options
 * @param {boolean} options.autoLoad - Whether to automatically load on mount (default: true)
 * @returns {Object} Opponent teams state and methods
 */
export const useOpponentTeams = (teamId, options = {}) => {
  const { autoLoad = true } = options;

  const [opponentTeams, setOpponentTeams] = useState([]);
  const [gamePlanId, setGamePlanId] = useState(null);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Track if initial load has happened
  const hasLoadedRef = useRef(false);

  /**
   * Transform backend GamePlanTeamResponse to frontend format
   */
  const transformTeam = (team) => ({
    id: team.id,
    teamId: teamId,
    gamePlanId: team.gamePlanId,
    pokepaste: team.pokepaste,
    notes: team.notes || '',
    color: team.color || 'blue',
    compositions: team.compositions || [],
    createdAt: team.createdAt,
  });

  /**
   * Load opponent teams for this team from the backend
   */
  const loadOpponentTeams = useCallback(async (teamIdToLoad = teamId) => {
    if (!teamIdToLoad) {
      setLoading(false);
      setOpponentTeams([]);
      setGamePlanId(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get or create game plan for this team
      const gamePlan = await gamePlanApi.getOrCreateForTeam(teamIdToLoad);

      setGamePlanId(gamePlan.id);

      // Transform teams from API format
      const teams = (gamePlan.teams || []).map(transformTeam);
      setOpponentTeams(teams);
      setLastUpdated(new Date());
      hasLoadedRef.current = true;
    } catch (err) {
      console.error('Error loading opponent teams:', err);
      setError(err.message || 'Failed to load opponent teams');
      setOpponentTeams([]);
      setGamePlanId(null);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  /**
   * Refresh opponent teams
   */
  const refresh = useCallback(() => {
    loadOpponentTeams(teamId);
  }, [teamId, loadOpponentTeams]);

  /**
   * Create a new opponent team
   */
  const createOpponentTeam = async (data) => {
    if (!gamePlanId) {
      throw new Error('Game plan not initialized');
    }

    try {
      const newTeam = await gamePlanApi.addTeam(gamePlanId, {
        pokepaste: data.pokepaste,
        notes: data.notes || '',
        color: data.color,
      });

      const transformedTeam = transformTeam(newTeam);
      setOpponentTeams((prev) => [transformedTeam, ...prev]);
      setLastUpdated(new Date());
      return transformedTeam;
    } catch (err) {
      console.error('Failed to create opponent team:', err);
      throw err;
    }
  };

  /**
   * Update an opponent team
   */
  const updateOpponentTeam = async (opponentTeamId, updates) => {
    if (!gamePlanId) {
      throw new Error('Game plan not initialized');
    }

    try {
      const updatedTeam = await gamePlanApi.updateTeam(gamePlanId, opponentTeamId, {
        pokepaste: updates.pokepaste,
        notes: updates.notes,
        color: updates.color,
      });

      const transformedTeam = transformTeam(updatedTeam);
      setOpponentTeams((prev) =>
        prev.map((team) => (team.id === opponentTeamId ? transformedTeam : team))
      );
      setLastUpdated(new Date());
      return transformedTeam;
    } catch (err) {
      console.error('Failed to update opponent team:', err);
      throw err;
    }
  };

  /**
   * Delete an opponent team
   */
  const deleteOpponentTeam = async (opponentTeamId) => {
    if (!gamePlanId) {
      throw new Error('Game plan not initialized');
    }

    try {
      await gamePlanApi.deleteTeam(gamePlanId, opponentTeamId);
      setOpponentTeams((prev) => prev.filter((team) => team.id !== opponentTeamId));
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to delete opponent team:', err);
      throw err;
    }
  };

  /**
   * Add a composition (plan) to an opponent team
   */
  const addComposition = async (opponentTeamId, composition) => {
    if (!gamePlanId) {
      throw new Error('Game plan not initialized');
    }

    try {
      const updatedTeam = await gamePlanApi.addComposition(gamePlanId, opponentTeamId, composition);
      const transformedTeam = transformTeam(updatedTeam);

      setOpponentTeams((prev) =>
        prev.map((team) => (team.id === opponentTeamId ? transformedTeam : team))
      );
      setLastUpdated(new Date());
      return transformedTeam;
    } catch (err) {
      console.error('Failed to add composition:', err);
      throw err;
    }
  };

  /**
   * Update a composition by index
   */
  const updateComposition = async (opponentTeamId, index, composition) => {
    if (!gamePlanId) {
      throw new Error('Game plan not initialized');
    }

    try {
      const updatedTeam = await gamePlanApi.updateComposition(
        gamePlanId,
        opponentTeamId,
        index,
        composition
      );
      const transformedTeam = transformTeam(updatedTeam);

      setOpponentTeams((prev) =>
        prev.map((team) => (team.id === opponentTeamId ? transformedTeam : team))
      );
      setLastUpdated(new Date());
      return transformedTeam;
    } catch (err) {
      console.error('Failed to update composition:', err);
      throw err;
    }
  };

  /**
   * Delete a composition by index
   */
  const deleteComposition = async (opponentTeamId, index) => {
    if (!gamePlanId) {
      throw new Error('Game plan not initialized');
    }

    try {
      const updatedTeam = await gamePlanApi.deleteComposition(gamePlanId, opponentTeamId, index);
      const transformedTeam = transformTeam(updatedTeam);

      setOpponentTeams((prev) =>
        prev.map((team) => (team.id === opponentTeamId ? transformedTeam : team))
      );
      setLastUpdated(new Date());
      return transformedTeam;
    } catch (err) {
      console.error('Failed to delete composition:', err);
      throw err;
    }
  };

  /**
   * Get a specific opponent team by ID
   */
  const getOpponentTeamById = useCallback(
    (opponentTeamId) => {
      return opponentTeams.find((team) => team.id === opponentTeamId) || null;
    },
    [opponentTeams]
  );

  /**
   * Reset state
   */
  const resetState = useCallback(() => {
    setOpponentTeams([]);
    setGamePlanId(null);
    setError(null);
    setLastUpdated(null);
    hasLoadedRef.current = false;
  }, []);

  // Auto-load on mount and teamId changes
  useEffect(() => {
    if (autoLoad && teamId) {
      loadOpponentTeams(teamId);
    } else if (!teamId) {
      resetState();
      setLoading(false);
    }
  }, [teamId, autoLoad, loadOpponentTeams, resetState]);

  // Derived/computed stats
  const totalOpponentTeams = opponentTeams.length;
  const totalCompositions = opponentTeams.reduce(
    (sum, team) => sum + (team.compositions?.length || 0),
    0
  );

  return {
    // Data
    opponentTeams,
    gamePlanId,

    // State
    loading,
    error,
    lastUpdated,

    // Opponent Team CRUD
    createOpponentTeam,
    updateOpponentTeam,
    deleteOpponentTeam,

    // Composition Management
    addComposition,
    updateComposition,
    deleteComposition,

    // Utilities
    refresh,
    getOpponentTeamById,
    resetState,

    // Derived data
    totalOpponentTeams,
    totalCompositions,

    // Utility flags
    hasOpponentTeams: opponentTeams.length > 0,
    isEmpty: opponentTeams.length === 0 && !loading,
    isLoading: loading,
    hasError: !!error,

    // For debugging
    _debug: {
      teamId,
      gamePlanId,
      options,
      rawData: opponentTeams,
    },
  };
};

export default useOpponentTeams;
