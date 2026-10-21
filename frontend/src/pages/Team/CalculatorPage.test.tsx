import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CalculatorPage from "./CalculatorPage";
import { CalcStateProvider } from "../../context/CalcStateContext";
import { fetchAndParse, type PokemonData } from "../../services/pokepasteService";
import type { FieldState, PokemonState } from "../../types";

let activeTeam = { id: 1, pokepaste: "old" };
vi.mock("../../context/ActiveTeamContext", () => ({ useActiveTeam: () => ({ team: activeTeam }) }));
vi.mock("../../services/pokepasteService", () => ({ fetchAndParse: vi.fn() }));
vi.mock("../../hooks/useTeamMembers", () => ({ default: () => ({ teamMembers: [], updateMemberCalcs: vi.fn() }) }));
vi.mock("../../hooks/useDamageCalc", () => ({ useDamageCalc: () => null }));
vi.mock("../../components/common/PageMeta", () => ({ default: () => null }));
vi.mock("../../components/calc", () => ({
  PokemonPanel: ({ side, state, onChange, teamPokemon, onTeamSelect }: {
    side: string; state: PokemonState; onChange: (s: Partial<PokemonState>) => void;
    teamPokemon: PokemonData[] | null; onTeamSelect?: (m: PokemonData) => void;
  }) => <div>
    <output data-testid={side}>{JSON.stringify(state)}</output>
    <button onClick={() => onChange({ curHP: 42 })}>Edit {side}</button>
    {teamPokemon?.map((mon) => <button key={mon.name} onClick={() => onTeamSelect?.(mon)}>Load {mon.name}</button>)}
  </div>,
  FieldPanel: ({ fieldState, onChange }: { fieldState: FieldState; onChange: (f: FieldState) => void }) => <div>
    <output data-testid="field">{fieldState.weather}</output>
    <button onClick={() => onChange({ ...fieldState, weather: "Sun" })}>Sun</button>
  </div>,
  GenerationPicker: () => null, MoveResults: () => null, MainResult: () => null,
}));

function Harness({ show }: { show: boolean }) {
  return <CalcStateProvider>{show ? <CalculatorPage /> : <div>Another page</div>}</CalcStateProvider>;
}
function state(side: string): PokemonState {
  return JSON.parse(screen.getByTestId(side).textContent || "{}") as PokemonState;
}
beforeEach(() => {
  activeTeam = { id: 1, pokepaste: "old" };
  vi.mocked(fetchAndParse).mockImplementation(async (url) => [{
    name: "Incineroar", species: "Incineroar", nature: url === "old" ? "Adamant" : "Careful",
  }]);
});

describe("calculator session lifecycle", () => {
  it("restores manual edits on navigation, then refreshes only the selected attacker after a paste edit", async () => {
    const { rerender } = render(<Harness show />);
    fireEvent.click(await screen.findByRole("button", { name: "Load Incineroar" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit p1" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit p2" }));
    fireEvent.click(screen.getByRole("button", { name: "Sun" }));
    rerender(<Harness show={false} />);
    rerender(<Harness show />);
    await screen.findByRole("button", { name: "Load Incineroar" });
    expect(state("p1").curHP).toBe(42);
    rerender(<Harness show={false} />);
    activeTeam = { id: 1, pokepaste: "new" };
    rerender(<Harness show />);
    await waitFor(() => expect(state("p1").nature).toBe("Careful"));
    expect(state("p1").curHP).toBe(100);
    expect(state("p2").curHP).toBe(42);
    expect(screen.getByTestId("field").textContent).toBe("Sun");
  });
  it("keeps snapshots isolated when switching teams without leaving the calculator", async () => {
    const { rerender } = render(<Harness show />);
    fireEvent.click(await screen.findByRole("button", { name: "Load Incineroar" }));
    fireEvent.click(screen.getByRole("button", { name: "Edit p1" }));
    activeTeam = { id: 2, pokepaste: "new" };
    rerender(<Harness show />);
    await screen.findByRole("button", { name: "Load Incineroar" });
    expect(state("p1").species).toBe("");
    fireEvent.click(screen.getByRole("button", { name: "Load Incineroar" }));
    expect(state("p1").nature).toBe("Careful");
    activeTeam = { id: 1, pokepaste: "old" };
    rerender(<Harness show />);
    await screen.findByRole("button", { name: "Load Incineroar" });
    expect(state("p1").nature).toBe("Adamant");
    expect(state("p1").curHP).toBe(42);
  });
});
