import { describe, expect, it } from "vitest";
import { calcSide } from "./calcSide";

// Stands in for the registry's base-species lookup, which isn't loaded in tests.
const BASES: Record<string, string> = {
  "charizard-mega-y": "charizard",
  "floette-mega": "floette-eternal",
};
const keyOf = (name: string) => {
  const key = name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return BASES[key] ?? key;
};

const VOLCARONA_CALC =
  "+1 14 SpA Volcarona Giga Drain vs. 2 HP / 0 SpD Basculegion in Grassy Terrain: 196-232 (99.4 - 117.7%) -- 93.75% chance to OHKO";

describe("calcSide", () => {
  it("reads the attacker as offensive and the target as defensive", () => {
    expect(calcSide(VOLCARONA_CALC, "Volcarona", keyOf)).toBe("offensive");
    expect(calcSide(VOLCARONA_CALC, "Basculegion", keyOf)).toBe("defensive");
  });

  it("finds multi-word names among items and tera types", () => {
    const calc =
      "252+ SpA Choice Specs Tera Fairy Flutter Mane Moonblast vs. 252 HP / 4 SpD Incineroar: 90-106 (44.1 - 52%) -- 2HKO";
    expect(calcSide(calc, "Flutter Mane", keyOf)).toBe("offensive");
    expect(calcSide(calc, "Incineroar", keyOf)).toBe("defensive");
  });

  it("matches a Mega forme to the species the team lists", () => {
    const calc =
      "252 SpA Charizard-Mega-Y Heat Wave (Spread) vs. 0 HP / 0 SpD Floette-Mega in Sun: 120-142 (80 - 94.6%) -- guaranteed 2HKO";
    expect(calcSide(calc, "Charizard", keyOf)).toBe("offensive");
    expect(calcSide(calc, "Floette-Eternal", keyOf)).toBe("defensive");
  });

  it("doesn't match a name inside a longer one", () => {
    const calc =
      "252 SpA Mewtwo Psystrike vs. 252 HP / 0 Def Amoonguss: 100-118 (45 - 53%) -- 2HKO";
    expect(calcSide(calc, "Mew", keyOf)).toBeNull();
  });

  it("can't tell a mirror match or text that isn't a calc", () => {
    const mirror =
      "252 Atk Incineroar Flare Blitz vs. 252 HP / 0 Def Incineroar: 50-60 (25 - 30%) -- 4HKO";
    expect(calcSide(mirror, "Incineroar", keyOf)).toBeNull();
    expect(
      calcSide("Outspeeds Tornadus after Tailwind", "Tornadus", keyOf),
    ).toBeNull();
  });
});
