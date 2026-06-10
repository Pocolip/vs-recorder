package com.yeskatronics.vs_recorder_backend.controllers;

import com.yeskatronics.vs_recorder_backend.dto.ErrorResponse;
import com.yeskatronics.vs_recorder_backend.dto.TeamMemberDTO;
import com.yeskatronics.vs_recorder_backend.entities.TeamMember;
import com.yeskatronics.vs_recorder_backend.mappers.TeamMemberMapper;
import com.yeskatronics.vs_recorder_backend.security.CustomUserDetailsService;
import com.yeskatronics.vs_recorder_backend.services.TeamAccessService;
import com.yeskatronics.vs_recorder_backend.services.TeamAccessService.Permission;
import com.yeskatronics.vs_recorder_backend.services.TeamMemberService;
import com.yeskatronics.vs_recorder_backend.services.TeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for TeamMember operations.
 * Base path: /api/team-members
 */
@RestController
@RequestMapping("/api/team-members")
@RequiredArgsConstructor
@Slf4j
public class TeamMemberController {

    private final TeamMemberService teamMemberService;
    private final TeamMemberMapper teamMemberMapper;
    private final TeamService teamService;
    private final TeamAccessService teamAccessService;
    private final CustomUserDetailsService userDetailsService;

    private Long getCurrentUserId(Authentication authentication) {
        String username = authentication.getName();
        return userDetailsService.getUserIdByUsername(username);
    }

    private void verifyTeamAccess(Long teamId, Long userId) {
        teamAccessService.resolve(teamId, userId);
    }

    private void verifyTeamPermission(Long teamId, Long userId, Permission permission) {
        teamAccessService.requirePermission(teamId, userId, permission);
    }

    /**
     * Create a team member
     * POST /api/team-members?teamId={teamId}
     */
    @PostMapping
    public ResponseEntity<TeamMemberDTO.Response> createTeamMember(
            @RequestParam Long teamId,
            Authentication authentication,
            @Valid @RequestBody TeamMemberDTO.CreateRequest request) {

        Long userId = getCurrentUserId(authentication);
        verifyTeamPermission(teamId, userId, Permission.EDIT_TEAM_DETAILS);

        TeamMember teamMember = teamMemberMapper.toEntity(request);
        TeamMember saved = teamMemberService.createTeamMember(teamMember, teamId);

        return ResponseEntity.status(HttpStatus.CREATED).body(teamMemberMapper.toResponse(saved));
    }

    /**
     * Get all team members for a team
     * GET /api/team-members?teamId={teamId}
     */
    @GetMapping
    public ResponseEntity<List<TeamMemberDTO.Response>> getTeamMembers(
            @RequestParam Long teamId,
            Authentication authentication) {

        Long userId = getCurrentUserId(authentication);
        verifyTeamAccess(teamId, userId);

        List<TeamMember> members = teamMemberService.getTeamMembersByTeamId(teamId);
        return ResponseEntity.ok(teamMemberMapper.toResponseList(members));
    }

    /**
     * Update a team member (notes)
     * PATCH /api/team-members/{id}
     */
    @PatchMapping("/{id}")
    public ResponseEntity<TeamMemberDTO.Response> updateTeamMember(
            @PathVariable Long id,
            Authentication authentication,
            @Valid @RequestBody TeamMemberDTO.UpdateRequest request) {

        Long userId = getCurrentUserId(authentication);

        TeamMember existing = teamMemberService.getTeamMemberById(id)
                .orElseThrow(() -> new IllegalArgumentException("Team member not found"));
        Long teamId = existing.getTeam().getId();

        // Gate notes and calcs separately — frontend disables whichever the caller can't edit.
        if (request.getNotes() != null) {
            verifyTeamPermission(teamId, userId, Permission.EDIT_TEAM_MEMBER_NOTES);
        }
        if (request.getCalcs() != null) {
            verifyTeamPermission(teamId, userId, Permission.EDIT_TEAM_MEMBER_CALCS);
        }
        if (request.getNotes() == null && request.getCalcs() == null) {
            verifyTeamAccess(teamId, userId);
        }

        TeamMember updates = new TeamMember();
        teamMemberMapper.updateEntityFromDto(request, updates);
        if (request.getCalcs() != null) {
            updates.setCalcs(request.getCalcs());
        } else {
            updates.setCalcs(null);
        }
        TeamMember updated = teamMemberService.updateTeamMember(id, updates);

        return ResponseEntity.ok(teamMemberMapper.toResponse(updated));
    }

    /**
     * Sync team members from pokepaste
     * POST /api/team-members/sync?teamId={teamId}
     */
    @PostMapping("/sync")
    public ResponseEntity<TeamMemberDTO.SyncResponse> syncTeamMembers(
            @RequestParam Long teamId,
            Authentication authentication) {

        Long userId = getCurrentUserId(authentication);
        verifyTeamPermission(teamId, userId, Permission.EDIT_TEAM_DETAILS);

        TeamService.SyncResult result = teamService.syncTeamMembersFromPokepaste(teamId, userId);

        TeamMemberDTO.SyncResponse response = new TeamMemberDTO.SyncResponse(
                teamMemberMapper.toResponseList(result.members()),
                result.kept(),
                result.added(),
                result.removed()
        );

        return ResponseEntity.ok(response);
    }

    /**
     * Delete a team member
     * DELETE /api/team-members/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeamMember(
            @PathVariable Long id,
            Authentication authentication) {

        Long userId = getCurrentUserId(authentication);

        TeamMember existing = teamMemberService.getTeamMemberById(id)
                .orElseThrow(() -> new IllegalArgumentException("Team member not found"));
        verifyTeamPermission(existing.getTeam().getId(), userId, Permission.EDIT_TEAM_DETAILS);

        teamMemberService.deleteTeamMember(id);
        return ResponseEntity.noContent().build();
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(
            IllegalArgumentException ex,
            @RequestAttribute(required = false) String requestPath) {

        log.warn("Illegal argument: {}", ex.getMessage());

        ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                ex.getMessage(),
                requestPath != null ? requestPath : "/api/team-members"
        );

        return ResponseEntity.badRequest().body(error);
    }
}
