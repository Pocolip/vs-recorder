package com.yeskatronics.vs_recorder_backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * DTOs for User entity API operations.
 * Separates internal entity structure from API contract.
 */
public class UserDTO {

    /**
     * Request DTO for user registration
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CreateRequest {
        @NotBlank(message = "Username is required")
        @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
        private String username;

        @NotBlank(message = "Password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String password;

        @NotBlank(message = "Email is required")
        @Email(message = "Email must be valid")
        private String email;
    }

    /**
     * Request DTO for user profile updates
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        @Email(message = "Email must be valid")
        private String email;

        @Size(min = 6, message = "Password must be at least 6 characters")
        private String password;
    }

    /**
     * Response DTO for user information
     * Excludes sensitive data like password hash
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private Long id;
        private String username;
        private String email;
        private LocalDateTime lastLogin;
        private LocalDateTime createdAt;
        private int teamCount;
    }

    /**
     * Minimal response DTO for user references
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Summary {
        private Long id;
        private String username;
    }
}
