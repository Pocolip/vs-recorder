package com.yeskatronics.vs_recorder_backend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTOs for Authentication operations.
 */
public class AuthDTO {

    /**
     * Request DTO for user login
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LoginRequest {
        @NotBlank(message = "Username is required")
        private String username;

        @NotBlank(message = "Password is required")
        private String password;
    }

    /**
     * Request DTO for user registration
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RegisterRequest {
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
     * Response DTO for login/register operations
     * Returns JWT token and user information
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuthResponse {
        private String token;
        private String type = "Bearer";
        private Long userId;
        private String username;
        private String email;

        public AuthResponse(String token, Long userId, String username, String email) {
            this.token = token;
            this.userId = userId;
            this.username = username;
            this.email = email;
        }
    }

    /**
     * Request DTO for forgot password (request reset link)
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ForgotPasswordRequest {
        @NotBlank(message = "Email is required")
        @Email(message = "Email must be valid")
        private String email;
    }

    /**
     * Request DTO for resetting password with token
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ResetPasswordRequest {
        @NotBlank(message = "Token is required")
        private String token;

        @NotBlank(message = "New password is required")
        @Size(min = 6, message = "Password must be at least 6 characters")
        private String newPassword;
    }

    /**
     * Response DTO for password reset operations
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PasswordResetResponse {
        private boolean success;
        private String message;

        public static PasswordResetResponse success(String message) {
            return new PasswordResetResponse(true, message);
        }

        public static PasswordResetResponse failure(String message) {
            return new PasswordResetResponse(false, message);
        }
    }
}