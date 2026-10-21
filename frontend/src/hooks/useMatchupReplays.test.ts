import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useMatchupReplays } from "./useMatchupReplays";
import { getByTeamId } from "../services/replayService";
import { replayFixture } from "../test/replayFixtures";
import type { Replay } from "../types";

vi.mock("../services/replayService", () => ({ getByTeamId: vi.fn() }));
describe("planner replay collection", () => {
  it("refreshes after uploads and rejects an old team's late response", async () => {
    let resolveFirst!: (replays: Replay[]) => void;
    vi.mocked(getByTeamId)
      .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r; }))
      .mockResolvedValueOnce([replayFixture(2)])
      .mockResolvedValueOnce([replayFixture(2), replayFixture(3)]);
    const { result, rerender } = renderHook(({ id, version }) => useMatchupReplays(id, version),
      { initialProps: { id: 1, version: 0 } });
    rerender({ id: 2, version: 0 });
    await waitFor(() => expect(result.current.replays[0]?.id).toBe(2));
    await act(async () => { resolveFirst([replayFixture(1)]); });
    expect(result.current.replays[0].id).toBe(2);
    rerender({ id: 2, version: 1 });
    await waitFor(() => expect(result.current.replays).toHaveLength(2));
    expect(getByTeamId).toHaveBeenCalledTimes(3);
  });
});
