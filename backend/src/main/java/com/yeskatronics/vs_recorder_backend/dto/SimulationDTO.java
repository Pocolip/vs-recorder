package com.yeskatronics.vs_recorder_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * API shapes for a team's matchup engine simulation.
 */
public class SimulationDTO {

    /**
     * {@code GET /api/teams/{id}/simulation}: everything the pages need to decide
     * what to show.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatusResponse {
        /** Engine jobs are switched on for this deployment. Everything else is empty when false. */
        private boolean enabled;
        /** The caller may submit a job for this team now (owner, allowlisted, supported regulation, under the cap). */
        private boolean canRun;
        /** Why {@code canRun} is false, when it's something the user can act on. */
        private String runBlockedReason;
        /** Runs the caller has left today; null unless they may run simulations on this team. */
        private Integer runsLeftToday;
        /** Simulations are open to every signed-in user (the allowlist is {@code *}). */
        private boolean openToAll;
        /** The team's latest job, or null if it has none. */
        private JobInfo job;
        /** The result the pages show (the latest job with one), or null. */
        private ResultInfo result;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class JobInfo {
        private UUID id;
        /** QUEUED, RUNNING, PARTIAL, COMPLETE, FAILED or CANCELLED. */
        private String status;
        /** "quick" or "full". */
        private String depth;
        /** What was changed in the paste before sending it, e.g. a Mega forme listed as its base species. */
        private List<String> pasteNotes;
        /** e.g. "preview 12/40", "games 8/40", "search 3/10". */
        private String progress;
        private boolean unfinished;
        private boolean cancelRequested;
        private String errorCode;
        /** Safe to show. */
        private String errorMessage;
        private Instant createdAt;
        private Instant updatedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResultInfo {
        private UUID jobId;
        /** "partial" (top opponents still being refined) or "complete". */
        private String status;
        /** "quick" or "full": the depth of the job that produced it. */
        private String depth;
        /** The team's paste changed since this result. */
        private boolean stale;
        private int opponentsCount;
        private int totalGames;
        /**
         * Each opposing Pokémon in the result with the games and wins against it,
         * sorted by name. Feeds the custom team analysis, like replays' matchups do.
         */
        private List<OpponentPokemon> opponentPokemon;
        private Instant createdAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OpponentPokemon {
        private String pokemon;
        private int gamesAgainst;
        private int winsAgainst;
    }

    /**
     * {@code GET /api/teams/{id}/simulation/diagnostics}. Rates are 0-1.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DiagnosticsResponse {
        private String resultStatus;
        private boolean stale;
        private int opponentsCount;
        private int games;
        private Double winRate;
        private List<SimulationResult.Member> members;
        private List<SimulationResult.Threat> threatSpecies;
        private List<SimulationResult.Threat> threatPairs;
    }
}
