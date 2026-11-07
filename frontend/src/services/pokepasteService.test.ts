import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAndParse, fetchPasteTitle, isInlinePaste, parsePokepasteText } from "./pokepasteService";
import { apiClient } from "./api";

vi.mock("./api", () => ({ apiClient: { get: vi.fn() } }));
afterEach(() => vi.unstubAllGlobals());
const raw = `Sparky (Pikachu) (F) @ Light Ball
Ability: Static
Timid Nature
EVs: 4 HP / 252 SpA / 252 Spe
IVs: 0 Atk
- Thunderbolt`;

describe("paste providers", () => {
  it.each(["pokebin.com", "vrpastes.com"])("preserves complete spreads from %s", async (host) => {
    vi.mocked(apiClient.get).mockResolvedValue({
      rawText: raw, pokemon: [{ species: "Pikachu", item: "Light Ball" }],
    });
    const [mon] = await fetchAndParse(`https://${host}/abc123`);
    expect(mon).toMatchObject({
      name: "Pikachu", species: "Pikachu", nickname: "Sparky", gender: "F",
      nature: "Timid", evs: { HP: 4, SpA: 252 }, ivs: { Atk: 0 },
    });
  });
  it("uses the same parser for Pokepaste and ignores obsolete cached sets", async () => {
    localStorage.setItem("pokepaste_cache_v3", JSON.stringify({
      "https://pokepast.es/abc123": { data: [{ name: "Old" }], timestamp: Date.now() },
    }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: async () => raw }));
    expect(await fetchAndParse("https://pokepast.es/abc123")).toEqual(parsePokepasteText(raw));
  });
  it("parses unnicknamed species without item/gender suffixes", () => {
    expect(parsePokepasteText("Pikachu (F) @ Light Ball")[0])
      .toMatchObject({ name: "Pikachu", species: "Pikachu", item: "Light Ball", gender: "F" });
  });
});

describe("inline open-teamsheet pastes", () => {
  const sheet = `Raichu @ Raichunite Y
Ability: Lightning Rod
Timid Nature
- Zap Cannon
- Protect

Kommo-o
- Clanging Scales`;

  it("detects inline text vs paste URLs", () => {
    expect(isInlinePaste(sheet)).toBe(true);
    expect(isInlinePaste("https://pokepast.es/abc123")).toBe(false);
    expect(isInlinePaste("Pikachu")).toBe(false);
    expect(isInlinePaste("")).toBe(false);
    expect(isInlinePaste(null)).toBe(false);
  });

  it("parses inline sheets without fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.mocked(apiClient.get).mockClear();
    const mons = await fetchAndParse(`\n${sheet}\n`);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(apiClient.get).not.toHaveBeenCalled();
    expect(mons).toHaveLength(2);
    expect(mons[0]).toMatchObject({
      name: "Raichu", item: "Raichunite Y", ability: "Lightning Rod", nature: "Timid",
      moves: ["Zap Cannon", "Protect"],
    });
    expect(mons[1]).toMatchObject({ name: "Kommo-o", moves: ["Clanging Scales"] });
    expect(mons[1].evs).toBeUndefined();
  });

  it("has no paste title for inline sheets", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    expect(await fetchPasteTitle(sheet)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
