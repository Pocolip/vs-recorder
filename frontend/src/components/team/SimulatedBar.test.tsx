import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SimulatedBar from "./SimulatedBar";
import { useSimulation } from "../../context/SimulationContext";
import { simulationContext, simulationJob, simulationResult } from "../../test/simulationFixtures";
import type { SimulationStatus } from "../../types";

vi.mock("../../context/SimulationContext", () => ({ useSimulation: vi.fn() }));
vi.mock("../../hooks/useTeamPermissions", () => ({ useTeamPermissions: () => ({ isOwner: true }) }));

function renderBar(status: Partial<SimulationStatus>) {
  const context = simulationContext(status);
  vi.mocked(useSimulation).mockReturnValue(context);
  render(<SimulatedBar />);
  return context;
}

describe("SimulatedBar actions", () => {
  it("opens the Simulations modal for a first run", () => {
    const { openPanel, run } = renderBar({});
    fireEvent.click(screen.getByRole("button", { name: "Run simulation" }));
    expect(openPanel).toHaveBeenCalled();
    expect(run).not.toHaveBeenCalled();
  });

  it("still offers a run once a team has a complete, current result", () => {
    const { openPanel } = renderBar({ job: simulationJob("COMPLETE", "job-1"), result: simulationResult() });
    fireEvent.click(screen.getByRole("button", { name: "Run again" }));
    expect(openPanel).toHaveBeenCalled();
  });

  it("says a later run was cancelled and offers another", () => {
    renderBar({ job: simulationJob("CANCELLED"), result: simulationResult() });
    expect(screen.getByText("Simulation cancelled.")).toBeTruthy();
    expect(screen.getByText("Showing the results of an earlier simulation.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Run again" })).toBeTruthy();
  });

  it("offers a re-run when the paste changed", () => {
    renderBar({ job: simulationJob("COMPLETE", "job-1"), result: simulationResult({ stale: true }) });
    expect(screen.getByRole("button", { name: "Re-run" })).toBeTruthy();
  });

  it("names the running job's depth", () => {
    renderBar({ canRun: false, job: { ...simulationJob("RUNNING"), depth: "quick" } });
    expect(screen.getByText("Quick simulation running…")).toBeTruthy();
  });

  it("shows why a run is blocked instead of a button", () => {
    renderBar({
      canRun: false,
      runBlockedReason: "Simulations only support VGC 2026 Regulation M-C for now.",
      result: simulationResult(),
    });
    expect(screen.queryByRole("button", { name: /Run/ })).toBeNull();
    expect(screen.getByText("Simulations only support VGC 2026 Regulation M-C for now.")).toBeTruthy();
  });
});
