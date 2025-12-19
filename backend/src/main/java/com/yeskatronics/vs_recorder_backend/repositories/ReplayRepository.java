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
 * Provides database access methods for replay operations.
 */
@Repository
public interface ReplayRepository extends JpaRepository<Replay, Long> {

    /**
     * Find all replays for a team
     */
    List<Replay> findByTeamId(Long teamId);

    /**
     * Find all replays for a team, ordered by date descending (newest first)
     */
    List<Replay> findByTeamIdOrderByDateDesc(Long teamId);

    /**
     * Find all replays for a match
     */
    List<Replay> findByMatchId(Long matchId);

    /**
     * Find a replay by URL
     */
    Optional<Replay> findByUrl(String url);

    /**
     * Check if a replay URL exists
     */
    boolean existsByUrl(String url);

    /**
     * Find replays by team and result
     */
    List<Replay> findByTeamIdAndResult(Long teamId, String result);

    /**
     * Find replays by team and opponent
     */
    List<Replay> findByTeamIdAndOpponent(Long teamId, String opponent);

    /**
     * Find standalone replays (not part of any match)
     */
    List<Replay> findByTeamIdAndMatchIsNull(Long teamId);

    /**
     * Find replays with complex filters using JPQL
     *
     * @param teamId required team ID
     * @param matchId optional match ID filter
     * @param opponent optional opponent name filter (case-insensitive)
     * @param result optional result filter
     * @param startDate optional start date filter (inclusive)
     * @param endDate optional end date filter (inclusive)
     * @return filtered list of replays
     */
    @Query("SELECT r FROM Replay r WHERE r.team.id = :teamId " +
            "AND (:matchId IS NULL OR r.match.id = :matchId) " +
            "AND (:opponent IS NULL OR LOWER(r.opponent) LIKE LOWER(CONCAT('%', :opponent, '%'))) " +
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