package com.yeskatronics.vs_recorder_backend.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.DynamicUpdate;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.EnumSet;
import java.util.Set;
import java.util.UUID;

/**
 * A matchup engine job for a team, of one of two kinds:
 * <ul>
 *   <li>SIMULATE: the engine plays the team against the meta's top teams, and its result
 *       fills the "Simulated" analytics and the Diagnostics page (about 45 KB);</li>
 *   <li>PLAN: the team against one Matchup Planner entry ({@link #gamePlanTeam}): what each
 *       side brings and a win rate (a few KB).</li>
 * </ul>
 *
 * Only the result's numbers are stored, never replays.
 *
 * Updates are dynamic, so the poller (status, progress, result) and a cancel request
 * ({@code cancelRequested}) write different columns and never overwrite each other.
 *
 * When a team (or a plan's entry) is deleted its jobs lose it rather than disappearing,
 * so the poller can still cancel and clean up an unfinished one in Redis.
 */
@Entity
@Table(name = "simulation_jobs", indexes = {
        @Index(name = "idx_simulation_jobs_team", columnList = "team_id"),
        @Index(name = "idx_simulation_jobs_status", columnList = "status"),
        @Index(name = "idx_simulation_jobs_game_plan_team", columnList = "game_plan_team_id")
})
@DynamicUpdate
@Getter
@Setter
@NoArgsConstructor
public class SimulationJob {

    public enum Status { QUEUED, RUNNING, PARTIAL, COMPLETE, FAILED, CANCELLED }

    /** What the engine does: see the class comment. */
    public enum Kind { SIMULATE, PLAN }

    public static final Set<Status> UNFINISHED = EnumSet.of(Status.QUEUED, Status.RUNNING, Status.PARTIAL);

    /**
     * How much the engine plays. QUICK: every opponent from fast games only. FULL: the
     * best-placed opponents are also played more carefully (the engine's default).
     * A FULL result covers what a QUICK one would.
     */
    public enum Depth {
        QUICK, FULL;

        public boolean covers(Depth other) {
            return compareTo(other) >= 0;
        }
    }

    /** The engine's {@code job_id}. Always new: a reused ID with other input is rejected. */
    @Id
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "team_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private Team team;

    /** The column's default fills rows from before plans existed. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(16) default 'SIMULATE'")
    private Kind kind = Kind.SIMULATE;

    /** PLAN only: the Matchup Planner entry the plan is for. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_plan_team_id")
    @OnDelete(action = OnDeleteAction.SET_NULL)
    private GamePlanTeam gamePlanTeam;

    /** The user who submitted the job, for the daily cap. */
    @Column(name = "requested_by", nullable = false)
    private Long requestedBy;

    /** The team's pokepaste URL when submitted. A different URL now means the result is stale. */
    @Column(name = "paste_url", nullable = false, columnDefinition = "TEXT")
    private String pasteUrl;

    /** SHA-256 of the paste text submitted (after normalization: what the engine got). */
    @Column(name = "paste_sha256", nullable = false, length = 64)
    private String pasteSha256;

    /**
     * PLAN only: the entry's {@code pokepaste} when submitted (a URL or inline sheet text).
     * A different one now means the plan is stale.
     */
    @Column(name = "opponent_paste", columnDefinition = "TEXT")
    private String opponentPaste;

    /** PLAN only: SHA-256 of the opponent paste text submitted (after normalization). */
    @Column(name = "opponent_paste_sha256", length = 64)
    private String opponentPasteSha256;

    /** What normalization changed in the paste(s), one note per line; null when nothing. */
    @Column(name = "paste_notes", columnDefinition = "TEXT")
    private String pasteNotes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private Status status;

    /** Nullable so the column can be added to existing rows; null reads as FULL. */
    @Enumerated(EnumType.STRING)
    @Column(length = 16)
    private Depth depth;

    /** The latest progress text, e.g. "search 3/10". */
    @Column(length = 100)
    private String progress;

    @Column(name = "cancel_requested", nullable = false)
    private boolean cancelRequested;

    /** Redis keys still need deleting (set when the job finishes). */
    @Column(name = "cleanup_pending", nullable = false)
    private boolean cleanupPending;

    /**
     * The job timed out on our side but a worker may still claim it. Until its result
     * appears the poller keeps it cancelled in Redis, then cleans up.
     */
    @Column(name = "reconcile_pending", nullable = false)
    private boolean reconcilePending;

    /** The partial result, replaced by the complete one. Kept when a job fails after a partial. */
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "TEXT")
    private String result;

    /** The result's {@code provenance.model}, once there's a complete result. */
    @Column(length = 100)
    private String model;

    @Column(name = "error_code", length = 50)
    private String errorCode;

    /** Safe to show the user. */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;

    /** When status or progress last changed; drives the stale-job timeout. */
    @Column(name = "last_changed_at", nullable = false)
    private Instant lastChangedAt;

    public boolean isUnfinished() {
        return status != null && UNFINISHED.contains(status);
    }

    /** FULL for SIMULATE jobs from before depths existed; null for PLAN jobs, which have none. */
    public Depth getDepth() {
        if (kind == Kind.PLAN) {
            return null;
        }
        return depth == null ? Depth.FULL : depth;
    }

    public Kind getKind() {
        return kind == null ? Kind.SIMULATE : kind;
    }
}
