import maData from "./tournamentTeams-regM-A.json";

export interface TournamentInnerTeam {
  name: string;
  placement: number | null;
  record: string;
  pokemonNames: string[];
  pokepasteUrl: string;
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

export interface TournamentTeamsData {
  regulation: string;
  labmausRegulation: string;
  dateRange: { from: string; to: string };
  generatedAt: string;
  compositions: TournamentComposition[];
}

// Team.regulation is stored as the verbatim NewTeamModal string
// (e.g. "VGC 2026 Regulation M-A"), so we match on a regex of the
// trailing regulation code rather than an exact equality check.
const REGISTRY: Array<{ match: RegExp; data: TournamentTeamsData }> = [
  { match: /Regulation\s+M-A\b/i, data: maData as TournamentTeamsData },
];

export function getTournamentTeamsForRegulation(
  regulation: string | null | undefined,
): TournamentTeamsData | null {
  if (!regulation) return null;
  return REGISTRY.find((r) => r.match.test(regulation))?.data ?? null;
}
