import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OpponentTeamCard, { type OpponentTeam } from "./OpponentTeamCard";
import { partialPlanResult, planJob, planResult } from "../../test/planFixtures";
import type { PlanEntryStatus } from "../../types";

vi.mock("../pokemon/PokemonTeam", () => ({ default: () => null }));
vi.mock("../pokemon/PokemonSprite", () => ({
  default: ({ name }: { name: string }) => <span data-testid="sprite">{name}</span>,
}));
vi.mock("../../services/pokepasteService", () => ({
  isInlinePaste: () => false,
  fetchPasteTitle: () => Promise.resolve("Frankfurt winner"),
}));

const entry: OpponentTeam = {
  id: 5,
  teamId: 7,
  gamePlanId: 3,
  pokepaste: "https://pokepast.es/frankfurt",
  notes: "My own notes",
  color: "blue",
  createdAt: "2026-11-18T00:00:00Z",
  compositions: [{ lead1: "Pelipper", lead2: "Archaludon", back1: "Golisopod", back2: "Sneasler", notes: "My own plan" }],
};

const complete: PlanEntryStatus = { gamePlanTeamId: 5, job: planJob("COMPLETE"), result: planResult() };

function renderCard(props: Partial<React.ComponentProps<typeof OpponentTeamCard>> = {}) {
  const handlers = {
    onUpdateNotes: vi.fn(),
    onAddComposition: vi.fn().mockResolvedValue({}),
    onUpdateComposition: vi.fn(),
    onDeleteComposition: vi.fn(),
    onDeleteTeam: vi.fn(),
  };
  render(<OpponentTeamCard opponentTeam={entry} myTeamPokemon={[]} {...handlers} {...props} />);
  return handlers;
}

describe("OpponentTeamCard with a simulated plan", () => {
  it("shows the user's own plans while Simulated is off", () => {
    renderCard({ plan: complete, simulated: false });
    expect(screen.getByText("My own plan")).toBeTruthy();
    expect(screen.getByText("My own notes")).toBeTruthy();
    expect(screen.queryByText("Simulated plan")).toBeNull();
    expect(screen.queryByText(/68%/)).toBeNull();
  });

  it("swaps in the engine's plan while Simulated is on, without touching the user's own", () => {
    const { onUpdateComposition, onDeleteComposition } = renderCard({ plan: complete, simulated: true });
    expect(screen.getByText("Simulated plan")).toBeTruthy();
    expect(screen.queryByText("My own plan")).toBeNull();
    expect(screen.getByText("Notes (simulated)")).toBeTruthy();
    expect(screen.getAllByText(/they lead Garchomp \+ Rillaboom 57%/).length).toBeGreaterThan(0);
    expect(screen.getByText("68% · Favorable")).toBeTruthy();
    expect(screen.getByText(/95% interval 59–77% · 128 games: 87–41/)).toBeTruthy();
    expect(screen.getByText("40%")).toBeTruthy();
    expect(screen.getByText(/not against a person/)).toBeTruthy();
    expect(screen.getByText(/costs about 14 points/)).toBeTruthy();
    expect(onUpdateComposition).not.toHaveBeenCalled();
    expect(onDeleteComposition).not.toHaveBeenCalled();
  });

  it("shows a partial plan's compositions with the win rate pending", () => {
    renderCard({ plan: { gamePlanTeamId: 5, job: planJob("PARTIAL"), result: partialPlanResult() }, simulated: true });
    expect(screen.getByText("Win rate pending")).toBeTruthy();
    expect(screen.getByText(/Win rate pending: the engine is playing the matchup/)).toBeTruthy();
    expect(screen.getByText(/What to bring is ready/)).toBeTruthy();
    expect(screen.getByText("What to bring (2)")).toBeTruthy();
  });

  it("doesn't call a partial pending once its job has failed", () => {
    renderCard({
      plan: {
        gamePlanTeamId: 5,
        job: planJob("FAILED", "plan-job-1", { errorCode: "internal", errorMessage: "The simulation failed on our side." }),
        result: partialPlanResult(),
      },
      simulated: true,
    });
    expect(screen.queryByText(/Win rate pending/)).toBeNull();
    expect(screen.getByText("No win rate")).toBeTruthy();
    expect(screen.getByText(/stopped before playing the matchup/)).toBeTruthy();
    expect(screen.getByText(/failed on our side\. What to bring is shown, without a win rate\./)).toBeTruthy();
  });

  it("copies one of the engine's compositions into the user's own plans on request", async () => {
    const { onAddComposition } = renderCard({ plan: complete, simulated: true });
    fireEvent.click(screen.getAllByRole("button", { name: /Add to my plans/ })[0]);
    await waitFor(() =>
      expect(onAddComposition).toHaveBeenCalledWith(5, {
        lead1: "Golisopod",
        lead2: "Pelipper",
        back1: "Basculegion-F",
        back2: "Sneasler",
        notes: "Simulated: 40% of the engine's preview mix.",
      }),
    );
  });

  it("marks a stale plan and offers to re-simulate it", () => {
    const onSimulate = vi.fn();
    renderCard({
      plan: { ...complete, result: planResult({ stale: true, staleReason: "OPPONENT" }) },
      simulated: true,
      onSimulate,
    });
    expect(screen.getByText("This team's paste changed since this plan.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Re-simulate" }));
    expect(onSimulate).toHaveBeenCalled();
  });

  it("says which team an engine rejection is about", () => {
    renderCard({
      plan: {
        gamePlanTeamId: 5,
        job: planJob("FAILED", "j9", { errorCode: "invalid_opponent", errorMessage: "a team has 6 Pokémon, this one 4" }),
        result: null,
      },
      simulated: true,
    });
    expect(screen.getByText("This team can't be simulated: a team has 6 Pokémon, this one 4")).toBeTruthy();
  });
});
