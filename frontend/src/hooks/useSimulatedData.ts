import { useEffect, useRef, useState } from "react";
import { useActiveTeam } from "../context/ActiveTeamContext";
import { useSimulation } from "../context/SimulationContext";

/**
 * Fetch a page's simulated data while the "Simulated" toggle is on, refetching when
 * the result changes (e.g. partial → complete). Returns null data while off.
 */
export function useSimulatedData<T>(fetcher: (teamId: number) => Promise<T>) {
  const { team } = useActiveTeam();
  const { showSimulated, resultKey } = useSimulation();
  const teamId = team?.id ?? null;

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!showSimulated || teamId == null) {
      setData(null);
      setError(null);
      setFetching(false);
      return;
    }
    let cancelled = false;
    setFetching(true);
    setError(null);
    fetcherRef
      .current(teamId)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load simulated data");
      })
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showSimulated, resultKey, teamId]);

  return {
    data: showSimulated ? data : null,
    // Covers the render between switching on and the fetch starting.
    loading: showSimulated && (fetching || (data === null && error === null)),
    error: showSimulated ? error : null,
  };
}

export default useSimulatedData;
