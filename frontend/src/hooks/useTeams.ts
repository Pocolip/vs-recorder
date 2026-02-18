import { useState, useEffect, useCallback } from "react";
import { teamApi } from "../services/api/teamApi";
import type { Team } from "../types";

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setTeams(await teamApi.getAll());
    } catch (err) {
      console.error("Failed to load teams:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { teams, loading, refresh };
}

export default useTeams;
