import { describe, expect, it } from "vitest";
import {
  describePlanProgress,
  describeProgress,
  jobProgress,
  percent,
  percentRange,
  planErrorMessage,
  simulatedScopeLabel,
  staleLabel,
} from "./simulationUtils";

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
