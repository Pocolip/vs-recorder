export interface BattleData {
  raw?: string;
  teams?: Record<string, string[]>;
  opponentPlayer?: string;
  userPlayer?: string;
  actualPicks?: Record<string, string[]>;
  teraEvents?: Record<string, { pokemon: string; type: string }[]>;
  eloChanges?: Record<string, { before: number; after: number; change: number }>;
  bestOf3?: {
    gameNumber: number;
  };
}

export interface Replay {
  id: number;
  teamId: number;
  url: string;
  opponent: string;
  result: string | null;
  gameNumber: number | null;
  matchId: number | null;
  notes: string;
  battleData: BattleData | null;
  battleLog: string | null;
  createdAt: string;
  updatedAt: string;
}
