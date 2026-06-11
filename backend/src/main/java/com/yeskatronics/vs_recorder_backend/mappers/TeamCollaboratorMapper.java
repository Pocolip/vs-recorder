package com.yeskatronics.vs_recorder_backend.mappers;

import com.yeskatronics.vs_recorder_backend.dto.TeamCollaboratorDTO;
import com.yeskatronics.vs_recorder_backend.entities.TeamCollaborator;
import com.yeskatronics.vs_recorder_backend.entities.User;
import org.springframework.stereotype.Component;

@Component
public class TeamCollaboratorMapper {

    public TeamCollaboratorDTO.Response toResponse(TeamCollaborator c) {
        TeamCollaboratorDTO.Response r = new TeamCollaboratorDTO.Response();
        r.setId(c.getId());
        r.setTeamId(c.getTeam() != null ? c.getTeam().getId() : null);
        r.setTeamName(c.getTeam() != null ? c.getTeam().getName() : null);
        User user = c.getUser();
        if (user != null) {
            r.setUserId(user.getId());
            r.setUsername(user.getUsername());
            r.setUserEmail(user.getEmail());
        }
        r.setInviteEmail(c.getInviteEmail());
        r.setInviteToken(c.getInviteToken());
        r.setStatus(c.getStatus() != null ? c.getStatus().name() : null);
        r.setAcceptedAt(c.getAcceptedAt());
        r.setInviteExpiresAt(c.getInviteExpiresAt());
        r.setCreatedAt(c.getCreatedAt());
        r.setCanAddReplays(c.isCanAddReplays());
        r.setCanDeleteReplays(c.isCanDeleteReplays());
        r.setCanEditReplayNotes(c.isCanEditReplayNotes());
        r.setCanEditTeamMemberNotes(c.isCanEditTeamMemberNotes());
        r.setCanEditTeamMemberCalcs(c.isCanEditTeamMemberCalcs());
        r.setCanEditTeamDetails(c.isCanEditTeamDetails());
        r.setCanEditGamePlans(c.isCanEditGamePlans());
        return r;
    }

    public TeamCollaboratorDTO.InvitePreview toPreview(TeamCollaborator c) {
        TeamCollaboratorDTO.InvitePreview p = new TeamCollaboratorDTO.InvitePreview();
        p.setTeamName(c.getTeam() != null ? c.getTeam().getName() : null);
        p.setOwnerUsername(c.getTeam() != null && c.getTeam().getUser() != null
                ? c.getTeam().getUser().getUsername() : null);
        p.setInviteEmail(c.getInviteEmail());
        p.setStatus(c.getStatus() != null ? c.getStatus().name() : null);
        p.setInviteExpiresAt(c.getInviteExpiresAt());
        p.setExpired(c.isExpired());
        return p;
    }
}
