package com.yeskatronics.vs_recorder_backend.repositories;

import com.yeskatronics.vs_recorder_backend.entities.Team;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Team entity.
 * Provides methods for querying teams by user and other criteria.
 */
@Repository
public interface TeamRepository extends JpaRepository<Team, Long> {

    /**
     * Find all teams belonging to a specific user
     * @param userId the user ID
     * @return list of teams
     */
    List<Team> findByUserId(Long userId);

    /**
     * Find a team by ID and user ID (ensures user owns the team)
     * @param id the team ID
     * @param userId the user ID
     * @return Optional containing the team if found and owned by user
     */
    Optional<Team> findByIdAndUserId(Long id, Long userId);

    /**
     * Find teams by user and regulation
     * @param userId the user ID
     * @param regulation the regulation (e.g., "Reg G")
     * @return list of teams
     */
    List<Team> findByUserIdAndRegulation(Long userId, String regulation);

    /**
     * Count teams for a specific user
     * @param userId the user ID
     * @return number of teams
     */
    long countByUserId(Long userId);

    /**
     * Check if a team exists by ID and user ID
     * @param id the team ID
     * @param userId the user ID
     * @return true if exists, false otherwise
     */
    boolean existsByIdAndUserId(Long id, Long userId);

    /**
     * Find teams with replays count
     * Custom query to get teams with their replay counts
     */
    @Query("SELECT t FROM Team t LEFT JOIN FETCH t.replays WHERE t.user.id = :userId")
    List<Team> findByUserIdWithReplays(Long userId);
}