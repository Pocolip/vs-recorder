package com.yeskatronics.vs_recorder_backend.repositories;

import com.yeskatronics.vs_recorder_backend.entities.SimulationJob;
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

@Repository
public interface SimulationJobRepository extends JpaRepository<SimulationJob, UUID> {

    /**
     * Load a job with a row lock held until the transaction ends. Polling and
     * cancelling both take it, so a cancel can't land after the job's clean-up.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select j from SimulationJob j where j.id = :id")
    Optional<SimulationJob> findByIdForUpdate(@Param("id") UUID id);

    /** The team's job ids, newest first (page with {@code PageRequest.of(0, 1)} for the latest). */
    @Query("select j.id from SimulationJob j where j.team.id = :teamId order by j.createdAt desc")
    List<UUID> findIdsByTeamNewestFirst(@Param("teamId") Long teamId, Pageable pageable);

    boolean existsByReconcilePendingTrueAndLastChangedAtAfter(Instant since);

    /** The team's latest job, whatever its state. */
    Optional<SimulationJob> findFirstByTeamIdOrderByCreatedAtDesc(Long teamId);

    /** The team's latest job with a result (partial or complete): what the pages show. */
    Optional<SimulationJob> findFirstByTeamIdAndResultIsNotNullOrderByCreatedAtDesc(Long teamId);

    Optional<SimulationJob> findFirstByTeamIdAndStatusOrderByCreatedAtDesc(Long teamId, Status status);

    boolean existsByTeamIdAndStatusIn(Long teamId, Collection<Status> statuses);

    boolean existsByStatusIn(Collection<Status> statuses);

    @Query("select j.id from SimulationJob j where j.status in :statuses")
    List<UUID> findIdsByStatusIn(@Param("statuses") Collection<Status> statuses);

    @Query("select j.id from SimulationJob j where j.cleanupPending = true")
    List<UUID> findIdsByCleanupPendingTrue();

    @Query("select j.id from SimulationJob j where j.reconcilePending = true")
    List<UUID> findIdsByReconcilePendingTrue();

    long countByRequestedByAndCreatedAtAfter(Long requestedBy, Instant since);

    /**
     * Finished jobs of deleted teams created before {@code before}, once Redis is
     * clean. Recent ones stay: the daily cap counts them.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("delete from SimulationJob j where j.team is null and j.cleanupPending = false"
            + " and j.reconcilePending = false and j.status not in :unfinished and j.createdAt < :before")
    int deleteOrphaned(@Param("unfinished") Collection<Status> unfinished, @Param("before") Instant before);
}
