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
  success: boolean;
  teamId?: number;
  teamName?: string;
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
