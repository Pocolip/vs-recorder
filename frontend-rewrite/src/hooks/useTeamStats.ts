import { useState, useEffect } from "react";
import * as replayService from "../services/replayService";
import { getResultStats } from "../utils/resultUtils";
import type { Replay } from "../types";

interface TeamStatsData {
  gamesPlayed: number;
  wins: number;
  losses: number;
  unknown: number;
  winRate: number;
  replays: Replay[];
}

interface UseTeamStatsOptions {
  autoLoad?: boolean;
}

const DEFAULT_STATS: TeamStatsData = {
  gamesPlayed: 0,
  wins: 0,
  losses: 0,
  unknown: 0,
  winRate: 0,
  replays: [],
};

export const useTeamStats = (teamId: number | null, options: UseTeamStatsOptions = {}) => {
  const { autoLoad = true } = options;

  const [stats, setStats] = useState<TeamStatsData>(DEFAULT_STATS);
  const [loading, setLoading] = useState(autoLoad);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadStats = async (teamIdToLoad: number | null = teamId) => {
    if (!teamIdToLoad) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const replays = await replayService.getByTeamId(teamIdToLoad);
      const results = replays.map((replay) => replay.result);
      const resultStats = getResultStats(results);

      setStats({
        gamesPlayed: resultStats.total,
        wins: resultStats.wins,
        losses: resultStats.losses,
        unknown: resultStats.unknown,
        winRate: resultStats.winRate,
        replays,
      });

      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error loading team stats:", err);
      setError(err instanceof Error ? err.message : "Failed to load team statistics");
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = () => {
    loadStats(teamId);
  };

  const resetStats = () => {
    setStats(DEFAULT_STATS);
    setError(null);
    setLastUpdated(null);
  };

  useEffect(() => {
    if (autoLoad && teamId) {
      loadStats(teamId);
    } else if (!teamId) {
      resetStats();
      setLoading(false);
    }
  }, [teamId, autoLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasGames = stats.gamesPlayed > 0;
  const lossRate = hasGames ? Math.round((stats.losses / stats.gamesPlayed) * 100) : 0;
  const lastGameResult = stats.replays.length > 0 ? stats.replays[0]?.result ?? null : null;
  const recentGames = stats.replays.slice(0, 5);

  return {
    ...stats,
    hasGames,
    needsMoreGames: stats.gamesPlayed < 5,
    lossRate,
    lastGameResult,
    recentGames,
    loading,
    error,
    lastUpdated,
    loadStats,
    refreshStats,
    resetStats,
    isLoading: loading,
    hasError: !!error,
    isEmpty: stats.gamesPlayed === 0 && !loading,
  };
};

interface MultiTeamStatsEntry {
  teamId: number;
  wins: number;
  losses: number;
  unknown: number;
  total: number;
  winRate: number;
  replays: Replay[];
  error?: string;
}

export const useMultipleTeamStats = (teamIds: number[] = []) => {
  const [allStats, setAllStats] = useState<Record<number, MultiTeamStatsEntry>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAllStats = async () => {
    if (!teamIds || teamIds.length === 0) {
      setAllStats({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const statsPromises = teamIds.map(async (teamId): Promise<MultiTeamStatsEntry> => {
        try {
          const replays = await replayService.getByTeamId(teamId);
          const results = replays.map((replay) => replay.result);
          const resultStats = getResultStats(results);

          return { teamId, ...resultStats, replays };
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
            error: err instanceof Error ? err.message : "Failed to load",
          };
        }
      });

      const allTeamStats = await Promise.all(statsPromises);

      const statsObject: Record<number, MultiTeamStatsEntry> = {};
      for (const teamStats of allTeamStats) {
        statsObject[teamStats.teamId] = teamStats;
      }

      setAllStats(statsObject);
    } catch (err) {
      console.error("Error loading multiple team stats:", err);
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllStats();
  }, [teamIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const overallStats = Object.values(allStats).reduce(
    (acc, teamStats) => {
      acc.totalGames += teamStats.total || 0;
      acc.totalWins += teamStats.wins || 0;
      acc.totalLosses += teamStats.losses || 0;
      acc.totalUnknown += teamStats.unknown || 0;
      return acc;
    },
    { totalGames: 0, totalWins: 0, totalLosses: 0, totalUnknown: 0, overallWinRate: 0 },
  );

  overallStats.overallWinRate =
    overallStats.totalGames > 0
      ? Math.round((overallStats.totalWins / overallStats.totalGames) * 100)
      : 0;

  return {
    teamStats: allStats,
    overallStats,
    loading,
    error,
    refreshAll: loadAllStats,
    isEmpty: Object.keys(allStats).length === 0 && !loading,
  };
};

export const useTeamComparison = (teamId1: number | null, teamId2: number | null) => {
  const team1Stats = useTeamStats(teamId1);
  const team2Stats = useTeamStats(teamId2);

  const comparison = {
    gamesPlayedDiff: team1Stats.gamesPlayed - team2Stats.gamesPlayed,
    winRateDiff: team1Stats.winRate - team2Stats.winRate,
    winsDiff: team1Stats.wins - team2Stats.wins,
    betterWinRate:
      team1Stats.winRate > team2Stats.winRate
        ? "team1"
        : team2Stats.winRate > team1Stats.winRate
          ? "team2"
          : "tie",
    moreGames:
      team1Stats.gamesPlayed > team2Stats.gamesPlayed
        ? "team1"
        : team2Stats.gamesPlayed > team1Stats.gamesPlayed
          ? "team2"
          : "tie",
    moreWins:
      team1Stats.wins > team2Stats.wins
        ? "team1"
        : team2Stats.wins > team1Stats.wins
          ? "team2"
          : "tie",
  };

  return {
    team1: team1Stats,
    team2: team2Stats,
    comparison,
    loading: team1Stats.loading || team2Stats.loading,
    error: team1Stats.error || team2Stats.error,
  };
};
