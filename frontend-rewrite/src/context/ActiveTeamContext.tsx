import { createContext, useCallback, useContext, useState } from "react";
import type { Team } from "../types";

type ActiveTeamContextType = {
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
  const [statsVersion, setStatsVersion] = useState(0);
  const bumpStatsVersion = useCallback(() => setStatsVersion((v) => v + 1), []);

  return (
    <ActiveTeamContext.Provider value={{ team, setTeam, statsVersion, bumpStatsVersion }}>
      {children}
    </ActiveTeamContext.Provider>
  );
};
