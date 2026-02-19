import apiClient from "./client";
import type { Replay } from "../../types";

export const replayApi = {
  getById: (id: number) =>
    apiClient.get(`/api/replays/${id}`) as Promise<Replay>,

  getByTeamId: (teamId: number) =>
    apiClient.get(`/api/replays?teamId=${teamId}`) as Promise<Replay[]>,

  createFromUrl: (teamId: number, url: string, notes = "") =>
    apiClient.post(`/api/replays/from-url?teamId=${teamId}`, { url, notes }) as Promise<Replay>,

  create: (teamId: number, data: Partial<Replay>) =>
    apiClient.post(`/api/replays?teamId=${teamId}`, data) as Promise<Replay>,

  update: (id: number, updates: Partial<Replay>) =>
    apiClient.patch(`/api/replays/${id}`, updates) as Promise<Replay>,

  delete: (id: number) =>
    apiClient.delete(`/api/replays/${id}`) as Promise<void>,

  getStandalone: (teamId: number) =>
    apiClient.get(`/api/replays/standalone?teamId=${teamId}`) as Promise<Replay[]>,

  getByResult: (teamId: number, result: string) =>
    apiClient.get(`/api/replays/result/${result}?teamId=${teamId}`) as Promise<Replay[]>,

  getByOpponent: (teamId: number, opponent: string) =>
    apiClient.get(`/api/replays/opponent/${opponent}?teamId=${teamId}`) as Promise<Replay[]>,

  associateWithMatch: (replayId: number, matchId: number) =>
    apiClient.put(`/api/replays/${replayId}/match`, { matchId }) as Promise<Replay>,

  dissociateFromMatch: (replayId: number) =>
    apiClient.delete(`/api/replays/${replayId}/match`) as Promise<Replay>,

  checkExists: (url: string) =>
    apiClient.get(`/api/replays/check/url?url=${encodeURIComponent(url)}`) as Promise<boolean>,
};

export default replayApi;
