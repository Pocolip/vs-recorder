import type { SimulationDepth } from "../types";

const STAGES: Record<string, string> = {
  preview: "Previewing opponents",
  games: "Playing games",
  search: "Refining the top opponents",
};

/** The engine's progress text, readable: "search 3/10" → "Refining the top opponents (3/10)". */
export function describeProgress(progress: string | null | undefined): string | null {
  if (!progress) return null;
  const match = /^(\w+)\s+(\d+\/\d+)$/.exec(progress.trim());
  if (!match) return progress;
  const stage = STAGES[match[1]];
  return stage ? `${stage} (${match[2]})` : progress;
}

/** The caveat shown whenever simulated numbers are on screen. */
export function simulatedScopeLabel(opponentsCount: number): string {
  return `Simulated: the engine played both sides against ${opponentsCount} teams in the meta. Not a prediction against particular players.`;
}

export interface DepthOption {
  depth: SimulationDepth;
  name: string;
  /** Engine time once it's running; starting it adds a few minutes. Estimates. */
  time: string;
  description: string;
}

/** Simulated analytics' two depths, cheapest first. */
export const DEPTH_OPTIONS: DepthOption[] = [
  {
    depth: "quick",
    name: "Quick",
    time: "about 10 minutes",
    description: "Fast games against each of the meta's top 40 teams.",
  },
  {
    depth: "full",
    name: "Full",
    time: "about 30 minutes",
    description:
      "The same, plus slower, more careful games against the 10 best-placed teams, for sharper win rates where they matter most.",
  },
];

/** "Quick" or "Full". */
export function depthName(depth: SimulationDepth | null | undefined): string {
  return depth === "quick" ? "Quick" : "Full";
}
