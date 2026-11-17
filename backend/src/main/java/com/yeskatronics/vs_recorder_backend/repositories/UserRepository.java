package com.yeskatronics.vs_recorder_backend.repositories;

import com.yeskatronics.vs_recorder_backend.entities.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for User entity.
 * Spring Data JPA automatically provides implementation for basic CRUD operations.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    /**
     * Find a user by username
     * @param username the username to search for
     * @return Optional containing the user if found
     */
    Optional<User> findByUsername(String username);

    /**
     * Load a user with a row lock held until the transaction ends. Serializes
     * operations that check and then consume a per-user allowance (e.g. the daily
     * simulation cap).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> findByIdForUpdate(@Param("id") Long id);

    /**
     * Find a user by email
     * @param email the email to search for
     * @return Optional containing the user if found
     */
    Optional<User> findByEmail(String email);

    /**
     * Check if a username already exists
     * @param username the username to check
     * @return true if username exists, false otherwise
     */
    boolean existsByUsername(String username);

    /**
     * Check if an email already exists
     * @param email the email to check
     * @return true if email exists, false otherwise
     */
    boolean existsByEmail(String email);

    /**
     * Find all users whose email matches, ignoring case.
     * Returns a list because emails were historically stored as typed, so
     * case-variant duplicates may exist in legacy data.
     * @param email the email to search for
     * @return all matching users (normally zero or one)
     */
    List<User> findAllByEmailIgnoreCase(String email);

    /**
     * Check if an email already exists, ignoring case
     * @param email the email to check
     * @return true if a case-insensitive match exists, false otherwise
     */
    boolean existsByEmailIgnoreCase(String email);
}