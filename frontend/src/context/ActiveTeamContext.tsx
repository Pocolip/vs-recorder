import type { ReplayPage } from "../services/api/replayApi";
import { createContext, useCallback, useContext, useState, useEffect, useRef } from "react";
import { createTeamReplayStore } from "../hooks/teamReplayStore";
import { teamApi } from "../services/api/teamApi";
import type { Team } from "../types";

type ActiveTeamContextType = {
  replayPages: Map<string, Promise<ReplayPage>>;
  getReplayStore: (id: number | null) => ReturnType<typeof createTeamReplayStore>;
  team: Team | null;
  setTeam: (team: Team | null) => void;
  statsVersion: number;
  bumpStatsVersion: () => void;
};

const ActiveTeamContext = createContext<ActiveTeamContextType | undefined>(
  undefined
);

export const useActiveTeam = () => {
  const context = useContext(ActiveTeamContext);
  if (!context) {
    throw new Error("useActiveTeam must be used within an ActiveTeamProvider");
  }
  return context;
};

export const ActiveTeamProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [team, setTeam] = useState<Team | null>(null);
  const teamId = team?.id;
  const [statsVersion, setStatsVersion] = useState(0);
  const replayPages = useRef(new Map<string, Promise<ReplayPage>>()).current;
  const stores = useRef(new Map<number | null, ReturnType<typeof createTeamReplayStore>>());
  const getReplayStore = useCallback((id: number | null) => {
    let entry = stores.current.get(id);
    if (!entry) { entry = createTeamReplayStore(); stores.current.set(id, entry); }
    return entry;
  }, []);
  const bumpStatsVersion = useCallback(() => {
    replayPages.clear();
    if (teamId) getReplayStore(teamId).invalidate(teamId);
    setStatsVersion((v) => v + 1);
  }, [teamId, getReplayStore, replayPages]);

  const refreshedVersion = useRef(statsVersion);
  useEffect(() => {
    if (!teamId || refreshedVersion.current === statsVersion) return;
    refreshedVersion.current = statsVersion;
    let cancelled = false;
    const id = teamId;
    teamApi.getStats(id).then((stats) => {
      if (!cancelled) setTeam((current) => current?.id === id ? { ...current, stats } : current);
    }).catch((error) => console.error("Failed to refresh team statistics:", error));
    return () => { cancelled = true; };
  }, [teamId, statsVersion]);

  return (
    <ActiveTeamContext.Provider value={{ replayPages, getReplayStore, team, setTeam, statsVersion, bumpStatsVersion }}>
      {children}
    </ActiveTeamContext.Provider>
  );
};
