package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.entities.TeamCollaborator;
import com.yeskatronics.vs_recorder_backend.entities.TeamCollaborator.Status;
import com.yeskatronics.vs_recorder_backend.entities.User;
import com.yeskatronics.vs_recorder_backend.exceptions.TeamAccessDeniedException;
import com.yeskatronics.vs_recorder_backend.repositories.TeamCollaboratorRepository;
import com.yeskatronics.vs_recorder_backend.repositories.TeamRepository;
import com.yeskatronics.vs_recorder_backend.repositories.UserRepository;
import com.yeskatronics.vs_recorder_backend.services.TeamAccessService.Permission;
import com.yeskatronics.vs_recorder_backend.services.TeamAccessService.Role;
import com.yeskatronics.vs_recorder_backend.services.TeamAccessService.TeamAccess;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@Transactional
class TeamAccessServiceTest {

    @Autowired private TeamAccessService teamAccessService;
    @Autowired private TeamRepository teamRepository;
    @Autowired private TeamCollaboratorRepository collaboratorRepository;
    @Autowired private UserRepository userRepository;

    private User owner;
    private User collaboratorUser;
    private User stranger;
    private Team team;

    @BeforeEach
    void setUp() {
        owner = saveUser("owner-tas", "owner-tas@example.com");
        collaboratorUser = saveUser("collab-tas", "collab-tas@example.com");
        stranger = saveUser("stranger-tas", "stranger-tas@example.com");

        team = new Team();
        team.setUser(owner);
        team.setName("Access Service Test Team");
        team.setPokepaste("https://pokepast.es/example");
        team = teamRepository.save(team);
    }

    @Test
    void resolve_ownerSeesAllPermissions() {
        TeamAccess access = teamAccessService.resolve(team.getId(), owner.getId());
        assertEquals(Role.OWNER, access.getRole());
        for (Permission p : Permission.values()) {
            assertTrue(teamAccessService.has(access, p), "owner should have " + p);
        }
    }

    @Test
    void resolve_collaboratorPermissionsAreMasked() {
        TeamCollaborator membership = new TeamCollaborator();
        membership.setTeam(team);
        membership.setUser(collaboratorUser);
        membership.setInviteEmail(collaboratorUser.getEmail());
        membership.setStatus(Status.ACCEPTED);
        membership.setInviteExpiresAt(LocalDateTime.now().plusDays(7));
        membership.setCanAddReplays(true);
        membership.setCanEditReplayNotes(true);
        // deletes + team details off
        collaboratorRepository.save(membership);

        TeamAccess access = teamAccessService.resolve(team.getId(), collaboratorUser.getId());
        assertEquals(Role.COLLABORATOR, access.getRole());
        assertTrue(teamAccessService.has(access, Permission.ADD_REPLAYS));
        assertTrue(teamAccessService.has(access, Permission.EDIT_REPLAY_NOTES));
        assertFalse(teamAccessService.has(access, Permission.DELETE_REPLAYS));
        assertFalse(teamAccessService.has(access, Permission.EDIT_TEAM_DETAILS));
    }

    @Test
    void resolve_pendingCollaboratorIsDenied() {
        TeamCollaborator pending = new TeamCollaborator();
        pending.setTeam(team);
        pending.setUser(collaboratorUser);
        pending.setInviteEmail(collaboratorUser.getEmail());
        pending.setStatus(Status.PENDING);
        pending.setInviteExpiresAt(LocalDateTime.now().plusDays(7));
        pending.setInviteToken("pending-token");
        pending.setCanAddReplays(true);
        collaboratorRepository.save(pending);

        assertThrows(TeamAccessDeniedException.class,
                () -> teamAccessService.resolve(team.getId(), collaboratorUser.getId()));
    }

    @Test
    void resolve_strangerIsDenied() {
        assertThrows(TeamAccessDeniedException.class,
                () -> teamAccessService.resolve(team.getId(), stranger.getId()));
    }

    @Test
    void requirePermission_throwsWhenCollaboratorLacksFlag() {
        TeamCollaborator membership = new TeamCollaborator();
        membership.setTeam(team);
        membership.setUser(collaboratorUser);
        membership.setInviteEmail(collaboratorUser.getEmail());
        membership.setStatus(Status.ACCEPTED);
        membership.setInviteExpiresAt(LocalDateTime.now().plusDays(7));
        // notes only; no team-details
        membership.setCanEditTeamMemberNotes(true);
        collaboratorRepository.save(membership);

        TeamAccess access = teamAccessService.resolve(team.getId(), collaboratorUser.getId());
        assertDoesNotThrow(() -> teamAccessService.requirePermission(access, Permission.EDIT_TEAM_MEMBER_NOTES));
        assertThrows(TeamAccessDeniedException.class,
                () -> teamAccessService.requirePermission(access, Permission.EDIT_TEAM_DETAILS));
    }

    @Test
    void requireOwner_rejectsCollaborator() {
        TeamCollaborator membership = new TeamCollaborator();
        membership.setTeam(team);
        membership.setUser(collaboratorUser);
        membership.setInviteEmail(collaboratorUser.getEmail());
        membership.setStatus(Status.ACCEPTED);
        membership.setInviteExpiresAt(LocalDateTime.now().plusDays(7));
        membership.setCanEditTeamDetails(true); // even with all perms, owner-only is gated
        collaboratorRepository.save(membership);

        assertThrows(TeamAccessDeniedException.class,
                () -> teamAccessService.requireOwner(team.getId(), collaboratorUser.getId()));
        assertDoesNotThrow(() -> teamAccessService.requireOwner(team.getId(), owner.getId()));
    }

    private User saveUser(String username, String email) {
        User u = new User();
        u.setUsername(username);
        u.setEmail(email);
        u.setPasswordHash("hashed_password");
        return userRepository.save(u);
    }
}
