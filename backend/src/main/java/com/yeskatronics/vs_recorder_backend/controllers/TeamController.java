package com.yeskatronics.vs_recorder_backend.controllers;

import com.yeskatronics.vs_recorder_backend.dto.ErrorResponse;
import com.yeskatronics.vs_recorder_backend.dto.TeamDTO;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.mappers.TeamMapper;
import com.yeskatronics.vs_recorder_backend.security.CustomUserDetailsService;
import com.yeskatronics.vs_recorder_backend.services.TeamAccessService;
import com.yeskatronics.vs_recorder_backend.services.TeamAccessService.Permission;
import com.yeskatronics.vs_recorder_backend.services.TeamAccessService.Role;
import com.yeskatronics.vs_recorder_backend.services.TeamAccessService.TeamAccess;
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
 * REST Controller for Team operations.
 * Handles team CRUD operations, statistics, and showdown username management.
 *
 * Base path: /api/teams
 *
 * Note: Uses Spring Security Authentication to identify the current user.
 */
@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
@Slf4j
public class TeamController {

    private final TeamService teamService;
    private final TeamAccessService teamAccessService;
    private final TeamMapper teamMapper;
    private final CustomUserDetailsService userDetailsService;

    /**
     * Helper method to get user ID from authentication
     */
    private Long getCurrentUserId(Authentication authentication) {
        String username = authentication.getName();
        return userDetailsService.getUserIdByUsername(username);
    }

    /**
     * Attach role + permissions to a Response based on the caller's resolved access.
     */
    private void applyAccessToDto(TeamDTO.Response response, TeamAccess access) {
        response.setRole(access.getRole().name());
        TeamDTO.Permissions perms = new TeamDTO.Permissions();
        perms.setCanAddReplays(teamAccessService.has(access, Permission.ADD_REPLAYS));
        perms.setCanDeleteReplays(teamAccessService.has(access, Permission.DELETE_REPLAYS));
        perms.setCanEditReplayNotes(teamAccessService.has(access, Permission.EDIT_REPLAY_NOTES));
        perms.setCanEditTeamMemberNotes(teamAccessService.has(access, Permission.EDIT_TEAM_MEMBER_NOTES));
        perms.setCanEditTeamMemberCalcs(teamAccessService.has(access, Permission.EDIT_TEAM_MEMBER_CALCS));
        perms.setCanEditTeamDetails(teamAccessService.has(access, Permission.EDIT_TEAM_DETAILS));
        perms.setCanEditGamePlans(teamAccessService.has(access, Permission.EDIT_GAME_PLANS));
        response.setPermissions(perms);
    }

    /**
     * Build a Summary DTO for a team and tag it with the caller's role. Owners get OWNER;
     * accepted collaborators get COLLABORATOR. Used by list endpoints.
     */
    private TeamDTO.Summary toSummaryDtoWithRole(Team team, Long userId) {
        int replayCount = team.getReplays() != null ? team.getReplays().size() : 0;
        int matchCount = team.getMatches() != null ? team.getMatches().size() : 0;
        double winRate = teamService.getTeamStats(team.getId()).winRate();
        TeamDTO.Summary summary = teamMapper.toSummaryDTO(team, replayCount, matchCount, winRate);
        boolean isOwner = team.getUser() != null && userId.equals(team.getUser().getId());
        summary.setRole(isOwner ? Role.OWNER.name() : Role.COLLABORATOR.name());
        return summary;
    }

