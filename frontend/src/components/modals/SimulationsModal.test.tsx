import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import SimulationsModal from "./SimulationsModal";
import { useSimulation } from "../../context/SimulationContext";
import { usePlanSimulationContext } from "../../context/PlanSimulationContext";
import { simulationContext, simulationJob, simulationResult } from "../../test/simulationFixtures";
import { planJob, planResult, planSimulations } from "../../test/planFixtures";
import type { PlanEntryStatus, SimulationStatus, Team } from "../../types";

let isOwner = true;
let planEntries: PlanEntryStatus[] = [];
vi.mock("../../context/SimulationContext", () => ({ useSimulation: vi.fn() }));
vi.mock("../../context/PlanSimulationContext", () => ({ usePlanSimulationContext: vi.fn() }));
vi.mock("../../hooks/useTeamPermissions", () => ({ useTeamPermissions: () => ({ isOwner }) }));

const team = { id: 7, name: "Rain" } as Team;

function renderModal(status: Partial<SimulationStatus>, over: Partial<ReturnType<typeof useSimulation>> = {}) {
  const context = { ...simulationContext(status), ...over };
  vi.mocked(useSimulation).mockReturnValue(context);
  vi.mocked(usePlanSimulationContext).mockReturnValue({ ...planSimulations(planEntries), setEntriesKey: vi.fn() });
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
    expect(screen.getAllByText("Coming later")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Open Matchup Planner" }).getAttribute("href")).toBe(
      "/team/7/matchup-planner",
    );

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

  it("says how a planner run is going", () => {
    isOwner = true;
    planEntries = [
      { gamePlanTeamId: 1, job: planJob("COMPLETE", "p1", { createdAt: "2026-11-18T10:00:00Z" }), result: planResult() },
      { gamePlanTeamId: 2, job: planJob("RUNNING", "p2", { createdAt: "2026-11-18T10:00:00Z" }), result: null },
      { gamePlanTeamId: 3, job: planJob("QUEUED", "p3", { createdAt: "2026-11-18T10:00:00Z" }), result: null },
    ];
    renderModal({});
    expect(screen.getByText("Simulating 3 teams: 1 done, 1 running, 1 queued.")).toBeTruthy();
    planEntries = [];
  });

  it("sums up the planner when nothing is running", () => {
    isOwner = true;
    planEntries = [
      { gamePlanTeamId: 1, job: planJob("COMPLETE", "p1"), result: planResult() },
      { gamePlanTeamId: 2, job: planJob("FAILED", "p2"), result: null },
      { gamePlanTeamId: 3, job: null, result: null },
    ];
    renderModal({});
    expect(screen.getByText(/1 of 3 teams has a plan \(1 failed\)\./)).toBeTruthy();
    planEntries = [];
  });

  it("says when simulations are open to everyone, with the feedback link", () => {
    isOwner = true;
    renderModal({ openToAll: true, feedbackUrl: "https://example.com/feedback", runsLeftToday: 2 });
    expect(screen.getByText(/Open to everyone for a limited time\. 2 runs left today\./)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Tell us what you think" }).getAttribute("href")).toBe(
      "https://example.com/feedback",
    );
  });

  it("shows a collaborator the status without run buttons", () => {
    isOwner = false;
    renderModal({ canRun: false, runsLeftToday: null, job: simulationJob("COMPLETE", "job-1"), result: simulationResult() });
    expect(screen.getByText("Full simulation complete")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Run/ })).toBeNull();
    expect(screen.getByText(/Only the team's owner can run simulations/)).toBeTruthy();
  });
});
