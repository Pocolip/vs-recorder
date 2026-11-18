import type { PlanCategory, PlanResultInfo, PlanStaleReason, SimulationDepth, SimulationJob } from "../types";

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

/**
 * Each engine stage's share of a run, from the measured timings (the engine's
 * pricing notes): Full spends most of its time on the careful games ("search"),
 * Quick on the preview solves.
 */
const STAGE_SPANS: Record<SimulationDepth, Record<string, [number, number]>> = {
  full: { preview: [0, 0.25], games: [0.25, 0.35], search: [0.35, 1] },
  quick: { preview: [0, 0.8], games: [0.8, 1] },
};

/**
 * How far an unfinished job is, 0-1, from the engine's progress text ("games 8/40").
 * Null when there's nothing to measure yet (queued, the worker starting) or the
 * text isn't one we know.
 */
export function jobProgress(job: Pick<SimulationJob, "depth" | "status" | "progress"> | null | undefined): number | null {
  if (!job) return null;
  const spans = STAGE_SPANS[job.depth] ?? STAGE_SPANS.full;
  const match = job.progress ? /^(\w+)\s+(\d+)\/(\d+)$/.exec(job.progress.trim()) : null;
  let fraction: number | null = null;
  if (match && spans[match[1]] && Number(match[3]) > 0) {
    const [start, end] = spans[match[1]];
    const done = Math.min(Number(match[2]) / Number(match[3]), 1);
    fraction = start + (end - start) * done;
  }
  // A partial result means the volume games are done, whatever the text says.
  if (job.status === "PARTIAL") fraction = Math.max(fraction ?? 0, spans.games?.[1] ?? 0);
  return fraction;
}

// ==================== Simulated Matchup Planner plans ====================

const PLAN_STAGES: Record<string, string> = {
  preview: "Working out team preview",
  search: "Playing the matchup",
};

/** A plan job's progress text, readable: "search 1/1" → "Playing the matchup". */
export function describePlanProgress(progress: string | null | undefined): string | null {
  if (!progress) return null;
  const match = /^(\w+)\s+\d+\/\d+$/.exec(progress.trim());
  if (!match) return progress;
  return PLAN_STAGES[match[1]] ?? progress;
}

/** The caveat shown with every simulated plan. */
export const PLAN_CAVEAT =
  "Simulated against the engine playing this team well, not against a person: a real opponent can do much better or worse.";

/** One entry at a time costs about as much as three together, because the engine has to start. */
export const SINGLE_PLAN_WARNING =
  "Simulating one team at a time costs about as much as three in a batch: the engine has to start up. Select several teams to simulate them together.";

/** "68%" from 0.6797. */
export function percent(rate: number | null | undefined): string {
  return rate == null ? "–" : `${Math.round(rate * 100)}%`;
}

/** "59–77%" from [0.5914, 0.768]. */
export function percentRange(ci95: [number, number] | null | undefined): string | null {
  if (!ci95) return null;
  return `${Math.round(ci95[0] * 100)}–${Math.round(ci95[1] * 100)}%`;
}

export const CATEGORY_LABEL: Record<PlanCategory, string> = {
  favorable: "Favorable",
  even: "Even",
  unfavorable: "Unfavorable",
};

const STALE_LABEL: Record<PlanStaleReason, string> = {
  TEAM: "Your team's paste changed since this plan.",
  OPPONENT: "This team's paste changed since this plan.",
  MODEL: "The engine has improved since this plan.",
};

export function staleLabel(result: Pick<PlanResultInfo, "stale" | "staleReason">): string | null {
  if (!result.stale) return null;
  return result.staleReason ? STALE_LABEL[result.staleReason] : "Something changed since this plan.";
}

/** A failed plan's message, saying which team it's about. */
export function planErrorMessage(errorCode: string | null, message: string | null): string {
  if (errorCode === "invalid_opponent") return `This team can't be simulated: ${message ?? "it isn't valid"}`;
  if (errorCode === "invalid_team") return `Your team can't be simulated: ${message ?? "it isn't valid"}`;
  return message || "The simulation failed.";
}
