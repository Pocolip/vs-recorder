import apiClient from "./client";
import type { TeamMember } from "../../types";

export const teamMemberApi = {
  getByTeamId: (teamId: number) =>
    apiClient.get(`/api/team-members?teamId=${teamId}`) as Promise<TeamMember[]>,

  create: (teamId: number, data: { pokemonName: string; slot: number; notes?: string }) =>
    apiClient.post(`/api/team-members?teamId=${teamId}`, data) as Promise<TeamMember>,

  update: (id: number, updates: Partial<TeamMember>) =>
    apiClient.patch(`/api/team-members/${id}`, updates) as Promise<TeamMember>,

  delete: (id: number) =>
    apiClient.delete(`/api/team-members/${id}`) as Promise<void>,
};

export default teamMemberApi;