    /**
     * Create a new team
     * POST /api/teams
     *
     * @param authentication the authenticated user
     * @param request the team creation request
     * @return the created team
     */
    @PostMapping
    public ResponseEntity<TeamDTO.Response> createTeam(
            Authentication authentication,
            @Valid @RequestBody TeamDTO.CreateRequest request) {

        Long userId = getCurrentUserId(authentication);
        log.info("Creating new team '{}' for user: {}", request.getName(), userId);

        Team team = teamMapper.toEntity(request);
        Team savedTeam = teamService.createTeam(team, userId);
        TeamService.TeamStats stats = teamService.getTeamStats(savedTeam.getId());
        TeamDTO.Response response = teamMapper.toDTO(savedTeam, stats);
        TeamAccess access = teamAccessService.resolve(savedTeam.getId(), userId);
        applyAccessToDto(response, access);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get team by ID
     * GET /api/teams/{id}
     *
     * @param id the team ID
     * @param authentication the authenticated user
     * @return the team details with statistics
     */
    @GetMapping("/{id}")
    public ResponseEntity<TeamDTO.Response> getTeamById(
            @PathVariable Long id,
            Authentication authentication) {

        log.debug("Fetching team by ID: {}", id);
        Long userId = getCurrentUserId(authentication);

        TeamAccess access = teamAccessService.resolve(id, userId);
        TeamService.TeamStats stats = teamService.getTeamStats(access.getTeam().getId());
        TeamDTO.Response response = teamMapper.toDTO(access.getTeam(), stats);
        applyAccessToDto(response, access);
        return ResponseEntity.ok(response);
    }

    /**
     * Get all teams for the authenticated user
     * GET /api/teams
     *
     * @param authentication the authenticated user
     * @return list of teams
     */
    @GetMapping
    public ResponseEntity<List<TeamDTO.Summary>> getTeamsByUserId(Authentication authentication) {
        Long userId = getCurrentUserId(authentication);
        log.debug("Fetching accessible teams for user: {}", userId);

        List<Team> teams = teamService.getAccessibleTeams(userId);
        List<TeamDTO.Summary> summaries = teams.stream()
                .map(team -> toSummaryDtoWithRole(team, userId))
                .collect(Collectors.toList());

        return ResponseEntity.ok(summaries);
    }

    /**
     * Get teams by regulation
     * GET /api/teams/regulation/{regulation}
     *
     * @param authentication the authenticated user
     * @param regulation the regulation filter
     * @return list of teams
     */
    @GetMapping("/regulation/{regulation}")
    public ResponseEntity<List<TeamDTO.Summary>> getTeamsByRegulation(
            Authentication authentication,
            @PathVariable String regulation) {

        Long userId = getCurrentUserId(authentication);
        log.debug("Fetching teams for user: {} with regulation: {}", userId, regulation);

        List<Team> teams = teamService.getTeamsByUserIdAndRegulation(userId, regulation);
        List<TeamDTO.Summary> summaries = teams.stream()
                .map(team -> toSummaryDtoWithRole(team, userId))
                .collect(Collectors.toList());

        return ResponseEntity.ok(summaries);
    }

    /**
     * Update a team
     * PATCH /api/teams/{id}
     *
     * @param id the team ID
     * @param authentication the authenticated user
     * @param request the update request
     * @return the updated team
     */
    @PatchMapping("/{id}")
    public ResponseEntity<TeamDTO.Response> updateTeam(
            @PathVariable Long id,
            Authentication authentication,
            @Valid @RequestBody TeamDTO.UpdateRequest request) {

        Long userId = getCurrentUserId(authentication);
        log.info("Updating team: {} for user: {}", id, userId);

        TeamAccess access = teamAccessService.requirePermission(id, userId, Permission.EDIT_TEAM_DETAILS);

        Team updates = teamMapper.toEntity(request);
        Team updatedTeam = teamService.updateTeam(id, userId, updates);
        TeamService.TeamStats stats = teamService.getTeamStats(updatedTeam.getId());
        TeamDTO.Response response = teamMapper.toDTO(updatedTeam, stats);
        applyAccessToDto(response, access);

        return ResponseEntity.ok(response);
    }

    /**
     * Delete a team
     * DELETE /api/teams/{id}
     *
     * @param id the team ID
     * @param authentication the authenticated user
     * @return no content response
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeam(
            @PathVariable Long id,
            Authentication authentication) {

        Long userId = getCurrentUserId(authentication);
        log.info("Deleting team: {} for user: {}", id, userId);

        teamAccessService.requireOwner(id, userId);
        teamService.deleteTeam(id, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get team statistics
     * GET /api/teams/{id}/stats
     *
     * @param id the team ID
     * @param authentication the authenticated user
     * @return team statistics
     */
    @GetMapping("/{id}/stats")
    public ResponseEntity<TeamDTO.TeamStats> getTeamStats(
            @PathVariable Long id,
            Authentication authentication) {

        Long userId = getCurrentUserId(authentication);
        log.debug("Fetching statistics for team: {}", id);

        teamAccessService.resolve(id, userId);

        TeamService.TeamStats stats = teamService.getTeamStats(id);
        TeamDTO.TeamStats response = teamMapper.toStatsDTO(stats);

        return ResponseEntity.ok(response);
    }

    /**
     * Add a showdown username to a team
     * POST /api/teams/{id}/showdown-usernames
     *
     * @param id the team ID
     * @param authentication the authenticated user
     * @param request the username to add
     * @return the updated team
     */
    @PostMapping("/{id}/showdown-usernames")
    public ResponseEntity<TeamDTO.Response> addShowdownUsername(
            @PathVariable Long id,
            Authentication authentication,
            @Valid @RequestBody TeamDTO.ShowdownUsernameRequest request) {

        Long userId = getCurrentUserId(authentication);
        log.info("Adding showdown username '{}' to team: {}", request.getUsername(), id);

        TeamAccess access = teamAccessService.requirePermission(id, userId, Permission.EDIT_TEAM_DETAILS);
        Team updatedTeam = teamService.addShowdownUsername(id, userId, request.getUsername());
        TeamService.TeamStats stats = teamService.getTeamStats(updatedTeam.getId());
        TeamDTO.Response response = teamMapper.toDTO(updatedTeam, stats);
        applyAccessToDto(response, access);

        return ResponseEntity.ok(response);
    }

    /**
     * Remove a showdown username from a team
     * DELETE /api/teams/{id}/showdown-usernames/{username}
     *
     * @param id the team ID
     * @param authentication the authenticated user
     * @param username the username to remove
     * @return the updated team
     */
    @DeleteMapping("/{id}/showdown-usernames/{username}")
    public ResponseEntity<TeamDTO.Response> removeShowdownUsername(
            @PathVariable Long id,
            Authentication authentication,
            @PathVariable String username) {

        Long userId = getCurrentUserId(authentication);
        log.info("Removing showdown username '{}' from team: {}", username, id);

        TeamAccess access = teamAccessService.requirePermission(id, userId, Permission.EDIT_TEAM_DETAILS);
        Team updatedTeam = teamService.removeShowdownUsername(id, userId, username);
        TeamService.TeamStats stats = teamService.getTeamStats(updatedTeam.getId());
        TeamDTO.Response response = teamMapper.toDTO(updatedTeam, stats);
        applyAccessToDto(response, access);

        return ResponseEntity.ok(response);
    }

    /**
     * Add team to folder
     * POST /api/teams/{id}/folders/{folderId}
     */
    @PostMapping("/{id}/folders/{folderId}")
    public ResponseEntity<Void> addTeamToFolder(
            @PathVariable Long id,
            @PathVariable Long folderId,
            Authentication authentication) {

        Long userId = getCurrentUserId(authentication);
        log.info("Adding team {} to folder {}", id, folderId);
        teamAccessService.resolve(id, userId); // any access — folders are per-caller
        teamService.addTeamToFolder(id, folderId, userId);
        return ResponseEntity.ok().build();
    }

    /**
     * Remove team from folder
     * DELETE /api/teams/{id}/folders/{folderId}
     */
    @DeleteMapping("/{id}/folders/{folderId}")
    public ResponseEntity<Void> removeTeamFromFolder(
            @PathVariable Long id,
            @PathVariable Long folderId,
            Authentication authentication) {

        Long userId = getCurrentUserId(authentication);
        log.info("Removing team {} from folder {}", id, folderId);
        teamAccessService.resolve(id, userId); // any access
        teamService.removeTeamFromFolder(id, folderId, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Exception handler for IllegalArgumentException
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(
            IllegalArgumentException ex,
            @RequestAttribute(required = false) String requestPath) {

        log.warn("Illegal argument: {}", ex.getMessage());

        ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                ex.getMessage(),
                requestPath != null ? requestPath : "/api/teams"
        );

        return ResponseEntity.badRequest().body(error);
    }
}