package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.entities.GamePlan;
import com.yeskatronics.vs_recorder_backend.entities.GamePlanTeam;
import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.repositories.GamePlanRepository;
import com.yeskatronics.vs_recorder_backend.repositories.GamePlanTeamRepository;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Service class for GamePlan business logic.
 * Handles tournament/match preparation planning.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class GamePlanService {

    private final GamePlanRepository gamePlanRepository;
    private final GamePlanTeamRepository gamePlanTeamRepository;
    private final UserRepository userRepository;

    // ==================== GamePlan CRUD ====================

    /**
     * Create a new game plan
     *
     * @param gamePlan the game plan to create
     * @param userId the ID of the user creating the plan
     * @return the created game plan
     * @throws IllegalArgumentException if user not found
     */
    public GamePlan createGamePlan(GamePlan gamePlan, Long userId) {
        log.info("Creating new game plan for user ID: {}", userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

        gamePlan.setUser(user);

        GamePlan savedPlan = gamePlanRepository.save(gamePlan);
        log.info("Game plan created successfully with ID: {}", savedPlan.getId());

        return savedPlan;
    }

    /**
     * Get a game plan by ID
     *
     * @param id the game plan ID
     * @return Optional containing the game plan if found
     */
    @Transactional(readOnly = true)
    public Optional<GamePlan> getGamePlanById(Long id) {
        log.debug("Fetching game plan by ID: {}", id);
        return gamePlanRepository.findById(id);
    }

    /**
     * Get a game plan by ID, ensuring it belongs to the specified user
     *
     * @param id the game plan ID
     * @param userId the user ID
     * @return Optional containing the game plan if found and owned by user
     */
    @Transactional(readOnly = true)
    public Optional<GamePlan> getGamePlanByIdAndUserId(Long id, Long userId) {
        log.debug("Fetching game plan by ID: {} for user: {}", id, userId);
        return gamePlanRepository.findByIdAndUserId(id, userId);
    }

    /**
     * Get all game plans for a user
     *
     * @param userId the user ID
     * @return list of game plans
     */
    @Transactional(readOnly = true)
    public List<GamePlan> getGamePlansByUserId(Long userId) {
        log.debug("Fetching game plans for user ID: {}", userId);
        return gamePlanRepository.findByUserId(userId);
    }

    /**
     * Update a game plan
     *
     * @param id the game plan ID
     * @param userId the user ID (for ownership verification)
     * @param updates the updates to apply
     * @return the updated game plan
     * @throws IllegalArgumentException if game plan not found or not owned by user
     */
    public GamePlan updateGamePlan(Long id, Long userId, GamePlan updates) {
        log.info("Updating game plan ID: {}", id);

        GamePlan existingPlan = gamePlanRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException("Game plan not found or not owned by user"));

        // Update fields
        if (updates.getName() != null) {
            existingPlan.setName(updates.getName());
        }
        if (updates.getNotes() != null) {
            existingPlan.setNotes(updates.getNotes());
        }

        GamePlan savedPlan = gamePlanRepository.save(existingPlan);
        log.info("Game plan updated successfully: {}", id);

        return savedPlan;
    }

    /**
     * Delete a game plan
     *
     * @param id the game plan ID
     * @param userId the user ID (for ownership verification)
     * @throws IllegalArgumentException if game plan not found or not owned by user
     */
    public void deleteGamePlan(Long id, Long userId) {
        log.info("Deleting game plan ID: {}", id);

        GamePlan gamePlan = gamePlanRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException("Game plan not found or not owned by user"));

        gamePlanRepository.delete(gamePlan);
        log.info("Game plan deleted successfully: {}", id);
    }

    /**
     * Count game plans for a user
     *
     * @param userId the user ID
     * @return number of game plans
     */
    @Transactional(readOnly = true)
    public long countGamePlansByUserId(Long userId) {
        return gamePlanRepository.countByUserId(userId);
    }

    // ==================== GamePlanTeam CRUD ====================

    /**
     * Add a team to a game plan
     *
     * @param gamePlanId the game plan ID
     * @param userId the user ID (for ownership verification)
     * @param team the team to add
     * @return the created game plan team
     * @throws IllegalArgumentException if game plan not found or not owned by user
     */
    public GamePlanTeam addTeamToGamePlan(Long gamePlanId, Long userId, GamePlanTeam team) {
        log.info("Adding team to game plan ID: {}", gamePlanId);

        GamePlan gamePlan = gamePlanRepository.findByIdAndUserId(gamePlanId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Game plan not found or not owned by user"));

        team.setGamePlan(gamePlan);

        GamePlanTeam savedTeam = gamePlanTeamRepository.save(team);
        log.info("Team added successfully with ID: {}", savedTeam.getId());

        return savedTeam;
    }

    /**
     * Get a game plan team by ID
     *
     * @param id the team ID
     * @return Optional containing the team if found
     */
    @Transactional(readOnly = true)
    public Optional<GamePlanTeam> getGamePlanTeamById(Long id) {
        log.debug("Fetching game plan team by ID: {}", id);
        return gamePlanTeamRepository.findById(id);
    }

    /**
     * Get all teams for a game plan
     *
     * @param gamePlanId the game plan ID
     * @return list of teams
     */
    @Transactional(readOnly = true)
    public List<GamePlanTeam> getTeamsByGamePlanId(Long gamePlanId) {
        log.debug("Fetching teams for game plan ID: {}", gamePlanId);
        return gamePlanTeamRepository.findByGamePlanId(gamePlanId);
    }

    /**
     * Update a game plan team
     *
     * @param id the team ID
     * @param gamePlanId the game plan ID (for verification)
     * @param userId the user ID (for ownership verification)
     * @param updates the updates to apply
     * @return the updated team
     * @throws IllegalArgumentException if team not found or not in specified game plan
     */
    public GamePlanTeam updateGamePlanTeam(Long id, Long gamePlanId, Long userId, GamePlanTeam updates) {
        log.info("Updating game plan team ID: {}", id);

        // Verify game plan ownership
        if (!gamePlanRepository.existsByIdAndUserId(gamePlanId, userId)) {
            throw new IllegalArgumentException("Game plan not found or not owned by user");
        }

        GamePlanTeam existingTeam = gamePlanTeamRepository.findByIdAndGamePlanId(id, gamePlanId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found in this game plan"));

        // Update fields
        if (updates.getPokepaste() != null) {
            existingTeam.setPokepaste(updates.getPokepaste());
        }
        if (updates.getNotes() != null) {
            existingTeam.setNotes(updates.getNotes());
        }

        GamePlanTeam savedTeam = gamePlanTeamRepository.save(existingTeam);
        log.info("Game plan team updated successfully: {}", id);

        return savedTeam;
    }

    /**
     * Delete a team from a game plan
     *
     * @param id the team ID
     * @param gamePlanId the game plan ID (for verification)
     * @param userId the user ID (for ownership verification)
     * @throws IllegalArgumentException if team not found or not in specified game plan
     */
    public void deleteGamePlanTeam(Long id, Long gamePlanId, Long userId) {
        log.info("Deleting game plan team ID: {}", id);

        // Verify game plan ownership
        if (!gamePlanRepository.existsByIdAndUserId(gamePlanId, userId)) {
            throw new IllegalArgumentException("Game plan not found or not owned by user");
        }

        GamePlanTeam team = gamePlanTeamRepository.findByIdAndGamePlanId(id, gamePlanId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found in this game plan"));

        gamePlanTeamRepository.delete(team);
        log.info("Game plan team deleted successfully: {}", id);
    }

    // ==================== Team Composition Management ====================

    /**
     * Add a composition to a game plan team
     *
     * @param teamId the team ID
     * @param gamePlanId the game plan ID (for verification)
     * @param userId the user ID (for ownership verification)
     * @param composition the composition to add
     * @return the updated team
     * @throws IllegalArgumentException if team not found
     */
    public GamePlanTeam addComposition(Long teamId, Long gamePlanId, Long userId,
                                       GamePlanTeam.TeamComposition composition) {
        log.info("Adding composition to game plan team ID: {}", teamId);

        // Verify game plan ownership
        if (!gamePlanRepository.existsByIdAndUserId(gamePlanId, userId)) {
            throw new IllegalArgumentException("Game plan not found or not owned by user");
        }

        GamePlanTeam team = gamePlanTeamRepository.findByIdAndGamePlanId(teamId, gamePlanId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found in this game plan"));

        team.addComposition(composition);

        GamePlanTeam savedTeam = gamePlanTeamRepository.save(team);
        log.info("Composition added successfully to team ID: {}", teamId);

        return savedTeam;
    }

    /**
     * Update a composition in a game plan team
     *
     * @param teamId the team ID
     * @param gamePlanId the game plan ID (for verification)
     * @param userId the user ID (for ownership verification)
     * @param index the composition index
     * @param composition the updated composition
     * @return the updated team
     * @throws IllegalArgumentException if team not found or index invalid
     */
    public GamePlanTeam updateComposition(Long teamId, Long gamePlanId, Long userId,
                                          int index, GamePlanTeam.TeamComposition composition) {
        log.info("Updating composition {} in game plan team ID: {}", index, teamId);

        // Verify game plan ownership
        if (!gamePlanRepository.existsByIdAndUserId(gamePlanId, userId)) {
            throw new IllegalArgumentException("Game plan not found or not owned by user");
        }

        GamePlanTeam team = gamePlanTeamRepository.findByIdAndGamePlanId(teamId, gamePlanId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found in this game plan"));

        if (team.getCompositions() == null || index < 0 || index >= team.getCompositions().size()) {
            throw new IllegalArgumentException("Invalid composition index");
        }

        team.updateComposition(index, composition);

        GamePlanTeam savedTeam = gamePlanTeamRepository.save(team);
        log.info("Composition updated successfully at index {}", index);

        return savedTeam;
    }

    /**
     * Delete a composition from a game plan team
     *
     * @param teamId the team ID
     * @param gamePlanId the game plan ID (for verification)
     * @param userId the user ID (for ownership verification)
     * @param index the composition index
     * @return the updated team
     * @throws IllegalArgumentException if team not found or index invalid
     */
    public GamePlanTeam deleteComposition(Long teamId, Long gamePlanId, Long userId, int index) {
        log.info("Deleting composition {} from game plan team ID: {}", index, teamId);

        // Verify game plan ownership
        if (!gamePlanRepository.existsByIdAndUserId(gamePlanId, userId)) {
            throw new IllegalArgumentException("Game plan not found or not owned by user");
        }

        GamePlanTeam team = gamePlanTeamRepository.findByIdAndGamePlanId(teamId, gamePlanId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found in this game plan"));

        if (team.getCompositions() == null || index < 0 || index >= team.getCompositions().size()) {
            throw new IllegalArgumentException("Invalid composition index");
        }

        team.removeComposition(index);

        GamePlanTeam savedTeam = gamePlanTeamRepository.save(team);
        log.info("Composition deleted successfully at index {}", index);

        return savedTeam;
    }
}