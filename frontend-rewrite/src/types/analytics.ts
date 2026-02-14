export interface UsageStats {
  pokemonStats: {
    pokemon: string;
    totalGames: number;
    wins: number;
    losses: number;
    winRate: number;
  }[];
}

export interface MatchupStats {
  bestMatchups: MatchupEntry[];
  worstMatchups: MatchupEntry[];
}

export interface MatchupEntry {
  pokemon: string;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface MoveUsage {
  pokemonMoves: {
    pokemon: string;
    moves: {
      move: string;
      count: number;
      percentage: number;
    }[];
  }[];
}
