import { useState, useEffect, useCallback } from "react";
import { teamMemberApi } from "../services/api";
import type { TeamMember } from "../types";

const useTeamMembers = (teamId: number | null, pokepaste?: string | null) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTeamMembers = useCallback(async () => {
    if (!teamId) return;

    try {
      setLoading(true);
      setError(null);

      const members = await teamMemberApi.getByTeamId(teamId);

      // Backfill: if no members exist but pokepaste is set, sync to create them
      if (members.length === 0 && pokepaste) {
        try {
          const syncResult = await teamMemberApi.sync(teamId);
          setTeamMembers(syncResult.members);
        } catch {
          // Sync failed (e.g. pokepaste fetch error) — show empty state
          setTeamMembers([]);
        }
      } else {
        setTeamMembers(members);
      }
    } catch (err) {
      console.error("Error loading team members:", err);
      setError(err instanceof Error ? err.message : "Failed to load team members");
    } finally {
      setLoading(false);
    }
  }, [teamId, pokepaste]);

  useEffect(() => {
    loadTeamMembers();
  }, [loadTeamMembers]);

  const updateMemberNotes = useCallback(async (memberId: number, notes: string) => {
    const updated = await teamMemberApi.update(memberId, { notes });
    setTeamMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
    return updated;
  }, []);

  const updateMemberCalcs = useCallback(async (memberId: number, calcs: string[]) => {
    const updated = await teamMemberApi.update(memberId, { calcs });
    setTeamMembers((prev) => prev.map((m) => (m.id === memberId ? updated : m)));
    return updated;
  }, []);

  const refreshMembers = useCallback(() => {
    loadTeamMembers();
  }, [loadTeamMembers]);

  return {
    teamMembers,
    loading,
    error,
    updateMemberNotes,
    updateMemberCalcs,
    refreshMembers,
  };
};

export default useTeamMembers;
