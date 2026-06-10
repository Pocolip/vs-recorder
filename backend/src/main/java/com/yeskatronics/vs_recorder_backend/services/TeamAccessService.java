package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.entities.TeamCollaborator;
import com.yeskatronics.vs_recorder_backend.entities.TeamCollaborator.Status;
import com.yeskatronics.vs_recorder_backend.exceptions.TeamAccessDeniedException;
import com.yeskatronics.vs_recorder_backend.repositories.TeamCollaboratorRepository;
import com.yeskatronics.vs_recorder_backend.repositories.TeamRepository;
import lombok.RequiredArgsConstructor;
import lombok.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Central authority for "can this user do X on this team?"
 *
 * Replaces the scattered {@code teamRepository.findByIdAndUserId(...)} pattern with a
 * single check that knows about both ownership and collaborator membership.
 *
 * The owner of a team always has all permissions; collaborators get the booleans on
 * their {@link TeamCollaborator} row.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TeamAccessService {

    public enum Role { OWNER, COLLABORATOR }

    public enum Permission {
        ADD_REPLAYS,
        DELETE_REPLAYS,
        EDIT_REPLAY_NOTES,
        EDIT_TEAM_MEMBER_NOTES,
        EDIT_TEAM_MEMBER_CALCS,
        EDIT_TEAM_DETAILS,
        EDIT_GAME_PLANS
    }

    private final TeamRepository teamRepository;
    private final TeamCollaboratorRepository collaboratorRepository;

    /**
     * Look up the team and verify the user has at least read access. Throws
     * {@link TeamAccessDeniedException} if the team doesn't exist or the user is
     * neither owner nor an accepted collaborator.
     */
    public TeamAccess resolve(Long teamId, Long userId) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new TeamAccessDeniedException(
                        "Team not found or access denied: " + teamId));

        if (team.getUser() != null && userId.equals(team.getUser().getId())) {
            return new TeamAccess(team, Role.OWNER, null);
        }

        TeamCollaborator membership = collaboratorRepository
                .findByTeamIdAndUserIdAndStatus(teamId, userId, Status.ACCEPTED)
                .orElseThrow(() -> new TeamAccessDeniedException(
                        "User " + userId + " does not have access to team " + teamId));

        return new TeamAccess(team, Role.COLLABORATOR, membership);
    }

    /**
     * Owner-only gate. Throws if the caller is not the team owner.
     */
    public TeamAccess requireOwner(Long teamId, Long userId) {
        TeamAccess access = resolve(teamId, userId);
        if (access.getRole() != Role.OWNER) {
            throw new TeamAccessDeniedException(
                    "Owner-only action attempted by collaborator on team " + teamId);
        }
        return access;
    }

    public void requirePermission(TeamAccess access, Permission permission) {
        if (!has(access, permission)) {
            throw new TeamAccessDeniedException(
                    "Missing permission " + permission + " on team " + access.getTeam().getId());
        }
    }

    /**
     * Convenience: look up + check in one call.
     */
    public TeamAccess requirePermission(Long teamId, Long userId, Permission permission) {
        TeamAccess access = resolve(teamId, userId);
        requirePermission(access, permission);
        return access;
    }

    public boolean has(TeamAccess access, Permission permission) {
        if (access.getRole() == Role.OWNER) {
            return true;
        }
        TeamCollaborator m = access.getMembership();
        if (m == null) {
            return false;
        }
        return switch (permission) {
            case ADD_REPLAYS -> m.isCanAddReplays();
            case DELETE_REPLAYS -> m.isCanDeleteReplays();
            case EDIT_REPLAY_NOTES -> m.isCanEditReplayNotes();
            case EDIT_TEAM_MEMBER_NOTES -> m.isCanEditTeamMemberNotes();
            case EDIT_TEAM_MEMBER_CALCS -> m.isCanEditTeamMemberCalcs();
            case EDIT_TEAM_DETAILS -> m.isCanEditTeamDetails();
            case EDIT_GAME_PLANS -> m.isCanEditGamePlans();
        };
    }

    @Value
    public static class TeamAccess {
        Team team;
        Role role;
        /**
         * Null when the caller is the owner.
         */
        TeamCollaborator membership;

        public boolean isOwner() {
            return role == Role.OWNER;
        }
    }
}
