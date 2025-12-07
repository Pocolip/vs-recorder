package com.yeskatronics.vs_recorder_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * DTOs for Team entity API operations.
 */
public class TeamDTO {

    /**
     * Request DTO for team creation
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @NotBlank(message = "Team name is required")
        @Size(max = 100, message = "Team name must not exceed 100 characters")
        private String name;

        @NotBlank(message = "Pokepaste URL is required")
        private String pokepaste;

        @Size(max = 50, message = "Regulation must not exceed 50 characters")
        private String regulation;

        private List<String> showdownUsernames = new ArrayList<>();
    }

    /**
     * Request DTO for team updates
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        @Size(max = 100, message = "Team name must not exceed 100 characters")
        private String name;

        private String pokepaste;

        @Size(max = 50, message = "Regulation must not exceed 50 characters")
        private String regulation;

        private List<String> showdownUsernames;
    }

    /**
     * Response DTO for team information
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private String name;
        private String pokepaste;
        private String regulation;
        private List<String> showdownUsernames;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private TeamStats stats;
    }

    /**
     * Summary response for team lists
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private Long id;
        private String name;
        private String regulation;
        private LocalDateTime createdAt;
        private int replayCount;
        private int matchCount;
        private Double winRate;
    }

    /**
     * Nested class for team statistics
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamStats {
        private int totalGames;
        private int wins;
        private int losses;
        private double winRate;
    }

    /**
     * Request DTO for adding/removing showdown username
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ShowdownUsernameRequest {
        @NotBlank(message = "Username is required")
        private String username;
    }
}
