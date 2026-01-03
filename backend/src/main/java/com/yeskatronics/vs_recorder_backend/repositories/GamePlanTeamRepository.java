package com.yeskatronics.vs_recorder_backend.repositories;

import com.yeskatronics.vs_recorder_backend.entities.GamePlanTeam;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Repository interface for GamePlanTeam entity.
 */
@Repository
public interface GamePlanTeamRepository extends JpaRepository<GamePlanTeam, Long> {

    /**
     * Find all teams for a specific game plan
     * @param gamePlanId the game plan ID
     * @return list of game plan teams
     */
    List<GamePlanTeam> findByGamePlanId(Long gamePlanId);

    /**
     * Find a team by ID and game plan ID (for verification)
     * @param id the team ID
     * @param gamePlanId the game plan ID
     * @return Optional containing the team if found
     */
    Optional<GamePlanTeam> findByIdAndGamePlanId(Long id, Long gamePlanId);

    /**
     * Count teams in a game plan
     * @param gamePlanId the game plan ID
     * @return number of teams
     */
    long countByGamePlanId(Long gamePlanId);
}