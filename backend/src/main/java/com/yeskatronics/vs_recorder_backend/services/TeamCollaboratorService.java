package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.dto.TeamCollaboratorDTO;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.entities.TeamCollaborator;
import com.yeskatronics.vs_recorder_backend.entities.TeamCollaborator.Status;
import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.exceptions.TeamAccessDeniedException;
import com.yeskatronics.vs_recorder_backend.repositories.TeamCollaboratorRepository;
import com.yeskatronics.vs_recorder_backend.repositories.TeamRepository;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * Business logic for team collaborator invites and memberships.
 *
 * Owner actions (invite, update permissions, remove) are owner-gated; the controller
 * verifies ownership before calling. Accept/decline are caller-scoped via the token.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TeamCollaboratorService {

    private static final int INVITE_TOKEN_BYTES = 32;
    private static final int INVITE_TTL_DAYS = 7;

    private final TeamCollaboratorRepository collaboratorRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final EmailService emailService;

    @Value("${app.frontend-url:http://localhost:3000}")
    private String frontendUrl;

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Invite (or re-invite) a user by email. Idempotent: if a PENDING invite already exists
     * for the same email on this team, re-send the email without creating a duplicate row.
     * If the email belongs to the team owner, reject as a self-invite.
     */
    public TeamCollaborator invite(Long teamId, Long ownerUserId,
                                   TeamCollaboratorDTO.InviteRequest request) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found: " + teamId));

        String email = request.getEmail().trim().toLowerCase();

        // Self-invite guard
        User owner = team.getUser();
        if (owner != null && owner.getEmail() != null && owner.getEmail().equalsIgnoreCase(email)) {
            throw new IllegalArgumentException("Cannot invite the team owner");
        }

        // If the invitee already has an accepted membership, reject as a duplicate
        Optional<User> existingUser = userRepository.findByEmail(email);
        if (existingUser.isPresent()) {
            boolean alreadyMember = collaboratorRepository.existsByTeamIdAndUserIdAndStatus(
                    teamId, existingUser.get().getId(), Status.ACCEPTED);
            if (alreadyMember) {
                throw new IllegalArgumentException("User is already a collaborator on this team");
            }
        }

        // Re-use an existing PENDING row for this email/team to keep invites idempotent
        Optional<TeamCollaborator> existingPending = collaboratorRepository
                .findByTeamIdAndInviteEmailIgnoreCaseAndStatus(teamId, email, Status.PENDING);

        TeamCollaborator collaborator = existingPending.orElseGet(TeamCollaborator::new);
        collaborator.setTeam(team);
        collaborator.setInviteEmail(email);
        collaborator.setStatus(Status.PENDING);
        collaborator.setInviteToken(generateInviteToken());
        collaborator.setInviteExpiresAt(LocalDateTime.now().plusDays(INVITE_TTL_DAYS));
        existingUser.ifPresent(collaborator::setUser);
        applyPermissions(collaborator, request);

        TeamCollaborator saved = collaboratorRepository.save(collaborator);
        sendInviteEmail(saved, team, owner);
        return saved;
    }

    /**
     * Accept an invite using the token. The caller must be either (a) the registered user
     * already attached to the row, or (b) anyone whose email matches the invite email.
     */
    public TeamCollaborator accept(String token, Long currentUserId) {
        TeamCollaborator invite = collaboratorRepository.findByInviteToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invite not found or already used"));

        if (invite.getStatus() != Status.PENDING) {
            throw new IllegalArgumentException("Invite is no longer pending (status: " + invite.getStatus() + ")");
        }
        if (invite.isExpired()) {
            throw new IllegalArgumentException("Invite has expired");
        }

        User user = userRepository.findById(currentUserId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + currentUserId));

        // If row is locked to a specific user (auto-attached on signup or previous invite), enforce that.
        if (invite.getUser() != null && !Objects.equals(invite.getUser().getId(), user.getId())) {
            throw new TeamAccessDeniedException("Invite is for a different user");
        }
        // Otherwise require email match
        if (invite.getUser() == null && !invite.getInviteEmail().equalsIgnoreCase(user.getEmail())) {
            throw new TeamAccessDeniedException("Invite email does not match your account email");
        }

        invite.setUser(user);
        invite.setStatus(Status.ACCEPTED);
        invite.setAcceptedAt(LocalDateTime.now());
        invite.setInviteToken(null); // burn the token so it can't be replayed
        return collaboratorRepository.save(invite);
    }

    public TeamCollaborator decline(String token, Long currentUserId) {
        TeamCollaborator invite = collaboratorRepository.findByInviteToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invite not found or already used"));
        if (invite.getStatus() != Status.PENDING) {
            throw new IllegalArgumentException("Invite is no longer pending");
        }
        // Allow the recipient (matched by email or attached user) to decline.
        if (currentUserId != null) {
            userRepository.findById(currentUserId).ifPresent(user -> {
                if (invite.getUser() != null && !Objects.equals(invite.getUser().getId(), user.getId())) {
                    throw new TeamAccessDeniedException("Invite is for a different user");
                }
                if (invite.getUser() == null && !invite.getInviteEmail().equalsIgnoreCase(user.getEmail())) {
                    throw new TeamAccessDeniedException("Invite email does not match your account email");
                }
            });
        }
        invite.setStatus(Status.REVOKED);
        invite.setInviteToken(null);
        return collaboratorRepository.save(invite);
    }

    public TeamCollaborator updatePermissions(Long collaboratorId,
                                              TeamCollaboratorDTO.UpdatePermissionsRequest request) {
        TeamCollaborator collaborator = collaboratorRepository.findById(collaboratorId)
                .orElseThrow(() -> new IllegalArgumentException("Collaborator not found"));
        collaborator.setCanAddReplays(request.isCanAddReplays());
        collaborator.setCanDeleteReplays(request.isCanDeleteReplays());
        collaborator.setCanEditReplayNotes(request.isCanEditReplayNotes());
        collaborator.setCanEditTeamMemberNotes(request.isCanEditTeamMemberNotes());
        collaborator.setCanEditTeamMemberCalcs(request.isCanEditTeamMemberCalcs());
        collaborator.setCanEditTeamDetails(request.isCanEditTeamDetails());
        collaborator.setCanEditGamePlans(request.isCanEditGamePlans());
        return collaboratorRepository.save(collaborator);
    }

    public void remove(Long collaboratorId) {
        if (!collaboratorRepository.existsById(collaboratorId)) {
            throw new IllegalArgumentException("Collaborator not found");
        }
        collaboratorRepository.deleteById(collaboratorId);
    }

    /**
     * Collaborator removes themselves from a team they no longer want to be part of.
     */
    public void leave(Long teamId, Long userId) {
        TeamCollaborator membership = collaboratorRepository
                .findByTeamIdAndUserIdAndStatus(teamId, userId, Status.ACCEPTED)
                .orElseThrow(() -> new IllegalArgumentException("You are not a collaborator on this team"));
        collaboratorRepository.delete(membership);
    }

    @Transactional(readOnly = true)
    public List<TeamCollaborator> listForTeam(Long teamId) {
        return collaboratorRepository.findByTeamId(teamId);
    }

    @Transactional(readOnly = true)
    public List<Team> listSharedTeams(Long userId) {
        return collaboratorRepository.findAcceptedTeamsByUserId(userId);
    }

    @Transactional(readOnly = true)
    public List<Team> listTeamsOwnerIsSharing(Long ownerUserId) {
        return collaboratorRepository.findTeamsOwnedByUserWithCollaborators(ownerUserId);
    }

    @Transactional(readOnly = true)
    public List<TeamCollaborator> listPendingInvitesForUser(Long userId, String email) {
        // Two ways pending invites can match the current user:
        //   1. the row was pre-linked to user_id (a previous accept attempt or admin link)
        //   2. invite_email matches the user's email (most common path)
        List<TeamCollaborator> byUser = collaboratorRepository.findByUserIdAndStatus(userId, Status.PENDING);
        List<TeamCollaborator> byEmail = collaboratorRepository
                .findByInviteEmailIgnoreCaseAndStatus(email, Status.PENDING);
        // Merge, deduping by id
        return java.util.stream.Stream.concat(byUser.stream(), byEmail.stream())
                .collect(java.util.stream.Collectors.toMap(TeamCollaborator::getId, c -> c, (a, b) -> a))
                .values()
                .stream()
                .toList();
    }

    @Transactional(readOnly = true)
    public Optional<TeamCollaborator> findByToken(String token) {
        return collaboratorRepository.findByInviteToken(token);
    }

    /**
     * Called from AuthService.register so that anyone who was invited before they had an
     * account is auto-added to the team when they sign up with the matching email.
     */
    public void autoAcceptOnSignup(Long userId, String email) {
        if (email == null) return;
        List<TeamCollaborator> pending = collaboratorRepository
                .findByInviteEmailIgnoreCaseAndStatus(email, Status.PENDING);
        if (pending.isEmpty()) return;

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) return;

        LocalDateTime now = LocalDateTime.now();
        for (TeamCollaborator invite : pending) {
            if (invite.isExpired()) continue;
            invite.setUser(user);
            invite.setStatus(Status.ACCEPTED);
            invite.setAcceptedAt(now);
            invite.setInviteToken(null);
            collaboratorRepository.save(invite);
            log.info("Auto-accepted invite {} for new user {} on team {}",
                    invite.getId(), userId, invite.getTeam().getId());
        }
    }

    private void applyPermissions(TeamCollaborator c, TeamCollaboratorDTO.InviteRequest r) {
        c.setCanAddReplays(r.isCanAddReplays());
        c.setCanDeleteReplays(r.isCanDeleteReplays());
        c.setCanEditReplayNotes(r.isCanEditReplayNotes());
        c.setCanEditTeamMemberNotes(r.isCanEditTeamMemberNotes());
        c.setCanEditTeamMemberCalcs(r.isCanEditTeamMemberCalcs());
        c.setCanEditTeamDetails(r.isCanEditTeamDetails());
        c.setCanEditGamePlans(r.isCanEditGamePlans());
    }

    private String generateInviteToken() {
        byte[] bytes = new byte[INVITE_TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private void sendInviteEmail(TeamCollaborator invite, Team team, User owner) {
        String acceptUrl = frontendUrl + "/invites/" + invite.getInviteToken();
        String ownerName = owner != null ? owner.getUsername() : "Someone";
        try {
            emailService.sendCollaborationInvite(invite.getInviteEmail(), ownerName, team.getName(), acceptUrl);
        } catch (RuntimeException e) {
            // We don't want a flaky mail provider to roll back the invite row.
            log.error("Failed to send collaboration invite email for invite {}: {}", invite.getId(), e.getMessage());
        }
    }
}
