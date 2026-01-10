package com.yeskatronics.vs_recorder_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * DTOs for Replay entity API operations.
 */
public class ReplayDTO {

    /**
     * Battle data extracted from battle log
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BattleData {
        private String winner;
        private String userPlayer; // "p1" or "p2"
        private String opponentPlayer; // "p1" or "p2"
        private Map<String, List<String>> teams; // "p1" -> [pokemon], "p2" -> [pokemon]
        private Map<String, List<String>> actualPicks; // "p1" -> [pokemon brought], "p2" -> [pokemon brought]
        private Map<String, List<TeraEvent>> teraEvents; // "p1" -> [tera events], "p2" -> [tera events]
        private Map<String, EloChange> eloChanges; // "p1" -> elo data, "p2" -> elo data
        private Map<String, Map<String, Map<String, Integer>>> moveUsage; // "p1" -> {pokemon -> {move -> count}}
    }

    /**
     * Terastallization event
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeraEvent {
        private String pokemon;
        private String type;
    }

    /**
     * ELO rating change
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EloChange {
        private Integer before;
        private Integer after;
        private Integer change;
    }

    /**
     * Request DTO for replay creation from URL
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateFromUrlRequest {
        @NotBlank(message = "Replay URL is required")
        private String url;

        private String notes;
    }

    /**
     * Request DTO for manual replay creation (with all data)
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @NotBlank(message = "Replay URL is required")
        private String url;

        @NotBlank(message = "Battle log is required")
        private String battleLog;

        @Size(max = 100, message = "Opponent name must not exceed 100 characters")
        private String opponent;

        @Size(max = 10, message = "Result must not exceed 10 characters")
        private String result; // "win" or "loss"

        private Integer gameNumber; // 1, 2, 3 for Bo3; null for Bo1

        private LocalDateTime date;

        private String notes;
    }

    /**
     * Request DTO for replay updates
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        private String notes;

        @Size(max = 100, message = "Opponent name must not exceed 100 characters")
        private String opponent;

        @Size(max = 10, message = "Result must not exceed 10 characters")
        private String result;

        private LocalDateTime date;
    }

    /**
     * Full response DTO with battle log
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private Long teamId;
        private Long matchId;
        private String url;
        private String battleLog;
        private String opponent;
        private String result;
        private Integer gameNumber; // 1, 2, 3 for Bo3; null for Bo1
        private LocalDateTime date;
        private String notes;
        private LocalDateTime createdAt;
    }

    /**
     * Summary response without battle log (for lists)
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private Long id;
        private Long teamId;
        private Long matchId;
        private String url;
        private String opponent;
        private String result;
        private Integer gameNumber; // 1, 2, 3 for Bo3; null for Bo1
        private LocalDateTime date;
        private String notes;
        private LocalDateTime createdAt;
        private BattleData battleData;
    }

    /**
     * Request DTO for associating replay with match
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssociateMatchRequest {
        private Long matchId;
    }

    /**
     * Request DTO for filtering replays
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FilterRequest {
        private Long matchId;
        private String opponent;
        private String result;
        private LocalDateTime startDate;
        private LocalDateTime endDate;
    }
}