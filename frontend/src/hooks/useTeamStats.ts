import { useEffect, useCallback, useSyncExternalStore } from "react";
import { useActiveTeam } from "../context/ActiveTeamContext";
import { getResultStats } from "../utils/resultUtils";

export const useTeamStats = (teamId: number | null, options: { autoLoad?: boolean } = {}) => {
  const { getReplayStore } = useActiveTeam();
  const store = getReplayStore(teamId);
  const { replays, loading, error, lastUpdated } = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const autoLoad = options.autoLoad ?? true;
  useEffect(() => { if (teamId && autoLoad) void store.load(teamId); }, [store, teamId, autoLoad]);
  const refreshStats = useCallback(() => { if (teamId) store.invalidate(teamId); }, [store, teamId]);
  const loadStats = refreshStats;
  const resetStats = refreshStats;
  const updateReplaysLocal = store.update;
  const results = getResultStats(replays.map((replay) => replay.result));
  const stats = { ...results, gamesPlayed: results.total, replays };

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
    updateReplaysLocal,
    resetStats,
    isLoading: loading,
    hasError: !!error,
    isEmpty: stats.gamesPlayed === 0 && !loading,
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
