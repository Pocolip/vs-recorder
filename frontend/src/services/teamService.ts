/**
 * Team service - wraps teamApi with additional convenience methods
 */

import { teamApi } from "./api";
import type { Team } from "../types";

/**
 * Get all teams as a Record keyed by team ID
 */
export async function getAll(): Promise<Record<number, Team>> {
  const teams = await teamApi.getAll();
  const teamRecord: Record<number, Team> = {};
  for (const team of teams) {
    teamRecord[team.id] = team;
  }
  return teamRecord;
}

/**
 * Get a team by ID
 */
export async function getById(id: number): Promise<Team | null> {
  try {
    return await teamApi.getById(id);
  } catch (error) {
    console.error(`Error getting team ${id}:`, error);
    return null;
  }
}

/**
 * Create a new team
 */
export async function create(teamData: {
  name: string;
  pokepaste: string;
  format?: string;
  notes?: string;
}): Promise<Team> {
  const regulation = teamData.format || "VGC 2025 Regulation F";
  return await teamApi.create({
    name: teamData.name,
    pokepaste: teamData.pokepaste,
    regulation,
  });
}

/**
 * Update a team
 */
export async function update(
  id: number,
  updates: {
    name?: string;
    pokepaste?: string;
    format?: string;
    regulation?: string;
    notes?: string;
  }
): Promise<Team> {
  // Map 'format' to 'regulation' if provided
  const apiUpdates: {
    name?: string;
    pokepaste?: string;
    regulation?: string;
    notes?: string;
  } = {
    ...updates,
  };

  if (updates.format) {
    apiUpdates.regulation = updates.format;
  }

  // Remove format field if it exists
  if ("format" in apiUpdates) {
    delete (apiUpdates as { format?: string }).format;
  }

  return await teamApi.update(id, apiUpdates);
}

/**
 * Delete a team
 */
export async function deleteTeam(id: number): Promise<boolean> {
  try {
    await teamApi.delete(id);
    return true;
  } catch (error) {
    console.error(`Error deleting team ${id}:`, error);
    return false;
  }
}

/**
 * Get all teams as a list sorted by updatedAt descending
 */
export async function getList(): Promise<Team[]> {
  const teams = await teamApi.getAll();
  return teams.sort((a, b) => {
    const dateA = new Date(a.updatedAt || 0).getTime();
    const dateB = new Date(b.updatedAt || 0).getTime();
    return dateB - dateA;
  });
}

/**
 * Search teams by name
 */
export async function search(query: string): Promise<Team[]> {
  const teams = await getList();
  const lowerQuery = query.toLowerCase();
  return teams.filter((team) =>
    team.name.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get teams by format/regulation
 */
export async function getByFormat(format: string): Promise<Team[]> {
  return await teamApi.getByRegulation(format);
}

/**
 * Check if a team exists
 */
export async function exists(id: number): Promise<boolean> {
  const team = await getById(id);
  return team !== null;
}

/**
 * Get team statistics
 */
export async function getStats(id: number): Promise<Record<string, unknown>> {
  return await teamApi.getStats(id);
}
