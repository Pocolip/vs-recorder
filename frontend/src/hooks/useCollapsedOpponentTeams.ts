import { useCallback, useEffect, useState } from "react";

const storageKey = (gamePlanId: number | null): string | null =>
  gamePlanId == null ? null : `matchupPlanner.collapsedTeams.${gamePlanId}`;

const loadInitial = (gamePlanId: number | null): Set<number> => {
  const key = storageKey(gamePlanId);
  if (!key) return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((n): n is number => typeof n === "number"))
      : new Set();
  } catch {
    return new Set();
  }
};

export function useCollapsedOpponentTeams(gamePlanId: number | null) {
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(() =>
    loadInitial(gamePlanId),
  );

  useEffect(() => {
    setCollapsedIds(loadInitial(gamePlanId));
  }, [gamePlanId]);

  useEffect(() => {
    const key = storageKey(gamePlanId);
    if (!key) return;
    try {
      localStorage.setItem(key, JSON.stringify([...collapsedIds]));
    } catch {
      // Storage unavailable (quota / private mode) — in-memory state still works.
    }
  }, [collapsedIds, gamePlanId]);

  const isExpanded = useCallback(
    (id: number) => !collapsedIds.has(id),
    [collapsedIds],
  );

  const toggle = useCallback((id: number) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const collapseAll = useCallback((ids: number[]) => {
    setCollapsedIds(new Set(ids));
  }, []);

  const expandAll = useCallback(() => {
    setCollapsedIds(new Set());
  }, []);

  return { isExpanded, toggle, collapseAll, expandAll };
}

export default useCollapsedOpponentTeams;
