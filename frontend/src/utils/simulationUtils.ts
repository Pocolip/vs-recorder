import type {
  PlanCategory,
  PlanEntryStatus,
  PlanJob,
  PlanResultInfo,
  PlanStaleReason,
  SimulationDepth,
  SimulationJob,
  SimulationJobStatus,
} from "../types";

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
    time: "about 15 minutes",
    description: "Fast games against each of the meta's top 40 teams.",
  },
  {
    depth: "full",
    name: "Full",
    time: "about 50 minutes",
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

// ==================== Engine progress (the bar along the bottom) ====================

/**
 * Rough engine minutes per job, to weigh jobs against each other in one bar (observed
 * run times; only their ratios matter).
 */
const JOB_MINUTES = { quick: 15, full: 50, plan: 5 } as const;

/**
 * A run starts this long before its oldest unfinished job, so jobs submitted together
 * (a batch of plans, created milliseconds apart) stay in it after the first finishes.
 */
const RUN_SLACK_MS = 60_000;

/** When the run of these unfinished jobs began, in ms; null when there are none. */
function runStart(unfinishedCreatedAt: string[]): number | null {
  const times = unfinishedCreatedAt.map((t) => Date.parse(t)).filter((t) => !Number.isNaN(t));
  return times.length === 0 ? null : Math.min(...times) - RUN_SLACK_MS;
}

const inRun = (createdAt: string, start: number) => Date.parse(createdAt) >= start;

/** A plan job's share of its run: the preview solve, then the matchup's search games. */
const PLAN_PREVIEW_SHARE = 0.25;

/**
 * How far a plan job is, 0-1. The engine reports "preview 1/1" once its preview solve
 * is done (the picks then arrive as a partial) and "search 1/1" once the matchup is
 * played. Null while it's queued.
 */
export function planJobProgress(job: Pick<PlanJob, "status" | "progress"> | null | undefined): number | null {
  if (!job) return null;
  const match = job.progress ? /^(\w+)\s+(\d+)\/(\d+)$/.exec(job.progress.trim()) : null;
  let fraction: number | null = null;
  if (match && Number(match[3]) > 0) {
    const done = Math.min(Number(match[2]) / Number(match[3]), 1);
    if (match[1] === "preview") fraction = PLAN_PREVIEW_SHARE * done;
    else if (match[1] === "search") fraction = PLAN_PREVIEW_SHARE + (1 - PLAN_PREVIEW_SHARE) * done;
  }
  if (job.status === "PARTIAL") fraction = Math.max(fraction ?? 0, PLAN_PREVIEW_SHARE);
  if (fraction == null && job.status === "RUNNING") fraction = 0;
  return fraction;
}

interface RunJob {
  id: string;
  status: SimulationJobStatus;
  unfinished: boolean;
  createdAt: string;
  weight: number;
  /** 0-1; null while queued. */
  fraction: number | null;
}

export interface EngineProgress {
  /** Anything of the team's is queued or running. */
  active: boolean;
  /** The whole run, 0-1; null while nothing has started (the worker starting). */
  fraction: number | null;
  /** What's running, in words, for screen readers. */
  label: string;
  /** The run's jobs: the unfinished ones and those that finished since it started. */
  jobs: { id: string; status: SimulationJobStatus }[];
}

/**
 * Everything the engine is doing for a team, as one bar: its Simulated analytics job and
 * its Matchup Planner plans. A run is the unfinished jobs plus the ones that finished
 * since the oldest of them was submitted, give or take a minute (a batch of plans counts
 * its finished plans as done), each weighted by how long it takes.
 */
export function engineProgress(simulateJob: SimulationJob | null, planEntries: PlanEntryStatus[]): EngineProgress {
  const candidates: RunJob[] = [];
  if (simulateJob) {
    candidates.push({
      id: simulateJob.id,
      status: simulateJob.status,
      unfinished: simulateJob.unfinished,
      createdAt: simulateJob.createdAt,
      weight: JOB_MINUTES[simulateJob.depth === "quick" ? "quick" : "full"],
      fraction: simulateJob.unfinished ? jobProgress(simulateJob) : 1,
    });
  }
  const planJobs: RunJob[] = planEntries.flatMap(({ job }) =>
    job
      ? [{
          id: job.id,
          status: job.status,
          unfinished: job.unfinished,
          createdAt: job.createdAt,
          weight: JOB_MINUTES.plan,
          fraction: job.unfinished ? planJobProgress(job) : 1,
        }]
      : [],
  );
  candidates.push(...planJobs);

  const unfinished = candidates.filter((j) => j.unfinished);
  if (unfinished.length === 0) return { active: false, fraction: null, label: "", jobs: [] };

  const start = runStart(unfinished.map((j) => j.createdAt)) ?? -Infinity;
  const run = candidates.filter((j) => j.unfinished || inRun(j.createdAt, start));
  const started = run.some((j) => !j.unfinished || j.fraction != null);
  const total = run.reduce((sum, j) => sum + j.weight, 0);
  const fraction = started ? run.reduce((sum, j) => sum + j.weight * (j.fraction ?? 0), 0) / total : null;

  const parts: string[] = [];
  if (simulateJob?.unfinished) {
    const progress = describeProgress(simulateJob.progress);
    parts.push(`${depthName(simulateJob.depth)} simulation${progress ? `: ${progress}` : " starting"}`);
  }
  const runPlans = run.filter((j) => planJobs.includes(j));
  if (runPlans.some((j) => j.unfinished)) {
    const done = runPlans.filter((j) => !j.unfinished).length;
    parts.push(`Matchup plans: ${done} of ${runPlans.length} done`);
  }

  return {
    active: true,
    fraction,
    label: parts.join(" · "),
    jobs: run.map(({ id, status }) => ({ id, status })),
  };
}

export interface PlanSummary {
  /** Teams in the planner. */
  total: number;
  /** Teams with a plan to show, and how many of those are out of date. */
  withPlan: number;
  stale: number;
  /** Teams whose latest plan failed. */
  failed: number;
  /** The current run: plans queued, running, and finished since it started. */
  queued: number;
  running: number;
  doneInRun: number;
}

/** The planner at a glance, for the Simulations modal. */
export function planSummary(entries: PlanEntryStatus[]): PlanSummary {
  const latest = entries.map((e) => e.job).filter((j): j is PlanJob => j != null);
  const unfinished = latest.filter((j) => j.unfinished);
  const start = runStart(unfinished.map((j) => j.createdAt));
  return {
    total: entries.length,
    withPlan: entries.filter((e) => e.result != null).length,
    stale: entries.filter((e) => e.result?.stale).length,
    failed: latest.filter((j) => j.status === "FAILED").length,
    queued: unfinished.filter((j) => j.status === "QUEUED").length,
    running: unfinished.filter((j) => j.status !== "QUEUED").length,
    doneInRun: start == null ? 0 : latest.filter((j) => !j.unfinished && inRun(j.createdAt, start)).length,
  };
}

/** The footers' note on who gets simulations: a limited-time trial for everyone, or testing. */
export function accessNote(openToAll: boolean | undefined): string {
  return openToAll ? "Open to everyone for a limited time." : "Free while simulations are being tested.";
}
