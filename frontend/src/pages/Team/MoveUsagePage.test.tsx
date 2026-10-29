import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import MoveUsagePage from "./MoveUsagePage";
import * as paste from "../../services/pokepasteService";
import { analyticsApi } from "../../services/api/analyticsApi";
import { useActiveTeam } from "../../context/ActiveTeamContext";
vi.mock("../../context/ActiveTeamContext", () => ({ useActiveTeam: vi.fn() }));
vi.mock("../../services/pokepasteService", () => ({ fetchAndParse: vi.fn() }));
vi.mock("../../services/api/analyticsApi", () => ({ analyticsApi: { getMoveUsage: vi.fn() } }));
vi.mock("../../components/common/PageMeta", () => ({ default: () => null }));
vi.mock("../../components/pokemon/PokemonSprite", () => ({ default: () => null }));
vi.mock("recharts", () => ({ PieChart: () => null, Pie: () => null, Cell: () => null, ResponsiveContainer: () => null, Tooltip: () => null }));
function team(id: number) {
  vi.mocked(useActiveTeam).mockReturnValue({ team: { id, pokepaste: String(id) } } as ReturnType<typeof useActiveTeam>);
}
describe("move usage loading", () => {
  it("renders analytics before a delayed paste and ignores old-team responses", async () => {
    let finish!: (value: paste.PokemonData[]) => void;
    team(1);
    vi.mocked(paste.fetchAndParse).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValue([]);
    vi.mocked(analyticsApi.getMoveUsage).mockResolvedValue({ pokemonMoves: [{ pokemon: "Pikachu", moves: [{ move: "Thunderbolt", count: 5 }] }] } as never);
    const { rerender } = render(<MoveUsagePage />);
    await waitFor(() => expect(screen.getByText("5 total uses")).toBeTruthy());
    team(2);
    vi.mocked(analyticsApi.getMoveUsage).mockResolvedValue({ pokemonMoves: [] } as never);
    rerender(<MoveUsagePage />);
    await act(async () => finish([{ name: "Old", species: "Old", moves: ["Stale"] }]));
    expect(screen.queryByText("Old")).toBeNull();
    expect(screen.queryByText("5 total uses")).toBeNull();
  });
  it("keeps analytics available when a paste fails", async () => {
    team(3);
    vi.mocked(paste.fetchAndParse).mockRejectedValue(new Error("paste unavailable"));
    vi.mocked(analyticsApi.getMoveUsage).mockResolvedValue({ pokemonMoves: [{ pokemon: "Pikachu", moves: [{ move: "Thunderbolt", count: 2 }] }] } as never);
    render(<MoveUsagePage />);
    await waitFor(() => expect(screen.getByText("2 total uses")).toBeTruthy());
  });
});
