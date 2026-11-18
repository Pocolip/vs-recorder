import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SimulationProgressBar from "./SimulationProgressBar";
import { useSimulation } from "../../context/SimulationContext";
import { simulationContext, simulationJob } from "../../test/simulationFixtures";
import type { SimulationStatus } from "../../types";

vi.mock("../../context/SimulationContext", () => ({ useSimulation: vi.fn() }));

const withStatus = (status: Partial<SimulationStatus>) =>
  vi.mocked(useSimulation).mockReturnValue(simulationContext(status));

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

  it("doesn't flash for a job it never saw running", () => {
    withStatus({ job: simulationJob("COMPLETE", "job-1") });
    const { container } = render(<SimulationProgressBar />);
    expect(container.firstChild).toBeNull();
  });
});
