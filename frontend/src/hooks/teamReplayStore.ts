import * as replayService from "../services/replayService";
import type { Replay } from "../types";

export function createTeamReplayStore() {
  let snapshot = { replays: [] as Replay[], loading: true, error: null as string | null, lastUpdated: null as Date | null };
  const listeners = new Set<() => void>();
  let pending: Promise<void> | null = null;
  let dirty = true;
  const publish = (changes: Partial<typeof snapshot>) => {
    snapshot = { ...snapshot, ...changes };
    listeners.forEach((listener) => listener());
  };
  const load = (id: number): Promise<void> => {
    if (pending) return pending;
    if (!dirty) return Promise.resolve();
    dirty = false;
    publish({ loading: true, error: null });
    pending = replayService.getByTeamId(id).then((replays) => {
      if (!dirty) publish({ replays, lastUpdated: new Date() });
    }).catch((error: unknown) => {
      publish({ error: error instanceof Error ? error.message : "Failed to load replays" });
    }).finally(() => {
      pending = null;
      if (dirty && listeners.size) void load(id);
      else publish({ loading: false });
    });
    return pending;
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    load,
    invalidate: (id: number) => { dirty = true; if (listeners.size) void load(id); },
    update: (updates: { id: number; changes: Partial<Replay> }[]) => {
      const changes = new Map(updates.map((update) => [update.id, update.changes]));
      publish({ replays: snapshot.replays.map((replay) => ({ ...replay, ...changes.get(replay.id) })) });
    },
  };
}
