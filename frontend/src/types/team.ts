import type { TeamPermissions, TeamRole } from "./collaborator";

export interface Team {
  id: number;
  name: string;
  pokepaste: string;
  regulation: string;
  showdownUsernames: string[];
  folderIds: number[];
  createdAt: string;
  updatedAt: string;
  // Populated by the backend per-request based on the caller's access.
  // Optional for compatibility with cached older payloads.
  role?: TeamRole;
  permissions?: TeamPermissions;
  // Counted server-side on list responses (GET /api/teams) so the dashboard
  // doesn't have to fetch every team's replays.
  replayCount?: number;
  wins?: number;
  losses?: number;
}

export interface TeamSummary {
  id: number;
  name: string;
  pokepaste: string;
  regulation: string;
  createdAt: string;
  updatedAt: string;
  folderIds: number[];
  replayCount: number;
  matchCount: number;
  wins: number;
  losses: number;
  winRate: number | null;
  role?: TeamRole;
}
