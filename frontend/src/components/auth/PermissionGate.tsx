import type { ReactNode } from "react";
import { useTeamPermissions, type Permission } from "../../hooks/useTeamPermissions";

interface PermissionGateProps {
  perm: Permission;
  children: ReactNode;
  /** Render this when denied. Default: render nothing. */
  fallback?: ReactNode;
  /**
   * When true, render the children regardless but pass a `disabled` data attribute
   * via the wrapping span so callers can style the disabled state inline. Most
   * callers should leave this off and use `fallback`.
   */
  renderDisabled?: boolean;
}

/**
 * Hide (or disable) a UI affordance when the active team's permissions don't allow it.
 * Owners always pass. Renders `fallback` (default nothing) when the caller lacks the perm.
 */
export function PermissionGate({ perm, children, fallback = null, renderDisabled = false }: PermissionGateProps) {
  const { can, isLoaded } = useTeamPermissions();
  if (!isLoaded) {
    return <>{children}</>;
  }
  if (can(perm)) {
    return <>{children}</>;
  }
  if (renderDisabled) {
    return <span data-permission-denied>{children}</span>;
  }
  return <>{fallback}</>;
}

export default PermissionGate;
