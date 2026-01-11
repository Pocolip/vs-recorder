package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.dto.ShowdownDTO;
import com.yeskatronics.vs_recorder_backend.entities.Match;
import com.yeskatronics.vs_recorder_backend.entities.Replay;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.repositories.MatchRepository;
import com.yeskatronics.vs_recorder_backend.repositories.ReplayRepository;
import com.yeskatronics.vs_recorder_backend.repositories.TeamRepository;
import com.yeskatronics.vs_recorder_backend.utils.ReplayMatcher;
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
    private final ShowdownService showdownService;

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

        // Check for duplicate URL within the same team
        if (replayRepository.existsByUrlAndTeamId(replay.getUrl(), teamId)) {
            throw new IllegalArgumentException("Replay URL already exists in this team: " + replay.getUrl());
        }

        replay.setTeam(team);

        // If battle log is present, detect Bo3 information
        if (replay.getBattleLog() != null && !replay.getBattleLog().isEmpty()) {
            ReplayMatcher.Bo3MatchInfo matchInfo = ReplayMatcher.parseBattleLog(replay.getBattleLog());
            if (matchInfo.isBo3() && replay.getGameNumber() == null) {
                replay.setGameNumber(matchInfo.getGameNumber());
            }
        }

        Replay savedReplay = replayRepository.save(replay);

        // Handle Bo3 match association if applicable
        if (savedReplay.isBo3()) {
            ReplayMatcher.Bo3MatchInfo matchInfo = ReplayMatcher.parseBattleLog(savedReplay.getBattleLog());
            handleBo3Match(savedReplay, matchInfo, team);
        }

        log.info("Replay created successfully with ID: {}", savedReplay.getId());

        return savedReplay;
    }

    /**
     * Create a replay from a URL (fetches and parses battle log, auto-detects Bo3)
     *
     * @param teamId the team ID
     * @param url the Pokemon Showdown replay URL
     * @return the created replay
     * @throws IllegalArgumentException if URL already exists or team not found
     */
    public Replay createReplayFromUrl(Long teamId, String url) {
        log.info("Creating replay from URL for team ID: {}", teamId);

        // Check for duplicate URL within the same team
        if (replayRepository.existsByUrlAndTeamId(url, teamId)) {
            throw new IllegalArgumentException("Replay URL already exists in this team: " + url);
        }

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found with ID: " + teamId));

        // Fetch battle log from Showdown
        ShowdownDTO.ReplayData replayData = showdownService.fetchReplayData(url, team.getShowdownUsernames());

        // Parse Bo3 information from battle log
        ReplayMatcher.Bo3MatchInfo matchInfo = ReplayMatcher.parseBattleLog(replayData.getBattleLog());

        // Create replay
        Replay replay = new Replay();
        replay.setTeam(team);
        replay.setUrl(url);
        replay.setBattleLog(replayData.getBattleLog());
        replay.setOpponent(replayData.getOpponent());
        replay.setResult(replayData.getResult());
        replay.setDate(replayData.getDate() != null ? replayData.getDate() : LocalDateTime.now());

        // Set game number if Bo3
        if (matchInfo.isBo3()) {
            replay.setGameNumber(matchInfo.getGameNumber());
            log.info("Detected Bo3 replay - Game {} of match {}",
                    matchInfo.getGameNumber(), matchInfo.getMatchId());
        }

        // Save replay first
        Replay savedReplay = replayRepository.save(replay);

        // Handle Bo3 match association
        if (matchInfo.isBo3()) {
            handleBo3Match(savedReplay, matchInfo, team);
        }

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

    // ==================== Bo3 Match Handling ====================

    /**
     * Handle Bo3 match association for a newly created replay.
     * - Finds existing siblings in the same Bo3 set
     * - Creates a new Match if none exists
     * - Associates this replay with the Match
     * - Updates sibling replays to point to the same Match
     *
     * @param replay the newly created replay
     * @param matchInfo Bo3 match information from battle log
     * @param team the team this replay belongs to
     */
    private void handleBo3Match(Replay replay, ReplayMatcher.Bo3MatchInfo matchInfo, Team team) {
        String matchId = matchInfo.getMatchId();

        log.debug("Handling Bo3 match for replay ID: {}, matchId: {}", replay.getId(), matchId);

        // Find sibling replays with the same matchId
        List<Replay> siblings = replayRepository.findByTeamId(team.getId()).stream()
                .filter(r -> !r.getId().equals(replay.getId())) // Exclude self
                .filter(r -> r.getBattleLog() != null)
                .filter(r -> {
                    String siblingMatchId = ReplayMatcher.getMatchId(r.getBattleLog());
                    return matchId.equals(siblingMatchId);
                })
                .toList();

        if (siblings.isEmpty()) {
            // First game in this Bo3 set - create new match
            createNewMatch(replay, matchInfo, team);
        } else {
            // Sibling(s) exist - join their match or create if they don't have one
            associateWithExistingMatch(replay, siblings, matchInfo, team);
        }
    }

    /**
     * Create a new Match for the first game in a Bo3 set
     */
    private void createNewMatch(Replay replay, ReplayMatcher.Bo3MatchInfo matchInfo, Team team) {
        Match match = new Match();
        match.setTeam(team);
        match.setOpponent(replay.getOpponent()); // Set opponent from replay data

        Match savedMatch = matchRepository.save(match);

        replay.setMatch(savedMatch);
        replayRepository.save(replay);

        log.info("Created new Match ID: {} for replay ID: {} (Game {}) vs {}",
                savedMatch.getId(), replay.getId(), matchInfo.getGameNumber(), replay.getOpponent());
    }

    /**
     * Associate replay with existing match from siblings
     */
    private void associateWithExistingMatch(Replay replay, List<Replay> siblings,
                                            ReplayMatcher.Bo3MatchInfo matchInfo, Team team) {
        // Check if any sibling already has a match
        Optional<Match> existingMatch = siblings.stream()
                .filter(Replay::isPartOfMatch)
                .map(Replay::getMatch)
                .findFirst();

        if (existingMatch.isPresent()) {
            // Join existing match
            Match match = existingMatch.get();
            replay.setMatch(match);
            replayRepository.save(replay);

            // Associate any siblings that don't have a match yet
            siblings.stream()
                    .filter(r -> !r.isPartOfMatch())
                    .forEach(sibling -> {
                        sibling.setMatch(match);
                        replayRepository.save(sibling);
                        log.info("Associated sibling replay ID: {} with Match ID: {}",
                                sibling.getId(), match.getId());
                    });

            log.info("Associated replay ID: {} with existing Match ID: {} (Game {})",
                    replay.getId(), match.getId(), matchInfo.getGameNumber());
        } else {
            // Siblings exist but no match created yet - create one and associate all
            Match match = new Match();
            match.setTeam(team);
            match.setOpponent(replay.getOpponent()); // Set opponent from replay data
            Match savedMatch = matchRepository.save(match);

            // Associate this replay
            replay.setMatch(savedMatch);
            replayRepository.save(replay);

            // Associate all siblings
            siblings.forEach(sibling -> {
                sibling.setMatch(savedMatch);
                replayRepository.save(sibling);
                log.info("Associated sibling replay ID: {} with new Match ID: {}",
                        sibling.getId(), savedMatch.getId());
            });

            log.info("Created Match ID: {} and associated {} replays (Game {}) vs {}",
                    savedMatch.getId(), siblings.size() + 1, matchInfo.getGameNumber(), replay.getOpponent());
        }
    }
}