import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import SimulationsModal from "./SimulationsModal";
import { useSimulation } from "../../context/SimulationContext";
import { simulationContext, simulationJob, simulationResult } from "../../test/simulationFixtures";
import type { SimulationStatus, Team } from "../../types";

let isOwner = true;
vi.mock("../../context/SimulationContext", () => ({ useSimulation: vi.fn() }));
vi.mock("../../hooks/useTeamPermissions", () => ({ useTeamPermissions: () => ({ isOwner }) }));

const team = { id: 7, name: "Rain" } as Team;

function renderModal(status: Partial<SimulationStatus>, over: Partial<ReturnType<typeof useSimulation>> = {}) {
  const context = { ...simulationContext(status), ...over };
  vi.mocked(useSimulation).mockReturnValue(context);
  render(
    <MemoryRouter>
      <SimulationsModal team={team} />
    </MemoryRouter>,
  );
  return context;
}

describe("SimulationsModal", () => {
  it("lists each feature, with a run per depth for simulated analytics", () => {
    isOwner = true;
    const { run } = renderModal({});
    expect(screen.getByText("No simulations yet for this team.")).toBeTruthy();
    expect(screen.getByText("Simulated analytics")).toBeTruthy();
    expect(screen.getByText("Matchup Planner")).toBeTruthy();
    expect(screen.getByText("Replay grading")).toBeTruthy();
    expect(screen.getAllByText("Coming later")).toHaveLength(2);

    fireEvent.click(screen.getByRole("button", { name: "Run quick" }));
    expect(run).toHaveBeenCalledWith("quick");
    fireEvent.click(screen.getByRole("button", { name: "Run full" }));
    expect(run).toHaveBeenCalledWith("full");
    expect(screen.getByText(/3 runs left today/)).toBeTruthy();
  });

  it("summarizes a running job and lets the owner cancel it", () => {
    isOwner = true;
    const { cancel } = renderModal({
      canRun: false,
      job: { ...simulationJob("RUNNING"), depth: "quick", progress: "games 8/40" },
      result: simulationResult({ depth: "full" }),
    });
    expect(screen.getByText("Quick simulation running")).toBeTruthy();
    expect(screen.getByText(/Playing games \(8\/40\)/)).toBeTruthy();
    expect(screen.getByText(/Pages show the full simulation/)).toBeTruthy();
    expect(screen.getByText("Current result")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Run quick" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(cancel).toHaveBeenCalled();
  });

  it("offers Run anyway at the depth that was refused", () => {
    isOwner = true;
    const { run } = renderModal(
      { job: simulationJob("COMPLETE", "job-1"), result: simulationResult() },
      { actionError: { message: "This team hasn't changed since its last simulation.", canForce: true, depth: "quick" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Run anyway" }));
    expect(run).toHaveBeenCalledWith("quick", true);
  });

  it("says what was adjusted in the paste", () => {
    isOwner = true;
    renderModal({
      canRun: false,
      job: { ...simulationJob("QUEUED"), pasteNotes: ["Garchomp-Mega was sent as Garchomp holding Garchompite."] },
    });
    expect(screen.getByText(/The paste was adjusted for the engine/)).toBeTruthy();
    expect(screen.getByText("Garchomp-Mega was sent as Garchomp holding Garchompite.")).toBeTruthy();
  });

  it("shows a collaborator the status without run buttons", () => {
    isOwner = false;
    renderModal({ canRun: false, runsLeftToday: null, job: simulationJob("COMPLETE", "job-1"), result: simulationResult() });
    expect(screen.getByText("Full simulation complete")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Run/ })).toBeNull();
    expect(screen.getByText(/Only the team's owner can run simulations/)).toBeTruthy();
  });
});
