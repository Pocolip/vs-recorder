import maData from "./tournamentTeams-regM-A.json";
import mbData from "./tournamentTeams-regM-B.json";
import mcData from "./tournamentTeams-regM-C.json";

export interface TournamentInnerTeam {
  name: string;
  placement: number | null;
  record: string;
  pokemonNames: string[];
  // LabMaus source: a pokepaste link. Direct sources (Limitless/Reportworm)
  // have open teamsheets instead, shipped as paste text in
  // `TournamentTeamsData.sheets[sheetId]`, plus a link to the source page.
  pokepasteUrl?: string;
  sheetId?: string;
  sourceUrl?: string;
  tournamentName: string;
}

export interface TournamentCluster {
  pokemon: string[];
  pokemonNames: string[];
  wins: number;
  losses: number;
  teams: TournamentInnerTeam[];
}

export interface TournamentComposition {
  size: number;
  clusters: TournamentCluster[];
}

export type TournamentTeamsSource = "direct" | "labmaus";

export interface TournamentTeamsData {
  regulation: string;
  // Absent on snapshots generated before direct ingestion existed (LabMaus).
  source?: TournamentTeamsSource;
  // Direct source only: which upstreams contributed and how many events each.
  sources?: Array<{ name: string; events: number }>;
  labmausRegulation?: string;
  // True when LabMaus had no data filed under this regulation and the
  // generator fell back to their "Custom format" bucket. That bucket is
  // dominated by this regulation's tournaments but is not exclusive to
  // them, so the modal surfaces a caveat when this is set.
  isFallbackSource?: boolean;
  dateRange: { from: string; to: string };
  generatedAt: string;
  compositions: TournamentComposition[];
  // Direct source only: Showdown paste text keyed by TournamentInnerTeam.sheetId.
  sheets?: Record<string, string>;
}

/** What to store as an opponent team's `pokepaste`: a URL or inline paste text. */
export function getImportablePaste(
  data: TournamentTeamsData,
  team: TournamentInnerTeam,
): string | null {
  if (team.pokepasteUrl) return team.pokepasteUrl;
  if (team.sheetId) return data.sheets?.[team.sheetId] ?? null;
  return null;
}

/** Stable identity for a listed team (used to track imported state). */
export function getTeamKey(team: TournamentInnerTeam): string {
  return team.pokepasteUrl ?? team.sourceUrl ?? team.sheetId ?? `${team.name}:${team.tournamentName}`;
}

// Team.regulation is stored as the verbatim NewTeamModal string
// (e.g. "VGC 2026 Regulation M-A"), so we match on a regex of the
// trailing regulation code rather than an exact equality check.
const REGISTRY: Array<{ match: RegExp; data: TournamentTeamsData }> = [
  { match: /Regulation\s+M-A\b/i, data: maData as TournamentTeamsData },
  { match: /Regulation\s+M-B\b/i, data: mbData as TournamentTeamsData },
  { match: /Regulation\s+M-C\b/i, data: mcData as TournamentTeamsData },
];

export function getTournamentTeamsForRegulation(
  regulation: string | null | undefined,
): TournamentTeamsData | null {
  if (!regulation) return null;
  return REGISTRY.find((r) => r.match.test(regulation))?.data ?? null;
}
