import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { SimulationProvider, useSimulation } from "./SimulationContext";
import { simulationApi } from "../services/api/simulationApi";
import type { SimulationStatus, Team } from "../types";

let activeTeam: Partial<Team> | null = { id: 1, pokepaste: "https://pokepast.es/a" };
vi.mock("./ActiveTeamContext", () => ({ useActiveTeam: () => ({ team: activeTeam }) }));
vi.mock("../services/api/simulationApi", () => ({
  simulationApi: { get: vi.fn(), submit: vi.fn(), cancel: vi.fn(), getDiagnostics: vi.fn() },
}));

const idle: SimulationStatus = {
  enabled: true,
  canRun: true,
  runBlockedReason: null,
  runsLeftToday: 3,
  job: null,
  result: null,
};
const queued: SimulationStatus = {
  ...idle,
  canRun: false,
  job: {
    id: "job-1",
    status: "QUEUED",
    depth: "full",
    progress: null,
    unfinished: true,
    cancelRequested: false,
    errorCode: null,
    errorMessage: null,
    createdAt: "2026-11-11T00:00:00Z",
    updatedAt: null,
  },
};

const wrapper = ({ children }: { children: ReactNode }) => <SimulationProvider>{children}</SimulationProvider>;

describe("SimulationProvider", () => {
  it("doesn't let an older status read overwrite a run's result", async () => {
    activeTeam = { id: 1, pokepaste: "https://pokepast.es/a" };
    let resolveStaleRead!: (s: SimulationStatus) => void;
    vi.mocked(simulationApi.get)
      .mockImplementationOnce(() => new Promise((r) => { resolveStaleRead = r; }))
      .mockResolvedValue(queued);
    vi.mocked(simulationApi.submit).mockResolvedValue(queued);

    const { result } = renderHook(() => useSimulation(), { wrapper });
    await act(async () => { await result.current.run("full"); });
    expect(result.current.status?.job?.status).toBe("QUEUED");

    // The read sent before the run comes back late, saying "no job"
    await act(async () => { resolveStaleRead(idle); });
    expect(result.current.status?.job?.unfinished).toBe(true);
  });

  it("flags an unchanged paste so the user can run it anyway", async () => {
    activeTeam = { id: 1, pokepaste: "https://pokepast.es/a" };
    vi.mocked(simulationApi.get).mockResolvedValue(idle);
    vi.mocked(simulationApi.submit).mockRejectedValue(
      Object.assign(new Error("This team hasn't changed since its last simulation."), {
        status: 409,
        errorCode: "simulation_unchanged",
      }),
    );

    const { result } = renderHook(() => useSimulation(), { wrapper });
    await waitFor(() => expect(result.current.status).not.toBeNull());
    await act(async () => { await result.current.run("full"); });
    expect(result.current.actionError?.canForce).toBe(true);
    expect(result.current.actionError?.depth).toBe("full");
    expect(result.current.busy).toBe(false);
  });

  it("only shows simulated data when there's a result", async () => {
    activeTeam = { id: 1, pokepaste: "https://pokepast.es/a" };
    vi.mocked(simulationApi.get).mockResolvedValue(idle);

    const { result } = renderHook(() => useSimulation(), { wrapper });
    await waitFor(() => expect(result.current.status).not.toBeNull());
    act(() => result.current.setSimulated(true));
    expect(result.current.simulated).toBe(true);
    expect(result.current.showSimulated).toBe(false);
  });
});
