import apiClient from "./client";
import type { Replay } from "../../types";

/**
 * Non-persisting parse of a single replay, used by the bulk-import grouping step.
 * Mirrors backend ShowdownDTO.ReplayPreview.
 */
export interface ReplayPreview {
  url: string;
  opponent: string;
  result: string;
  userTeam: string[];
  matchesTeam: boolean;
  identified: boolean;
}

export interface ReplayBrowseFilters {
  page?: number;
  size?: number;
  tags?: string[];
  result?: string;
  reviewed?: boolean;
  sort?: string;
  direction?: "asc" | "desc";
}
export interface ReplayPage {
  content: Replay[];
  totalElements: number;
  totalTeam: number;
  wins: number;
  losses: number;
  page: number;
  size: number;
}
function browseParams(teamId: number, filters: ReplayBrowseFilters) {
  const params = new URLSearchParams({ teamId: String(teamId) });
  for (const [name, value] of Object.entries(filters)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((tag) => params.append(name, tag));
    else params.set(name, String(value));
  }
  return params;
}

export const replayApi = {
  browse: (teamId: number, filters: ReplayBrowseFilters) =>
    apiClient.get("/api/replays/browse", { params: browseParams(teamId, filters) }) as Promise<ReplayPage>,
  urls: (teamId: number, filters: ReplayBrowseFilters) =>
    apiClient.get("/api/replays/urls", { params: browseParams(teamId, filters) }) as Promise<string[]>,
  setReviewed: (teamId: number, filters: ReplayBrowseFilters, reviewed: boolean) =>
    apiClient.patch(`/api/replays/reviewed?teamId=${teamId}&reviewed=${reviewed}`, filters) as Promise<number>,
  getById: (id: number) =>
    apiClient.get(`/api/replays/${id}`) as Promise<Replay>,

  getByTeamId: (teamId: number) =>
    apiClient.get(`/api/replays?teamId=${teamId}`) as Promise<Replay[]>,

  createFromUrl: (teamId: number, url: string, notes = "", reviewed = false) =>
    apiClient.post(`/api/replays/from-url?teamId=${teamId}`, { url, notes, reviewed }) as Promise<Replay>,

  previewFromUrl: (teamId: number, url: string) =>
    apiClient.post(`/api/replays/preview?teamId=${teamId}`, { url }) as Promise<ReplayPreview>,

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
