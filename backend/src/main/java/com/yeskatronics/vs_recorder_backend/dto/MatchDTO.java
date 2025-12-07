package com.yeskatronics.vs_recorder_backend.dto;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * DTOs for Match entity API operations.
 */
public class MatchDTO {

    /**
     * Request DTO for match creation
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @Size(max = 100, message = "Opponent name must not exceed 100 characters")
        private String opponent;

        private String notes;

        private List<String> tags = new ArrayList<>();
    }

    /**
     * Request DTO for match updates
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        @Size(max = 100, message = "Opponent name must not exceed 100 characters")
        private String opponent;

        private String notes;

        private List<String> tags;
    }

    /**
     * Full response DTO with replays
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private Long teamId;
        private String opponent;
        private String notes;
        private List<String> tags;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private List<ReplayDTO.Summary> replays;
        private MatchStats stats;
    }

    /**
     * Summary response without replays (for lists)
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private Long id;
        private Long teamId;
        private String opponent;
        private List<String> tags;
        private LocalDateTime createdAt;
        private int replayCount;
        private boolean complete;
        private String matchResult; // "win", "loss", or "incomplete"
    }

    /**
     * Nested class for match statistics
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MatchStats {
        private int replayCount;
        private int wins;
        private int losses;
        private boolean complete;
        private String matchResult;
    }

    /**
     * Request DTO for adding/removing tags
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TagRequest {
        private String tag;
    }

    /**
     * Response DTO for team-wide match statistics
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamMatchStatsResponse {
        private Long teamId;
        private int totalMatches;
        private int completeMatches;
        private int incompleteMatches;
        private int matchWins;
        private int matchLosses;
        private double matchWinRate;
    }
}