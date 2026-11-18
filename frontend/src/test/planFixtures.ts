import { vi } from "vitest";
import type { PlanSimulations } from "../hooks/usePlanSimulations";
import type { PlanEntryStatus, PlanJob, PlanResultInfo, PlanStatus } from "../types";

export const planJob = (status: PlanJob["status"], id = "plan-job-1", over: Partial<PlanJob> = {}): PlanJob => ({
  id,
  status,
  pasteNotes: [],
  progress: null,
  unfinished: ["QUEUED", "RUNNING", "PARTIAL"].includes(status),
  cancelRequested: false,
  errorCode: null,
  errorMessage: null,
  createdAt: "2026-11-18T00:00:00Z",
  updatedAt: null,
  ...over,
});

/** The engine's sample plan (louis's rain team against Frankfurt's winner). */
export const planResult = (over: Partial<PlanResultInfo> = {}): PlanResultInfo => ({
  jobId: "plan-job-1",
  status: "complete",
  stale: false,
  staleReason: null,
  compositions: [
    { lead1: "Golisopod", lead2: "Pelipper", back1: "Basculegion-F", back2: "Sneasler", notes: "Simulated: 40% of the engine's preview mix.", weight: 0.4025 },
    { lead1: "Pelipper", lead2: "Basculegion-F", back1: "Golisopod", back2: "Archaludon", notes: "Simulated: 29% of the engine's preview mix.", weight: 0.294 },
  ],
  opponentCompositions: [
    { lead1: "Garchomp", lead2: "Rillaboom", back1: "Gholdengo", back2: "Incineroar", notes: "Simulated: they bring this 54% of the time.", weight: 0.5427 },
  ],
  opponentSummary: "Simulated: they lead Garchomp + Rillaboom 57% of the time, with Gholdengo / Incineroar in the back.",
  games: 128,
  wins: 87,
  losses: 41,
  ties: 0,
  winRate: 0.6797,
  ci95: [0.5914, 0.768],
  category: "favorable",
  previewValue: 0.7264,
  simplifyCost: 0.1364,
  opponentSpreads: "sheet",
  createdAt: null,
  ...over,
});

/** A partial result: the compositions, no win rate yet. */
export const partialPlanResult = (): PlanResultInfo =>
  planResult({ status: "partial", games: null, wins: null, losses: null, ties: null, winRate: null, ci95: null, category: null });

export function planSimulations(entries: PlanEntryStatus[], status: Partial<PlanStatus> = {}): PlanSimulations {
  const full: PlanStatus = { enabled: true, canRun: true, runBlockedReason: null, runsLeftToday: 20, entries, ...status };
  return {
    status: full,
    loadFailed: false,
    byEntry: new Map(full.entries.map((e) => [e.gamePlanTeamId, e])),
    anyUnfinished: full.entries.some((e) => e.job?.unfinished),
    anyResult: full.entries.some((e) => e.result != null),
    busy: false,
    submit: vi.fn().mockResolvedValue({ outcomes: [], error: null }),
    cancel: vi.fn(),
    refresh: vi.fn(),
  };
}
