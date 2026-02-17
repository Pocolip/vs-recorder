/**
 * Match service - wraps matchApi with additional convenience methods
 */

import { matchApi } from "./api";
import type { Match } from "../types";

/**
 * Get a match by ID
 */
export async function getById(id: number): Promise<Match | null> {
  try {
    return await matchApi.getById(id);
  } catch (error) {
    console.error(`Error getting match ${id}:`, error);
    return null;
  }
}

/**
 * Create or update a match
 */
export async function createOrUpdate(matchData: {
  id?: number;
  teamId: number;
  opponent: string;
  notes?: string;
  tags?: string[];
  replayIds?: number[];
}): Promise<Match> {
  if (matchData.id) {
    // Update existing match
    return await matchApi.update(matchData.id, {
      opponent: matchData.opponent,
      notes: matchData.notes,
      tags: matchData.tags,
    });
  } else {
    // Create new match
    return await matchApi.create({
      teamId: matchData.teamId,
      opponent: matchData.opponent,
      notes: matchData.notes,
      tags: matchData.tags,
    });
  }
}

/**
 * Update match notes
 */
export async function updateNotes(matchId: number, notes: string): Promise<Match> {
  return await matchApi.update(matchId, { notes });
}

/**
 * Update match tags
 */
export async function updateTags(matchId: number, tags: string[]): Promise<Match> {
  return await matchApi.update(matchId, { tags });
}

/**
 * Delete a match
 */
export async function deleteMatch(id: number): Promise<boolean> {
  try {
    await matchApi.delete(id);
    return true;
  } catch (error) {
    console.error(`Error deleting match ${id}:`, error);
    return false;
  }
}

/**
 * Get all matches for a team, sorted by updatedAt descending
 */
export async function getByTeamId(teamId: number): Promise<Match[]> {
  const matches = await matchApi.getByTeamId(teamId);
  return matches.sort((a, b) => {
    const dateA = new Date(a.updatedAt || 0).getTime();
    const dateB = new Date(b.updatedAt || 0).getTime();
    return dateB - dateA;
  });
}

/**
 * Get enhanced matches with populated replay data
 */
export async function getEnhancedMatches(teamId: number): Promise<Match[]> {
  const matches = await matchApi.getWithReplays(teamId);
  return matches.sort((a, b) => {
    const dateA = new Date(a.updatedAt || 0).getTime();
    const dateB = new Date(b.updatedAt || 0).getTime();
    return dateB - dateA;
  });
}

/**
 * Get match statistics for a team
 */
export async function getMatchStats(teamId: number): Promise<{
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
}> {
  const stats = await matchApi.getStats(teamId);

  // Map backend field names to frontend names and round winRate
  return {
    totalMatches: stats.totalMatches || 0,
    wins: stats.matchWins || 0,
    losses: stats.matchLosses || 0,
    winRate: Math.round((stats.matchWinRate || 0) * 10) / 10, // Round to 1 decimal
  };
}

/**
 * Search matches by opponent, notes, or tags
 */
export async function search(teamId: number, query: string): Promise<Match[]> {
  const matches = await getByTeamId(teamId);
  const lowerQuery = query.toLowerCase();
  return matches.filter(
    (match) =>
      match.opponent?.toLowerCase().includes(lowerQuery) ||
      match.notes?.toLowerCase().includes(lowerQuery) ||
      match.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get matches by result (win/loss)
 */
export async function getByResult(
  teamId: number,
  result: "win" | "loss"
): Promise<Match[]> {
  const matches = await getByTeamId(teamId);
  return matches.filter((m) => m.matchResult === result);
}

/**
 * Get matches by opponent
 */
export async function getByOpponent(
  teamId: number,
  opponent: string
): Promise<Match[]> {
  return await matchApi.getByOpponent(teamId, opponent);
}

/**
 * Get matches by tag
 */
export async function getByTag(teamId: number, tag: string): Promise<Match[]> {
  return await matchApi.getByTag(teamId, tag);
}

/**
 * Get recent matches (limited)
 */
export async function getRecent(teamId: number, limit: number = 10): Promise<Match[]> {
  const matches = await getByTeamId(teamId);
  return matches.slice(0, limit);
}

/**
 * Get unique opponents for a team
 */
export async function getUniqueOpponents(teamId: number): Promise<string[]> {
  const matches = await getByTeamId(teamId);
  const opponents = new Set<string>();
  for (const match of matches) {
    if (match.opponent) {
      opponents.add(match.opponent);
    }
  }
  return Array.from(opponents).sort();
}

/**
 * Get unique tags for a team
 */
export async function getUniqueTags(teamId: number): Promise<string[]> {
  const matches = await getByTeamId(teamId);
  const tags = new Set<string>();
  for (const match of matches) {
    if (match.tags) {
      for (const tag of match.tags) {
        tags.add(tag);
      }
    }
  }
  return Array.from(tags).sort();
}

/**
 * Add a replay to a match
 */
export async function addReplayToMatch(
  matchId: number,
  replayId: number
): Promise<Match> {
  return await matchApi.addReplay(matchId, replayId);
}

/**
 * Remove a replay from a match
 */
export async function removeReplayFromMatch(
  matchId: number,
  replayId: number
): Promise<Match> {
  return await matchApi.removeReplay(matchId, replayId);
}
