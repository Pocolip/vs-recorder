package com.yeskatronics.vs_recorder_backend.dto;

import com.yeskatronics.vs_recorder_backend.entities.GamePlanTeam;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * DTOs for GamePlan and GamePlanTeam API operations.
 */
public class GamePlanDTO {

    // ==================== GamePlan DTOs ====================

    /**
     * Request DTO for creating a game plan
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateGamePlanRequest {
        @NotBlank(message = "Game plan name is required")
        @Size(max = 100, message = "Name must not exceed 100 characters")
        private String name;

        private String notes;

        /**
         * Optional team ID to associate this game plan with a specific team.
         */
        private Long teamId;
    }

    /**
     * Request DTO for updating a game plan
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateGamePlanRequest {
        @Size(max = 100, message = "Name must not exceed 100 characters")
        private String name;

        private String notes;
    }

    /**
     * Full response DTO for a game plan with all teams
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GamePlanResponse {
        private Long id;
        private Long userId;
        private Long teamId;
        private String name;
        private String notes;
        private List<GamePlanTeamResponse> teams;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    /**
     * Summary response DTO for game plan list (without teams)
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GamePlanSummary {
        private Long id;
        private Long userId;
        private Long teamId;
        private String name;
        private String notes;
        private int teamCount;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    // ==================== GamePlanTeam DTOs ====================

    /**
     * Request DTO for adding a team to a game plan
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AddTeamRequest {
        @NotBlank(message = "Pokepaste is required")
        private String pokepaste;

        private String notes;
    }

    /**
     * Request DTO for updating a game plan team
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateTeamRequest {
        private String pokepaste;
        private String notes;
    }

    /**
     * Response DTO for a game plan team
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GamePlanTeamResponse {
        private Long id;
        private Long gamePlanId;
        private String pokepaste;
        private String notes;
        private List<TeamCompositionDTO> compositions;
        private LocalDateTime createdAt;
    }

    // ==================== TeamComposition DTOs ====================

    /**
     * DTO for team composition
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamCompositionDTO {
        @NotBlank(message = "Lead 1 is required")
        private String lead1;

        @NotBlank(message = "Lead 2 is required")
        private String lead2;

        @NotBlank(message = "Back 1 is required")
        private String back1;

        @NotBlank(message = "Back 2 is required")
        private String back2;

        private String notes;

        /**
         * Convert to entity TeamComposition
         */
        public GamePlanTeam.TeamComposition toEntity() {
            return new GamePlanTeam.TeamComposition(lead1, lead2, back1, back2, notes);
        }

        /**
         * Create from entity TeamComposition
         */
        public static TeamCompositionDTO fromEntity(GamePlanTeam.TeamComposition entity) {
            return new TeamCompositionDTO(
                    entity.getLead1(),
                    entity.getLead2(),
                    entity.getBack1(),
                    entity.getBack2(),
                    entity.getNotes()
            );
        }
    }

    /**
     * Request DTO for adding a composition
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AddCompositionRequest {
        @NotNull(message = "Composition is required")
        private TeamCompositionDTO composition;
    }

    /**
     * Request DTO for updating a composition
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateCompositionRequest {
        @NotNull(message = "Composition index is required")
        private Integer index;

        @NotNull(message = "Composition is required")
        private TeamCompositionDTO composition;
    }

    /**
     * Request DTO for deleting a composition
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DeleteCompositionRequest {
        @NotNull(message = "Composition index is required")
        private Integer index;
    }
}