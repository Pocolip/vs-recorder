import { useEffect, useState } from "react";
import { useActiveTeam } from "../context/ActiveTeamContext";
import { replayApi, type ReplayBrowseFilters, type ReplayPage } from "../services/api/replayApi";

export function useReplayPage(teamId: number | null, filters: ReplayBrowseFilters) {
  const { statsVersion, bumpStatsVersion, replayPages } = useActiveTeam();
  const key = JSON.stringify([teamId, filters, statsVersion]);
  const [state, setState] = useState<{ key: string; data?: ReplayPage; error?: string }>({ key: "" });
  useEffect(() => {
    if (!teamId) return;
    let cancelled = false;
    let pending = replayPages.get(key);
    if (!pending) {
      pending = replayApi.browse(teamId, filters);
      replayPages.set(key, pending);
      if (replayPages.size > 40) replayPages.delete(replayPages.keys().next().value!);
    }
    pending.then((data) => { if (!cancelled) setState({ key, data }); })
      .catch((error: unknown) => {
        replayPages.delete(key);
        if (!cancelled) setState({ key, error: error instanceof Error ? error.message : "Could not load replays" });
      });
    return () => { cancelled = true; };
  }, [key, teamId, replayPages]); // eslint-disable-line react-hooks/exhaustive-deps
  const current = state.key === key ? state : undefined;
  return { data: current?.data, loading: !!teamId && !current, error: current?.error, refresh: bumpStatsVersion };
}
