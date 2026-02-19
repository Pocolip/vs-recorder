import apiClient from "./client";
import type { Team } from "../../types";

export const teamApi = {
  getAll: () =>
    apiClient.get("/api/teams") as Promise<Team[]>,

  getById: (id: number) =>
    apiClient.get(`/api/teams/${id}`) as Promise<Team>,

  getByRegulation: (regulation: string) =>
    apiClient.get(`/api/teams/regulation/${regulation}`) as Promise<Team[]>,

  create: (data: { name: string; pokepaste: string; regulation?: string; showdownUsernames?: string[] }) =>
    apiClient.post("/api/teams", data) as Promise<Team>,

  update: (id: number, updates: Partial<Team>) =>
    apiClient.patch(`/api/teams/${id}`, updates) as Promise<Team>,

  delete: (id: number) =>
    apiClient.delete(`/api/teams/${id}`) as Promise<void>,

  getStats: (id: number) =>
    apiClient.get(`/api/teams/${id}/stats`) as Promise<Record<string, unknown>>,

  addShowdownUsername: (id: number, username: string) =>
    apiClient.post(`/api/teams/${id}/showdown-usernames`, { username }) as Promise<Team>,

  removeShowdownUsername: (id: number, username: string) =>
    apiClient.delete(`/api/teams/${id}/showdown-usernames/${username}`) as Promise<Team>,
};

export default teamApi;
