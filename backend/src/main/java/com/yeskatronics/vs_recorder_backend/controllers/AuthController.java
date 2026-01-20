package com.yeskatronics.vs_recorder_backend.controllers;

import com.yeskatronics.vs_recorder_backend.dto.AuthDTO;
import com.yeskatronics.vs_recorder_backend.dto.ErrorResponse;
import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.exceptions.InvalidTokenException;
import com.yeskatronics.vs_recorder_backend.exceptions.RateLimitExceededException;
import com.yeskatronics.vs_recorder_backend.security.CustomUserDetailsService;
import com.yeskatronics.vs_recorder_backend.security.JwtUtil;
import com.yeskatronics.vs_recorder_backend.services.PasswordResetService;
import com.yeskatronics.vs_recorder_backend.services.UserService;
import jakarta.servlet.http.HttpServletRequest;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for Authentication operations.
 * Handles user registration and login with JWT token generation.
 *
 * Base path: /api/auth
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Authentication", description = "User registration and login endpoints")
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final CustomUserDetailsService userDetailsService;
    private final JwtUtil jwtUtil;
    private final PasswordResetService passwordResetService;

    /**
     * Register a new user
     * POST /api/auth/register
     *
     * @param request the registration request
     * @return JWT token and user information
     */
    @PostMapping("/register")
    @Operation(
            summary = "Register a new user",
            description = "Create a new user account and receive a JWT token for authentication"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "201",
                    description = "User registered successfully",
                    content = @Content(schema = @Schema(implementation = AuthDTO.AuthResponse.class))
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid input or username/email already exists",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))
            )
    })
    public ResponseEntity<AuthDTO.AuthResponse> register(@Valid @RequestBody AuthDTO.RegisterRequest request) {
        log.info("Registering new user: {}", request.getUsername());

        try {
            // Create user entity
            User user = new User();
            user.setUsername(request.getUsername());
            user.setPasswordHash(request.getPassword()); // Will be hashed in service
            user.setEmail(request.getEmail());

            // Save user
            User savedUser = userService.createUser(user);

            // Generate JWT tokens
            UserDetails userDetails = userDetailsService.loadUserByUsername(savedUser.getUsername());
            String accessToken = jwtUtil.generateAccessToken(userDetails, savedUser.getId());
            String refreshToken = jwtUtil.generateRefreshToken(userDetails, savedUser.getId());

            // Update last login
            userService.updateLastLogin(savedUser.getId());

            // Build response
            AuthDTO.AuthResponse response = new AuthDTO.AuthResponse(
                    accessToken,
                    refreshToken,
                    jwtUtil.getAccessExpirationSeconds(),
                    savedUser.getId(),
                    savedUser.getUsername(),
                    savedUser.getEmail()
            );

            return ResponseEntity.status(HttpStatus.CREATED).body(response);

        } catch (IllegalArgumentException e) {
            log.warn("Registration failed: {}", e.getMessage());
            throw e;
        }
    }

    /**
     * Login user
     * POST /api/auth/login
     *
     * @param request the login request
     * @return JWT token and user information
     */
    @PostMapping("/login")
    @Operation(
            summary = "Login user",
            description = "Authenticate with username and password to receive a JWT token"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Login successful",
                    content = @Content(schema = @Schema(implementation = AuthDTO.AuthResponse.class))
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "Invalid credentials",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))
            )
    })
    public ResponseEntity<AuthDTO.AuthResponse> login(@Valid @RequestBody AuthDTO.LoginRequest request) {
        log.info("Login attempt for user: {}", request.getUsername());

        try {
            // Authenticate user
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );

            // Load user details
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();

            // Get user ID
            Long userId = userDetailsService.getUserIdByUsername(userDetails.getUsername());

            // Get user entity
            User user = userService.getUserById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            // Generate JWT tokens
            String accessToken = jwtUtil.generateAccessToken(userDetails, userId);
            String refreshToken = jwtUtil.generateRefreshToken(userDetails, userId);

            // Update last login
            userService.updateLastLogin(userId);

            // Build response
            AuthDTO.AuthResponse response = new AuthDTO.AuthResponse(
                    accessToken,
                    refreshToken,
                    jwtUtil.getAccessExpirationSeconds(),
                    user.getId(),
                    user.getUsername(),
                    user.getEmail()
            );

            log.info("User logged in successfully: {}", request.getUsername());
            return ResponseEntity.ok(response);

        } catch (AuthenticationException e) {
            log.warn("Login failed for user: {}", request.getUsername());
            throw new IllegalArgumentException("Invalid username or password");
        }
    }

    /**
     * Refresh access token using refresh token
     * POST /api/auth/refresh
     *
     * @param request the refresh token request
     * @return new access token and user information
     */
    @PostMapping("/refresh")
    @Operation(
            summary = "Refresh access token",
            description = "Use a valid refresh token to obtain a new access token"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Token refreshed successfully",
                    content = @Content(schema = @Schema(implementation = AuthDTO.AuthResponse.class))
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "Invalid or expired refresh token",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))
            )
    })
    public ResponseEntity<AuthDTO.AuthResponse> refresh(@Valid @RequestBody AuthDTO.RefreshRequest request) {
        log.debug("Token refresh attempt");

        String refreshToken = request.getRefreshToken();

        // Validate the refresh token
        if (!jwtUtil.validateToken(refreshToken) || !jwtUtil.isRefreshToken(refreshToken)) {
            log.warn("Invalid refresh token provided");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            // Extract user info from refresh token
            String username = jwtUtil.extractUsername(refreshToken);
            Long userId = jwtUtil.extractUserId(refreshToken);

            // Load user details to generate new token
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);

            // Get user entity for response
            User user = userService.getUserById(userId)
                    .orElseThrow(() -> new IllegalArgumentException("User not found"));

            // Generate new access token (keep same refresh token)
            String newAccessToken = jwtUtil.generateAccessToken(userDetails, userId);

            // Build response
            AuthDTO.AuthResponse response = new AuthDTO.AuthResponse(
                    newAccessToken,
                    refreshToken, // Return the same refresh token
                    jwtUtil.getAccessExpirationSeconds(),
                    user.getId(),
                    user.getUsername(),
                    user.getEmail()
            );

            log.debug("Token refreshed successfully for user: {}", username);
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Token refresh failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
    }

    /**
     * Get current authenticated user information
     * GET /api/auth/me
     *
     * @return current user information
     */
    @GetMapping("/me")
    @Operation(
            summary = "Get current user",
            description = "Retrieve information about the currently authenticated user",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "User information retrieved successfully",
                    content = @Content(schema = @Schema(implementation = AuthDTO.AuthResponse.class))
            ),
            @ApiResponse(
                    responseCode = "401",
                    description = "Not authenticated",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))
            )
    })
    public ResponseEntity<AuthDTO.AuthResponse> getCurrentUser(Authentication authentication) {
        log.debug("Fetching current user info");

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String username = authentication.getName();
        Long userId = userDetailsService.getUserIdByUsername(username);
        User user = userService.getUserById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Return user info without regenerating tokens
        AuthDTO.AuthResponse response = new AuthDTO.AuthResponse(
                null, // No new access token
                null, // No new refresh token
                null, // No expiration
                user.getId(),
                user.getUsername(),
                user.getEmail()
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Request a password reset link
     * POST /api/auth/forgot-password
     *
     * @param request the forgot password request containing email
     * @return success message (always returns success to prevent email enumeration)
     */
    @PostMapping("/forgot-password")
    @Operation(
            summary = "Request password reset",
            description = "Request a password reset link. If the email exists, a reset link will be sent."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Request processed (check email if account exists)",
                    content = @Content(schema = @Schema(implementation = AuthDTO.PasswordResetResponse.class))
            ),
            @ApiResponse(
                    responseCode = "429",
                    description = "Too many requests",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))
            )
    })
    public ResponseEntity<AuthDTO.PasswordResetResponse> forgotPassword(
            @Valid @RequestBody AuthDTO.ForgotPasswordRequest request,
            HttpServletRequest httpRequest) {

        log.info("Password reset requested for email: {}***",
            request.getEmail().substring(0, Math.min(3, request.getEmail().indexOf('@'))));

        String clientIp = getClientIp(httpRequest);

        try {
            passwordResetService.initiatePasswordReset(request.getEmail(), clientIp);
        } catch (RateLimitExceededException e) {
            log.warn("Rate limit exceeded for password reset from IP: {}", clientIp);
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(AuthDTO.PasswordResetResponse.failure("Too many requests. Please try again later."));
        }

        // Always return success to prevent email enumeration
        return ResponseEntity.ok(AuthDTO.PasswordResetResponse.success(
            "If an account with that email exists, a password reset link has been sent."));
    }

    /**
     * Validate a password reset token
     * GET /api/auth/reset-password/validate
     *
     * @param token the reset token to validate
     * @return whether the token is valid
     */
    @GetMapping("/reset-password/validate")
    @Operation(
            summary = "Validate reset token",
            description = "Check if a password reset token is valid and not expired"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Token validation result",
                    content = @Content(schema = @Schema(implementation = AuthDTO.PasswordResetResponse.class))
            )
    })
    public ResponseEntity<AuthDTO.PasswordResetResponse> validateResetToken(
            @RequestParam("token") String token) {

        boolean isValid = passwordResetService.validateToken(token);

        if (isValid) {
            return ResponseEntity.ok(AuthDTO.PasswordResetResponse.success("Token is valid"));
        } else {
            return ResponseEntity.ok(AuthDTO.PasswordResetResponse.failure(
                "Token is invalid or has expired"));
        }
    }

    /**
     * Reset password using token
     * POST /api/auth/reset-password
     *
     * @param request the reset password request
     * @return success/failure response
     */
    @PostMapping("/reset-password")
    @Operation(
            summary = "Reset password",
            description = "Reset password using a valid reset token"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Password reset result",
                    content = @Content(schema = @Schema(implementation = AuthDTO.PasswordResetResponse.class))
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid or expired token",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))
            )
    })
    public ResponseEntity<AuthDTO.PasswordResetResponse> resetPassword(
            @Valid @RequestBody AuthDTO.ResetPasswordRequest request) {

        log.info("Password reset attempt with token");

        try {
            passwordResetService.resetPassword(request.getToken(), request.getNewPassword());
            return ResponseEntity.ok(AuthDTO.PasswordResetResponse.success(
                "Password has been reset successfully. You can now log in with your new password."));
        } catch (InvalidTokenException e) {
            log.warn("Invalid token used for password reset");
            return ResponseEntity.badRequest()
                .body(AuthDTO.PasswordResetResponse.failure(
                    "Invalid or expired reset token. Please request a new password reset."));
        }
    }

    /**
     * Helper method to extract client IP address
     */
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * Exception handler for authentication errors
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleAuthException(
            IllegalArgumentException ex,
            @RequestAttribute(required = false) String requestPath) {

        log.warn("Authentication error: {}", ex.getMessage());

        ErrorResponse error = new ErrorResponse(
                HttpStatus.UNAUTHORIZED.value(),
                "Unauthorized",
                ex.getMessage(),
                requestPath != null ? requestPath : "/api/auth"
        );

        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }
}