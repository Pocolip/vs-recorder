package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.entities.PasswordResetToken;
import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.exceptions.InvalidTokenException;
import com.yeskatronics.vs_recorder_backend.exceptions.RateLimitExceededException;
import com.yeskatronics.vs_recorder_backend.repositories.PasswordResetTokenRepository;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;

/**
 * Service class for password reset functionality.
 * Handles token generation, validation, and password reset operations.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PasswordResetService {

    private final PasswordResetTokenRepository tokenRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final EmailService emailService;

    private static final int TOKEN_EXPIRATION_HOURS = 1;
    private static final int MAX_REQUESTS_PER_USER_PER_HOUR = 3;
    private static final int MAX_REQUESTS_PER_IP_PER_HOUR = 10;
    private static final int TOKEN_LENGTH_BYTES = 32;

    @Value("${app.frontend-url:https://vsrecorder.app}")
    private String frontendUrl;

    /**
     * Initiate password reset process.
     * Generates token, stores hash, sends email with plain token.
     *
     * @param email    the email address to send reset link to
     * @param clientIp the client's IP address for rate limiting
     * @throws RateLimitExceededException if rate limit exceeded
     */
    public void initiatePasswordReset(String email, String clientIp) {
        // Rate limiting check by IP first
        LocalDateTime oneHourAgo = LocalDateTime.now().minusHours(1);
        long ipRequestCount = tokenRepository.countRecentTokensByIp(clientIp, oneHourAgo);
        if (ipRequestCount >= MAX_REQUESTS_PER_IP_PER_HOUR) {
            throw new RateLimitExceededException("Too many password reset requests");
        }

        // Find user by email (silently return if not found - prevents enumeration)
        Optional<User> userOpt = userRepository.findByEmail(email.toLowerCase().trim());
        if (userOpt.isEmpty()) {
            log.info("Password reset requested for non-existent email");
            // Introduce small delay to prevent timing attacks
            try {
                Thread.sleep(100 + new SecureRandom().nextInt(200));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            return;
        }

        User user = userOpt.get();

        // Rate limiting check by user
        long userRequestCount = tokenRepository.countRecentTokensByUser(user, oneHourAgo);
        if (userRequestCount >= MAX_REQUESTS_PER_USER_PER_HOUR) {
            throw new RateLimitExceededException("Too many password reset requests");
        }

        // Generate secure random token
        String plainToken = generateSecureToken();
        String tokenHash = hashToken(plainToken);

        // Create and save token entity
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setUser(user);
        resetToken.setTokenHash(tokenHash);
        resetToken.setExpiresAt(LocalDateTime.now().plusHours(TOKEN_EXPIRATION_HOURS));
        resetToken.setRequestIp(clientIp);
        tokenRepository.save(resetToken);

        // Build reset URL and send email
        String resetUrl = buildResetUrl(plainToken);
        emailService.sendPasswordResetEmail(user.getEmail(), user.getUsername(), resetUrl);

        log.info("Password reset email sent to user ID: {}", user.getId());
    }

    /**
     * Validate a password reset token.
     *
     * @param plainToken the plain token to validate
     * @return true if valid, false otherwise
     */
    @Transactional(readOnly = true)
    public boolean validateToken(String plainToken) {
        String tokenHash = hashToken(plainToken);
        Optional<PasswordResetToken> tokenOpt = tokenRepository.findValidTokenByHash(
            tokenHash, LocalDateTime.now());
        return tokenOpt.isPresent() && tokenOpt.get().isValid();
    }

    /**
     * Reset password using a valid token.
     *
     * @param plainToken  the plain reset token
     * @param newPassword the new password
     * @throws InvalidTokenException if token is invalid or expired
     */
    public void resetPassword(String plainToken, String newPassword) {
        String tokenHash = hashToken(plainToken);

        PasswordResetToken token = tokenRepository.findValidTokenByHash(
                tokenHash, LocalDateTime.now())
            .orElseThrow(() -> new InvalidTokenException("Invalid or expired token"));

        if (!token.isValid()) {
            throw new InvalidTokenException("Token has expired or been used");
        }

        User user = token.getUser();

        // Update password using existing UserService (which handles BCrypt hashing)
        User updates = new User();
        updates.setPasswordHash(newPassword);
        userService.updateUser(user.getId(), updates);

        // Mark token as used
        token.markAsUsed();
        tokenRepository.save(token);

        // Invalidate any other pending tokens for this user
        tokenRepository.invalidateAllTokensForUser(user, LocalDateTime.now());

        log.info("Password reset successful for user ID: {}", user.getId());

        // Send confirmation email
        emailService.sendPasswordChangedConfirmation(user.getEmail(), user.getUsername());
    }

    /**
     * Generate a cryptographically secure random token.
     *
     * @return URL-safe Base64 encoded token
     */
    private String generateSecureToken() {
        SecureRandom secureRandom = new SecureRandom();
        byte[] tokenBytes = new byte[TOKEN_LENGTH_BYTES];
        secureRandom.nextBytes(tokenBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
    }

    /**
     * Hash a token using SHA-256.
     *
     * @param plainToken the plain token
     * @return hex-encoded hash
     */
    private String hashToken(String plainToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(plainToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    /**
     * Build the password reset URL for the frontend.
     *
     * @param token the plain token
     * @return complete reset URL
     */
    private String buildResetUrl(String token) {
        return frontendUrl + "/reset-password?token=" + token;
    }

    /**
     * Scheduled cleanup of expired tokens.
     * Runs daily at 3 AM.
     */
    @Scheduled(cron = "0 0 3 * * *")
    public void cleanupExpiredTokens() {
        LocalDateTime cutoff = LocalDateTime.now().minusDays(7);
        int deleted = tokenRepository.deleteExpiredTokens(cutoff);
        log.info("Cleaned up {} expired password reset tokens", deleted);
    }
}
