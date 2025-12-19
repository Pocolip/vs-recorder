package com.yeskatronics.vs_recorder_backend.controllers;

import com.yeskatronics.vs_recorder_backend.dto.AuthDTO;
import com.yeskatronics.vs_recorder_backend.dto.ErrorResponse;
import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.security.CustomUserDetailsService;
import com.yeskatronics.vs_recorder_backend.security.JwtUtil;
import com.yeskatronics.vs_recorder_backend.services.UserService;
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
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final UserService userService;
    private final CustomUserDetailsService userDetailsService;
    private final JwtUtil jwtUtil;

    /**
     * Register a new user
     * POST /api/auth/register
     *
     * @param request the registration request
     * @return JWT token and user information
     */
    @PostMapping("/register")
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

            // Generate JWT token
            UserDetails userDetails = userDetailsService.loadUserByUsername(savedUser.getUsername());
            String token = jwtUtil.generateToken(userDetails, savedUser.getId());

            // Update last login
            userService.updateLastLogin(savedUser.getId());

            // Build response
            AuthDTO.AuthResponse response = new AuthDTO.AuthResponse(
                    token,
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

            // Generate JWT token
            String token = jwtUtil.generateToken(userDetails, userId);

            // Update last login
            userService.updateLastLogin(userId);

            // Build response
            AuthDTO.AuthResponse response = new AuthDTO.AuthResponse(
                    token,
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
     * Get current authenticated user information
     * GET /api/auth/me
     *
     * @return current user information
     */
    @GetMapping("/me")
    public ResponseEntity<AuthDTO.AuthResponse> getCurrentUser(Authentication authentication) {
        log.debug("Fetching current user info");

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        String username = authentication.getName();
        Long userId = userDetailsService.getUserIdByUsername(username);
        User user = userService.getUserById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Return user info without regenerating token
        AuthDTO.AuthResponse response = new AuthDTO.AuthResponse(
                null, // No new token
                user.getId(),
                user.getUsername(),
                user.getEmail()
        );

        return ResponseEntity.ok(response);
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