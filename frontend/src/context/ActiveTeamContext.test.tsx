import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActiveTeamProvider, useActiveTeam } from "./ActiveTeamContext";
import { useTeamStats } from "../hooks/useTeamStats";
import { useReplayPage } from "../hooks/useReplayPage";
import { teamApi } from "../services/api/teamApi";
import { replayApi } from "../services/api/replayApi";
import * as replayService from "../services/replayService";
import type { Team } from "../types";
vi.mock("../services/api/teamApi", () => ({ teamApi: { getStats: vi.fn() } }));
vi.mock("../services/api/replayApi", () => ({ replayApi: { browse: vi.fn() } }));
vi.mock("../services/replayService", () => ({ getByTeamId: vi.fn() }));
const team = (id: number) => ({ id, stats: { totalGames: 2, wins: 1, losses: 1, winRate: 50 } } as Team);
beforeEach(() => vi.clearAllMocks());
describe("team query ownership", () => {
  it("uses detail stats initially and rejects an old team's aggregate refresh", async () => {
    let finish!: (stats: NonNullable<Team["stats"]>) => void;
    vi.mocked(teamApi.getStats).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const { result } = renderHook(useActiveTeam, { wrapper: ActiveTeamProvider });
    act(() => result.current.setTeam(team(1)));
    expect(replayService.getByTeamId).not.toHaveBeenCalled();
    expect(teamApi.getStats).not.toHaveBeenCalled();
    act(() => result.current.bumpStatsVersion());
    expect(teamApi.getStats).toHaveBeenCalledTimes(1);
    act(() => result.current.setTeam(team(2)));
    await act(async () => finish({ totalGames: 100, wins: 100, losses: 0, winRate: 100 }));
    expect(result.current.team?.id).toBe(2);
    expect(result.current.team?.stats?.totalGames).toBe(2);
  });
  it("shares an analytics query across consumers and team switches cannot publish stale data", async () => {
    let finish!: (replays: []) => void;
    vi.mocked(replayService.getByTeamId).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; })).mockResolvedValue([]);
    const { result, rerender } = renderHook(({ id }) => [useTeamStats(id), useTeamStats(id)], {
      wrapper: ActiveTeamProvider, initialProps: { id: 1 },
    });
    expect(replayService.getByTeamId).toHaveBeenCalledTimes(1);
    rerender({ id: 2 });
    await waitFor(() => expect(result.current[0].loading).toBe(false));
    await act(async () => finish([]));
    expect(result.current[0].replays).toEqual([]);
    rerender({ id: 1 });
    expect(replayService.getByTeamId).toHaveBeenCalledTimes(2);
  });
  it("deduplicates page requests and refreshes once per mutation", async () => {
    vi.mocked(replayApi.browse).mockResolvedValue({ content: [], totalElements: 0, totalTeam: 0, wins: 0, losses: 0, page: 0, size: 25 });
    const { result } = renderHook(() => ({ first: useReplayPage(1, {}), second: useReplayPage(1, {}), context: useActiveTeam() }), { wrapper: ActiveTeamProvider });
    await waitFor(() => expect(result.current.first.loading).toBe(false));
    expect(replayApi.browse).toHaveBeenCalledTimes(1);
    act(() => result.current.context.bumpStatsVersion());
    await waitFor(() => expect(result.current.first.loading).toBe(false));
    expect(replayApi.browse).toHaveBeenCalledTimes(2);
  });
});
