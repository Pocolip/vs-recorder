import { useEffect, useState } from "react";
import { getByTeamId } from "../services/replayService";
import type { Replay } from "../types";

export function useMatchupReplays(teamId: number | null, version: number) {
  const [data, setData] = useState<{ teamId: number | null; replays: Replay[] }>({ teamId: null, replays: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setError(null);
    setLoading(true);
    if (teamId === null) {
      setLoading(false);
      return;
    }
    getByTeamId(teamId).then((replays) => {
      if (!cancelled) setData({ teamId, replays });
    }).catch(() => {
      if (!cancelled) setError("Could not load replays.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [teamId, version, attempt]);
  return {
    replays: data.teamId === teamId ? data.replays : [],
    loading, error, retry: () => setAttempt((n) => n + 1),
  };
}
