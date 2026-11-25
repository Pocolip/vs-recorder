// A team's matchup engine simulation (backend SimulationDTO).

export type SimulationJobStatus = "QUEUED" | "RUNNING" | "PARTIAL" | "COMPLETE" | "FAILED" | "CANCELLED";

/** quick: every opponent from fast games. full: the best-placed opponents also played carefully. */
export type SimulationDepth = "quick" | "full";

export interface SimulationJob {
  id: string;
  status: SimulationJobStatus;
  depth: SimulationDepth;
  /** What was changed in the team's paste before sending it (e.g. a Mega forme listed as its base species). */
  pasteNotes?: string[];
  /** e.g. "preview 12/40", "games 8/40", "search 3/10" */
  progress: string | null;
  unfinished: boolean;
  cancelRequested: boolean;
  errorCode: string | null;
  /** Safe to show. */
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string | null;
  /** While it waits its turn: the jobs ahead of it in the engine's queue (everyone's). */
  jobsAhead?: number | null;
  /** While it waits its turn: estimated minutes before it starts. */
  startsInMinutes?: number | null;
}

/**
 * The engine's one worker, shared by everyone. asleep: nothing to do, powered off.
 * awake: nothing to do, still up after its last job. starting: jobs are waiting while
 * it powers on. busy: running a job.
 */
export type EngineQueueState = "asleep" | "awake" | "starting" | "busy";

/** The engine's queue as a job submitted now would find it (backend SimulationDTO.QueueInfo). */
export interface EngineQueue {
  state: EngineQueueState;
  jobsAhead: number;
  /** Estimated minutes before a job submitted now starts, start-up included. */
  waitMinutes: number;
}

export interface SimulationOpponentPokemon {
  pokemon: string;
  gamesAgainst: number;
  winsAgainst: number;
}

/** Why a simulation is out of date: the team's paste, the engine's meta teams (POOL) or its model. */
export type SimulationStaleReason = "TEAM" | "POOL" | "MODEL";

export interface SimulationResultInfo {
  jobId: string;
  /** "partial": the top opponents are still being refined. */
  status: "partial" | "complete";
  depth: SimulationDepth;
  /** Something changed since this result: see staleReason. */
  stale: boolean;
  staleReason?: SimulationStaleReason | null;
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
  /** Simulations are open to every signed-in user (for a limited time). */
  openToAll?: boolean;
  job: SimulationJob | null;
  result: SimulationResultInfo | null;
  queue?: EngineQueue | null;
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

// ==================== Simulated Matchup Planner plans (backend PlanDTO) ====================

/** A plan job: a SimulationJob with no depth. */
export type PlanJob = Omit<SimulationJob, "depth"> & { depth?: null };

/** A composition (lead1, lead2, back1, back2, notes) plus its share of the engine's mix, 0-1. */
export interface PlanComposition {
  lead1: string;
  lead2: string;
  back1: string;
  back2: string;
  notes: string;
  weight: number | null;
}

export type PlanCategory = "favorable" | "even" | "unfavorable";

/** What changed since a plan: the user's team, the entry's team, or the engine's model. */
export type PlanStaleReason = "TEAM" | "OPPONENT" | "MODEL";

export interface PlanResultInfo {
  jobId: string;
  /** "partial": the compositions are ready, the win rate is pending. */
  status: "partial" | "complete";
  stale: boolean;
  staleReason: PlanStaleReason | null;
  compositions: PlanComposition[];
  opponentCompositions: PlanComposition[];
  opponentSummary: string | null;
  /** Null until complete. Rates are 0-1. */
  games: number | null;
  wins: number | null;
  losses: number | null;
  ties: number | null;
  winRate: number | null;
  ci95: [number, number] | null;
  category: PlanCategory | null;
  previewValue: number | null;
  /** What always bringing the top composition costs against an opponent who expects it. */
  simplifyCost: number | null;
  opponentSpreads: "sheet" | "paste" | null;
  createdAt: string | null;
}

export interface PlanEntryStatus {
  gamePlanTeamId: number;
  job: PlanJob | null;
  result: PlanResultInfo | null;
}

export interface PlanStatus {
  enabled: boolean;
  canRun: boolean;
  runBlockedReason: string | null;
  /** Plans the viewer may still submit today; null unless they may run them on this team. */
  runsLeftToday: number | null;
  entries: PlanEntryStatus[];
  queue?: EngineQueue | null;
}

export interface PlanSubmitOutcome {
  gamePlanTeamId: number;
  queued: boolean;
  errorCode: string | null;
  message: string | null;
}

export interface PlanSubmitResponse {
  outcomes: PlanSubmitOutcome[];
  status: PlanStatus;
}
