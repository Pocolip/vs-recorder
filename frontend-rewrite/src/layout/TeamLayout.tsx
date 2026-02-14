import { useEffect, useState } from "react";
import { Outlet, useParams, Navigate } from "react-router";
import { useActiveTeam } from "../context/ActiveTeamContext";
import { teamApi } from "../services/api/teamApi";

export default function TeamLayout() {
  const { teamId } = useParams<{ teamId: string }>();
  const { setTeam } = useActiveTeam();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!teamId) return;

    let cancelled = false;

    const fetchTeam = async () => {
      setLoading(true);
      try {
        const team = await teamApi.getById(Number(teamId));
        if (!cancelled) {
          setTeam(team);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
      }
    };

    fetchTeam();

    return () => {
      cancelled = true;
      setTeam(null);
    };
  }, [teamId, setTeam]);

  if (notFound) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500" />
      </div>
    );
  }

  return <Outlet />;
}
