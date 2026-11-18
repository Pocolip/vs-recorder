package com.yeskatronics.vs_recorder_backend.repositories;

import com.yeskatronics.vs_recorder_backend.entities.SimulationJob;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob.Kind;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob.Status;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Team-level queries take a {@link Kind}: a team has SIMULATE jobs (the analytics) and
 * PLAN jobs (one series per Matchup Planner entry), followed separately. The poller's
 * queries cover both.
 */
@Repository
public interface SimulationJobRepository extends JpaRepository<SimulationJob, UUID> {

    /**
     * Load a job with a row lock held until the transaction ends. Polling and
     * cancelling both take it, so a cancel can't land after the job's clean-up.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select j from SimulationJob j where j.id = :id")
    Optional<SimulationJob> findByIdForUpdate(@Param("id") UUID id);

    /** The team's job ids of a kind, newest first (page with {@code PageRequest.of(0, 1)} for the latest). */
    @Query("select j.id from SimulationJob j where j.team.id = :teamId and j.kind = :kind order by j.createdAt desc")
    List<UUID> findIdsByTeamNewestFirst(@Param("teamId") Long teamId, @Param("kind") Kind kind, Pageable pageable);

    boolean existsByReconcilePendingTrueAndLastChangedAtAfter(Instant since);

    /** The team's latest job of a kind, whatever its state. */
    Optional<SimulationJob> findFirstByTeamIdAndKindOrderByCreatedAtDesc(Long teamId, Kind kind);

    /** The team's latest job of a kind with a result (partial or complete): what the pages show. */
    Optional<SimulationJob> findFirstByTeamIdAndKindAndResultIsNotNullOrderByCreatedAtDesc(Long teamId, Kind kind);

    Optional<SimulationJob> findFirstByTeamIdAndKindAndStatusOrderByCreatedAtDesc(Long teamId, Kind kind, Status status);

    boolean existsByTeamIdAndKindAndStatusIn(Long teamId, Kind kind, Collection<Status> statuses);

    // ==================== Plans (one series of jobs per Matchup Planner entry) ====================

    /** Every plan job of these entries, newest first. Plan results are small. */
    List<SimulationJob> findByGamePlanTeamIdInOrderByCreatedAtDesc(Collection<Long> gamePlanTeamIds);

    /** The entry's job ids, newest first (page with {@code PageRequest.of(0, 1)} for the latest). */
    @Query("select j.id from SimulationJob j where j.gamePlanTeam.id = :entryId order by j.createdAt desc")
    List<UUID> findIdsByGamePlanTeamNewestFirst(@Param("entryId") Long gamePlanTeamId, Pageable pageable);

    boolean existsByGamePlanTeamIdAndStatusIn(Long gamePlanTeamId, Collection<Status> statuses);

    Optional<SimulationJob> findFirstByGamePlanTeamIdAndStatusOrderByCreatedAtDesc(Long gamePlanTeamId, Status status);

    /** The latest complete job that names its model: the model the engine runs now, as far as we know. */
    Optional<SimulationJob> findFirstByStatusAndModelIsNotNullOrderByLastChangedAtDesc(Status status);

    // ==================== The poller ====================

    boolean existsByStatusIn(Collection<Status> statuses);

    @Query("select j.id from SimulationJob j where j.status in :statuses")
    List<UUID> findIdsByStatusIn(@Param("statuses") Collection<Status> statuses);

    @Query("select j.id from SimulationJob j where j.cleanupPending = true")
    List<UUID> findIdsByCleanupPendingTrue();

    @Query("select j.id from SimulationJob j where j.reconcilePending = true")
    List<UUID> findIdsByReconcilePendingTrue();

    /** For the daily caps, which are per kind. */
    long countByRequestedByAndKindAndCreatedAtAfter(Long requestedBy, Kind kind, Instant since);

    /**
     * Finished jobs of deleted teams (or, for plans, deleted entries) created before
     * {@code before}, once Redis is clean. Recent ones stay: the daily caps count them.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from SimulationJob j where (j.team is null or (j.kind = :plan and j.gamePlanTeam is null))"
            + " and j.cleanupPending = false and j.reconcilePending = false"
            + " and j.status not in :unfinished and j.createdAt < :before")
    int deleteOrphaned(@Param("unfinished") Collection<Status> unfinished, @Param("plan") Kind plan,
                       @Param("before") Instant before);
}
