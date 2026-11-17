import { describe, expect, it } from "vitest";
import { describeProgress, simulatedScopeLabel } from "./simulationUtils";

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
