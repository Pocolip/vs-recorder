export interface ExportOptions {
  includeReplays?: boolean;
  includeReplayNotes?: boolean;
  includeMatchNotes?: boolean;
  includeOpponentPlans?: boolean;
}

export interface ExportResult {
  code: string;
  teamName: string;
  createdAt: string;
  expiresAt: string;
  isExisting: boolean;
}

export interface ImportResult {
  teamId?: number;
  teamName?: string;
  replaysImported?: number;
  matchesImported?: number;
  opponentPlansImported?: number;
  teamMembersImported?: number;
  errors?: string[];
  warnings?: string[];
  error?: string;
}

export interface RateLimitStatus {
  codesCreatedToday: number;
  dailyLimit: number;
  remaining: number;
  resetsAt: string;
}

export interface ExportSummary {
  id: number;
  code: string;
  teamName: string;
  createdAt: string;
  expiresAt: string;
}
