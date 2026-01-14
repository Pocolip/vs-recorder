package com.yeskatronics.vs_recorder_backend.repositories;

import com.yeskatronics.vs_recorder_backend.entities.PasswordResetToken;
import com.yeskatronics.vs_recorder_backend.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

/**
 * Repository interface for PasswordResetToken entity.
 */
@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    /**
     * Find a valid (non-expired, non-used) token by its hash.
     */
    @Query("SELECT t FROM PasswordResetToken t WHERE t.tokenHash = :tokenHash " +
           "AND t.used = false AND t.expiresAt > :now")
    Optional<PasswordResetToken> findValidTokenByHash(
        @Param("tokenHash") String tokenHash,
        @Param("now") LocalDateTime now
    );

    /**
     * Count recent token requests for a user (rate limiting).
     */
    @Query("SELECT COUNT(t) FROM PasswordResetToken t WHERE t.user = :user " +
           "AND t.createdAt > :since")
    long countRecentTokensByUser(@Param("user") User user, @Param("since") LocalDateTime since);

    /**
     * Count recent token requests from an IP (rate limiting).
     */
    @Query("SELECT COUNT(t) FROM PasswordResetToken t WHERE t.requestIp = :ip " +
           "AND t.createdAt > :since")
    long countRecentTokensByIp(@Param("ip") String ip, @Param("since") LocalDateTime since);

    /**
     * Invalidate all existing tokens for a user (when new password is set).
     */
    @Modifying
    @Query("UPDATE PasswordResetToken t SET t.used = true, t.usedAt = :now " +
           "WHERE t.user = :user AND t.used = false")
    void invalidateAllTokensForUser(@Param("user") User user, @Param("now") LocalDateTime now);

    /**
     * Delete expired tokens (cleanup job).
     */
    @Modifying
    @Query("DELETE FROM PasswordResetToken t WHERE t.expiresAt < :cutoff")
    int deleteExpiredTokens(@Param("cutoff") LocalDateTime cutoff);
}
