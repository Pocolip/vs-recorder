import apiClient from "./client";
import type { UsageStats, MatchupStats, MoveUsage, CustomMatchup, AnalyticsOptions } from "../../types";

const params = (options?: AnalyticsOptions) =>
  options?.simulated ? { params: { simulated: true } } : undefined;

export const analyticsApi = {
  getUsageStats: (teamId: number, options?: AnalyticsOptions) =>
    apiClient.get(`/api/teams/${teamId}/analytics/usage`, params(options)) as Promise<UsageStats>,

  getMatchupStats: (teamId: number, options?: AnalyticsOptions) =>
    apiClient.get(`/api/teams/${teamId}/analytics/matchups`, params(options)) as Promise<MatchupStats>,

  getMoveUsage: (teamId: number, options?: AnalyticsOptions) =>
    apiClient.get(`/api/teams/${teamId}/analytics/moves`, params(options)) as Promise<MoveUsage>,

  getCustomMatchup: (teamId: number, opponentPokemon: string[], options?: AnalyticsOptions) =>
    apiClient.post(
      `/api/teams/${teamId}/analytics/matchups/custom`,
      { opponentPokemon },
      params(options),
    ) as Promise<CustomMatchup>,
};

export default analyticsApi;
