package com.yeskatronics.vs_recorder_backend.repositories;

import com.yeskatronics.vs_recorder_backend.entities.TeamExport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Repository for TeamExport entity operations.
 */
@Repository
public interface TeamExportRepository extends JpaRepository<TeamExport, Long> {

    /**
     * Find export by share code
     */
    Optional<TeamExport> findByCode(String code);

    /**
     * Check if a code already exists
     */
    boolean existsByCode(String code);

    /**
     * Count exports created by a user since a given time (for rate limiting)
     */
    @Query("SELECT COUNT(e) FROM TeamExport e WHERE e.userId = :userId AND e.createdAt > :since")
    int countByUserIdAndCreatedAtAfter(@Param("userId") Long userId, @Param("since") LocalDateTime since);

    /**
     * Find existing export with same checksum for a team (to avoid duplicates)
     */
    Optional<TeamExport> findByTeamIdAndDataChecksum(Long teamId, String dataChecksum);

    /**
     * Find all exports for a team
     */
    List<TeamExport> findByTeamIdOrderByCreatedAtDesc(Long teamId);

    /**
     * Find all exports by a user
     */
    List<TeamExport> findByUserIdOrderByCreatedAtDesc(Long userId);

    /**
     * Delete expired exports
     */
    @Modifying
    @Query("DELETE FROM TeamExport e WHERE e.expiresAt IS NOT NULL AND e.expiresAt < :now")
    int deleteExpiredExports(@Param("now") LocalDateTime now);

    /**
     * Find exports expiring soon (for cleanup notifications if needed)
     */
    @Query("SELECT e FROM TeamExport e WHERE e.expiresAt IS NOT NULL AND e.expiresAt BETWEEN :now AND :soon")
    List<TeamExport> findExpiringExports(@Param("now") LocalDateTime now, @Param("soon") LocalDateTime soon);
}
