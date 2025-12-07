package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Service class for User entity business logic.
 * Handles user registration, retrieval, and management operations.
 *
 * Note: Password hashing and JWT authentication will be added in a future phase.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class UserService {

    private final UserRepository userRepository;

    /**
     * Create a new user
     *
     * @param user the user to create
     * @return the created user
     * @throws IllegalArgumentException if username or email already exists
     */
    public User createUser(User user) {
        log.info("Creating new user: {}", user.getUsername());

        // Validate username uniqueness
        if (userRepository.existsByUsername(user.getUsername())) {
            throw new IllegalArgumentException("Username already exists: " + user.getUsername());
        }

        // Validate email uniqueness
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new IllegalArgumentException("Email already exists: " + user.getEmail());
        }

        // TODO: In future phase, hash the password before saving
        // For now, we're storing it as-is (NOT PRODUCTION READY)

        User savedUser = userRepository.save(user);
        log.info("User created successfully with ID: {}", savedUser.getId());

        return savedUser;
    }

    /**
     * Get a user by ID
     *
     * @param id the user ID
     * @return Optional containing the user if found
     */
    @Transactional(readOnly = true)
    public Optional<User> getUserById(Long id) {
        log.debug("Fetching user by ID: {}", id);
        return userRepository.findById(id);
    }

    /**
     * Get a user by username
     *
     * @param username the username
     * @return Optional containing the user if found
     */
    @Transactional(readOnly = true)
    public Optional<User> getUserByUsername(String username) {
        log.debug("Fetching user by username: {}", username);
        return userRepository.findByUsername(username);
    }

    /**
     * Get a user by email
     *
     * @param email the email
     * @return Optional containing the user if found
     */
    @Transactional(readOnly = true)
    public Optional<User> getUserByEmail(String email) {
        log.debug("Fetching user by email: {}", email);
        return userRepository.findByEmail(email);
    }

    /**
     * Get all users (admin function)
     *
     * @return list of all users
     */
    @Transactional(readOnly = true)
    public List<User> getAllUsers() {
        log.debug("Fetching all users");
        return userRepository.findAll();
    }

    /**
     * Update user profile (email, password)
     *
     * @param id the user ID
     * @param updates the user with updated fields
     * @return the updated user
     * @throws IllegalArgumentException if user not found or email already exists
     */
    public User updateUser(Long id, User updates) {
        log.info("Updating user with ID: {}", id);

        User existingUser = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + id));

        // Update email if provided and different
        if (updates.getEmail() != null && !updates.getEmail().equals(existingUser.getEmail())) {
            if (userRepository.existsByEmail(updates.getEmail())) {
                throw new IllegalArgumentException("Email already exists: " + updates.getEmail());
            }
            existingUser.setEmail(updates.getEmail());
        }

        // Update password if provided
        if (updates.getPasswordHash() != null && !updates.getPasswordHash().isEmpty()) {
            // TODO: Hash the password in future phase
            existingUser.setPasswordHash(updates.getPasswordHash());
        }

        User savedUser = userRepository.save(existingUser);
        log.info("User updated successfully: {}", savedUser.getId());

        return savedUser;
    }

    /**
     * Update last login timestamp
     *
     * @param id the user ID
     */
    public void updateLastLogin(Long id) {
        log.debug("Updating last login for user ID: {}", id);

        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + id));

        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);
    }

    /**
     * Delete a user (cascades to teams, replays, etc.)
     *
     * @param id the user ID
     * @throws IllegalArgumentException if user not found
     */
    public void deleteUser(Long id) {
        log.info("Deleting user with ID: {}", id);

        if (!userRepository.existsById(id)) {
            throw new IllegalArgumentException("User not found with ID: " + id);
        }

        userRepository.deleteById(id);
        log.info("User deleted successfully: {}", id);
    }

    /**
     * Check if a username exists
     *
     * @param username the username to check
     * @return true if exists, false otherwise
     */
    @Transactional(readOnly = true)
    public boolean usernameExists(String username) {
        return userRepository.existsByUsername(username);
    }

    /**
     * Check if an email exists
     *
     * @param email the email to check
     * @return true if exists, false otherwise
     */
    @Transactional(readOnly = true)
    public boolean emailExists(String email) {
        return userRepository.existsByEmail(email);
    }

    /**
     * Get user with all teams loaded (useful for profile page)
     *
     * @param id the user ID
     * @return Optional containing the user with teams
     */
    @Transactional(readOnly = true)
    public Optional<User> getUserWithTeams(Long id) {
        log.debug("Fetching user with teams for ID: {}", id);

        Optional<User> user = userRepository.findById(id);
        // Force initialization of teams collection
        user.ifPresent(u -> u.getTeams().size());

        return user;
    }
}