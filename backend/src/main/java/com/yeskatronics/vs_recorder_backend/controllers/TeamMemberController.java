package com.yeskatronics.vs_recorder_backend.controllers;

import com.yeskatronics.vs_recorder_backend.dto.ErrorResponse;
import com.yeskatronics.vs_recorder_backend.dto.TeamMemberDTO;
import com.yeskatronics.vs_recorder_backend.entities.TeamMember;
import com.yeskatronics.vs_recorder_backend.mappers.TeamMemberMapper;
import com.yeskatronics.vs_recorder_backend.security.CustomUserDetailsService;
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
    private final CustomUserDetailsService userDetailsService;

    private Long getCurrentUserId(Authentication authentication) {
        String username = authentication.getName();
        return userDetailsService.getUserIdByUsername(username);
    }

    private void verifyTeamOwnership(Long teamId, Long userId) {
        teamService.getTeamByIdAndUserId(teamId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found or access denied"));
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
        verifyTeamOwnership(teamId, userId);

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
        verifyTeamOwnership(teamId, userId);

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
        verifyTeamOwnership(existing.getTeam().getId(), userId);

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
        verifyTeamOwnership(existing.getTeam().getId(), userId);

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
