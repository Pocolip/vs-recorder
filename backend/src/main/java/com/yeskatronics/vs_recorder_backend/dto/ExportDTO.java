package com.yeskatronics.vs_recorder_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * DTOs for Team Export/Import API operations.
 */
public class ExportDTO {

    /**
     * Export options - what to include in the export
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExportOptions {
        @Builder.Default
        private boolean includeReplays = true;
        @Builder.Default
        private boolean includeReplayNotes = true;
        @Builder.Default
        private boolean includeMatchNotes = true;
        @Builder.Default
        private boolean includeOpponentPlans = true;
        @Builder.Default
        private boolean includeTeamMembers = false;
    }

    /**
     * Full export data structure
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExportData {
        @Builder.Default
        private String version = "1.0";
        private LocalDateTime exportedAt;
        private ExportOptions options;
        private TeamData team;
        @Builder.Default
        private List<ReplayData> replays = new ArrayList<>();
        @Builder.Default
        private List<MatchData> matches = new ArrayList<>();
        @Builder.Default
        private List<OpponentPlanData> opponentPlans = new ArrayList<>();
    }

    /**
     * Team data for export
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TeamData {
        private String name;
        private String pokepaste;
        private String regulation;
        @Builder.Default
        private List<String> showdownUsernames = new ArrayList<>();
        @Builder.Default
        private List<TeamMemberData> teamMembers = new ArrayList<>();
    }

    /**
     * Replay data for export
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ReplayData {
        private String url;
        private String battleLog;
        private String opponent;
        private String result;
        private Integer gameNumber;
        private LocalDateTime date;
        private String notes;
    }

    /**
     * Match (Bo3) data for export
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class MatchData {
        private String opponent;
        private String notes;
        @Builder.Default
        private List<String> tags = new ArrayList<>();
        @Builder.Default
        private List<String> replayUrls = new ArrayList<>();
    }

    /**
     * Opponent plan (GamePlanTeam) data for export
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class OpponentPlanData {
        private String pokepaste;
        private String notes;
        @Builder.Default
        private List<CompositionData> compositions = new ArrayList<>();
    }

    /**
     * Composition data for export
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CompositionData {
        private String lead1;
        private String lead2;
        private String back1;
        private String back2;
        private String notes;
    }

    /**
     * Team member (Pokemon) data for export
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TeamMemberData {
        private String pokemonName;
        private Integer slot;
        private String notes;
        @Builder.Default
        private List<String> calcs = new ArrayList<>();
    }

    /**
     * Response when generating an export code
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExportCodeResponse {
        private String code;
        private String teamName;
        private LocalDateTime createdAt;
        private LocalDateTime expiresAt;
        private boolean isExisting; // true if returning existing code due to same checksum
    }

    /**
     * Request to import from a share code
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImportCodeRequest {
        @NotBlank(message = "Export code is required")
        @Size(min = 6, max = 6, message = "Export code must be exactly 6 characters")
        @Pattern(regexp = "^[A-HJ-NP-Z2-9]{6}$", message = "Invalid export code format")
        private String code;
    }

    /**
     * Request to import from JSON
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImportJsonRequest {
        @NotBlank(message = "Export data is required")
        private String jsonData;
    }

    /**
     * Response after import
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ImportResult {
        private Long teamId;
        private String teamName;
        private int replaysImported;
        private int matchesImported;
        private int opponentPlansImported;
        private int teamMembersImported;
        @Builder.Default
        private List<String> errors = new ArrayList<>();
        @Builder.Default
        private List<String> warnings = new ArrayList<>();
    }

    /**
     * Summary of a user's exports
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ExportSummary {
        private Long id;
        private String code;
        private String teamName;
        private Long teamId;
        private LocalDateTime createdAt;
        private LocalDateTime expiresAt;
    }

    /**
     * Rate limit status
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RateLimitStatus {
        private int codesCreatedToday;
        private int dailyLimit;
        private int remaining;
        private LocalDateTime resetsAt;
    }
}
