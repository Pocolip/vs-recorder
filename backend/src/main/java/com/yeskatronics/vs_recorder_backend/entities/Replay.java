package com.yeskatronics.vs_recorder_backend.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/**
 * Replay entity representing a Pokemon Showdown battle replay.
 * Each replay belongs to a team and optionally to a match (Bo3 set).
 */
@Entity
@Table(name = "replays")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Replay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    private Team team;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id")
    private Match match;

    @NotBlank(message = "Replay URL is required")
    @Column(nullable = false, unique = true, columnDefinition = "TEXT")
    private String url;

    @Column(columnDefinition = "TEXT")
    private String notes;

    /**
     * Full battle log from Pokemon Showdown.
     * In H2: stored as JSON string (VARCHAR/TEXT)
     * In PostgreSQL: will use JSONB column type
     *
     * The @JdbcTypeCode annotation ensures proper JSON handling across databases.
     */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "battle_log", nullable = false, columnDefinition = "TEXT")
    private String battleLog;

    @Size(max = 100, message = "Opponent name must not exceed 100 characters")
    @Column(length = 100)
    private String opponent;

    @Size(max = 10, message = "Result must not exceed 10 characters")
    @Column(length = 10)
    private String result; // 'win' or 'loss'

    @Column(name = "date")
    private LocalDateTime date;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * Helper method to check if this replay is part of a match
     */
    public boolean isPartOfMatch() {
        return match != null;
    }

    /**
     * Helper method to check if this is a win
     */
    public boolean isWin() {
        return "win".equalsIgnoreCase(result);
    }

    /**
     * Helper method to check if this is a loss
     */
    public boolean isLoss() {
        return "loss".equalsIgnoreCase(result);
    }
}