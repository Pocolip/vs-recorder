import { describe, expect, it } from "vitest";
import { matchupPaste, replayFixture } from "../test/replayFixtures";
import { MATCHUP_ITEM_RULES, matchReplayTeam } from "./matchupMatching";

describe("matchup replay matching", () => {
  it("matches all six in any order with packed item names", () => {
    const replay = replayFixture();
    const members = replay.battleData!.teamDetails!.p2;
    members[0].item = "CharizarditeY";
    members.reverse();
    expect(matchReplayTeam(matchupPaste, replay)).toBe("confirmed");
  });
  it.each(["Charizardite X", "Life Orb", ""])("rejects a known different item: %s", (item) => {
    const replay = replayFixture();
    replay.battleData!.teamDetails!.p2[0].item = item;
    expect(matchReplayTeam(matchupPaste, replay)).toBe("none");
  });
  it("ignores ordinary item differences and preserves competitive formes", () => {
    const replay = replayFixture();
    replay.battleData!.teamDetails!.p2[1].item = "Assault Vest";
    expect(matchReplayTeam(matchupPaste, replay)).toBe("confirmed");
    replay.battleData!.teamDetails!.p2[3].species = "Urshifu";
    expect(matchReplayTeam(matchupPaste, replay)).toBe("none");
  });
  it("labels unknown relevant items/formes as possible, but rejects contradictions", () => {
    const replay = replayFixture();
    replay.battleData!.teamDetails!.p2[0].item = null;
    expect(matchReplayTeam(matchupPaste, replay)).toBe("possible");
    replay.battleData!.teamDetails!.p2[3].species = "Urshifu-*";
    expect(matchReplayTeam(matchupPaste, replay)).toBe("possible");
    replay.battleData!.teamDetails!.p2[1].species = "Pikachu";
    expect(matchReplayTeam(matchupPaste, replay)).toBe("none");
  });
  it("uses Mega evidence for legacy summaries and explicit Mega species", () => {
    const replay = replayFixture();
    replay.battleData!.teamDetails!.p2[0].item = null;
    replay.battleData!.megaEvents = { p2: [{ pokemon: "Charizard", megaForme: "Charizard-Mega-Y" }] };
    expect(matchReplayTeam(matchupPaste, replay)).toBe("confirmed");
    replay.battleData!.teamDetails!.p2[0].species = "Charizard-Mega-Y";
    expect(matchReplayTeam(matchupPaste, replay)).toBe("confirmed");
  });
  it("includes Mega-Z and all species sharing a stone", () => {
    expect(MATCHUP_ITEM_RULES.absolitez.formes?.absol).toBe("absolmegaz");
    expect(MATCHUP_ITEM_RULES.floettite.formes?.floetteeternal).toBe("floettemega");
    expect(MATCHUP_ITEM_RULES.tatsugirinite.species).toHaveLength(3);
  });
  it("supports additional item families without changing the matching algorithm", () => {
    const replay = replayFixture();
    const rules = { ...MATCHUP_ITEM_RULES, sitrusberry: { species: ["incineroar"] } };
    replay.battleData!.teamDetails!.p2[1].item = "Assault Vest";
    expect(matchReplayTeam(matchupPaste, replay, rules)).toBe("none");
  });
  it("requires six known roster slots and an identified opponent", () => {
    const replay = replayFixture();
    expect(matchReplayTeam(matchupPaste.slice(0, 5), replay)).toBe("none");
    replay.battleData!.teamDetails = undefined;
    replay.battleData!.teams!.p2.pop();
    expect(matchReplayTeam(matchupPaste, replay)).toBe("none");
    replay.battleData!.opponentPlayer = undefined;
    expect(matchReplayTeam(matchupPaste, replay)).toBe("none");
  });
  it("does not match repeated members in place of a missing species", () => {
    const replay = replayFixture();
    replay.battleData!.teamDetails!.p2[4] = { ...replay.battleData!.teamDetails!.p2[5] };
    expect(matchReplayTeam(matchupPaste, replay)).toBe("none");
  });
  it("normalizes aliases without conflating regional and size formes", () => {
    const paste = matchupPaste.map((m) => ({ ...m }));
    const replay = replayFixture();
    paste[3].name = "Indeedee-F";
    replay.battleData!.teamDetails!.p2[3].species = "Indeedee-Female";
    expect(matchReplayTeam(paste, replay)).toBe("confirmed");
    replay.battleData!.teamDetails!.p2[3].species = "Indeedee-M";
    expect(matchReplayTeam(paste, replay)).toBe("none");
    paste[3].name = "Gourgeist-Small";
    replay.battleData!.teamDetails!.p2[3].species = "Gourgeist-Super";
    expect(matchReplayTeam(paste, replay)).toBe("none");
  });
});
