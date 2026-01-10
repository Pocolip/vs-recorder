package com.yeskatronics.vs_recorder_backend.repositories;

import com.yeskatronics.vs_recorder_backend.entities.GamePlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for GamePlan entity.
 */
@Repository
public interface GamePlanRepository extends JpaRepository<GamePlan, Long> {

    /**
     * Find all game plans for a specific user
     * @param userId the user ID
     * @return list of game plans
     */
    List<GamePlan> findByUserId(Long userId);

    /**
     * Find a game plan by ID and user ID (for ownership verification)
     * @param id the game plan ID
     * @param userId the user ID
     * @return Optional containing the game plan if found and owned by user
     */
    Optional<GamePlan> findByIdAndUserId(Long id, Long userId);

    /**
     * Check if a game plan exists and is owned by user
     * @param id the game plan ID
     * @param userId the user ID
     * @return true if exists and owned by user
     */
    boolean existsByIdAndUserId(Long id, Long userId);

    /**
     * Count game plans for a user
     * @param userId the user ID
     * @return number of game plans
     */
    long countByUserId(Long userId);

    /**
     * Find a game plan associated with a specific team and owned by user
     * @param teamId the team ID
     * @param userId the user ID
     * @return Optional containing the game plan if found
     */
    Optional<GamePlan> findByTeamIdAndUserId(Long teamId, Long userId);

    /**
     * Check if a game plan already exists for a team and user
     * @param teamId the team ID
     * @param userId the user ID
     * @return true if a game plan exists
     */
    boolean existsByTeamIdAndUserId(Long teamId, Long userId);
}