import apiClient from "./client";
import type { UsageStats, MatchupStats, MoveUsage } from "../../types";

export const analyticsApi = {
  getUsageStats: (teamId: number) =>
    apiClient.get(`/api/teams/${teamId}/analytics/usage`) as Promise<UsageStats>,

  getMatchupStats: (teamId: number) =>
    apiClient.get(`/api/teams/${teamId}/analytics/matchups`) as Promise<MatchupStats>,

  getMoveUsage: (teamId: number) =>
    apiClient.get(`/api/teams/${teamId}/analytics/moves`) as Promise<MoveUsage>,

  getCustomMatchup: (teamId: number, opponentPokemon: string[]) =>
    apiClient.post(`/api/teams/${teamId}/analytics/matchups/custom`, {
      opponentPokemon,
    }) as Promise<Record<string, unknown>>,
};

export default analyticsApi;
