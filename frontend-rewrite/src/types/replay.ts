export interface BattleData {
  raw?: string;
  teams?: Record<string, string[]>;
  opponentPlayer?: string;
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
