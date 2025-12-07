package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.entities.Match;
import com.yeskatronics.vs_recorder_backend.entities.Replay;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.repositories.MatchRepository;
import com.yeskatronics.vs_recorder_backend.repositories.TeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * Service class for Match entity business logic.
 * Handles Best-of-3 match set creation, management, and statistics.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class MatchService {

    private final MatchRepository matchRepository;
    private final TeamRepository teamRepository;

    /**
     * Create a new match
     *
     * @param match the match to create
     * @param teamId the ID of the team this match belongs to
     * @return the created match
     * @throws IllegalArgumentException if team not found
     */
    public Match createMatch(Match match, Long teamId) {
        log.info("Creating new match for team ID: {}", teamId);

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found with ID: " + teamId));

        match.setTeam(team);

        Match savedMatch = matchRepository.save(match);
        log.info("Match created successfully with ID: {}", savedMatch.getId());

        return savedMatch;
    }

    /**
     * Get a match by ID
     *
     * @param id the match ID
     * @return Optional containing the match if found
     */
    @Transactional(readOnly = true)
    public Optional<Match> getMatchById(Long id) {
        log.debug("Fetching match by ID: {}", id);
        return matchRepository.findById(id);
    }

    /**
     * Get a match by ID, ensuring it belongs to the specified team
     *
     * @param id the match ID
     * @param teamId the team ID
     * @return Optional containing the match if found and owned by team
     */
    @Transactional(readOnly = true)
    public Optional<Match> getMatchByIdAndTeamId(Long id, Long teamId) {
        log.debug("Fetching match by ID: {} for team: {}", id, teamId);
        return matchRepository.findByIdAndTeamId(id, teamId);
    }

    /**
     * Get all matches for a team
     *
     * @param teamId the team ID
     * @return list of matches
     */
    @Transactional(readOnly = true)
    public List<Match> getMatchesByTeamId(Long teamId) {
        log.debug("Fetching matches for team ID: {}", teamId);
        return matchRepository.findByTeamId(teamId);
    }

    /**
     * Get all matches for a team, ordered by creation date descending
     *
     * @param teamId the team ID
     * @return list of matches
     */
    @Transactional(readOnly = true)
    public List<Match> getMatchesByTeamIdOrderedByDate(Long teamId) {
        log.debug("Fetching matches for team ID: {} ordered by date", teamId);
        return matchRepository.findByTeamIdOrderByCreatedAtDesc(teamId);
    }

    /**
     * Get all matches for a team with replays loaded
     *
     * @param teamId the team ID
     * @return list of matches with replays
     */
    @Transactional(readOnly = true)
    public List<Match> getMatchesWithReplays(Long teamId) {
        log.debug("Fetching matches with replays for team ID: {}", teamId);
        return matchRepository.findByTeamIdWithReplays(teamId);
    }

    /**
     * Get matches by team and opponent
     *
     * @param teamId the team ID
     * @param opponent the opponent name
     * @return list of matches
     */
    @Transactional(readOnly = true)
    public List<Match> getMatchesByTeamIdAndOpponent(Long teamId, String opponent) {
        log.debug("Fetching matches for team ID: {} against opponent: {}", teamId, opponent);
        return matchRepository.findByTeamIdAndOpponent(teamId, opponent);
    }

    /**
     * Get matches by team and tag
     *
     * @param teamId the team ID
     * @param tag the tag to search for
     * @return list of matches
     */
    @Transactional(readOnly = true)
    public List<Match> getMatchesByTeamIdAndTag(Long teamId, String tag) {
        log.debug("Fetching matches for team ID: {} with tag: {}", teamId, tag);
        return matchRepository.findByTeamIdAndTag(teamId, tag);
    }

    /**
     * Update a match
     *
     * @param id the match ID
     * @param teamId the team ID (for ownership verification)
     * @param updates the match with updated fields
     * @return the updated match
     * @throws IllegalArgumentException if match not found or not owned by team
     */
    public Match updateMatch(Long id, Long teamId, Match updates) {
        log.info("Updating match ID: {} for team ID: {}", id, teamId);

        Match existingMatch = matchRepository.findByIdAndTeamId(id, teamId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Match not found with ID: " + id + " for team: " + teamId));

        // Update fields if provided
        if (updates.getOpponent() != null) {
            existingMatch.setOpponent(updates.getOpponent());
        }

        if (updates.getNotes() != null) {
            existingMatch.setNotes(updates.getNotes());
        }

        if (updates.getTags() != null) {
            existingMatch.setTags(updates.getTags());
        }

        Match savedMatch = matchRepository.save(existingMatch);
        log.info("Match updated successfully: {}", savedMatch.getId());

        return savedMatch;
    }

    /**
     * Add a tag to a match
     *
     * @param matchId the match ID
     * @param teamId the team ID (for ownership verification)
     * @param tag the tag to add
     * @return the updated match
     */
    public Match addTag(Long matchId, Long teamId, String tag) {
        log.info("Adding tag '{}' to match ID: {}", tag, matchId);

        Match match = matchRepository.findByIdAndTeamId(matchId, teamId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Match not found with ID: " + matchId + " for team: " + teamId));

        match.addTag(tag);
        return matchRepository.save(match);
    }

    /**
     * Remove a tag from a match
     *
     * @param matchId the match ID
     * @param teamId the team ID (for ownership verification)
     * @param tag the tag to remove
     * @return the updated match
     */
    public Match removeTag(Long matchId, Long teamId, String tag) {
        log.info("Removing tag '{}' from match ID: {}", tag, matchId);

        Match match = matchRepository.findByIdAndTeamId(matchId, teamId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Match not found with ID: " + matchId + " for team: " + teamId));

        match.removeTag(tag);
        return matchRepository.save(match);
    }

    /**
     * Delete a match (replays are NOT deleted, just dissociated)
     *
     * @param id the match ID
     * @param teamId the team ID (for ownership verification)
     * @throws IllegalArgumentException if match not found or not owned by team
     */
    public void deleteMatch(Long id, Long teamId) {
        log.info("Deleting match ID: {} for team ID: {}", id, teamId);

        if (!matchRepository.existsByIdAndTeamId(id, teamId)) {
            throw new IllegalArgumentException(
                    "Match not found with ID: " + id + " for team: " + teamId);
        }

        matchRepository.deleteById(id);
        log.info("Match deleted successfully: {}", id);
    }

    /**
     * Count matches for a team
     *
     * @param teamId the team ID
     * @return number of matches
     */
    @Transactional(readOnly = true)
    public long countMatchesByTeamId(Long teamId) {
        return matchRepository.countByTeamId(teamId);
    }

    /**
     * Get match statistics including wins, losses, and completion status
     *
     * @param matchId the match ID
     * @return MatchStats object with calculated statistics
     */
    @Transactional(readOnly = true)
    public MatchStats getMatchStats(Long matchId) {
        log.debug("Calculating statistics for match ID: {}", matchId);

        Match match = matchRepository.findById(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Match not found with ID: " + matchId));

        // Force load replays
        List<Replay> replays = match.getReplays();

        int replayCount = replays.size();
        long wins = replays.stream().filter(Replay::isWin).count();
        long losses = replays.stream().filter(Replay::isLoss).count();

        boolean isComplete = match.isComplete();
        String matchResult = match.getMatchResult();

        return new MatchStats(
                matchId,
                match.getOpponent(),
                replayCount,
                (int) wins,
                (int) losses,
                isComplete,
                matchResult
        );
    }

    /**
     * Get overall match statistics for a team
     *
     * @param teamId the team ID
     * @return TeamMatchStats with aggregated match statistics
     */
    @Transactional(readOnly = true)
    public TeamMatchStats getTeamMatchStats(Long teamId) {
        log.debug("Calculating match statistics for team ID: {}", teamId);

        List<Match> matches = matchRepository.findByTeamIdWithReplays(teamId);

        int totalMatches = matches.size();
        long completeMatches = matches.stream().filter(Match::isComplete).count();
        long incompleteMatches = totalMatches - completeMatches;

        long matchWins = matches.stream()
                .filter(Match::isComplete)
                .filter(m -> "win".equals(m.getMatchResult()))
                .count();

        long matchLosses = matches.stream()
                .filter(Match::isComplete)
                .filter(m -> "loss".equals(m.getMatchResult()))
                .count();

        double matchWinRate = completeMatches > 0 ?
                (double) matchWins / completeMatches * 100 : 0.0;

        return new TeamMatchStats(
                teamId,
                totalMatches,
                (int) completeMatches,
                (int) incompleteMatches,
                (int) matchWins,
                (int) matchLosses,
                matchWinRate
        );
    }

    /**
     * Inner class to hold match statistics
     */
    public record MatchStats(
            Long matchId,
            String opponent,
            int replayCount,
            int wins,
            int losses,
            boolean complete,
            String matchResult
    ) {}

    /**
     * Inner class to hold team-wide match statistics
     */
    public record TeamMatchStats(
            Long teamId,
            int totalMatches,
            int completeMatches,
            int incompleteMatches,
            int matchWins,
            int matchLosses,
            double matchWinRate
    ) {}
}