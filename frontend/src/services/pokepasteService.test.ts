import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAndParse, parsePokepasteText } from "./pokepasteService";
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

it("deduplicates in-flight pastes and caps cold-cache concurrency", async () => {
  localStorage.clear();
  let active = 0;
  let peak = 0;
  const release: Array<() => void> = [];
  const fetcher = vi.fn(() => {
    active++; peak = Math.max(peak, active);
    return new Promise((resolve) => release.push(() => {
      active--;
      resolve({ ok: true, text: async () => raw });
    }));
  });
  vi.stubGlobal("fetch", fetcher);
  const requests = Array.from({ length: 10 }, (_, i) => fetchAndParse(`https://pokepast.es/perf${i}`));
  requests.push(fetchAndParse("https://pokepast.es/perf0"));
  await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(4));
  while (fetcher.mock.calls.length < 10 || release.length) {
    release.splice(0).forEach((finish) => finish());
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  await Promise.all(requests);
  expect(peak).toBe(4);
  expect(fetcher).toHaveBeenCalledTimes(10);
  const cache = JSON.parse(localStorage.getItem("pokepaste_cache_v4")!);
  expect(Object.keys(cache)).toHaveLength(10);
});
