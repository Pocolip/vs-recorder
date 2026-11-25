import { describe, expect, it } from "vitest";
import { planJob, planResult } from "../test/planFixtures";
import { simulationJob } from "../test/simulationFixtures";
import { describePlanProgress, describeProgress, describeQueue, describeQueuedJob, engineProgress, formatWait, jobProgress, percent, percentRange, planErrorMessage, planJobProgress, planSummary, simulatedScopeLabel, staleLabel } from "./simulationUtils";

describe("describeProgress", () => {
  it("names each engine stage", () => {
    expect(describeProgress("preview 12/40")).toBe("Previewing opponents (12/40)");
    expect(describeProgress("games 8/40")).toBe("Playing games (8/40)");
    expect(describeProgress("search 3/10")).toBe("Refining the top opponents (3/10)");
  });

  it("passes unknown text through and handles nothing", () => {
    expect(describeProgress("warming up")).toBe("warming up");
    expect(describeProgress("train 1/2")).toBe("train 1/2");
    expect(describeProgress(null)).toBeNull();
    expect(describeProgress("")).toBeNull();
  });
});

describe("the engine's queue", () => {
  it("rounds waits the way people say them", () => {
    expect(formatWait(0)).toBe("about a minute");
    expect(formatWait(1)).toBe("about a minute");
    expect(formatWait(12)).toBe("about 12 minutes");
    expect(formatWait(33)).toBe("about 35 minutes");
    expect(formatWait(58)).toBe("about 1 hour");
    expect(formatWait(71)).toBe("about 1 hour 10 minutes");
    expect(formatWait(120)).toBe("about 2 hours");
  });

  it("describes the queue a run would join", () => {
    expect(describeQueue(null)).toBeNull();
    expect(describeQueue({ state: "awake", jobsAhead: 0, waitMinutes: 0 })).toBe(
      "The engine is free: a run would start right away.",
    );
    expect(describeQueue({ state: "asleep", jobsAhead: 0, waitMinutes: 3 })).toBe(
      "The engine is free. It's powered off when idle, so a run would start in about 3 minutes.",
    );
    expect(describeQueue({ state: "starting", jobsAhead: 1, waitMinutes: 7 })).toBe(
      "The engine is starting up for 1 job. A run now would start in about 7 minutes.",
    );
    expect(describeQueue({ state: "busy", jobsAhead: 3, waitMinutes: 55 })).toBe(
      "The engine is busy, with 3 jobs in line. A run now would start in about 55 minutes.",
    );
  });

  it("gives a queued job its place in line", () => {
    expect(describeQueuedJob({ jobsAhead: 0, startsInMinutes: 2 })).toBe("Next in line: starts in about 2 minutes.");
    expect(describeQueuedJob({ jobsAhead: 2, startsInMinutes: 40 })).toBe(
      "2 jobs ahead in the engine's queue: starts in about 40 minutes.",
    );
    expect(describeQueuedJob({ jobsAhead: null, startsInMinutes: null })).toBeNull();
  });
});

describe("simulatedScopeLabel", () => {
  it("states the scope and that it isn't a prediction", () => {
    const label = simulatedScopeLabel(40);
    expect(label).toContain("40 teams in the meta");
    expect(label).toContain("Not a prediction");
  });
});

describe("jobProgress", () => {
  const job = (depth: "quick" | "full", progress: string | null, status: "QUEUED" | "RUNNING" | "PARTIAL" = "RUNNING") => ({
    depth,
    progress,
    status,
  });

  it("maps each stage onto the whole run", () => {
    expect(jobProgress(job("full", "preview 20/40"))).toBeCloseTo(0.125);
    expect(jobProgress(job("full", "games 40/40"))).toBeCloseTo(0.35);
    expect(jobProgress(job("full", "search 5/10"))).toBeCloseTo(0.675);
    expect(jobProgress(job("quick", "preview 40/40"))).toBeCloseTo(0.8);
    expect(jobProgress(job("quick", "games 20/40"))).toBeCloseTo(0.9);
  });

  it("has nothing to measure before the worker reports", () => {
    expect(jobProgress(job("full", null, "QUEUED"))).toBeNull();
    expect(jobProgress(job("full", "warming up"))).toBeNull();
    expect(jobProgress(null)).toBeNull();
  });

  it("counts a partial result as the volume games done", () => {
    expect(jobProgress(job("full", null, "PARTIAL"))).toBeCloseTo(0.35);
    expect(jobProgress(job("full", "search 3/10", "PARTIAL"))).toBeCloseTo(0.545);
  });
});

describe("plan helpers", () => {
  it("describes a plan job's stages", () => {
    expect(describePlanProgress("preview 1/1")).toBe("Working out team preview");
    expect(describePlanProgress("search 1/1")).toBe("Playing the matchup");
    expect(describePlanProgress(null)).toBeNull();
    expect(describePlanProgress("warming up")).toBe("warming up");
  });

  it("formats rates and intervals", () => {
    expect(percent(0.6797)).toBe("68%");
    expect(percent(null)).toBe("–");
    expect(percentRange([0.5914, 0.768])).toBe("59–77%");
    expect(percentRange(null)).toBeNull();
  });

  it("names the team an error is about", () => {
    expect(planErrorMessage("invalid_opponent", "not 6 Pokémon")).toBe("This team can't be simulated: not 6 Pokémon");
    expect(planErrorMessage("invalid_team", "a typo")).toBe("Your team can't be simulated: a typo");
    expect(planErrorMessage("internal", "The simulation failed on our side.")).toBe("The simulation failed on our side.");
  });

  it("says what made a plan stale", () => {
    expect(staleLabel({ stale: false, staleReason: null })).toBeNull();
    expect(staleLabel({ stale: true, staleReason: "MODEL" })).toBe("The engine has improved since this plan.");
  });
});

