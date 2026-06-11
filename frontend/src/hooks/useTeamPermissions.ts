import { useMemo } from "react";
import { useActiveTeam } from "../context/ActiveTeamContext";
import {
  ALL_PERMISSIONS_FALSE,
  ALL_PERMISSIONS_TRUE,
  type TeamPermissions,
  type TeamRole,
} from "../types";

export type Permission = keyof TeamPermissions;

export interface TeamPermissionsHelpers {
  role: TeamRole | null;
  permissions: TeamPermissions;
  isOwner: boolean;
  isCollaborator: boolean;
  isLoaded: boolean;
  can: (perm: Permission) => boolean;
}

/**
 * Read the caller's role + permissions on the currently active team. Owners
 * implicitly have every permission. While the team is still loading (or no
 * team is active), `isLoaded` is false and permission checks return false.
 */
export function useTeamPermissions(): TeamPermissionsHelpers {
  const { team } = useActiveTeam();

  return useMemo<TeamPermissionsHelpers>(() => {
    if (!team) {
      return {
        role: null,
        permissions: ALL_PERMISSIONS_FALSE,
        isOwner: false,
        isCollaborator: false,
        isLoaded: false,
        can: () => false,
      };
    }
    const role: TeamRole = team.role ?? "OWNER";
    // Older payloads may not carry permissions yet — treat as owner-all.
    const permissions = team.permissions ?? (role === "OWNER" ? ALL_PERMISSIONS_TRUE : ALL_PERMISSIONS_FALSE);
    return {
      role,
      permissions,
      isOwner: role === "OWNER",
      isCollaborator: role === "COLLABORATOR",
      isLoaded: true,
      can: (perm) => Boolean(permissions[perm]),
    };
  }, [team]);
}

export default useTeamPermissions;
