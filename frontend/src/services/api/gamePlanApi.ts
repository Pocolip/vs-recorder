import apiClient from "./client";
import type { GamePlan, GamePlanTeam, Composition } from "../../types";

export const gamePlanApi = {
  getAll: () =>
    apiClient.get("/api/game-plans") as Promise<GamePlan[]>,

  getById: (id: number) =>
    apiClient.get(`/api/game-plans/${id}`) as Promise<GamePlan>,

  getForTeam: async (teamId: number): Promise<GamePlan | null> => {
    try {
      return (await apiClient.get(`/api/game-plans/for-team/${teamId}`)) as GamePlan;
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (msg.includes("not found") || msg.includes("404")) {
        return null;
      }
      throw error;
    }
  },

  getOrCreateForTeam: (teamId: number, name?: string) => {
    const params = name ? `?name=${encodeURIComponent(name)}` : "";
    return apiClient.post(`/api/game-plans/for-team/${teamId}${params}`) as Promise<GamePlan>;
  },

  create: (data: { teamId: number; name: string; notes?: string }) =>
    apiClient.post("/api/game-plans", data) as Promise<GamePlan>,

  update: (id: number, updates: Partial<GamePlan>) =>
    apiClient.patch(`/api/game-plans/${id}`, updates) as Promise<GamePlan>,

  delete: (id: number) =>
    apiClient.delete(`/api/game-plans/${id}`) as Promise<void>,

  // Opponent Teams
  getTeams: (gamePlanId: number) =>
    apiClient.get(`/api/game-plans/${gamePlanId}/teams`) as Promise<GamePlanTeam[]>,

  addTeam: (gamePlanId: number, data: { pokepaste: string; playerName: string; notes?: string }) =>
    apiClient.post(`/api/game-plans/${gamePlanId}/teams`, data) as Promise<GamePlanTeam>,

  updateTeam: (gamePlanId: number, teamId: number, updates: Partial<GamePlanTeam>) =>
    apiClient.patch(`/api/game-plans/${gamePlanId}/teams/${teamId}`, updates) as Promise<GamePlanTeam>,

  deleteTeam: (gamePlanId: number, teamId: number) =>
    apiClient.delete(`/api/game-plans/${gamePlanId}/teams/${teamId}`) as Promise<void>,

  // Compositions
  addComposition: (gamePlanId: number, teamId: number, composition: Composition) =>
    apiClient.post(`/api/game-plans/${gamePlanId}/teams/${teamId}/compositions`, {
      composition,
    }) as Promise<GamePlanTeam>,

  updateComposition: (gamePlanId: number, teamId: number, index: number, composition: Composition) =>
    apiClient.patch(`/api/game-plans/${gamePlanId}/teams/${teamId}/compositions`, {
      index,
      composition,
    }) as Promise<GamePlanTeam>,

  deleteComposition: (gamePlanId: number, teamId: number, index: number) =>
    apiClient.delete(
      `/api/game-plans/${gamePlanId}/teams/${teamId}/compositions/${index}`,
    ) as Promise<GamePlanTeam>,
};

export default gamePlanApi;
