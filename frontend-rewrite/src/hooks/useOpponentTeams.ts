import { useState, useEffect, useCallback, useRef } from "react";
import { gamePlanApi } from "../services/api";
import type { GamePlanTeam, Composition } from "../types";

interface OpponentTeam {
  id: number;
  teamId: number;
  gamePlanId: number;
  pokepaste: string;
  notes: string;
  color: string;
  compositions: Composition[];
  createdAt: string;
}

interface UseOpponentTeamsOptions {
  autoLoad?: boolean;
}

export const useOpponentTeams = (
  teamId: number | null,
  options: UseOpponentTeamsOptions = {},
) => {
  const { autoLoad = true } = options;

  const [opponentTeams, setOpponentTeams] = useState<OpponentTeam[]>([]);
  const [gamePlanId, setGamePlanId] = useState<number | null>(null);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const hasLoadedRef = useRef(false);

  const transformTeam = (team: GamePlanTeam): OpponentTeam => ({
    id: team.id,
    teamId: teamId!,
    gamePlanId: team.gamePlanId,
    pokepaste: team.pokepaste,
    notes: team.notes || "",
    color: (team as GamePlanTeam & { color?: string }).color || "blue",
    compositions: team.compositions || [],
    createdAt: team.createdAt,
  });

  const loadOpponentTeams = useCallback(
    async (teamIdToLoad: number | null = teamId) => {
      if (!teamIdToLoad) {
        setLoading(false);
        setOpponentTeams([]);
        setGamePlanId(null);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const gamePlan = await gamePlanApi.getOrCreateForTeam(teamIdToLoad);
        setGamePlanId(gamePlan.id);

        const teams = (gamePlan.teams || []).map(transformTeam);
        setOpponentTeams(teams);
        setLastUpdated(new Date());
        hasLoadedRef.current = true;
      } catch (err) {
        console.error("Error loading opponent teams:", err);
        setError(err instanceof Error ? err.message : "Failed to load opponent teams");
        setOpponentTeams([]);
        setGamePlanId(null);
      } finally {
        setLoading(false);
      }
    },
    [teamId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const refresh = useCallback(() => {
    loadOpponentTeams(teamId);
  }, [teamId, loadOpponentTeams]);

  const createOpponentTeam = async (data: {
    pokepaste: string;
    notes?: string;
    color?: string;
  }) => {
    if (!gamePlanId) {
      throw new Error("Game plan not initialized");
    }

    const newTeam = await gamePlanApi.addTeam(gamePlanId, {
      pokepaste: data.pokepaste,
      playerName: "",
      notes: data.notes || "",
    });

    const transformedTeam = transformTeam(newTeam);
    setOpponentTeams((prev) => [transformedTeam, ...prev]);
    setLastUpdated(new Date());
    return transformedTeam;
  };

  const updateOpponentTeam = async (
    opponentTeamId: number,
    updates: { pokepaste?: string; notes?: string; color?: string },
  ) => {
    if (!gamePlanId) {
      throw new Error("Game plan not initialized");
    }

    const updatedTeam = await gamePlanApi.updateTeam(gamePlanId, opponentTeamId, updates);
    const transformedTeam = transformTeam(updatedTeam);
    setOpponentTeams((prev) =>
      prev.map((team) => (team.id === opponentTeamId ? transformedTeam : team)),
    );
    setLastUpdated(new Date());
    return transformedTeam;
  };

  const deleteOpponentTeam = async (opponentTeamId: number) => {
    if (!gamePlanId) {
      throw new Error("Game plan not initialized");
    }

    await gamePlanApi.deleteTeam(gamePlanId, opponentTeamId);
    setOpponentTeams((prev) => prev.filter((team) => team.id !== opponentTeamId));
    setLastUpdated(new Date());
  };

  const addComposition = async (opponentTeamId: number, composition: Composition) => {
    if (!gamePlanId) {
      throw new Error("Game plan not initialized");
    }

    const updatedTeam = await gamePlanApi.addComposition(gamePlanId, opponentTeamId, composition);
    const transformedTeam = transformTeam(updatedTeam);
    setOpponentTeams((prev) =>
      prev.map((team) => (team.id === opponentTeamId ? transformedTeam : team)),
    );
    setLastUpdated(new Date());
    return transformedTeam;
  };

  const updateComposition = async (
    opponentTeamId: number,
    index: number,
    composition: Composition,
  ) => {
    if (!gamePlanId) {
      throw new Error("Game plan not initialized");
    }

    const updatedTeam = await gamePlanApi.updateComposition(
      gamePlanId,
      opponentTeamId,
      index,
      composition,
    );
    const transformedTeam = transformTeam(updatedTeam);
    setOpponentTeams((prev) =>
      prev.map((team) => (team.id === opponentTeamId ? transformedTeam : team)),
    );
    setLastUpdated(new Date());
    return transformedTeam;
  };

  const deleteComposition = async (opponentTeamId: number, index: number) => {
    if (!gamePlanId) {
      throw new Error("Game plan not initialized");
    }

    const updatedTeam = await gamePlanApi.deleteComposition(gamePlanId, opponentTeamId, index);
    const transformedTeam = transformTeam(updatedTeam);
    setOpponentTeams((prev) =>
      prev.map((team) => (team.id === opponentTeamId ? transformedTeam : team)),
    );
    setLastUpdated(new Date());
    return transformedTeam;
  };

  const getOpponentTeamById = useCallback(
    (opponentTeamId: number) => {
      return opponentTeams.find((team) => team.id === opponentTeamId) || null;
    },
    [opponentTeams],
  );

  const resetState = useCallback(() => {
    setOpponentTeams([]);
    setGamePlanId(null);
    setError(null);
    setLastUpdated(null);
    hasLoadedRef.current = false;
  }, []);

  useEffect(() => {
    if (autoLoad && teamId) {
      loadOpponentTeams(teamId);
    } else if (!teamId) {
      resetState();
      setLoading(false);
    }
  }, [teamId, autoLoad, loadOpponentTeams, resetState]);

  const totalOpponentTeams = opponentTeams.length;
  const totalCompositions = opponentTeams.reduce(
    (sum, team) => sum + (team.compositions?.length || 0),
    0,
  );

  return {
    opponentTeams,
    gamePlanId,
    loading,
    error,
    lastUpdated,
    createOpponentTeam,
    updateOpponentTeam,
    deleteOpponentTeam,
    addComposition,
    updateComposition,
    deleteComposition,
    refresh,
    getOpponentTeamById,
    resetState,
    totalOpponentTeams,
    totalCompositions,
    hasOpponentTeams: opponentTeams.length > 0,
    isEmpty: opponentTeams.length === 0 && !loading,
    isLoading: loading,
    hasError: !!error,
  };
};

export default useOpponentTeams;
