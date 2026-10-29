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
        return fromCounts(matchRepository.countResultsByMatchId(matchId)
                .orElseThrow(() -> new IllegalArgumentException("Match not found with ID: " + matchId)));
    }

    private MatchStats fromCounts(MatchRepository.ResultCounts counts) {
        return calculateStats(counts.getMatchId(), counts.getOpponent(), counts.getReplayCount(),
                counts.getWins(), counts.getLosses());
    }

    public static MatchStats calculateStats(Long id, String opponent, int count, int wins, int losses) {
        boolean complete = count >= 2 && count <= 3;
        return new MatchStats(id, opponent, count, wins, losses, complete,
                complete ? (wins >= 2 ? "win" : "loss") : "incomplete");
    }

    /** Reuse replays when the detailed response already needs them. */
    public MatchStats getLoadedMatchStats(Match match) {
        return calculateStats(match.getId(), match.getOpponent(), match.getReplays().size(),
                (int) match.getReplays().stream().filter(Replay::isWin).count(),
                (int) match.getReplays().stream().filter(Replay::isLoss).count());
    }

    @Transactional(readOnly = true)
    public java.util.Map<Long, MatchStats> getMatchStatsByTeamId(Long teamId) {
        return matchRepository.countResultsByTeamId(teamId).stream()
                .map(this::fromCounts)
                .collect(java.util.stream.Collectors.toMap(MatchStats::matchId, stats -> stats));
    }

    @Transactional(readOnly = true)
    public TeamMatchStats getTeamMatchStats(Long teamId) {
        var stats = getMatchStatsByTeamId(teamId).values();
        int complete = (int) stats.stream().filter(MatchStats::complete).count();
        int wins = (int) stats.stream().filter(s -> "win".equals(s.matchResult())).count();
        int losses = (int) stats.stream().filter(s -> "loss".equals(s.matchResult())).count();
        return new TeamMatchStats(teamId, stats.size(), complete, stats.size() - complete,
                wins, losses, complete > 0 ? (double) wins / complete * 100 : 0.0);
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