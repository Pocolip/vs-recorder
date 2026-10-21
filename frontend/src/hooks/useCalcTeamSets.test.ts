import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCalcTeamSets } from "./useCalcTeamSets";
import { fetchAndParse, type PokemonData } from "../services/pokepasteService";
import { createDefaultPokemonState, createDefaultFieldState } from "../utils/calcUtils";
import type { CalcSnapshot } from "../context/CalcStateContext";

vi.mock("../services/pokepasteService", () => ({ fetchAndParse: vi.fn() }));
const mon: PokemonData = { name: "Incineroar", species: "Incineroar", evs: { HP: 32 }, nature: "Careful" };
const saved: CalcSnapshot = {
  p1: createDefaultPokemonState("Incineroar"), p2: createDefaultPokemonState("Pikachu"),
  field: createDefaultFieldState(), selectedP1Move: 2, selectedP2Move: 1,
  activeSide: "p2", gen: 10, sourcePaste: "old", selectedTeamMember: "Incineroar",
};
beforeEach(() => vi.mocked(fetchAndParse).mockReset());

describe("calculator team refresh", () => {
  it("preserves the saved calculation when the paste is unchanged", async () => {
    vi.mocked(fetchAndParse).mockResolvedValue([mon]);
    const replace = vi.fn();
    const { result } = renderHook(() => useCalcTeamSets("old", 10, saved, replace));
    await waitFor(() => expect(result.current.teamPokemon).toHaveLength(1));
    expect(replace).not.toHaveBeenCalled();
  });
  it("loads the updated selected set and falls back when the member was removed", async () => {
    vi.mocked(fetchAndParse).mockResolvedValue([mon]);
    const replace = vi.fn();
    const { result, rerender } = renderHook(({ paste }) => useCalcTeamSets(paste, 10, saved, replace),
      { initialProps: { paste: "new" } });
    await waitFor(() => expect(result.current.sourcePaste).toBe("new"));
    expect(replace).toHaveBeenLastCalledWith(expect.objectContaining({ nature: "Careful", sps: expect.objectContaining({ hp: 32 }) }));
    vi.mocked(fetchAndParse).mockResolvedValue([{ name: "Pikachu", species: "Pikachu" }]);
    rerender({ paste: "replacement" });
    await waitFor(() => expect(result.current.selectedTeamMember).toBe("Pikachu"));
    expect(replace).toHaveBeenLastCalledWith(expect.objectContaining({ species: "Pikachu" }));
  });
  it("ignores obsolete responses and respects a preset selected while loading", async () => {
    let resolveOld!: (value: PokemonData[]) => void;
    let resolveNew!: (value: PokemonData[]) => void;
    vi.mocked(fetchAndParse)
      .mockImplementationOnce(() => new Promise((r) => { resolveOld = r; }))
      .mockImplementationOnce(() => new Promise((r) => { resolveNew = r; }));
    const replace = vi.fn();
    const { result, rerender } = renderHook(({ paste }) => useCalcTeamSets(paste, 9, saved, replace),
      { initialProps: { paste: "one" } });
    rerender({ paste: "two" });
    act(() => result.current.clearSelection());
    replace.mockClear();
    await act(async () => { resolveNew([mon]); });
    await act(async () => { resolveOld([{ name: "Old", species: "Old" }]); });
    expect(result.current.teamPokemon).toEqual([mon]);
    expect(result.current.sourcePaste).toBe("two");
    expect(replace).not.toHaveBeenCalled();
  });
  it("clears old sets on errors, retries, and clears association on paste removal", async () => {
    vi.mocked(fetchAndParse).mockRejectedValueOnce(new Error("Unavailable")).mockResolvedValue([mon]);
    const replace = vi.fn();
    const { result, rerender } = renderHook(({ paste }: { paste: string | null }) => useCalcTeamSets(paste, 9, saved, replace),
      { initialProps: { paste: "new" as string | null } });
    await waitFor(() => expect(result.current.error).toBe("Unavailable"));
    expect(result.current.teamPokemon).toEqual([]);
    expect(result.current.sourcePaste).toBe("old");
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.sourcePaste).toBe("new"));
    rerender({ paste: null });
    expect(result.current.selectedTeamMember).toBeNull();
    expect(result.current.teamPokemon).toEqual([]);
    expect(replace).toHaveBeenLastCalledWith(createDefaultPokemonState());
  });
});
