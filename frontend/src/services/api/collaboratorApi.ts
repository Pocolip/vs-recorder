import apiClient from "./client";
import type { Collaborator, InvitePreview, TeamPermissions, TeamSummary } from "../../types";

export interface InvitePayload extends TeamPermissions {
  email: string;
}

export const collaboratorApi = {
  // Owner-side: per-team management
  listForTeam: (teamId: number) =>
    apiClient.get(`/api/teams/${teamId}/collaborators`) as Promise<Collaborator[]>,

  invite: (teamId: number, payload: InvitePayload) =>
    apiClient.post(`/api/teams/${teamId}/collaborators/invite`, payload) as Promise<Collaborator>,

  updatePermissions: (teamId: number, collaboratorId: number, permissions: TeamPermissions) =>
    apiClient.patch(
      `/api/teams/${teamId}/collaborators/${collaboratorId}`,
      permissions,
    ) as Promise<Collaborator>,

  remove: (teamId: number, collaboratorId: number) =>
    apiClient.delete(`/api/teams/${teamId}/collaborators/${collaboratorId}`) as Promise<void>,

  leave: (teamId: number) =>
    apiClient.delete(`/api/teams/${teamId}/collaborators/me`) as Promise<void>,

  // Caller-side: shared hub page
  sharedWithMe: () =>
    apiClient.get("/api/collaborations/shared-with-me") as Promise<TeamSummary[]>,

  teamsIAmSharing: () =>
    apiClient.get("/api/collaborations/sharing") as Promise<TeamSummary[]>,

  pendingInvites: () =>
    apiClient.get("/api/collaborations/pending-invites") as Promise<Collaborator[]>,

  // Accept flow
  previewInvite: (token: string) =>
    apiClient.get(`/api/collaborations/invites/${token}`) as Promise<InvitePreview>,

  acceptInvite: (token: string) =>
    apiClient.post(`/api/collaborations/invites/${token}/accept`) as Promise<Collaborator>,

  declineInvite: (token: string) =>
    apiClient.post(`/api/collaborations/invites/${token}/decline`) as Promise<Collaborator>,
};

export default collaboratorApi;
