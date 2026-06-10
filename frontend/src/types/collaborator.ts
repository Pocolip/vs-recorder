export type TeamRole = "OWNER" | "COLLABORATOR";

export interface TeamPermissions {
  canAddReplays: boolean;
  canDeleteReplays: boolean;
  canEditReplayNotes: boolean;
  canEditTeamMemberNotes: boolean;
  canEditTeamMemberCalcs: boolean;
  canEditTeamDetails: boolean;
  canEditGamePlans: boolean;
}

export const ALL_PERMISSIONS_FALSE: TeamPermissions = {
  canAddReplays: false,
  canDeleteReplays: false,
  canEditReplayNotes: false,
  canEditTeamMemberNotes: false,
  canEditTeamMemberCalcs: false,
  canEditTeamDetails: false,
  canEditGamePlans: false,
};

export const ALL_PERMISSIONS_TRUE: TeamPermissions = {
  canAddReplays: true,
  canDeleteReplays: true,
  canEditReplayNotes: true,
  canEditTeamMemberNotes: true,
  canEditTeamMemberCalcs: true,
  canEditTeamDetails: true,
  canEditGamePlans: true,
};

export type CollaboratorStatus = "PENDING" | "ACCEPTED" | "REVOKED";

export interface Collaborator extends TeamPermissions {
  id: number;
  teamId: number;
  teamName: string | null;
  userId: number | null;
  username: string | null;
  userEmail: string | null;
  inviteEmail: string;
  inviteToken: string | null;
  status: CollaboratorStatus;
  acceptedAt: string | null;
  inviteExpiresAt: string;
  createdAt: string;
}

export interface InvitePreview {
  teamName: string;
  ownerUsername: string;
  inviteEmail: string;
  status: CollaboratorStatus;
  inviteExpiresAt: string;
  expired: boolean;
}
