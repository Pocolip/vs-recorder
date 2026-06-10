package com.yeskatronics.vs_recorder_backend.controllers;

import com.yeskatronics.vs_recorder_backend.dto.TeamCollaboratorDTO;
import com.yeskatronics.vs_recorder_backend.dto.TeamDTO;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.entities.TeamCollaborator;
import com.yeskatronics.vs_recorder_backend.mappers.TeamCollaboratorMapper;
import com.yeskatronics.vs_recorder_backend.mappers.TeamMapper;
import com.yeskatronics.vs_recorder_backend.security.CustomUserDetailsService;
import com.yeskatronics.vs_recorder_backend.services.TeamAccessService;
import com.yeskatronics.vs_recorder_backend.services.TeamCollaboratorService;
import com.yeskatronics.vs_recorder_backend.services.TeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Endpoints for the team-collaboration feature: invites, accept/decline, listing
 * shared teams. The "manage collaborators" UI calls /api/teams/{id}/collaborators,
 * while the "Shared" page calls /api/collaborations/*.
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class TeamCollaboratorController {

    private final TeamCollaboratorService collaboratorService;
    private final TeamAccessService teamAccessService;
    private final TeamService teamService;
    private final TeamCollaboratorMapper collaboratorMapper;
    private final TeamMapper teamMapper;
    private final CustomUserDetailsService userDetailsService;

    private Long getCurrentUserId(Authentication authentication) {
        String username = authentication.getName();
        return userDetailsService.getUserIdByUsername(username);
    }

    // ==================== Owner-side endpoints (per team) ====================

    @GetMapping("/api/teams/{teamId}/collaborators")
    public ResponseEntity<List<TeamCollaboratorDTO.Response>> listCollaborators(
            @PathVariable Long teamId,
            Authentication authentication) {
        Long userId = getCurrentUserId(authentication);
        teamAccessService.requireOwner(teamId, userId);
        List<TeamCollaboratorDTO.Response> response = collaboratorService.listForTeam(teamId).stream()
                .map(collaboratorMapper::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/teams/{teamId}/collaborators/invite")
    public ResponseEntity<TeamCollaboratorDTO.Response> invite(
            @PathVariable Long teamId,
            Authentication authentication,
            @Valid @RequestBody TeamCollaboratorDTO.InviteRequest request) {
        Long userId = getCurrentUserId(authentication);
        teamAccessService.requireOwner(teamId, userId);
        log.info("Inviting collaborator {} to team {}", request.getEmail(), teamId);
        TeamCollaborator created = collaboratorService.invite(teamId, userId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(collaboratorMapper.toResponse(created));
    }

    @PatchMapping("/api/teams/{teamId}/collaborators/{collaboratorId}")
    public ResponseEntity<TeamCollaboratorDTO.Response> updatePermissions(
            @PathVariable Long teamId,
            @PathVariable Long collaboratorId,
            Authentication authentication,
            @Valid @RequestBody TeamCollaboratorDTO.UpdatePermissionsRequest request) {
        Long userId = getCurrentUserId(authentication);
        teamAccessService.requireOwner(teamId, userId);
        TeamCollaborator updated = collaboratorService.updatePermissions(collaboratorId, request);
        return ResponseEntity.ok(collaboratorMapper.toResponse(updated));
    }

    @DeleteMapping("/api/teams/{teamId}/collaborators/{collaboratorId}")
    public ResponseEntity<Void> remove(
            @PathVariable Long teamId,
            @PathVariable Long collaboratorId,
            Authentication authentication) {
        Long userId = getCurrentUserId(authentication);
        teamAccessService.requireOwner(teamId, userId);
        collaboratorService.remove(collaboratorId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/api/teams/{teamId}/collaborators/me")
    public ResponseEntity<Void> leave(
            @PathVariable Long teamId,
            Authentication authentication) {
        Long userId = getCurrentUserId(authentication);
        collaboratorService.leave(teamId, userId);
        return ResponseEntity.noContent().build();
    }

    // ==================== Caller-side endpoints (current user) ====================

    @GetMapping("/api/collaborations/shared-with-me")
    public ResponseEntity<List<TeamDTO.Summary>> sharedWithMe(Authentication authentication) {
        Long userId = getCurrentUserId(authentication);
        List<Team> teams = collaboratorService.listSharedTeams(userId);
        List<TeamDTO.Summary> response = teams.stream()
                .map(team -> toSummaryWithRole(team, /*owner*/ false))
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/collaborations/sharing")
    public ResponseEntity<List<TeamDTO.Summary>> teamsIAmSharing(Authentication authentication) {
        Long userId = getCurrentUserId(authentication);
        List<Team> teams = collaboratorService.listTeamsOwnerIsSharing(userId);
        List<TeamDTO.Summary> response = teams.stream()
                .map(team -> toSummaryWithRole(team, /*owner*/ true))
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/collaborations/pending-invites")
    public ResponseEntity<List<TeamCollaboratorDTO.Response>> myPendingInvites(Authentication authentication) {
        Long userId = getCurrentUserId(authentication);
        String email = userDetailsService.getUserEmailById(userId);
        List<TeamCollaboratorDTO.Response> response = collaboratorService
                .listPendingInvitesForUser(userId, email).stream()
                .map(collaboratorMapper::toResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/collaborations/invites/{token}/accept")
    public ResponseEntity<TeamCollaboratorDTO.Response> accept(
            @PathVariable String token,
            Authentication authentication) {
        Long userId = getCurrentUserId(authentication);
        TeamCollaborator accepted = collaboratorService.accept(token, userId);
        return ResponseEntity.ok(collaboratorMapper.toResponse(accepted));
    }

    @PostMapping("/api/collaborations/invites/{token}/decline")
    public ResponseEntity<TeamCollaboratorDTO.Response> decline(
            @PathVariable String token,
            Authentication authentication) {
        Long userId = getCurrentUserId(authentication);
        TeamCollaborator declined = collaboratorService.decline(token, userId);
        return ResponseEntity.ok(collaboratorMapper.toResponse(declined));
    }

    /**
     * Public preview of an invite — used by the accept page to show team/owner info
     * before the recipient signs in. Returns 404 if the token doesn't exist.
     */
    @GetMapping("/api/collaborations/invites/{token}")
    public ResponseEntity<TeamCollaboratorDTO.InvitePreview> previewInvite(@PathVariable String token) {
        return collaboratorService.findByToken(token)
                .map(collaboratorMapper::toPreview)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    private TeamDTO.Summary toSummaryWithRole(Team team, boolean isOwner) {
        int replayCount = team.getReplays() != null ? team.getReplays().size() : 0;
        int matchCount = team.getMatches() != null ? team.getMatches().size() : 0;
        double winRate = teamService.getTeamStats(team.getId()).winRate();
        TeamDTO.Summary summary = teamMapper.toSummaryDTO(team, replayCount, matchCount, winRate);
        summary.setRole(isOwner ? "OWNER" : "COLLABORATOR");
        return summary;
    }
}
