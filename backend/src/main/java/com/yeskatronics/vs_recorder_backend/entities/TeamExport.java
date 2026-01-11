package com.yeskatronics.vs_recorder_backend.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/**
 * TeamExport entity representing a shareable team export with a 6-character code.
 * Stores the full export JSON data and allows other users to import the team.
 */
@Entity
@Table(name = "team_exports", indexes = {
    @Index(name = "idx_team_exports_code", columnList = "code", unique = true),
    @Index(name = "idx_team_exports_user_id", columnList = "user_id"),
    @Index(name = "idx_team_exports_team_id", columnList = "team_id")
})
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeamExport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 6-character alphanumeric share code (e.g., "ABC123")
     * Uses A-Z (excluding I,O) and 2-9 to avoid ambiguous characters
     */
    @NotBlank(message = "Export code is required")
    @Size(min = 6, max = 6, message = "Export code must be exactly 6 characters")
    @Pattern(regexp = "^[A-HJ-NP-Z2-9]{6}$", message = "Export code must contain only valid characters")
    @Column(nullable = false, unique = true, length = 6)
    private String code;

    /**
     * User who created this export
     */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /**
     * Source team ID
     */
    @Column(name = "team_id", nullable = false)
    private Long teamId;

    /**
     * Team name (stored for display without needing to parse JSON)
     */
    @Size(max = 100)
    @Column(name = "team_name", length = 100)
    private String teamName;

    /**
     * Full export data as JSON
     * Contains team, replays, matches, and opponent plans
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "export_data", nullable = false, columnDefinition = "TEXT")
    private String exportData;

    /**
     * SHA-256 checksum of export data for change detection
     * Used to avoid creating duplicate exports when data hasn't changed
     */
    @Size(max = 64)
    @Column(name = "data_checksum", length = 64)
    private String dataChecksum;

    /**
     * Options used when creating this export
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "export_options", columnDefinition = "TEXT")
    private String exportOptions;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Optional expiration date for cleanup
     * Null means the export never expires
     */
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;
}