describe("planJobProgress", () => {
  it("follows a plan's preview solve, then its matchup", () => {
    expect(planJobProgress({ status: "QUEUED", progress: null })).toBeNull();
    expect(planJobProgress({ status: "RUNNING", progress: null })).toBe(0);
    expect(planJobProgress({ status: "RUNNING", progress: "preview 1/1" })).toBeCloseTo(0.25);
    expect(planJobProgress({ status: "PARTIAL", progress: null })).toBeCloseTo(0.25);
    expect(planJobProgress({ status: "PARTIAL", progress: "search 1/1" })).toBeCloseTo(1);
  });
});

describe("engineProgress", () => {
  const at = "2026-11-18T10:00:00Z";
  const later = "2026-11-18T10:05:00Z";
  const earlier = "2026-11-17T10:00:00Z";

  it("is inactive with nothing unfinished", () => {
    expect(engineProgress(simulationJob("COMPLETE"), [{ gamePlanTeamId: 1, job: planJob("COMPLETE"), result: null }]).active).toBe(false);
  });

  it("counts a batch's finished plans as done, and leaves out older runs", () => {
    const p = engineProgress(null, [
      { gamePlanTeamId: 1, job: planJob("COMPLETE", "old", { createdAt: earlier }), result: null },
      { gamePlanTeamId: 2, job: planJob("COMPLETE", "a", { createdAt: at }), result: null },
      { gamePlanTeamId: 3, job: planJob("RUNNING", "b", { createdAt: at, progress: "preview 1/1" }), result: null },
    ]);
    expect(p.fraction).toBeCloseTo((1 + 0.25) / 2);
    expect(p.jobs.map((j) => j.id)).toEqual(["a", "b"]);
    expect(p.label).toBe("Matchup plans: 1 of 2 done");
  });

  it("weighs a full simulation against plans by how long each takes", () => {
    const p = engineProgress(
      { ...simulationJob("RUNNING"), createdAt: at, progress: "search 5/10" },
      [{ gamePlanTeamId: 1, job: planJob("COMPLETE", "a", { createdAt: later }), result: null }],
    );
    // full: 50 min at 0.675; the plan: 5 min, done
    expect(p.fraction).toBeCloseTo((50 * 0.675 + 5) / 55);
    expect(p.label).toBe("Full simulation: Refining the top opponents (5/10)");
  });

  it("keeps a batch together once its first plan finishes", () => {
    // Created in one request, milliseconds apart; the first one is done
    const p = engineProgress(null, [
      { gamePlanTeamId: 1, job: planJob("COMPLETE", "a", { createdAt: "2026-11-18T10:00:00.101Z" }), result: null },
      { gamePlanTeamId: 2, job: planJob("RUNNING", "b", { createdAt: "2026-11-18T10:00:00.152Z" }), result: null },
      { gamePlanTeamId: 3, job: planJob("QUEUED", "c", { createdAt: "2026-11-18T10:00:00.198Z" }), result: null },
    ]);
    expect(p.label).toBe("Matchup plans: 1 of 3 done");
    expect(p.fraction).toBeCloseTo(1 / 3);
    expect(
      planSummary([
        { gamePlanTeamId: 1, job: planJob("COMPLETE", "a", { createdAt: "2026-11-18T10:00:00.101Z" }), result: null },
        { gamePlanTeamId: 2, job: planJob("RUNNING", "b", { createdAt: "2026-11-18T10:00:00.152Z" }), result: null },
      ]).doneInRun,
    ).toBe(1);
  });

  it("has no fraction before anything starts", () => {
    const p = engineProgress(null, [{ gamePlanTeamId: 1, job: planJob("QUEUED", "a", { createdAt: at }), result: null }]);
    expect(p.active).toBe(true);
    expect(p.fraction).toBeNull();
  });
});

describe("planSummary", () => {
  it("counts the planner's plans and the current run", () => {
    const at = "2026-11-18T10:00:00Z";
    const s = planSummary([
      { gamePlanTeamId: 1, job: planJob("COMPLETE", "a", { createdAt: at }), result: planResult({ stale: true }) },
      { gamePlanTeamId: 2, job: planJob("RUNNING", "b", { createdAt: at }), result: null },
      { gamePlanTeamId: 3, job: planJob("FAILED", "c", { createdAt: "2026-11-17T10:00:00Z" }), result: null },
      { gamePlanTeamId: 4, job: null, result: null },
    ]);
    expect(s).toEqual({ total: 4, withPlan: 1, stale: 1, failed: 1, queued: 0, running: 1, doneInRun: 1 });
  });
});
