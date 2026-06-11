package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.entities.GamePlan;
import com.yeskatronics.vs_recorder_backend.entities.GamePlanTeam;
import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.exceptions.TeamAccessDeniedException;
import com.yeskatronics.vs_recorder_backend.repositories.GamePlanRepository;
import com.yeskatronics.vs_recorder_backend.repositories.GamePlanTeamRepository;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import com.yeskatronics.vs_recorder_backend.services.TeamAccessService.Permission;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

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
    private final TeamService teamService;
    private final TeamAccessService teamAccessService;

    /**
     * Resolve a game plan and verify the caller can access it.
     *
     * Access rules (a) the caller created the plan, OR (b) the plan is attached to a
     * team and the caller is owner/accepted-collaborator of that team. For mutations
     * (requireEdit=true) collaborators must additionally have {@link Permission#EDIT_GAME_PLANS}.
     */
    private GamePlan requirePlanAccess(Long planId, Long userId, boolean requireEdit) {
        GamePlan plan = gamePlanRepository.findById(planId)
                .orElseThrow(() -> new IllegalArgumentException("Game plan not found"));

        boolean isCreator = plan.getUser() != null && userId.equals(plan.getUser().getId());
        if (isCreator) {
            return plan;
        }

        Long teamId = plan.getTeamId();
        if (teamId == null) {
            throw new TeamAccessDeniedException("Game plan not accessible to user " + userId);
        }

        if (requireEdit) {
            teamAccessService.requirePermission(teamId, userId, Permission.EDIT_GAME_PLANS);
        } else {
            teamAccessService.resolve(teamId, userId);
        }
        return plan;
    }

    /**
     * Bump the team's updatedAt when a matchup-planner edit lands. Safe no-op
     * for legacy/standalone game plans that aren't linked to a team.
     */
    private void touchLinkedTeam(GamePlan plan) {
        if (plan != null && plan.getTeamId() != null) {
            teamService.touchTeam(plan.getTeamId());
        }
    }

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
        try {
            return Optional.of(requirePlanAccess(id, userId, false));
        } catch (IllegalArgumentException | TeamAccessDeniedException e) {
            return Optional.empty();
        }
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

        GamePlan existingPlan = requirePlanAccess(id, userId, true);

        // Update fields
        if (updates.getName() != null) {
            existingPlan.setName(updates.getName());
        }
        if (updates.getNotes() != null) {
            existingPlan.setNotes(updates.getNotes());
        }

        GamePlan savedPlan = gamePlanRepository.save(existingPlan);
        touchLinkedTeam(savedPlan);
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

        GamePlan gamePlan = requirePlanAccess(id, userId, true);
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

    /**
     * Get a game plan by team ID and user ID
     *
     * @param teamId the team ID
     * @param userId the user ID
     * @return Optional containing the game plan if found
     */
    @Transactional(readOnly = true)
    public Optional<GamePlan> getGamePlanByTeamIdAndUserId(Long teamId, Long userId) {
        log.debug("Fetching game plan for team ID: {} (caller: {})", teamId, userId);
        // Shared semantics: any caller with team access sees the team's plan, not their own.
        teamAccessService.resolve(teamId, userId);
        return gamePlanRepository.findFirstByTeamId(teamId);
    }

    /**
     * Get or create a game plan for a specific team.
     * If a game plan already exists for the team, return it.
     * Otherwise, create a new one with a default name.
     *
     * @param teamId the team ID
     * @param userId the user ID
     * @param defaultName the name to use if creating a new game plan
     * @return the existing or newly created game plan
     */
    public GamePlan getOrCreateGamePlanForTeam(Long teamId, Long userId, String defaultName) {
        log.info("Getting or creating game plan for team ID: {} (caller: {})", teamId, userId);

        // Reading is gated on team access; creating additionally requires EDIT_GAME_PLANS for collaborators.
        Optional<GamePlan> existingPlan = gamePlanRepository.findFirstByTeamId(teamId);
        if (existingPlan.isPresent()) {
            teamAccessService.resolve(teamId, userId);
            log.info("Found existing game plan ID: {} for team ID: {}", existingPlan.get().getId(), teamId);
            return existingPlan.get();
        }

        teamAccessService.requirePermission(teamId, userId, Permission.EDIT_GAME_PLANS);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

        GamePlan newPlan = new GamePlan();
        newPlan.setUser(user);
        newPlan.setTeamId(teamId);
        newPlan.setName(defaultName != null ? defaultName : "Opponent Plans");

        GamePlan savedPlan = gamePlanRepository.save(newPlan);
        log.info("Created new game plan ID: {} for team ID: {}", savedPlan.getId(), teamId);
        return savedPlan;
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

        GamePlan gamePlan = requirePlanAccess(gamePlanId, userId, true);

        // New teams go to position 0; shift existing teams down by 1.
        List<GamePlanTeam> existing = gamePlanTeamRepository.findByGamePlanIdOrderByPositionAscIdAsc(gamePlanId);
        for (GamePlanTeam existingTeam : existing) {
            Integer pos = existingTeam.getPosition();
            existingTeam.setPosition((pos == null ? 0 : pos) + 1);
        }
        if (!existing.isEmpty()) {
            gamePlanTeamRepository.saveAll(existing);
        }

        team.setGamePlan(gamePlan);
        team.setPosition(0);

        GamePlanTeam savedTeam = gamePlanTeamRepository.save(team);
        touchLinkedTeam(gamePlan);
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
        return gamePlanTeamRepository.findByGamePlanIdOrderByPositionAscIdAsc(gamePlanId);
    }

    /**
     * Reorder all teams in a game plan to match the given ID order.
     * Assigns position 0..N-1 according to the order of {@code orderedIds}.
     *
     * @param gamePlanId the game plan ID
     * @param userId the user ID (for ownership verification)
     * @param orderedIds the desired team order
     * @throws IllegalArgumentException if game plan not owned, count mismatches, or an ID doesn't belong to the plan
     */
    public void reorderTeams(Long gamePlanId, Long userId, List<Long> orderedIds) {
        log.info("Reordering {} teams for game plan ID: {}", orderedIds.size(), gamePlanId);

        GamePlan plan = requirePlanAccess(gamePlanId, userId, true);

        List<GamePlanTeam> teams = gamePlanTeamRepository.findByGamePlanIdOrderByPositionAscIdAsc(gamePlanId);
        if (teams.size() != orderedIds.size()) {
            throw new IllegalArgumentException("Team count mismatch: expected " + teams.size() + ", got " + orderedIds.size());
        }

        Map<Long, GamePlanTeam> byId = teams.stream()
                .collect(Collectors.toMap(GamePlanTeam::getId, t -> t));

        for (int i = 0; i < orderedIds.size(); i++) {
            GamePlanTeam team = byId.get(orderedIds.get(i));
            if (team == null) {
                throw new IllegalArgumentException("Team ID " + orderedIds.get(i) + " not found in game plan: " + gamePlanId);
            }
            team.setPosition(i);
        }

        gamePlanTeamRepository.saveAll(teams);
        touchLinkedTeam(plan);
        log.info("Reordered teams for game plan ID: {}", gamePlanId);
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

        GamePlan plan = requirePlanAccess(gamePlanId, userId, true);

        GamePlanTeam existingTeam = gamePlanTeamRepository.findByIdAndGamePlanId(id, gamePlanId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found in this game plan"));

        // Update fields
        if (updates.getPokepaste() != null) {
            existingTeam.setPokepaste(updates.getPokepaste());
        }
        if (updates.getNotes() != null) {
            existingTeam.setNotes(updates.getNotes());
        }
        if (updates.getColor() != null) {
            existingTeam.setColor(updates.getColor());
        }

        GamePlanTeam savedTeam = gamePlanTeamRepository.save(existingTeam);
        touchLinkedTeam(plan);
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

        GamePlan plan = requirePlanAccess(gamePlanId, userId, true);

        GamePlanTeam team = gamePlanTeamRepository.findByIdAndGamePlanId(id, gamePlanId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found in this game plan"));

        gamePlanTeamRepository.delete(team);
        touchLinkedTeam(plan);
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

        GamePlan plan = requirePlanAccess(gamePlanId, userId, true);

        GamePlanTeam team = gamePlanTeamRepository.findByIdAndGamePlanId(teamId, gamePlanId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found in this game plan"));

        team.addComposition(composition);

        GamePlanTeam savedTeam = gamePlanTeamRepository.save(team);
        touchLinkedTeam(plan);
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

        GamePlan plan = requirePlanAccess(gamePlanId, userId, true);

        GamePlanTeam team = gamePlanTeamRepository.findByIdAndGamePlanId(teamId, gamePlanId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found in this game plan"));

        if (team.getCompositions() == null || index < 0 || index >= team.getCompositions().size()) {
            throw new IllegalArgumentException("Invalid composition index");
        }

        team.updateComposition(index, composition);

        GamePlanTeam savedTeam = gamePlanTeamRepository.save(team);
        touchLinkedTeam(plan);
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

        GamePlan plan = requirePlanAccess(gamePlanId, userId, true);

        GamePlanTeam team = gamePlanTeamRepository.findByIdAndGamePlanId(teamId, gamePlanId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found in this game plan"));

        if (team.getCompositions() == null || index < 0 || index >= team.getCompositions().size()) {
            throw new IllegalArgumentException("Invalid composition index");
        }

        team.removeComposition(index);

        GamePlanTeam savedTeam = gamePlanTeamRepository.save(team);
        touchLinkedTeam(plan);
        log.info("Composition deleted successfully at index {}", index);

        return savedTeam;
    }
}