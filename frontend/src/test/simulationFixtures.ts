import { vi } from "vitest";
import type { useSimulation } from "../context/SimulationContext";
import type { SimulationJob, SimulationResultInfo, SimulationStatus } from "../types";

export const simulationJob = (status: SimulationJob["status"], id = "job-2"): SimulationJob => ({
  id,
  status,
  depth: "full",
  progress: null,
  unfinished: ["QUEUED", "RUNNING", "PARTIAL"].includes(status),
  cancelRequested: false,
  errorCode: null,
  errorMessage: null,
  createdAt: "2026-11-11T00:00:00Z",
  updatedAt: null,
});

export const simulationResult = (over: Partial<SimulationResultInfo> = {}): SimulationResultInfo => ({
  jobId: "job-1",
  status: "complete",
  depth: "full",
  stale: false,
  opponentsCount: 12,
  totalGames: 480,
  opponentPokemon: [],
  createdAt: null,
  ...over,
});

/** A SimulationContext value for an allowlisted owner, with mocked actions. */
export function simulationContext(status: Partial<SimulationStatus> = {}): ReturnType<typeof useSimulation> {
  return {
    status: {
      enabled: true,
      canRun: true,
      runBlockedReason: null,
      runsLeftToday: 3,
      job: null,
      result: null,
      ...status,
    },
    loadFailed: false,
    simulated: false,
    setSimulated: vi.fn(),
    showSimulated: false,
    resultKey: null,
    busy: false,
    actionError: null,
    run: vi.fn(),
    cancel: vi.fn(),
    refresh: vi.fn(),
    panelOpen: true,
    openPanel: vi.fn(),
    closePanel: vi.fn(),
  };
}
