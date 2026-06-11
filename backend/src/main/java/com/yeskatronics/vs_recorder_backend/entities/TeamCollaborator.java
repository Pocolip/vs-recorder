package com.yeskatronics.vs_recorder_backend.entities;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Grants a User collaborative access to a Team they don't own.
 *
 * Lifecycle:
 *   PENDING   - invite emailed, awaiting acceptance. user may be null if the invitee
 *               doesn't yet have an account (auto-linked on signup by matching email).
 *   ACCEPTED  - user accepted; permissions are live.
 *   REVOKED   - declined or owner-revoked; row kept for history but blocks re-use of the token.
 *
 * Per-collaborator permission booleans gate UI affordances and API mutations.
 * The team owner always has all permissions implicitly (no row here for the owner).
 */
@Entity
@Table(name = "team_collaborators",
    indexes = {
        @Index(name = "idx_team_collaborators_team_id", columnList = "team_id"),
        @Index(name = "idx_team_collaborators_user_id", columnList = "user_id"),
        @Index(name = "idx_team_collaborators_invite_token", columnList = "invite_token", unique = true),
        @Index(name = "idx_team_collaborators_invite_email", columnList = "invite_email")
    },
    uniqueConstraints = {
        // NULL user_ids are treated as distinct by SQL, so multiple pending invites for the
        // same team but different emails are allowed; only one accepted row per (team, user).
        @UniqueConstraint(name = "uk_team_collaborators_team_user", columnNames = {"team_id", "user_id"})
    })
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeamCollaborator {

    public enum Status {
        PENDING,
        ACCEPTED,
        REVOKED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "team_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Team team;

    /**
     * Null until the invitee accepts (and registers if needed).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User user;

    /**
     * Lowercased at the service layer for case-insensitive matching against User.email.
     */
    @NotBlank(message = "Invite email is required")
    @Email(message = "Invite email must be valid")
    @Column(name = "invite_email", nullable = false)
    private String inviteEmail;

    /**
     * Secure random token used in the accept link. Nulled after acceptance so an
     * intercepted token can't be reused.
     */
    @Column(name = "invite_token", length = 64, unique = true)
    private String inviteToken;

    @Column(name = "invite_expires_at", nullable = false)
    private LocalDateTime inviteExpiresAt;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private Status status = Status.PENDING;

    @Column(name = "accepted_at")
    private LocalDateTime acceptedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "can_add_replays", nullable = false)
    private boolean canAddReplays = false;

    @Column(name = "can_delete_replays", nullable = false)
    private boolean canDeleteReplays = false;

    @Column(name = "can_edit_replay_notes", nullable = false)
    private boolean canEditReplayNotes = false;

    @Column(name = "can_edit_team_member_notes", nullable = false)
    private boolean canEditTeamMemberNotes = false;

    @Column(name = "can_edit_team_member_calcs", nullable = false)
    private boolean canEditTeamMemberCalcs = false;

    @Column(name = "can_edit_team_details", nullable = false)
    private boolean canEditTeamDetails = false;

    @Column(name = "can_edit_game_plans", nullable = false)
    private boolean canEditGamePlans = false;

    public boolean isExpired() {
        return inviteExpiresAt != null && LocalDateTime.now().isAfter(inviteExpiresAt);
    }

    public boolean isAcceptable() {
        return status == Status.PENDING && !isExpired();
    }
}
