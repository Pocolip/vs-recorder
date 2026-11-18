import apiClient from "./client";
import type {
  PlanStatus,
  PlanSubmitResponse,
  SimulationDepth,
  SimulationStatus,
  SimulationDiagnostics,
} from "../../types";

/** A team's matchup engine simulation. */
export const simulationApi = {
  get: (teamId: number) =>
    apiClient.get(`/api/teams/${teamId}/simulation`) as Promise<SimulationStatus>,

  /** Owner only. `force` re-runs even if the paste is unchanged since a result this deep. */
  submit: (teamId: number, depth: SimulationDepth, force = false) =>
    apiClient.post(`/api/teams/${teamId}/simulation`, null, {
      params: force ? { depth, force: true } : { depth },
    }) as Promise<SimulationStatus>,

  /** Owner only. The job stays unfinished until the engine confirms. */
  cancel: (teamId: number) =>
    apiClient.delete(`/api/teams/${teamId}/simulation`) as Promise<SimulationStatus>,

  getDiagnostics: (teamId: number) =>
    apiClient.get(`/api/teams/${teamId}/simulation/diagnostics`) as Promise<SimulationDiagnostics>,

  /** Every Matchup Planner entry's simulated plan. */
  getPlans: (teamId: number) =>
    apiClient.get(`/api/teams/${teamId}/simulation/plans`) as Promise<PlanStatus>,

  /**
   * Owner only. One job per entry, started together. `force` re-runs entries whose
   * plan is up to date. Each entry gets an outcome: queued, or why not.
   */
  submitPlans: (teamId: number, gamePlanTeamIds: number[], force = false) =>
    apiClient.post(`/api/teams/${teamId}/simulation/plans`, { gamePlanTeamIds, force }) as Promise<PlanSubmitResponse>,

  /** Owner only. The job stays unfinished until the engine confirms. */
  cancelPlan: (teamId: number, gamePlanTeamId: number) =>
    apiClient.delete(`/api/teams/${teamId}/simulation/plans/${gamePlanTeamId}`) as Promise<PlanStatus>,
};

export default simulationApi;
