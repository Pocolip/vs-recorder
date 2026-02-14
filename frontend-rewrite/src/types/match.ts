import type { Replay } from "./replay";

export interface Match {
  id: number;
  teamId: number;
  opponent: string;
  result: string | null;
  matchResult: string | null;
  isComplete: boolean;
  notes: string;
  tags: string[];
  replays: Replay[];
  createdAt: string;
  updatedAt: string;
}

export interface MatchStats {
  totalMatches: number;
  completeMatches: number;
  incompleteMatches: number;
  matchWins: number;
  matchLosses: number;
  matchWinRate: number;
}
