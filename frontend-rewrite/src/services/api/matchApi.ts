import apiClient from "./client";
import type { Match, MatchStats } from "../../types";

export const matchApi = {
  getById: (id: number) =>
    apiClient.get(`/api/matches/${id}`) as Promise<Match>,

  getByTeamId: (teamId: number) =>
    apiClient.get(`/api/matches?teamId=${teamId}`) as Promise<Match[]>,

  getWithReplays: (teamId: number) =>
    apiClient.get(`/api/matches/with-replays?teamId=${teamId}`) as Promise<Match[]>,

  create: (data: { teamId: number; opponent: string; notes?: string; tags?: string[] }) =>
    apiClient.post("/api/matches", data) as Promise<Match>,

  update: (id: number, updates: Partial<Match>) =>
    apiClient.patch(`/api/matches/${id}`, updates) as Promise<Match>,

  delete: (id: number) =>
    apiClient.delete(`/api/matches/${id}`) as Promise<void>,

  addReplay: (matchId: number, replayId: number) =>
    apiClient.post(`/api/matches/${matchId}/replays`, { replayId }) as Promise<Match>,

  removeReplay: (matchId: number, replayId: number) =>
    apiClient.delete(`/api/matches/${matchId}/replays/${replayId}`) as Promise<Match>,

  getStats: (teamId: number) =>
    apiClient.get(`/api/matches/stats/team?teamId=${teamId}`) as Promise<MatchStats>,

  getByOpponent: (teamId: number, opponent: string) =>
    apiClient.get(`/api/matches/opponent/${opponent}?teamId=${teamId}`) as Promise<Match[]>,

  getByTag: (teamId: number, tag: string) =>
    apiClient.get(`/api/matches/tag/${tag}?teamId=${teamId}`) as Promise<Match[]>,
};

export default matchApi;
