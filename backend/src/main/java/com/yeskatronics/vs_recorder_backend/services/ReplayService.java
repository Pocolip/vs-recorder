package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.dto.ShowdownDTO;
import com.yeskatronics.vs_recorder_backend.entities.Match;
import com.yeskatronics.vs_recorder_backend.entities.Replay;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.repositories.MatchRepository;
import com.yeskatronics.vs_recorder_backend.repositories.ReplayRepository;
import com.yeskatronics.vs_recorder_backend.repositories.TeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Service class for Replay entity business logic.
 * Handles replay creation, management, and battle log processing.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ReplayService {

    private final ReplayRepository replayRepository;
    private final TeamRepository teamRepository;
    private final MatchRepository matchRepository;
    private final ShowdownService showdownService;

    /**
     * Create a new replay with full data
     *
     * @param replay the replay to create
     * @param teamId the ID of the team this replay belongs to
     * @return the created replay
     * @throws IllegalArgumentException if team not found or URL already exists
     */
    public Replay createReplay(Replay replay, Long teamId) {
        log.info("Creating new replay for team ID: {}", teamId);

        // Verify team exists
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found with ID: " + teamId));

        // Check for duplicate URL
        if (replayRepository.existsByUrl(replay.getUrl())) {
            throw new IllegalArgumentException("Replay URL already exists: " + replay.getUrl());
        }

        replay.setTeam(team);

        Replay savedReplay = replayRepository.save(replay);
        log.info("Replay created successfully with ID: {}", savedReplay.getId());

        return savedReplay;
    }

    /**
     * Create a replay from a URL (fetches and parses battle log from Showdown)
     *
     * @param teamId the team ID
     * @param url the Pokemon Showdown replay URL
     * @return the created replay
     * @throws IllegalArgumentException if URL already exists, team not found, or fetch fails
     */
    public Replay createReplayFromUrl(Long teamId, String url) {
        log.info("Creating replay from URL for team ID: {}", teamId);

        // Check for duplicate URL
        if (replayRepository.existsByUrl(url)) {
            throw new IllegalArgumentException("Replay URL already exists: " + url);
        }

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found with ID: " + teamId));

        // Validate URL format
        if (!showdownService.isValidReplayUrl(url)) {
            throw new IllegalArgumentException("Invalid Pokemon Showdown replay URL format");
        }

        try {
            // Fetch and parse replay data from Showdown
            ShowdownDTO.ReplayData replayData = showdownService.fetchReplayData(
                    url,
                    team.getShowdownUsernames()
            );

            // Create replay entity
            Replay replay = new Replay();
            replay.setTeam(team);
            replay.setUrl(url);
            replay.setBattleLog(replayData.getBattleLog());
            replay.setOpponent(replayData.getOpponent());
            replay.setResult(replayData.getResult());
            replay.setDate(replayData.getDate());

            Replay savedReplay = replayRepository.save(replay);
            log.info("Replay created successfully from URL with ID: {}", savedReplay.getId());

            return savedReplay;

        } catch (IllegalArgumentException e) {
            // Re-throw validation errors
            throw e;
        } catch (Exception e) {
            log.error("Failed to create replay from URL: {}", e.getMessage(), e);
            throw new IllegalArgumentException("Failed to fetch replay data: " + e.getMessage());
        }
    }

    /**
     * Get a replay by ID
     *
     * @param id the replay ID
     * @return Optional containing the replay if found
     */
    @Transactional(readOnly = true)
    public Optional<Replay> getReplayById(Long id) {
        log.debug("Fetching replay by ID: {}", id);
        return replayRepository.findById(id);
    }

    /**
     * Get all replays for a team, ordered by date
     *
     * @param teamId the team ID
     * @return list of replays
     */
    @Transactional(readOnly = true)
    public List<Replay> getReplaysByTeamIdOrderedByDate(Long teamId) {
        log.debug("Fetching replays for team ID: {} ordered by date", teamId);
        return replayRepository.findByTeamIdOrderByDateDesc(teamId);
    }

    /**
     * Get all replays for a team
     *
     * @param teamId the team ID
     * @return list of replays
     */
    @Transactional(readOnly = true)
    public List<Replay> getReplaysByTeamId(Long teamId) {
        log.debug("Fetching replays for team ID: {}", teamId);
        return replayRepository.findByTeamId(teamId);
    }

    /**
     * Get standalone replays (not part of any match)
     *
     * @param teamId the team ID
     * @return list of standalone replays
     */
    @Transactional(readOnly = true)
    public List<Replay> getStandaloneReplays(Long teamId) {
        log.debug("Fetching standalone replays for team ID: {}", teamId);
        return replayRepository.findByTeamIdAndMatchIsNull(teamId);
    }

    /**
     * Get replays by match
     *
     * @param matchId the match ID
     * @return list of replays in the match
     */
    @Transactional(readOnly = true)
    public List<Replay> getReplaysByMatchId(Long matchId) {
        log.debug("Fetching replays for match ID: {}", matchId);
        return replayRepository.findByMatchId(matchId);
    }

    /**
     * Get replays by team and result
     *
     * @param teamId the team ID
     * @param result "win" or "loss"
     * @return list of replays
     */
    @Transactional(readOnly = true)
    public List<Replay> getReplaysByTeamIdAndResult(Long teamId, String result) {
        log.debug("Fetching replays for team ID: {} with result: {}", teamId, result);
        return replayRepository.findByTeamIdAndResult(teamId, result);
    }

    /**
     * Get replays by team and opponent
     *
     * @param teamId the team ID
     * @param opponent the opponent name
     * @return list of replays
     */
    @Transactional(readOnly = true)
    public List<Replay> getReplaysByTeamIdAndOpponent(Long teamId, String opponent) {
        log.debug("Fetching replays for team ID: {} against opponent: {}", teamId, opponent);
        return replayRepository.findByTeamIdAndOpponent(teamId, opponent);
    }

    /**
     * Get replays with complex filters
     *
     * @param teamId the team ID
     * @param matchId optional match ID filter
     * @param opponent optional opponent name filter
     * @param result optional result filter
     * @param startDate optional start date filter
     * @param endDate optional end date filter
     * @return filtered list of replays
     */
    @Transactional(readOnly = true)
    public List<Replay> getReplaysWithFilters(Long teamId, Long matchId, String opponent,
                                              String result, LocalDateTime startDate, LocalDateTime endDate) {
        log.debug("Fetching replays with filters for team ID: {}", teamId);
        return replayRepository.findWithFilters(teamId, matchId, opponent, result, startDate, endDate);
    }

    /**
     * Update a replay (battleLog is immutable)
     *
     * @param id the replay ID
     * @param updates the replay with updated fields
     * @return the updated replay
     * @throws IllegalArgumentException if replay not found
     */
    public Replay updateReplay(Long id, Replay updates) {
        log.info("Updating replay with ID: {}", id);

        Replay existingReplay = replayRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Replay not found with ID: " + id));

        // Update mutable fields only
        if (updates.getNotes() != null) {
            existingReplay.setNotes(updates.getNotes());
        }
        if (updates.getOpponent() != null) {
            existingReplay.setOpponent(updates.getOpponent());
        }
        if (updates.getResult() != null) {
            existingReplay.setResult(updates.getResult());
        }
        if (updates.getDate() != null) {
            existingReplay.setDate(updates.getDate());
        }

        // Note: battleLog is immutable and cannot be updated

        Replay savedReplay = replayRepository.save(existingReplay);
        log.info("Replay updated successfully: {}", savedReplay.getId());

        return savedReplay;
    }

    /**
     * Associate a replay with a match
     *
     * @param replayId the replay ID
     * @param matchId the match ID
     * @return the updated replay
     * @throws IllegalArgumentException if replay or match not found, or they belong to different teams
     */
    public Replay associateReplayWithMatch(Long replayId, Long matchId) {
        log.info("Associating replay ID: {} with match ID: {}", replayId, matchId);

        Replay replay = replayRepository.findById(replayId)
                .orElseThrow(() -> new IllegalArgumentException("Replay not found with ID: " + replayId));

        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Match not found with ID: " + matchId));

        // Verify replay and match belong to same team
        if (!replay.getTeam().getId().equals(match.getTeam().getId())) {
            throw new IllegalArgumentException("Replay and match must belong to the same team");
        }

        replay.setMatch(match);

        Replay savedReplay = replayRepository.save(replay);
        log.info("Replay associated with match successfully");

        return savedReplay;
    }

    /**
     * Dissociate a replay from its match
     *
     * @param replayId the replay ID
     * @return the updated replay
     * @throws IllegalArgumentException if replay not found
     */
    public Replay dissociateReplayFromMatch(Long replayId) {
        log.info("Dissociating replay ID: {} from its match", replayId);

        Replay replay = replayRepository.findById(replayId)
                .orElseThrow(() -> new IllegalArgumentException("Replay not found with ID: " + replayId));

        replay.setMatch(null);

        Replay savedReplay = replayRepository.save(replay);
        log.info("Replay dissociated from match successfully");

        return savedReplay;
    }

    /**
     * Delete a replay
     *
     * @param id the replay ID
     * @throws IllegalArgumentException if replay not found
     */
    public void deleteReplay(Long id) {
        log.info("Deleting replay with ID: {}", id);

        if (!replayRepository.existsById(id)) {
            throw new IllegalArgumentException("Replay not found with ID: " + id);
        }

        replayRepository.deleteById(id);
        log.info("Replay deleted successfully: {}", id);
    }

    /**
     * Check if a replay URL exists
     *
     * @param url the replay URL
     * @return true if exists, false otherwise
     */
    @Transactional(readOnly = true)
    public boolean replayUrlExists(String url) {
        return replayRepository.existsByUrl(url);
    }

    /**
     * Calculate win rate for a team
     *
     * @param teamId the team ID
     * @return win rate as percentage (0-100)
     */
    @Transactional(readOnly = true)
    public double calculateWinRate(Long teamId) {
        log.debug("Calculating win rate for team ID: {}", teamId);

        List<Replay> replays = replayRepository.findByTeamId(teamId);

        if (replays.isEmpty()) {
            return 0.0;
        }

        long wins = replays.stream()
                .filter(Replay::isWin)
                .count();

        return (wins * 100.0) / replays.size();
    }
}