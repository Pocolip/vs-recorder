package com.yeskatronics.vs_recorder_backend.repositories;

import com.yeskatronics.vs_recorder_backend.entities.Match;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Match entity.
 * Provides methods for querying matches (Bo3 sets).
 */
@Repository
public interface MatchRepository extends JpaRepository<Match, Long> {

    /**
     * Find all matches for a specific team
     * @param teamId the team ID
     * @return list of matches
     */
    List<Match> findByTeamId(Long teamId);

    /**
     * Find a match by ID and team ID (ensures team owns the match)
     * @param id the match ID
     * @param teamId the team ID
     * @return Optional containing the match if found and owned by team
     */
    Optional<Match> findByIdAndTeamId(Long id, Long teamId);

    /**
     * Find matches by team and opponent
     * @param teamId the team ID
     * @param opponent the opponent name
     * @return list of matches
     */
    List<Match> findByTeamIdAndOpponent(Long teamId, String opponent);

    /**
     * Find matches by team ordered by creation date descending
     * @param teamId the team ID
     * @return list of matches
     */
    List<Match> findByTeamIdOrderByCreatedAtDesc(Long teamId);

    /**
     * Count matches for a specific team
     * @param teamId the team ID
     * @return number of matches
     */
    long countByTeamId(Long teamId);

    /**
     * Check if a match exists by ID and team ID
     * @param id the match ID
     * @param teamId the team ID
     * @return true if exists, false otherwise
     */
    boolean existsByIdAndTeamId(Long id, Long teamId);

    /**
     * Find matches with their replays eagerly loaded
     * @param teamId the team ID
     * @return list of matches with replays
     */
    @Query("SELECT DISTINCT m FROM Match m LEFT JOIN FETCH m.replays WHERE m.team.id = :teamId ORDER BY m.createdAt DESC")
    List<Match> findByTeamIdWithReplays(Long teamId);

    /**
     * Find matches containing a specific tag
     * @param teamId the team ID
     * @param tag the tag to search for
     * @return list of matches
     */
    @Query("SELECT m FROM Match m WHERE m.team.id = :teamId AND :tag MEMBER OF m.tags")
    List<Match> findByTeamIdAndTag(Long teamId, String tag);

    /**
     * Count matches per team without loading match rows.
     * @param teamIds the team IDs
     * @return one row per team that has at least one match
     */
    @Query("SELECT m.team.id AS teamId, COUNT(m) AS total FROM Match m " +
            "WHERE m.team.id IN :teamIds GROUP BY m.team.id")
    List<TeamMatchCount> countByTeamIds(@Param("teamIds") Collection<Long> teamIds);

    interface TeamMatchCount {
        Long getTeamId();
        Long getTotal();
    }

    interface ResultCounts {
        Long getMatchId();
        String getOpponent();
        int getReplayCount();
        int getWins();
        int getLosses();
    }

    String RESULT_COUNTS = "SELECT m.id AS matchId, m.opponent AS opponent, COUNT(r) AS replayCount, " +
            "SUM(CASE WHEN LOWER(r.result) = 'win' THEN 1 ELSE 0 END) AS wins, " +
            "SUM(CASE WHEN LOWER(r.result) = 'loss' THEN 1 ELSE 0 END) AS losses " +
            "FROM Match m LEFT JOIN m.replays r ";

    @Query(RESULT_COUNTS + "WHERE m.team.id = :teamId GROUP BY m.id, m.opponent")
    List<ResultCounts> countResultsByTeamId(Long teamId);

    @Query(RESULT_COUNTS + "WHERE m.id = :matchId GROUP BY m.id, m.opponent")
    Optional<ResultCounts> countResultsByMatchId(Long matchId);
}
