import { createContext, useContext, useMemo, useState } from "react";
import { useActiveTeam } from "./ActiveTeamContext";
import { useSimulation } from "./SimulationContext";
import { usePlanSimulations, type PlanSimulations } from "../hooks/usePlanSimulations";

type PlanSimulationContextType = PlanSimulations & {
  /**
   * The Matchup Planner page's entries and pastes, so plans refetch when one is added,
   * removed or re-pasted (staleness). Other pages leave it alone.
   */
  setEntriesKey: (key: string) => void;
};

const PlanSimulationContext = createContext<PlanSimulationContextType | undefined>(undefined);

export const usePlanSimulationContext = () => {
  const context = useContext(PlanSimulationContext);
  if (!context) {
    throw new Error("usePlanSimulationContext must be used within a PlanSimulationProvider");
  }
  return context;
};

/**
 * The active team's simulated Matchup Planner plans, for every page that needs them:
 * the planner itself, the Simulations modal and the progress bar along the bottom.
 * Must sit inside ActiveTeamProvider and SimulationProvider. Nothing is fetched while
 * simulations are off for this deployment.
 */
export const PlanSimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { team } = useActiveTeam();
  const { status: simulation } = useSimulation();
  const [entriesKey, setEntriesKey] = useState("");
  const teamId = simulation?.enabled ? (team?.id ?? null) : null;
  const plans = usePlanSimulations(teamId, entriesKey);

  const value = useMemo(() => ({ ...plans, setEntriesKey }), [plans]);
  return <PlanSimulationContext.Provider value={value}>{children}</PlanSimulationContext.Provider>;
};
