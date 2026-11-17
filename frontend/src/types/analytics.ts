// Shapes of the backend's AnalyticsDTO. Win rates and usage rates are whole percentages.

export interface PokemonUsageStats {
  pokemon: string;
  usage: number;
  usageRate: number;
  overallWinRate: number;
  leadUsage: number;
  leadWinRate: number | null;
  teraUsage: number;
  teraWinRate: number | null;
  megaUsage: number;
  megaWinRate: number | null;
}

export interface LeadPairStats {
  pair: string;
  pokemon1: string;
  pokemon2: string;
  usage: number;
  usageRate: number;
  wins: number;
  winRate: number;
}

export interface UsageStats {
  pokemonStats: PokemonUsageStats[];
  leadPairStats: LeadPairStats[];
  averageWinRate: number;
  totalGames: number;
}

export interface MatchupEntry {
  pokemon: string;
  gamesAgainst: number;
  winsAgainst: number;
  winRate: number;
  timesOnTeam: number;
  timesBrought: number;
  attendanceRate: number | null;
}

export interface MatchupStats {
  bestMatchups: MatchupEntry[];
  worstMatchups: MatchupEntry[];
  highestAttendance: MatchupEntry[];
  lowestAttendance: MatchupEntry[];
}

export interface MoveUsage {
  pokemonMoves: {
    pokemon: string;
    moves: {
      move: string;
      timesUsed: number;
      usageRate: number;
    }[];
  }[];
}

export interface CustomMatchup {
  pokemonAnalysis: {
    pokemon: string;
    gamesAgainst: number;
    winsAgainst: number;
    winRate: number;
  }[];
  teamWinRate: number;
  averageWinRate: number;
  totalEncounters: number;
}

/** Options shared by the analytics endpoints. */
export interface AnalyticsOptions {
  /** Serve the team's matchup engine simulation instead of its replays. */
  simulated?: boolean;
}
