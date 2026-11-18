import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { simulationApi } from "../services/api/simulationApi";
import type { ApiError } from "../services/api/client";
import type { PlanEntryStatus, PlanStatus, PlanSubmitOutcome } from "../types";

/** While a plan is unfinished. The backend polls the engine once a minute. */
const ACTIVE_POLL_MS = 30_000;
/** While idle, to notice plans someone else started. */
const IDLE_POLL_MS = 5 * 60_000;
const RETRY_MS = 15_000;

export interface PlanSubmitResult {
  outcomes: PlanSubmitOutcome[];
  /** Set when the whole request failed (not allowed, the team's own paste, the network). */
  error: string | null;
}

export interface PlanSimulations {
  /** Null while loading or with no team. */
  status: PlanStatus | null;
  loadFailed: boolean;
  /** Each entry's plan, by GamePlanTeam id. */
  byEntry: Map<number, PlanEntryStatus>;
  /** Any entry's plan is queued or running. */
  anyUnfinished: boolean;
  /** Any entry has a plan to show. */
  anyResult: boolean;
  busy: boolean;
  submit: (gamePlanTeamIds: number[], force?: boolean) => Promise<PlanSubmitResult>;
  cancel: (gamePlanTeamId: number) => Promise<void>;
  refresh: () => Promise<void>;
}

/**
 * Follows the simulated plans of the active team's Matchup Planner: fast while any is
 * unfinished, slowly otherwise. Refetches when `entriesKey` changes (an entry added,
 * removed or re-pasted, or the team's paste), so staleness updates after edits.
 *
 * As in SimulationContext, a read is applied only if nothing newer was sent since,
 * so an older read can't overwrite a submit's or cancel's result.
 */
export function usePlanSimulations(teamId: number | null, entriesKey: string): PlanSimulations {
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const generation = useRef(0);
  const sequence = useRef(0);
  const readsInFlight = useRef(0);
  const actionInFlight = useRef(false);

  useEffect(() => {
    generation.current += 1;
    sequence.current += 1;
    actionInFlight.current = false;
    setStatus(null);
    setLoadFailed(false);
    setBusy(false);
  }, [teamId]);

  const refresh = useCallback(async () => {
    // Skipped while a submit or cancel is in flight: its response is newer.
    if (teamId == null || actionInFlight.current) return;
    const gen = generation.current;
    const seq = ++sequence.current;
    readsInFlight.current += 1;
    try {
      const next = await simulationApi.getPlans(teamId);
      if (generation.current === gen && sequence.current === seq) {
        setStatus(next);
        setLoadFailed(false);
      }
    } catch (err) {
      console.warn("Failed to load simulated plans:", err);
      if (generation.current === gen && sequence.current === seq) setLoadFailed(true);
    } finally {
      readsInFlight.current -= 1;
    }
  }, [teamId]);

  useEffect(() => {
    refresh();
  }, [refresh, entriesKey]);

  const anyUnfinished = status?.entries.some((e) => e.job?.unfinished) ?? false;
  const enabled = status?.enabled ?? true;
  useEffect(() => {
    if (teamId == null || !enabled) return;
    const interval = loadFailed && status == null ? RETRY_MS : anyUnfinished ? ACTIVE_POLL_MS : IDLE_POLL_MS;
    const timer = setInterval(() => {
      if (readsInFlight.current === 0) refresh();
    }, interval);
    return () => clearInterval(timer);
  }, [teamId, enabled, anyUnfinished, loadFailed, status, refresh]);

  useEffect(() => {
    if (teamId == null) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [teamId, refresh]);

  /** Runs a submit or cancel: reads sent before it, or while it runs, are dropped. */
  const act = useCallback(async <T,>(action: () => Promise<T>, onResult: (result: T) => void) => {
    const gen = generation.current;
    sequence.current += 1;
    actionInFlight.current = true;
    setBusy(true);
    try {
      const result = await action();
      if (generation.current === gen) {
        sequence.current += 1;
        onResult(result);
      }
    } finally {
      if (generation.current === gen) {
        actionInFlight.current = false;
        setBusy(false);
      }
    }
  }, []);

  const submit = useCallback(
    async (gamePlanTeamIds: number[], force = false): Promise<PlanSubmitResult> => {
      if (teamId == null || actionInFlight.current) return { outcomes: [], error: null };
      let outcomes: PlanSubmitOutcome[] = [];
      try {
        await act(
          () => simulationApi.submitPlans(teamId, gamePlanTeamIds, force),
          (response) => {
            setStatus(response.status);
            outcomes = response.outcomes;
          },
        );
        return { outcomes, error: null };
      } catch (err) {
        const apiError = err as ApiError;
        refresh();
        return { outcomes: [], error: apiError.message || "Something went wrong. Please try again." };
      }
    },
    [teamId, act, refresh],
  );

  const cancel = useCallback(
    async (gamePlanTeamId: number) => {
      if (teamId == null || actionInFlight.current) return;
      try {
        await act(() => simulationApi.cancelPlan(teamId, gamePlanTeamId), setStatus);
      } catch (err) {
        console.warn("Failed to cancel the plan:", err);
        refresh();
      }
    },
    [teamId, act, refresh],
  );

  const byEntry = useMemo(
    () => new Map((status?.entries ?? []).map((e) => [e.gamePlanTeamId, e])),
    [status],
  );
  const anyResult = status?.entries.some((e) => e.result != null) ?? false;

  return { status, loadFailed, byEntry, anyUnfinished, anyResult, busy, submit, cancel, refresh };
}

export default usePlanSimulations;
