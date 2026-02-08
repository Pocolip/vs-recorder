package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.entities.Replay;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.repositories.TeamRepository;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Service class for Team entity business logic.
 * Handles team creation, management, and statistics calculation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TeamService {

    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final ReplayService replayService;

    /**
     * Create a new team for a user
     *
     * @param team the team to create
     * @param userId the ID of the user creating the team
     * @return the created team
     * @throws IllegalArgumentException if user not found
     */
    public Team createTeam(Team team, Long userId) {
        log.info("Creating new team '{}' for user ID: {}", team.getName(), userId);

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found with ID: " + userId));

        team.setUser(user);

        Team savedTeam = teamRepository.save(team);
        log.info("Team created successfully with ID: {}", savedTeam.getId());

        return savedTeam;
    }

    /**
     * Get a team by ID
     *
     * @param id the team ID
     * @return Optional containing the team if found
     */
    @Transactional(readOnly = true)
    public Optional<Team> getTeamById(Long id) {
        log.debug("Fetching team by ID: {}", id);
        return teamRepository.findById(id);
    }

    /**
     * Get a team by ID, ensuring it belongs to the specified user
     *
     * @param id the team ID
     * @param userId the user ID
     * @return Optional containing the team if found and owned by user
     */
    @Transactional(readOnly = true)
    public Optional<Team> getTeamByIdAndUserId(Long id, Long userId) {
        log.debug("Fetching team by ID: {} for user: {}", id, userId);
        return teamRepository.findByIdAndUserId(id, userId);
    }

    /**
     * Get all teams for a specific user
     *
     * @param userId the user ID
     * @return list of teams
     */
    @Transactional(readOnly = true)
    public List<Team> getTeamsByUserId(Long userId) {
        log.debug("Fetching all teams for user ID: {}", userId);
        return teamRepository.findByUserId(userId);
    }

    /**
     * Get teams by user and regulation
     *
     * @param userId the user ID
     * @param regulation the regulation (e.g., "Reg G")
     * @return list of teams
     */
    @Transactional(readOnly = true)
    public List<Team> getTeamsByUserIdAndRegulation(Long userId, String regulation) {
        log.debug("Fetching teams for user ID: {} with regulation: {}", userId, regulation);
        return teamRepository.findByUserIdAndRegulation(userId, regulation);
    }

    /**
     * Get all teams for a user with their replays loaded
     *
     * @param userId the user ID
     * @return list of teams with replays
     */
    @Transactional(readOnly = true)
    public List<Team> getTeamsWithReplays(Long userId) {
        log.debug("Fetching teams with replays for user ID: {}", userId);
        return teamRepository.findByUserIdWithReplays(userId);
    }

    /**
     * Update a team
     *
     * @param id the team ID
     * @param userId the user ID (for ownership verification)
     * @param updates the team with updated fields
     * @return the updated team
     * @throws IllegalArgumentException if team not found or not owned by user
     */
    public Team updateTeam(Long id, Long userId, Team updates) {
        log.info("Updating team ID: {} for user ID: {}", id, userId);

        Team existingTeam = teamRepository.findByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Team not found with ID: " + id + " for user: " + userId));

        // Update fields if provided
        if (updates.getName() != null && !updates.getName().isEmpty()) {
            existingTeam.setName(updates.getName());
        }

        if (updates.getPokepaste() != null && !updates.getPokepaste().isEmpty()) {
            existingTeam.setPokepaste(updates.getPokepaste());
        }

        if (updates.getRegulation() != null) {
            existingTeam.setRegulation(updates.getRegulation());
        }

        // Update showdown usernames if provided
        if (updates.getShowdownUsernames() != null) {
            existingTeam.setShowdownUsernames(updates.getShowdownUsernames());
        }

        Team savedTeam = teamRepository.save(existingTeam);

        // Reprocess replays if usernames were updated
        if (updates.getShowdownUsernames() != null) {
            replayService.reprocessReplaysForTeam(savedTeam.getId(), savedTeam.getShowdownUsernames());
        }

        log.info("Team updated successfully: {}", savedTeam.getId());

        return savedTeam;
    }

    /**
     * Add a showdown username to a team
     *
     * @param teamId the team ID
     * @param userId the user ID (for ownership verification)
     * @param username the showdown username to add
     * @return the updated team
     */
    public Team addShowdownUsername(Long teamId, Long userId, String username) {
        log.info("Adding showdown username '{}' to team ID: {}", username, teamId);

        Team team = teamRepository.findByIdAndUserId(teamId, userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Team not found with ID: " + teamId + " for user: " + userId));

        team.addShowdownUsername(username);
        Team savedTeam = teamRepository.save(team);
        replayService.reprocessReplaysForTeam(savedTeam.getId(), savedTeam.getShowdownUsernames());
        return savedTeam;
    }

    /**
     * Remove a showdown username from a team
     *
     * @param teamId the team ID
     * @param userId the user ID (for ownership verification)
     * @param username the showdown username to remove
     * @return the updated team
     */
    public Team removeShowdownUsername(Long teamId, Long userId, String username) {
        log.info("Removing showdown username '{}' from team ID: {}", username, teamId);

        Team team = teamRepository.findByIdAndUserId(teamId, userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Team not found with ID: " + teamId + " for user: " + userId));

        team.removeShowdownUsername(username);
        Team savedTeam = teamRepository.save(team);
        replayService.reprocessReplaysForTeam(savedTeam.getId(), savedTeam.getShowdownUsernames());
        return savedTeam;
    }

    /**
     * Delete a team (cascades to replays and matches)
     *
     * @param id the team ID
     * @param userId the user ID (for ownership verification)
     * @throws IllegalArgumentException if team not found or not owned by user
     */
    public void deleteTeam(Long id, Long userId) {
        log.info("Deleting team ID: {} for user ID: {}", id, userId);

        if (!teamRepository.existsByIdAndUserId(id, userId)) {
            throw new IllegalArgumentException(
                    "Team not found with ID: " + id + " for user: " + userId);
        }

        teamRepository.deleteById(id);
        log.info("Team deleted successfully: {}", id);
    }

    /**
     * Get team statistics (win rate, total games, etc.)
     *
     * @param teamId the team ID
     * @return TeamStats object with calculated statistics
     */
    @Transactional(readOnly = true)
    public TeamStats getTeamStats(Long teamId) {
        log.debug("Calculating statistics for team ID: {}", teamId);

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found with ID: " + teamId));

        // Force load replays
        List<Replay> replays = team.getReplays();

        int totalGames = replays.size();
        long wins = replays.stream()
                .filter(Replay::isWin)
                .count();
        long losses = replays.stream()
                .filter(Replay::isLoss)
                .count();

        double winRate = totalGames > 0 ? (double) wins / totalGames * 100 : 0.0;

        return new TeamStats(teamId, totalGames, (int) wins, (int) losses, winRate);
    }

    /**
     * Count teams for a user
     *
     * @param userId the user ID
     * @return number of teams
     */
    @Transactional(readOnly = true)
    public long countTeamsByUserId(Long userId) {
        return teamRepository.countByUserId(userId);
    }

    /**
     * Inner class to hold team statistics
     */
    public record TeamStats(
            Long teamId,
            int totalGames,
            int wins,
            int losses,
            double winRate
    ) {}
}