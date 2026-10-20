import { describe, expect, it } from "vitest";
import { parsePokepasteText } from "../services/pokepasteService";
import { pasteToCalc } from "./pasteToCalc";

const paste = `Incineroar (M) @ Sitrus Berry
Ability: Intimidate
Level: 100
Tera Type: Ghost
Careful Nature
EVs: 252 HP / 4 Atk / 252 SpD
IVs: 0 Spe
- Fake Out
- Flare Blitz`;

describe("paste-to-calculator conversion", () => {
  it("retains species, nature, stats and zero IVs, using VGC level 50", () => {
    const mon = parsePokepasteText(paste)[0];
    expect(mon.species).toBe("Incineroar");
    const state = pasteToCalc(mon, 9);
    expect(state).toMatchObject({
      species: "Incineroar", level: 50, nature: "Careful", item: "Sitrus Berry",
      evs: { hp: 252, atk: 4, spd: 252 }, ivs: { spe: 0, hp: 31 },
      teraType: "Ghost", isTera: false, curHP: 100, boostedStat: null,
    });
    expect(state.moves).toHaveLength(4);
    expect(state.moves[2]).toEqual({ name: "", crit: false, bpOverride: null });
    expect(Object.values(state.boosts)).toEqual([0, 0, 0, 0, 0]);
  });

  it("loads Champions values as SPs with fresh defaults", () => {
    const state = pasteToCalc(parsePokepasteText(paste.replace("252", "32"))[0], 10);
    expect(state.sps.hp).toBe(32);
    expect(state.evs.hp).toBe(0);
    expect(state.ivs.spe).toBe(31);
    const plain = pasteToCalc({ name: "Pikachu", species: "Pikachu" }, 9);
    expect(plain.nature).toBe("Hardy");
    expect(plain.item).toBe("");
    expect(plain.evs.hp).toBe(0);
    expect(plain.teraType).toBeNull();
  });
});
