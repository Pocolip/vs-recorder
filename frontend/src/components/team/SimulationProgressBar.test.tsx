import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SimulationProgressBar from "./SimulationProgressBar";
import { useSimulation } from "../../context/SimulationContext";
import { usePlanSimulationContext } from "../../context/PlanSimulationContext";
import { simulationContext, simulationJob } from "../../test/simulationFixtures";
import { planJob, planSimulations } from "../../test/planFixtures";
import type { PlanEntryStatus, SimulationStatus } from "../../types";

vi.mock("../../context/SimulationContext", () => ({ useSimulation: vi.fn() }));
vi.mock("../../context/PlanSimulationContext", () => ({ usePlanSimulationContext: vi.fn() }));

const withStatus = (status: Partial<SimulationStatus>, plans: PlanEntryStatus[] = []) => {
  vi.mocked(useSimulation).mockReturnValue(simulationContext(status));
  vi.mocked(usePlanSimulationContext).mockReturnValue({ ...planSimulations(plans), setEntriesKey: vi.fn() });
};

const at = "2026-11-18T10:00:00Z";

afterEach(() => vi.useRealTimers());

describe("SimulationProgressBar", () => {
  it("shows nothing without a running job", () => {
    withStatus({});
    const { container } = render(<SimulationProgressBar />);
    expect(container.firstChild).toBeNull();
  });

  it("sweeps while queued, then follows the engine's stages", () => {
    withStatus({ canRun: false, job: simulationJob("QUEUED") });
    const { rerender } = render(<SimulationProgressBar />);
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-valuenow")).toBeNull();
    expect(bar.getAttribute("aria-label")).toBe("Full simulation starting");

    withStatus({ canRun: false, job: { ...simulationJob("RUNNING"), progress: "search 5/10" } });
    rerender(<SimulationProgressBar />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("68");
  });

  it("flashes on finishing, then goes", () => {
    vi.useFakeTimers();
    withStatus({ canRun: false, job: { ...simulationJob("RUNNING", "job-1"), progress: "games 8/40" } });
    const { rerender, container } = render(<SimulationProgressBar />);

    withStatus({ job: simulationJob("FAILED", "job-1") });
    rerender(<SimulationProgressBar />);
    expect(container.querySelector(".bg-red-500")).not.toBeNull();

    act(() => vi.advanceTimersByTime(3000));
    expect(container.firstChild).toBeNull();
  });

  it("follows a batch of plans as one run, pulsing", () => {
    withStatus({}, [
      { gamePlanTeamId: 1, job: planJob("COMPLETE", "p1", { createdAt: at }), result: null },
      { gamePlanTeamId: 2, job: planJob("PARTIAL", "p2", { createdAt: at, progress: "preview 1/1" }), result: null },
      { gamePlanTeamId: 3, job: planJob("QUEUED", "p3", { createdAt: at }), result: null },
    ]);
    const { container } = render(<SimulationProgressBar />);
    const bar = screen.getByRole("progressbar");
    // (1 + 0.25 + 0) / 3
    expect(bar.getAttribute("aria-valuenow")).toBe("42");
    expect(bar.getAttribute("aria-label")).toBe("Matchup plans: 1 of 3 done");
    expect(container.querySelector(".progress-pulse")).not.toBeNull();
    expect(bar.className).toContain("h-[5px]");
  });

  it("flashes red when a plan in the run failed", () => {
    vi.useFakeTimers();
    withStatus({}, [
      { gamePlanTeamId: 1, job: planJob("RUNNING", "p1", { createdAt: at }), result: null },
      { gamePlanTeamId: 2, job: planJob("QUEUED", "p2", { createdAt: at }), result: null },
    ]);
    const { rerender, container } = render(<SimulationProgressBar />);

    withStatus({}, [
      { gamePlanTeamId: 1, job: planJob("COMPLETE", "p1", { createdAt: at }), result: null },
      { gamePlanTeamId: 2, job: planJob("FAILED", "p2", { createdAt: at }), result: null },
    ]);
    rerender(<SimulationProgressBar />);
    expect(container.querySelector(".bg-red-500")).not.toBeNull();
    act(() => vi.advanceTimersByTime(3000));
    expect(container.firstChild).toBeNull();
  });

  it("doesn't flash for a job it never saw running", () => {
    withStatus({ job: simulationJob("COMPLETE", "job-1") });
    const { container } = render(<SimulationProgressBar />);
    expect(container.firstChild).toBeNull();
  });
});
