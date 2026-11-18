import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DiagnosticsPage from "./DiagnosticsPage";
import { simulationApi } from "../../services/api/simulationApi";
import { simulationContext, simulationResult } from "../../test/simulationFixtures";
import type { SimulationDiagnostics } from "../../types";

vi.mock("../../context/ActiveTeamContext", () => ({ useActiveTeam: () => ({ team: { id: 1 } }) }));
vi.mock("../../context/SimulationContext", () => ({
  useSimulation: () => ({ ...simulationContext({ result: simulationResult() }), resultKey: "job-1:complete" }),
}));
vi.mock("../../services/api/simulationApi", () => ({ simulationApi: { getDiagnostics: vi.fn() } }));
vi.mock("../../components/team/SimulatedBar", () => ({ default: () => null }));
vi.mock("../../components/pokemon/PokemonSprite", () => ({ default: () => null }));
vi.mock("../../components/common/PageMeta", () => ({ default: () => null }));

const diagnostics: SimulationDiagnostics = {
  resultStatus: "complete",
  stale: false,
  opponentsCount: 40,
  games: 8000,
  winRate: 0.505,
  members: [
    {
      species: "Sneasler",
      broughtRate: 0.4,
      leadRate: 0.2,
      gamesBrought: 3200,
      gamesBenched: 4800,
      winRateBrought: 0.55,
      winRateBenched: 0.47,
      delta: 0.08,
      ci95: [0.058, 0.102],
    },
  ],
  // The engine's order: biggest drop first
  threatSpecies: [
    { species: ["Garchomp"], games: 71, winRate: 0.422, delta: -0.083 },
    { species: ["Kingambit"], games: 1485, winRate: 0.425, delta: -0.08 },
  ],
  threatPairs: [],
};

const threatList = () => within(screen.getByText("Threatening Pokemon").parentElement!);
const order = () =>
  threatList()
    .getAllByText(/^(Garchomp|Kingambit)$/)
    .map((el) => el.textContent);

describe("DiagnosticsPage threats", () => {
  it("ranks by biggest drop, or by the drop we're sure of", async () => {
    vi.mocked(simulationApi.getDiagnostics).mockResolvedValue(diagnostics);
    render(<DiagnosticsPage />);
    await waitFor(() => expect(screen.getByText("Threatening Pokemon")).toBeTruthy());

    expect(order()).toEqual(["Garchomp", "Kingambit"]);
    expect(threatList().getByText("Within noise")).toBeTruthy();
    expect(threatList().getByText("Notable")).toBeTruthy();

    fireEvent.click(screen.getByRole("radio", { name: "Surest drop" }));
    expect(order()).toEqual(["Kingambit", "Garchomp"]);
    expect(localStorage.getItem("vsr.diagnostics.ranking")).toBe("sure");
  });

  it("names the brought-minus-benched column Difference", async () => {
    vi.mocked(simulationApi.getDiagnostics).mockResolvedValue(diagnostics);
    render(<DiagnosticsPage />);
    await waitFor(() => expect(screen.getByText("Difference")).toBeTruthy());
    expect(screen.queryByText("Adds")).toBeNull();
    expect(screen.getByText("+8.0 pts")).toBeTruthy();
  });
});
