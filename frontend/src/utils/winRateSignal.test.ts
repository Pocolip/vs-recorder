import { describe, expect, it } from "vitest";
import { atLeast, betweenRates, formatPoints, fromInterval, threatSeverity, vsBaseline } from "./winRateSignal";

describe("vsBaseline", () => {
  it("calls a small gap real over thousands of games", () => {
    // A Pokemon brought in 5,594 of 8,000 simulated games, 47% against the team's 50%
    const s = vsBaseline(0.47, 0.5, 5594, 8000);
    expect(s.direction).toBe(-1);
    expect(s.level).toBe(1);
    expect(s.points).toBeCloseTo(-3);
  });

  it("calls the same gap noise over a handful of replays", () => {
    expect(vsBaseline(0.47, 0.5, 15, 20).direction).toBe(0);
    expect(vsBaseline(0.35, 0.5, 12, 20).direction).toBe(0);
  });

  it("grades the size of a real gap", () => {
    expect(vsBaseline(0.41, 0.505, 1485, 8000).level).toBe(2); // Arcanine-Hisui, -9.5
    expect(vsBaseline(0.32, 0.505, 79, 8000).level).toBe(3); // a pair at -18.6 over 79 games
  });

  it("treats a moderate gap over few games as uncertain", () => {
    expect(vsBaseline(0.458, 0.505, 200, 8000).direction).toBe(0); // -4.7 over 200 games
    expect(vsBaseline(0.4, 0.505, 58, 8000).direction).toBe(0); // -10.5 over 58 games
  });

  it("ignores a gap that whole percentages could have made", () => {
    // Brought in 467 of 480 games, 49% against the team's 50%
    expect(vsBaseline(0.49, 0.5, 467, 480).direction).toBe(-1);
    expect(vsBaseline(0.49, 0.5, 467, 480, 0.01).direction).toBe(0);
    expect(vsBaseline(0.45, 0.5, 369, 480, 0.01).direction).toBe(-1);
  });

  it("has nothing to say without games or a baseline", () => {
    expect(vsBaseline(0.6, 0.5, 0).direction).toBe(0);
    expect(vsBaseline(0.6, null, 100).direction).toBe(0);
    // Brought every game: it is the team's rate
    expect(vsBaseline(0.5, 0.5, 8000, 8000).direction).toBe(0);
  });
});

describe("betweenRates and fromInterval", () => {
  it("compares brought with benched", () => {
    expect(betweenRates(0.53, 3000, 0.48, 5000).direction).toBe(1);
    expect(betweenRates(0.53, 30, 0.48, 50).direction).toBe(0);
  });

  it("uses an interval when there is one", () => {
    expect(fromInterval(0.0161, [-0.1067, 0.1389]).direction).toBe(0);
    expect(fromInterval(-0.06, [-0.09, -0.03])).toMatchObject({ direction: -1, level: 2 });
  });
});

describe("formatPoints and threatSeverity", () => {
  it("formats signed points", () => {
    expect(formatPoints(3.2)).toBe("+3");
    expect(formatPoints(-9.46, 1)).toBe("−9.5");
    expect(formatPoints(0.2)).toBe("0");
  });

  it("names each degree of danger", () => {
    expect(threatSeverity(vsBaseline(0.32, 0.505, 79, 8000)).label).toBe("Severe");
    expect(threatSeverity(vsBaseline(0.41, 0.505, 1485, 8000)).label).toBe("Notable");
    expect(threatSeverity(vsBaseline(0.47, 0.505, 2790, 8000)).label).toBe("Minor");
    expect(threatSeverity(vsBaseline(0.458, 0.505, 200, 8000)).label).toBe("Within noise");
  });
});

describe("margins and atLeast", () => {
  it("narrows the margin with more games", () => {
    expect(vsBaseline(0.41, 0.505, 1485, 8000).margin).toBeLessThan(vsBaseline(0.41, 0.505, 200, 8000).margin);
  });

  it("ranks a solid threat above a bigger but uncertain one", () => {
    const solid = vsBaseline(0.425, 0.505, 1485, 8000); // -8.0 over 1,485 games
    const shaky = vsBaseline(0.422, 0.505, 71, 8000); // -8.3 over 71 games
    expect(shaky.points).toBeLessThan(solid.points);
    expect(atLeast(solid)).toBeLessThan(atLeast(shaky));
    expect(atLeast(shaky)).toBe(0);
  });

  it("takes the side of an interval facing zero", () => {
    const s = fromInterval(-0.06, [-0.1, -0.02]);
    expect(s.margin).toBeCloseTo(4);
    expect(atLeast(s)).toBeCloseTo(-2);
  });

  it("is zero with nothing to go on", () => {
    expect(atLeast(vsBaseline(null, 0.5, 10))).toBe(0);
  });
});
