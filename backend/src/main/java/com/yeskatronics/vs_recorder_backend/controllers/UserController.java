package com.yeskatronics.vs_recorder_backend.controllers;

import com.yeskatronics.vs_recorder_backend.dto.ErrorResponse;
import com.yeskatronics.vs_recorder_backend.dto.UserDTO;
import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.mappers.UserMapper;
import com.yeskatronics.vs_recorder_backend.services.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * REST Controller for User operations.
 * Handles user registration, profile management, and account operations.
 *
 * Base path: /api/users
 */
@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
@Slf4j
public class UserController {

    private final UserService userService;
    private final UserMapper userMapper;

    /**
     * Create a new user (registration)
     * POST /api/users
     *
     * @param request the user creation request
     * @return the created user
     */
    @PostMapping
    public ResponseEntity<UserDTO.Response> createUser(@Valid @RequestBody UserDTO.CreateRequest request) {
        log.info("Creating new user: {}", request.getUsername());

        User user = userMapper.toEntity(request);
        User savedUser = userService.createUser(user);
        UserDTO.Response response = userMapper.toDTO(savedUser);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get user by ID
     * GET /api/users/{id}
     *
     * @param id the user ID
     * @return the user details
     */
    @GetMapping("/{id}")
    public ResponseEntity<UserDTO.Response> getUserById(@PathVariable Long id) {
        log.debug("Fetching user by ID: {}", id);

        return userService.getUserById(id)
                .map(userMapper::toDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get user by username
     * GET /api/users/username/{username}
     *
     * @param username the username
     * @return the user details
     */
    @GetMapping("/username/{username}")
    public ResponseEntity<UserDTO.Response> getUserByUsername(@PathVariable String username) {
        log.debug("Fetching user by username: {}", username);

        return userService.getUserByUsername(username)
                .map(userMapper::toDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get all users (admin function)
     * GET /api/users
     *
     * @return list of all users
     */
    @GetMapping
    public ResponseEntity<List<UserDTO.Response>> getAllUsers() {
        log.debug("Fetching all users");

        List<UserDTO.Response> users = userService.getAllUsers().stream()
                .map(userMapper::toDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(users);
    }

    /**
     * Update user profile
     * PATCH /api/users/{id}
     *
     * @param id the user ID
     * @param request the update request
     * @return the updated user
     */
    @PatchMapping("/{id}")
    public ResponseEntity<UserDTO.Response> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UserDTO.UpdateRequest request) {

        log.info("Updating user: {}", id);

        User updates = userMapper.toEntity(request);
        User updatedUser = userService.updateUser(id, updates);
        UserDTO.Response response = userMapper.toDTO(updatedUser);

        return ResponseEntity.ok(response);
    }

    /**
     * Delete user account
     * DELETE /api/users/{id}
     *
     * @param id the user ID
     * @return no content response
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        log.info("Deleting user: {}", id);

        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Check if username exists
     * GET /api/users/check/username/{username}
     *
     * @param username the username to check
     * @return boolean indicating if username exists
     */
    @GetMapping("/check/username/{username}")
    public ResponseEntity<Boolean> checkUsernameExists(@PathVariable String username) {
        log.debug("Checking if username exists: {}", username);

        boolean exists = userService.usernameExists(username);
        return ResponseEntity.ok(exists);
    }

    /**
     * Check if email exists
     * GET /api/users/check/email/{email}
     *
     * @param email the email to check
     * @return boolean indicating if email exists
     */
    @GetMapping("/check/email/{email}")
    public ResponseEntity<Boolean> checkEmailExists(@PathVariable String email) {
        log.debug("Checking if email exists: {}", email);

        boolean exists = userService.emailExists(email);
        return ResponseEntity.ok(exists);
    }

    /**
     * Exception handler for IllegalArgumentException
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(
            IllegalArgumentException ex,
            @RequestAttribute(required = false) String requestPath) {

        log.warn("Illegal argument: {}", ex.getMessage());

        ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                ex.getMessage(),
                requestPath != null ? requestPath : "/api/users"
        );

        return ResponseEntity.badRequest().body(error);
    }
}