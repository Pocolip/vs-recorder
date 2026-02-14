import apiClient from "./client";
import type { ExportOptions, ExportResult, RateLimitStatus, ExportSummary, ImportResult } from "../../types";

export const exportApi = {
  previewExport: (teamId: number, options: ExportOptions = {}) =>
    apiClient.post(`/api/teams/${teamId}/export`, options) as Promise<Record<string, unknown>>,

  generateCode: (teamId: number, options: ExportOptions = {}) =>
    apiClient.post(`/api/teams/${teamId}/export/code`, options) as Promise<ExportResult>,

  getByCode: (code: string) =>
    apiClient.get(`/api/export/${code.toUpperCase()}`) as Promise<Record<string, unknown>>,

  getRateLimitStatus: () =>
    apiClient.get("/api/export/rate-limit") as Promise<RateLimitStatus>,

  getMyExports: () =>
    apiClient.get("/api/export/my-exports") as Promise<ExportSummary[]>,

  deleteExport: (exportId: number) =>
    apiClient.delete(`/api/export/${exportId}`) as Promise<void>,

  importFromCode: (code: string) =>
    apiClient.post("/api/import/code", { code: code.toUpperCase() }) as Promise<ImportResult>,

  importFromJson: (jsonData: string) =>
    apiClient.post("/api/import/json", { jsonData }) as Promise<ImportResult>,
};

export default exportApi;
