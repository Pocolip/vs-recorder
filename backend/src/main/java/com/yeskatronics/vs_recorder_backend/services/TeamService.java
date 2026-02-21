package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.dto.PokepasteDTO;
import com.yeskatronics.vs_recorder_backend.entities.Folder;
import com.yeskatronics.vs_recorder_backend.entities.Replay;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.entities.TeamMember;
import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.repositories.FolderRepository;
import com.yeskatronics.vs_recorder_backend.repositories.TeamMemberRepository;
import com.yeskatronics.vs_recorder_backend.repositories.TeamRepository;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

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
    private final TeamMemberRepository teamMemberRepository;
    private final FolderRepository folderRepository;
    private final UserRepository userRepository;
    private final ReplayService replayService;
    private final PokepasteService pokepasteService;
    private final EntityManager entityManager;

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

        // Auto-create team members from pokepaste (best-effort)
        if (savedTeam.getPokepaste() != null && !savedTeam.getPokepaste().isEmpty()) {
            createTeamMembersFromPokepaste(savedTeam);
        }

        return savedTeam;
    }

    /**
     * Parse the team's pokepaste and create TeamMember entities (slots 1-6).
     * Best-effort: if parsing fails, the team is still usable — members can be
     * created later when the user visits the Pokemon Notes page.
     */
    private void createTeamMembersFromPokepaste(Team team) {
        try {
            PokepasteDTO.PasteData pasteData = pokepasteService.fetchPasteData(team.getPokepaste());
            List<String> speciesNames = pokepasteService.extractSpeciesNames(pasteData);

            for (int i = 0; i < speciesNames.size() && i < 6; i++) {
                TeamMember member = new TeamMember();
                member.setTeam(team);
                member.setPokemonName(speciesNames.get(i));
                member.setSlot(i + 1);
                member.setNotes("");
                teamMemberRepository.save(member);
            }

            log.info("Auto-created {} team members for team ID: {}", speciesNames.size(), team.getId());
        } catch (Exception e) {
            log.warn("Failed to auto-create team members from pokepaste for team ID: {} - {}",
                    team.getId(), e.getMessage());
        }
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
     * Sync team members from the team's pokepaste URL.
     * Performs a smart merge: keeps existing members that match, adds new ones, removes stale ones.
     *
     * @param teamId the team ID
     * @param userId the user ID (for ownership verification)
     * @return SyncResult with the updated member list and change details
     */
    public SyncResult syncTeamMembersFromPokepaste(Long teamId, Long userId) {
        log.info("Syncing team members from pokepaste for team ID: {} user ID: {}", teamId, userId);

        Team team = teamRepository.findByIdAndUserId(teamId, userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Team not found with ID: " + teamId + " for user: " + userId));

        if (team.getPokepaste() == null || team.getPokepaste().isEmpty()) {
            throw new IllegalArgumentException("Team has no pokepaste URL");
        }

        // Parse pokepaste
        PokepasteDTO.PasteData pasteData = pokepasteService.fetchPasteData(team.getPokepaste());
        List<String> newNames = pokepasteService.extractSpeciesNames(pasteData);

        // Get existing members
        List<TeamMember> existingMembers = teamMemberRepository.findByTeamIdOrderBySlotAsc(teamId);

        // Build a map of lowercase name -> existing member for matching
        Map<String, TeamMember> existingByName = new LinkedHashMap<>();
        for (TeamMember member : existingMembers) {
            existingByName.put(member.getPokemonName().toLowerCase(), member);
        }

        List<String> kept = new ArrayList<>();
        List<String> added = new ArrayList<>();
        List<String> removed = new ArrayList<>();

        // Track which existing members are matched
        Set<String> matchedKeys = new HashSet<>();
        // Map new slot -> kept member
        Map<Integer, TeamMember> keptBySlot = new LinkedHashMap<>();

        for (int i = 0; i < newNames.size() && i < 6; i++) {
            String newName = newNames.get(i);
            String key = newName.toLowerCase();

            if (existingByName.containsKey(key) && !matchedKeys.contains(key)) {
                TeamMember member = existingByName.get(key);
                matchedKeys.add(key);
                kept.add(newName);
                keptBySlot.put(i + 1, member);
            } else {
                added.add(newName);
            }
        }

        // 1. Delete removed members first to free up slots
        for (Map.Entry<String, TeamMember> entry : existingByName.entrySet()) {
            if (!matchedKeys.contains(entry.getKey())) {
                removed.add(entry.getValue().getPokemonName());
                teamMemberRepository.delete(entry.getValue());
            }
        }
        entityManager.flush();

        // 2. Move kept members to temporary slots (slot + 100) to avoid unique constraint conflicts
        for (Map.Entry<Integer, TeamMember> entry : keptBySlot.entrySet()) {
            entry.getValue().setSlot(entry.getKey() + 100);
            teamMemberRepository.save(entry.getValue());
        }
        entityManager.flush();

        // 3. Assign final slots to kept members and create new members
        List<TeamMember> resultMembers = new ArrayList<>();
        for (int i = 0; i < newNames.size() && i < 6; i++) {
            String newName = newNames.get(i);
            int slot = i + 1;

            if (keptBySlot.containsKey(slot)) {
                TeamMember member = keptBySlot.get(slot);
                member.setSlot(slot);
                member.setPokemonName(newName); // normalize casing
                resultMembers.add(teamMemberRepository.save(member));
            } else {
                TeamMember member = new TeamMember();
                member.setTeam(team);
                member.setPokemonName(newName);
                member.setSlot(slot);
                member.setNotes("");
                resultMembers.add(teamMemberRepository.save(member));
            }
        }

        log.info("Sync complete for team {}: kept={}, added={}, removed={}", teamId, kept, added, removed);
        return new SyncResult(resultMembers, kept, added, removed);
    }

    /**
     * Add a team to a folder
     */
    public Team addTeamToFolder(Long teamId, Long folderId, Long userId) {
        log.info("Adding team {} to folder {} for user {}", teamId, folderId, userId);

        Team team = teamRepository.findByIdAndUserId(teamId, userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Team not found with ID: " + teamId + " for user: " + userId));

        Folder folder = folderRepository.findByIdAndUserId(folderId, userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Folder not found with ID: " + folderId + " for user: " + userId));

        team.addFolder(folder);
        return teamRepository.save(team);
    }

    /**
     * Remove a team from a folder
     */
    public Team removeTeamFromFolder(Long teamId, Long folderId, Long userId) {
        log.info("Removing team {} from folder {} for user {}", teamId, folderId, userId);

        Team team = teamRepository.findByIdAndUserId(teamId, userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Team not found with ID: " + teamId + " for user: " + userId));

        Folder folder = folderRepository.findByIdAndUserId(folderId, userId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Folder not found with ID: " + folderId + " for user: " + userId));

        team.removeFolder(folder);
        return teamRepository.save(team);
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

    public record SyncResult(
            List<TeamMember> members,
            List<String> kept,
            List<String> added,
            List<String> removed
    ) {}
}