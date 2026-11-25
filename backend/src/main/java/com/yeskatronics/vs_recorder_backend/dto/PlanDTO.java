package com.yeskatronics.vs_recorder_backend.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * API shapes for simulated Matchup Planner plans: one engine job per planner entry.
 */
public class PlanDTO {

    /** Why a plan no longer matches what's on the page. */
    public enum StaleReason {
        /** The user's team paste changed. */
        TEAM,
        /** The entry's paste changed. */
        OPPONENT,
        /** The engine runs a newer model. */
        MODEL
    }

    /**
     * {@code GET /api/teams/{id}/simulation/plans}: every entry's plan and what the
     * caller may do.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatusResponse {
        /** Engine jobs are switched on for this deployment. Everything else is empty when false. */
        private boolean enabled;
        /** The caller may submit plans for this team now (owner, allowlisted, supported regulation, under the cap). */
        private boolean canRun;
        /** Why {@code canRun} is false, when it's something the user can act on. */
        private String runBlockedReason;
        /** Plans the caller may still submit today; null unless they may run them on this team. */
        private Integer runsLeftToday;
        /** One per entry of the team's planner, in the planner's order. */
        private List<EntryStatus> entries;
        /** The engine's queue as a plan submitted now would find it; null when disabled. */
        private SimulationDTO.QueueInfo queue;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EntryStatus {
        private Long gamePlanTeamId;
        /** The entry's latest job, or null if it has none. */
        private SimulationDTO.JobInfo job;
        /** The plan shown: the latest job with a result (partial or complete), or null. */
        private PlanInfo result;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PlanInfo {
        private UUID jobId;
        /** "partial" (compositions ready, win rate pending) or "complete". */
        private String status;
        private boolean stale;
        /** What changed, when {@code stale}; the first that applies. */
        private StaleReason staleReason;
        private List<PlanResult.Composition> compositions;
        private List<PlanResult.Composition> opponentCompositions;
        private String opponentSummary;
        /** The rest is null until the result is complete. Rates are 0-1. */
        private Integer games;
        private Integer wins;
        private Integer losses;
        private Integer ties;
        private Double winRate;
        private List<Double> ci95;
        private String category;
        /** The user's expected score from the preview mixes alone. */
        private Double previewValue;
        /** What always bringing the top composition costs against an opponent who expects it. */
        private Double simplifyCost;
        /** "sheet" or "paste": where the opponent's stat points came from. */
        private String opponentSpreads;
        private Instant createdAt;
    }

    /** {@code POST /api/teams/{id}/simulation/plans}. */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubmitRequest {
        @NotEmpty(message = "Choose at least one matchup team")
        @Size(max = 50, message = "At most 50 matchup teams at once")
        private List<Long> gamePlanTeamIds;
        /** Re-run entries whose plan is up to date. */
        private boolean force;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubmitResponse {
        /** One per requested entry, in the request's order. */
        private List<SubmitOutcome> outcomes;
        private StatusResponse status;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubmitOutcome {
        private Long gamePlanTeamId;
        private boolean queued;
        /**
         * Why it wasn't: simulation_unfinished, simulation_unchanged, daily_cap,
         * invalid_opponent (the paste can't be read or normalized), entry_changed (edited
         * meanwhile), queue_unavailable.
         */
        private String errorCode;
        /** Safe to show. */
        private String message;
    }
}
