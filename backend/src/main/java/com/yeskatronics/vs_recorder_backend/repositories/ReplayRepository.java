package com.yeskatronics.vs_recorder_backend.repositories;

import com.yeskatronics.vs_recorder_backend.entities.Replay;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository interface for Replay entity.
 * Provides methods for querying replays with various filters.
 */
@Repository
public interface ReplayRepository extends JpaRepository<Replay, Long> {

    /**
     * Find all replays for a specific team
     * @param teamId the team ID
     * @return list of replays
     */
    List<Replay> findByTeamId(Long teamId);

    /**
     * Find all replays for a specific match
     * @param matchId the match ID
     * @return list of replays
     */
    List<Replay> findByMatchId(Long matchId);

    /**
     * Find replay by URL
     * @param url the replay URL
     * @return Optional containing the replay if found
     */
    Optional<Replay> findByUrl(String url);

    /**
     * Check if a replay URL already exists
     * @param url the replay URL
     * @return true if exists, false otherwise
     */
    boolean existsByUrl(String url);

    /**
     * Find replays by team and result (win/loss)
     * @param teamId the team ID
     * @param result the result ("win" or "loss")
     * @return list of replays
     */
    List<Replay> findByTeamIdAndResult(Long teamId, String result);

    /**
     * Find replays by team and opponent
     * @param teamId the team ID
     * @param opponent the opponent name
     * @return list of replays
     */
    List<Replay> findByTeamIdAndOpponent(Long teamId, String opponent);

    /**
     * Find replays by team within a date range
     * @param teamId the team ID
     * @param startDate the start date
     * @param endDate the end date
     * @return list of replays
     */
    List<Replay> findByTeamIdAndDateBetween(Long teamId, LocalDateTime startDate, LocalDateTime endDate);

    /**
     * Find replays by team ordered by date descending (most recent first)
     * @param teamId the team ID
     * @return list of replays
     */
    List<Replay> findByTeamIdOrderByDateDesc(Long teamId);

    /**
     * Count replays for a specific team
     * @param teamId the team ID
     * @return number of replays
     */
    long countByTeamId(Long teamId);

    /**
     * Count wins for a specific team
     * @param teamId the team ID
     * @param result the result ("win")
     * @return number of wins
     */
    long countByTeamIdAndResult(Long teamId, String result);

    /**
     * Find replays that are not part of any match
     * @param teamId the team ID
     * @return list of standalone replays
     */
    List<Replay> findByTeamIdAndMatchIsNull(Long teamId);

    /**
     * Custom query to find replays with filters
     * @param teamId the team ID
     * @param matchId optional match ID filter
     * @param opponent optional opponent name filter
     * @param result optional result filter
     * @param startDate optional start date filter
     * @param endDate optional end date filter
     * @return list of replays matching criteria
     */
    @Query("SELECT r FROM Replay r WHERE r.team.id = :teamId " +
            "AND (:matchId IS NULL OR r.match.id = :matchId) " +
            "AND (:opponent IS NULL OR r.opponent = :opponent) " +
            "AND (:result IS NULL OR r.result = :result) " +
            "AND (:startDate IS NULL OR r.date >= :startDate) " +
            "AND (:endDate IS NULL OR r.date <= :endDate) " +
            "ORDER BY r.date DESC")
    List<Replay> findWithFilters(
            @Param("teamId") Long teamId,
            @Param("matchId") Long matchId,
            @Param("opponent") String opponent,
            @Param("result") String result,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate
    );
}