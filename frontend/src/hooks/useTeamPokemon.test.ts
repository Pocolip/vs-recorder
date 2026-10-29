import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import useTeamPokemon from "./useTeamPokemon";
import * as paste from "../services/pokepasteService";
vi.mock("../services/pokepasteService", () => ({ fetchAndParse: vi.fn() }));

describe("progressive team rosters", () => {
  it("shows stored species and fast pastes while another paste waits", async () => {
    let finish!: (data: paste.PokemonData[]) => void;
    vi.mocked(paste.fetchAndParse).mockImplementation((url) => url === "slow" ? new Promise((resolve) => { finish = resolve; }) : Promise.resolve([{ name: "Pikachu", species: "Pikachu" }]));
    const { result } = renderHook(() => useTeamPokemon([
      { id: 1, pokepaste: "stored", pokemonNames: ["Incineroar"] },
      { id: 2, pokepaste: "slow" }, { id: 3, pokepaste: "fast" },
    ], true));
    expect(result.current.teamPokemon[1]).toEqual(["Incineroar"]);
    await waitFor(() => expect(result.current.teamPokemon[3]).toEqual(["Pikachu"]));
    expect(result.current.loading).toBe(true);
    expect(paste.fetchAndParse).not.toHaveBeenCalledWith("stored", expect.anything());
    await act(async () => finish([{ name: "Slowbro", species: "Slowbro" }]));
    expect(result.current.teamPokemon[2]).toEqual(["Slowbro"]);
  });
  it("does not publish stale results after changing teams", async () => {
    let finish!: (data: paste.PokemonData[]) => void;
    vi.mocked(paste.fetchAndParse).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValue([]);
    const { result, rerender } = renderHook(({ id }) => useTeamPokemon([{ id, pokepaste: String(id) }]), { initialProps: { id: 1 } });
    rerender({ id: 2 });
    await act(async () => finish([{ name: "Stale", species: "Stale" }]));
    expect(result.current.teamPokemon[1]).toBeUndefined();
  });
});
