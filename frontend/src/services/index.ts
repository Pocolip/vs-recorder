/**
 * Service layer exports
 * 
 * Services provide higher-level abstractions over the API layer,
 * including caching, data transformation, and convenience methods.
 */

// API layer (re-exported for convenience)
export { apiClient, authApi, teamApi, replayApi, matchApi, analyticsApi, gamePlanApi, exportApi, teamMemberApi } from "./api";

// Service layer - import with namespace pattern for clear usage
export * as storageService from "./storageService";
export * as teamService from "./teamService";
export * as replayService from "./replayService";
export * as matchService from "./matchService";
export * as pokepasteService from "./pokepasteService";
export * as pokemonService from "./pokemonService";

// Deprecated service (stub only)
export * as opponentTeamService from "./opponentTeamService";
