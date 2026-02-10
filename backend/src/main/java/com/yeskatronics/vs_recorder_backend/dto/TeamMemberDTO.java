package com.yeskatronics.vs_recorder_backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTOs for TeamMember entity API operations.
 */
public class TeamMemberDTO {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @NotBlank(message = "Pokemon name is required")
        @Size(max = 100, message = "Pokemon name must not exceed 100 characters")
        private String pokemonName;

        private Integer slot;

        private String notes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        private String notes;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private Long teamId;
        private String pokemonName;
        private Integer slot;
        private String notes;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }
}
