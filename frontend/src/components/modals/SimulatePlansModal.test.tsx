import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SimulatePlansModal from "./SimulatePlansModal";
import { planJob, planResult, planSimulations } from "../../test/planFixtures";
import { SINGLE_PLAN_WARNING } from "../../utils/simulationUtils";

vi.mock("../pokemon/PokemonTeam", () => ({ default: () => null }));
vi.mock("../pokemon/PokemonSprite", () => ({ default: () => null }));

const entries = [
  { id: 1, pokepaste: "https://pokepast.es/a" },
  { id: 2, pokepaste: "https://pokepast.es/b" },
  { id: 3, pokepaste: "https://pokepast.es/c" },
  { id: 4, pokepaste: "Garchomp @ Choice Scarf\n- Earthquake" },
];

// 1: never simulated, 2: up to date, 3: running, 4: stale
const plans = () =>
  planSimulations([
    { gamePlanTeamId: 1, job: null, result: null },
    { gamePlanTeamId: 2, job: planJob("COMPLETE", "j2"), result: planResult({ jobId: "j2" }) },
    { gamePlanTeamId: 3, job: planJob("RUNNING", "j3"), result: null },
    { gamePlanTeamId: 4, job: planJob("COMPLETE", "j4"), result: planResult({ jobId: "j4", stale: true, staleReason: "OPPONENT" }) },
  ]);

const checkbox = (id: number) => document.getElementById(`simulate-entry-${id}`) as HTMLInputElement;

describe("SimulatePlansModal", () => {
  it("checks every entry without an up-to-date plan, and can't check a running one", () => {
    render(<SimulatePlansModal isOpen onClose={vi.fn()} entries={entries} plans={plans()} initialSelection={null} />);
    expect(checkbox(1).checked).toBe(true);
    expect(checkbox(2).checked).toBe(false);
    expect(checkbox(3).checked).toBe(false);
    expect(checkbox(3).disabled).toBe(true);
    expect(checkbox(4).checked).toBe(true);
    expect(screen.getByRole("button", { name: "Simulate 2 teams" })).toBeTruthy();
    expect(screen.queryByText(SINGLE_PLAN_WARNING)).toBeNull();
  });

  it("queues one job per checked entry, in the planner's order, forcing only when asked", async () => {
    const p = plans();
    const onClose = vi.fn();
    render(<SimulatePlansModal isOpen onClose={onClose} entries={entries} plans={p} initialSelection={null} />);

    fireEvent.click(screen.getByRole("button", { name: "Simulate 2 teams" }));
    await waitFor(() => expect(p.submit).toHaveBeenCalledWith([1, 4], false));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("Check all takes every entry that isn't running, re-running an up-to-date one", async () => {
    const p = plans();
    render(<SimulatePlansModal isOpen onClose={vi.fn()} entries={entries} plans={p} initialSelection={null} />);
    fireEvent.click(screen.getByLabelText("Check all"));
    expect(screen.getByText("Nothing changed: it'll run again.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Simulate 3 teams" }));
    await waitFor(() => expect(p.submit).toHaveBeenCalledWith([1, 2, 4], true));
  });

  it("warns that one team alone costs about as much as three", () => {
    render(<SimulatePlansModal isOpen onClose={vi.fn()} entries={entries} plans={plans()} initialSelection={[1]} />);
    expect(checkbox(1).checked).toBe(true);
    expect(checkbox(4).checked).toBe(false);
    expect(screen.getByText(SINGLE_PLAN_WARNING)).toBeTruthy();
  });

  it("shows why an entry wasn't queued, and stays open", async () => {
    const p = plans();
    p.submit = vi.fn().mockResolvedValue({
      outcomes: [
        { gamePlanTeamId: 1, queued: true, errorCode: null, message: null },
        { gamePlanTeamId: 4, queued: false, errorCode: "invalid_opponent", message: "Couldn't read this team's paste." },
      ],
      error: null,
    });
    const onClose = vi.fn();
    render(<SimulatePlansModal isOpen onClose={onClose} entries={entries} plans={p} initialSelection={null} />);
    fireEvent.click(screen.getByRole("button", { name: "Simulate 2 teams" }));

    expect(await screen.findByText("This team can't be simulated: Couldn't read this team's paste.")).toBeTruthy();
    expect(screen.getByText(/1 team is being simulated\. 1 couldn't be/)).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("won't submit more than today's cap", () => {
    const p = planSimulations(plans().status!.entries, { runsLeftToday: 1 });
    render(<SimulatePlansModal isOpen onClose={vi.fn()} entries={entries} plans={p} initialSelection={null} />);
    expect(screen.getByText("You can simulate 1 more team today.")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Simulate 2 teams" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
