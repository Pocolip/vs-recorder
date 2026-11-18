import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useActiveTeam } from "./ActiveTeamContext";
import { simulationApi } from "../services/api/simulationApi";
import type { ApiError } from "../services/api/client";
import type { SimulationDepth, SimulationStatus } from "../types";

/** While a job is unfinished. The backend polls the engine once a minute. */
const ACTIVE_POLL_MS = 30_000;
/** While idle, to notice a run someone else started (e.g. the owner, for a collaborator). */
const IDLE_POLL_MS = 5 * 60_000;
/** After a failed status load. */
const RETRY_MS = 15_000;

export interface SimulationActionError {
  message: string;
  /** The paste is unchanged since the last result; the user may run it anyway. */
  canForce: boolean;
  /** The depth of the run that failed, for "Run anyway". */
  depth: SimulationDepth | null;
}

type SimulationContextType = {
  /** The active team's simulation, or null while loading or with no team. */
  status: SimulationStatus | null;
  /** The last status load failed (it's retried). */
  loadFailed: boolean;
  /** The user's "Simulated" toggle. */
  simulated: boolean;
  setSimulated: (on: boolean) => void;
  /** The toggle is on and there's a result to show. Pages switch on this. */
  showSimulated: boolean;
  /** Changes whenever the shown result changes (a new job, or partial → complete), so pages refetch. */
  resultKey: string | null;
  busy: boolean;
  actionError: SimulationActionError | null;
  run: (depth: SimulationDepth, force?: boolean) => Promise<void>;
  cancel: () => Promise<void>;
  refresh: () => Promise<void>;
  /** The Simulations modal (status and every simulation feature), opened from the sidebar and the bar. */
  panelOpen: boolean;
  openPanel: () => void;
  closePanel: () => void;
};

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error("useSimulation must be used within a SimulationProvider");
  }
  return context;
};

/**
 * Follows the active team's matchup engine simulation for every page that needs it
 * (the analytics pages' toggle, the Diagnostics page and the sidebar). Must sit
 * inside ActiveTeamProvider.
 *
 * Responses are ordered: each team visit has a generation, and every request a
 * sequence number. A response is applied only if nothing newer has been sent since,
 * and status reads are skipped while a run or cancel is in flight, so an older read
 * can't overwrite a newer action's result.
 */
export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { team } = useActiveTeam();
  const teamId = team?.id ?? null;
  // Refetch when the paste changes, so staleness updates after an edit.
  const pokepaste = team?.pokepaste ?? null;

  const [status, setStatus] = useState<SimulationStatus | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<SimulationActionError | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const generation = useRef(0);
  const sequence = useRef(0);
  const actionInFlight = useRef(false);
  const readsInFlight = useRef(0);

  useEffect(() => {
    generation.current += 1;
    sequence.current += 1;
    actionInFlight.current = false;
    setStatus(null);
    setLoadFailed(false);
    setSimulated(false);
    setBusy(false);
    setActionError(null);
    setPanelOpen(false);
  }, [teamId]);

  const refresh = useCallback(async () => {
    if (teamId == null || actionInFlight.current) return;
    const gen = generation.current;
    const seq = ++sequence.current;
    readsInFlight.current += 1;
    try {
      const next = await simulationApi.get(teamId);
      if (generation.current === gen && sequence.current === seq) {
        setStatus(next);
        setLoadFailed(false);
      }
    } catch (err) {
      console.warn("Failed to load simulation status:", err);
      if (generation.current === gen && sequence.current === seq) setLoadFailed(true);
    } finally {
      readsInFlight.current -= 1;
    }
  }, [teamId]);

  useEffect(() => {
    refresh();
  }, [refresh, pokepaste]);

  // Poll fast while a job runs, slowly while idle, and retry after a failure.
  const unfinished = status?.job?.unfinished ?? false;
  const enabled = status?.enabled ?? true;
  useEffect(() => {
    if (teamId == null || !enabled) return;
    const interval = loadFailed && status == null ? RETRY_MS : unfinished ? ACTIVE_POLL_MS : IDLE_POLL_MS;
    // A tick waits for a slow read rather than superseding it, so slow responses still land.
    const timer = setInterval(() => {
      if (readsInFlight.current === 0) refresh();
    }, interval);
    return () => clearInterval(timer);
  }, [teamId, enabled, unfinished, loadFailed, status, refresh]);

  // Catch up when the tab comes back into view.
  useEffect(() => {
    if (teamId == null) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [teamId, refresh]);

  const act = useCallback(
    async (action: (id: number) => Promise<SimulationStatus>, depth: SimulationDepth | null) => {
      if (teamId == null || actionInFlight.current) return;
      const gen = generation.current;
      sequence.current += 1; // drop reads sent before this action
      actionInFlight.current = true;
      setBusy(true);
      setActionError(null);
      try {
        const next = await action(teamId);
        if (generation.current === gen) setStatus(next);
      } catch (err) {
        const apiError = err as ApiError;
        if (generation.current === gen) {
          setActionError({
            message: apiError.message || "Something went wrong. Please try again.",
            canForce: apiError.status === 409 && apiError.errorCode === "simulation_unchanged",
            depth,
          });
        }
      } finally {
        if (generation.current === gen) {
          actionInFlight.current = false;
          setBusy(false);
        }
      }
      // After a failure the job may have changed under us (e.g. already running).
      if (generation.current === gen) refresh();
    },
    [teamId, refresh],
  );

  const run = useCallback(
    (depth: SimulationDepth, force = false) => act((id) => simulationApi.submit(id, depth, force), depth),
    [act],
  );
  const cancel = useCallback(() => act((id) => simulationApi.cancel(id), null), [act]);
  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  const result = status?.result ?? null;
  const resultKey = result ? `${result.jobId}:${result.status}` : null;
  const showSimulated = simulated && result != null;

  const value = useMemo(
    () => ({
      status,
      loadFailed,
      simulated,
      setSimulated,
      showSimulated,
      resultKey,
      busy,
      actionError,
      run,
      cancel,
      refresh,
      panelOpen,
      openPanel,
      closePanel,
    }),
    [
      status,
      loadFailed,
      simulated,
      showSimulated,
      resultKey,
      busy,
      actionError,
      run,
      cancel,
      refresh,
      panelOpen,
      openPanel,
      closePanel,
    ],
  );

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
};
