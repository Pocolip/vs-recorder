// A team's matchup engine simulation (backend SimulationDTO).

export type SimulationJobStatus = "QUEUED" | "RUNNING" | "PARTIAL" | "COMPLETE" | "FAILED" | "CANCELLED";

/** quick: every opponent from fast games. full: the best-placed opponents also played carefully. */
export type SimulationDepth = "quick" | "full";

export interface SimulationJob {
  id: string;
  status: SimulationJobStatus;
  depth: SimulationDepth;
  /** e.g. "preview 12/40", "games 8/40", "search 3/10" */
  progress: string | null;
  unfinished: boolean;
  cancelRequested: boolean;
  errorCode: string | null;
  /** Safe to show. */
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string | null;
}

export interface SimulationOpponentPokemon {
  pokemon: string;
  gamesAgainst: number;
  winsAgainst: number;
}

export interface SimulationResultInfo {
  jobId: string;
  /** "partial": the top opponents are still being refined. */
  status: "partial" | "complete";
  depth: SimulationDepth;
  /** The team's paste changed since this result. */
  stale: boolean;
  opponentsCount: number;
  totalGames: number;
  opponentPokemon: SimulationOpponentPokemon[];
  createdAt: string | null;
}

export interface SimulationStatus {
  /** Engine jobs are on for this deployment. Everything else is empty when false. */
  enabled: boolean;
  canRun: boolean;
  runBlockedReason: string | null;
  /** Runs the viewer has left today; null unless they may run simulations on this team. */
  runsLeftToday: number | null;
  job: SimulationJob | null;
  result: SimulationResultInfo | null;
}

/** Rates here are 0-1, unlike the analytics pages' whole percentages. */
export interface SimulationMember {
  species: string;
  broughtRate: number | null;
  leadRate: number | null;
  gamesBrought: number | null;
  gamesBenched: number | null;
  winRateBrought: number | null;
  winRateBenched: number | null;
  delta: number | null;
  /** The 95% interval of `delta`, when the engine sends one. */
  ci95?: [number, number] | null;
}

export interface SimulationThreat {
  species: string[];
  games: number;
  winRate: number | null;
  delta: number | null;
}

export interface SimulationDiagnostics {
  resultStatus: "partial" | "complete";
  stale: boolean;
  opponentsCount: number;
  games: number;
  winRate: number | null;
  members: SimulationMember[];
  threatSpecies: SimulationThreat[];
  threatPairs: SimulationThreat[];
}
