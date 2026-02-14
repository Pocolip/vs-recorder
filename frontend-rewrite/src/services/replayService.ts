/**
 * Replay service - wraps replayApi with additional convenience methods
 */

import { replayApi } from "./api";
import type { Replay, Match } from "../types";

/**
 * Get a replay by ID
 */
export async function getById(id: number): Promise<Replay | null> {
  try {
    return await replayApi.getById(id);
  } catch (error) {
    console.error(`Error getting replay ${id}:`, error);
    return null;
  }
}

/**
 * Create a replay from a Showdown URL
 */
export async function createFromUrl(
  teamId: number,
  url: string,
  notes?: string
): Promise<Replay> {
  return await replayApi.createFromUrl(teamId, url, notes);
}

/**
 * Create a replay from replay data
 */
export async function create(replayData: {
  teamId: number;
  url: string;
  result?: string;
  opponent?: string;
  notes?: string;
}): Promise<Replay> {
  return await replayApi.create(replayData.teamId, {
    url: replayData.url,
    result: replayData.result || "unknown",
    opponent: replayData.opponent || "Unknown",
    notes: replayData.notes,
  });
}

/**
 * Update a replay
 */
export async function update(
  id: number,
  updates: {
    url?: string;
    result?: string;
    opponent?: string;
    notes?: string;
  }
): Promise<Replay> {
  return await replayApi.update(id, updates);
}

/**
 * Delete a replay
 */
export async function deleteReplay(id: number): Promise<boolean> {
  try {
    await replayApi.delete(id);
    return true;
  } catch (error) {
    console.error(`Error deleting replay ${id}:`, error);
    return false;
  }
}

/**
 * Get all replays for a team, sorted by createdAt descending
 */
export async function getByTeamId(teamId: number): Promise<Replay[]> {
  const replays = await replayApi.getByTeamId(teamId);
  return replays.sort((a, b) => {
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });
}

/**
 * Get replays by result (win/loss/draw)
 */
export async function getByResult(
  teamId: number,
  result: string
): Promise<Replay[]> {
  return await replayApi.getByResult(teamId, result);
}

/**
 * Check if a replay URL exists (any team)
 */
export async function existsByUrl(url: string): Promise<boolean> {
  try {
    return await replayApi.checkExists(url);
  } catch (error) {
    console.error("Error checking replay existence:", error);
    return false;
  }
}

/**
 * Check if a replay URL exists for a specific team
 */
export async function existsByUrlForTeam(
  url: string,
  teamId: number
): Promise<boolean> {
  try {
    const replays = await getByTeamId(teamId);
    return replays.some((replay) => replay.url === url);
  } catch (error) {
    console.error("Error checking replay existence for team:", error);
    return false;
  }
}

/**
 * Get the count of replays for a team
 */
export async function getCountByTeamId(teamId: number): Promise<number> {
  const replays = await getByTeamId(teamId);
  return replays.length;
}

/**
 * Create multiple replays from URLs with progress callback
 */
export async function createManyFromUrls(
  teamId: number,
  urls: string[],
  progressCallback?: (current: number, total: number) => void
): Promise<{ success: Replay[]; failed: { url: string; error: string }[] }> {
  const success: Replay[] = [];
  const failed: { url: string; error: string }[] = [];

  for (let i = 0; i < urls.length; i++) {
    try {
      const replay = await createFromUrl(teamId, urls[i]);
      success.push(replay);
      if (progressCallback) {
        progressCallback(i + 1, urls.length);
      }
      // Add small delay between requests
      await new Promise((resolve) => setTimeout(resolve, 100));
    } catch (error) {
      failed.push({
        url: urls[i],
        error: error instanceof Error ? error.message : "Unknown error",
      });
      if (progressCallback) {
        progressCallback(i + 1, urls.length);
      }
    }
  }

  return { success, failed };
}

/**
 * Get standalone replays (not part of any match)
 */
export async function getStandaloneReplays(teamId: number): Promise<Replay[]> {
  return await replayApi.getStandalone(teamId);
}

/**
 * Search replays by opponent, notes, or URL
 */
export async function search(teamId: number, query: string): Promise<Replay[]> {
  const replays = await getByTeamId(teamId);
  const lowerQuery = query.toLowerCase();
  return replays.filter(
    (replay) =>
      replay.opponent?.toLowerCase().includes(lowerQuery) ||
      replay.notes?.toLowerCase().includes(lowerQuery) ||
      replay.url.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get match summary string (e.g., "Won 2-1" or "Lost 1-2")
 */
export function getMatchSummary(match: Match): string {
  if (!match.replays || match.replays.length === 0) {
    return "No games";
  }

  const wins = match.replays.filter((r) => r.result === "win").length;
  const losses = match.replays.filter((r) => r.result === "loss").length;

  if (wins > losses) {
    return `Won ${wins}-${losses}`;
  } else if (losses > wins) {
    return `Lost ${wins}-${losses}`;
  } else {
    return `Tied ${wins}-${losses}`;
  }
}

/**
 * Get game-by-game results for a match
 */
export function getGameByGameResults(match: Match): {
  gameNumber: number;
  result: string;
  url: string;
}[] {
  if (!match.replays) {
    return [];
  }

  return match.replays
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateA - dateB;
    })
    .map((replay, index) => ({
      gameNumber: index + 1,
      result: replay.result || "unknown",
      url: replay.url,
    }));
}
