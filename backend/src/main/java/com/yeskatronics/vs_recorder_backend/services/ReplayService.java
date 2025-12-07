package com.yeskatronics.vs_recorder_backend.services;

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
 *
 * Note: Battle log fetching from Pokemon Showdown will be added in a future phase.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ReplayService {

    private final ReplayRepository replayRepository;
    private final TeamRepository teamRepository;
    private final MatchRepository matchRepository;

    /**
     * Create a new replay
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
     * Create a replay from a URL (will fetch and parse battle log)
     *
     * @param teamId the team ID
     * @param url the Pokemon Showdown replay URL
     * @return the created replay
     * @throws IllegalArgumentException if URL already exists or team not found
     */
    public Replay createReplayFromUrl(Long teamId, String url) {
        log.info("Creating replay from URL for team ID: {}", teamId);

        // Check for duplicate URL
        if (replayRepository.existsByUrl(url)) {
            throw new IllegalArgumentException("Replay URL already exists: " + url);
        }

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found with ID: " + teamId));

        // TODO: In future phase, fetch and parse battle log from Showdown
        // For now, create a basic replay with the URL
        Replay replay = new Replay();
        replay.setTeam(team);
        replay.setUrl(url);
        replay.setBattleLog("{}"); // Placeholder - will be replaced with actual data
        replay.setDate(LocalDateTime.now());

        Replay savedReplay = replayRepository.save(replay);
        log.info("Replay created from URL with ID: {}", savedReplay.getId());

        return savedReplay;
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
     * Get a replay by URL
     *
     * @param url the replay URL
     * @return Optional containing the replay if found
     */
    @Transactional(readOnly = true)
    public Optional<Replay> getReplayByUrl(String url) {
        log.debug("Fetching replay by URL: {}", url);
        return replayRepository.findByUrl(url);
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
     * Get all replays for a team, ordered by date descending
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
     * Get all replays for a match
     *
     * @param matchId the match ID
     * @return list of replays
     */
    @Transactional(readOnly = true)
    public List<Replay> getReplaysByMatchId(Long matchId) {
        log.debug("Fetching replays for match ID: {}", matchId);
        return replayRepository.findByMatchId(matchId);
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
     * @param result optional result filter ("win" or "loss")
     * @param startDate optional start date filter
     * @param endDate optional end date filter
     * @return list of filtered replays
     */
    @Transactional(readOnly = true)
    public List<Replay> getReplaysWithFilters(
            Long teamId,
            Long matchId,
            String opponent,
            String result,
            LocalDateTime startDate,
            LocalDateTime endDate) {

        log.debug("Fetching replays with filters - teamId: {}, matchId: {}, opponent: {}, result: {}",
                teamId, matchId, opponent, result);

        return replayRepository.findWithFilters(teamId, matchId, opponent, result, startDate, endDate);
    }

    /**
     * Update a replay
     *
     * @param id the replay ID
     * @param updates the replay with updated fields
     * @return the updated replay
     * @throws IllegalArgumentException if replay not found
     */
    public Replay updateReplay(Long id, Replay updates) {
        log.info("Updating replay ID: {}", id);

        Replay existingReplay = replayRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Replay not found with ID: " + id));

        // Update notes if provided
        if (updates.getNotes() != null) {
            existingReplay.setNotes(updates.getNotes());
        }

        // Update opponent if provided
        if (updates.getOpponent() != null) {
            existingReplay.setOpponent(updates.getOpponent());
        }

        // Update result if provided
        if (updates.getResult() != null) {
            existingReplay.setResult(updates.getResult());
        }

        // Update date if provided
        if (updates.getDate() != null) {
            existingReplay.setDate(updates.getDate());
        }

        // Note: battleLog is immutable and should not be updated

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
     * @throws IllegalArgumentException if replay or match not found
     */
    public Replay associateReplayWithMatch(Long replayId, Long matchId) {
        log.info("Associating replay ID: {} with match ID: {}", replayId, matchId);

        Replay replay = replayRepository.findById(replayId)
                .orElseThrow(() -> new IllegalArgumentException("Replay not found with ID: " + replayId));

        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Match not found with ID: " + matchId));

        // Verify replay and match belong to the same team
        if (!replay.getTeam().getId().equals(match.getTeam().getId())) {
            throw new IllegalArgumentException("Replay and match must belong to the same team");
        }

        replay.setMatch(match);
        return replayRepository.save(replay);
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
        return replayRepository.save(replay);
    }

    /**
     * Delete a replay
     *
     * @param id the replay ID
     * @throws IllegalArgumentException if replay not found
     */
    public void deleteReplay(Long id) {
        log.info("Deleting replay ID: {}", id);

        if (!replayRepository.existsById(id)) {
            throw new IllegalArgumentException("Replay not found with ID: " + id);
        }

        replayRepository.deleteById(id);
        log.info("Replay deleted successfully: {}", id);
    }

    /**
     * Count replays for a team
     *
     * @param teamId the team ID
     * @return number of replays
     */
    @Transactional(readOnly = true)
    public long countReplaysByTeamId(Long teamId) {
        return replayRepository.countByTeamId(teamId);
    }

    /**
     * Count wins for a team
     *
     * @param teamId the team ID
     * @return number of wins
     */
    @Transactional(readOnly = true)
    public long countWinsByTeamId(Long teamId) {
        return replayRepository.countByTeamIdAndResult(teamId, "win");
    }

    /**
     * Count losses for a team
     *
     * @param teamId the team ID
     * @return number of losses
     */
    @Transactional(readOnly = true)
    public long countLossesByTeamId(Long teamId) {
        return replayRepository.countByTeamIdAndResult(teamId, "loss");
    }

    /**
     * Calculate win rate for a team
     *
     * @param teamId the team ID
     * @return win rate as percentage (0-100)
     */
    @Transactional(readOnly = true)
    public double calculateWinRate(Long teamId) {
        long totalGames = countReplaysByTeamId(teamId);
        if (totalGames == 0) {
            return 0.0;
        }

        long wins = countWinsByTeamId(teamId);
        return (double) wins / totalGames * 100;
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
}