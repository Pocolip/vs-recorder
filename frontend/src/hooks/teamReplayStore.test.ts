import { describe, it, expect, vi } from "vitest";
import { createTeamReplayStore } from "./teamReplayStore";
import * as replayService from "../services/replayService";
vi.mock("../services/replayService", () => ({ getByTeamId: vi.fn() }));
describe("team replay cache", () => {
  it("deduplicates concurrent consumers and caches tab revisits", async () => {
    vi.mocked(replayService.getByTeamId).mockResolvedValue([]);
    const store = createTeamReplayStore();
    await Promise.all([store.load(1), store.load(1)]);
    await store.load(1);
    expect(replayService.getByTeamId).toHaveBeenCalledTimes(1);
  });
  it("re-fetches once when a mutation happens during a request", async () => {
    vi.mocked(replayService.getByTeamId).mockReset();
    let resolve!: (value: []) => void;
    vi.mocked(replayService.getByTeamId).mockImplementationOnce(() => new Promise((done) => { resolve = done; })).mockResolvedValue([]);
    const store = createTeamReplayStore();
    const unsubscribe = store.subscribe(() => {});
    const pending = store.load(1);
    store.invalidate(1);
    store.invalidate(1);
    resolve([]);
    await pending;
    await store.load(1);
    expect(replayService.getByTeamId).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot().loading).toBe(false);
    unsubscribe();
  });
});
