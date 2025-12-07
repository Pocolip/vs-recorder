package com.yeskatronics.vs_recorder_backend.controllers;

import com.yeskatronics.vs_recorder_backend.dto.ErrorResponse;
import com.yeskatronics.vs_recorder_backend.dto.TeamDTO;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.mappers.TeamMapper;
import com.yeskatronics.vs_recorder_backend.services.TeamService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * REST Controller for Team operations.
 * Handles team CRUD operations, statistics, and showdown username management.
 *
 * Base path: /api/teams
 *
 * Note: In a real application with authentication, userId would come from
 * the authenticated user's session/JWT token, not from request parameters.
 * For now, we pass it as a query parameter for testing.
 */
@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
@Slf4j
public class TeamController {

    private final TeamService teamService;
    private final TeamMapper teamMapper;

    /**
     * Create a new team
     * POST /api/teams?userId={userId}
     *
     * @param userId the user ID (TODO: get from auth token)
     * @param request the team creation request
     * @return the created team
     */
    @PostMapping
    public ResponseEntity<TeamDTO.Response> createTeam(
            @RequestParam Long userId,
            @Valid @RequestBody TeamDTO.CreateRequest request) {

        log.info("Creating new team '{}' for user: {}", request.getName(), userId);

        Team team = teamMapper.toEntity(request);
        Team savedTeam = teamService.createTeam(team, userId);
        TeamService.TeamStats stats = teamService.getTeamStats(savedTeam.getId());
        TeamDTO.Response response = teamMapper.toDTO(savedTeam, stats);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get team by ID
     * GET /api/teams/{id}
     *
     * @param id the team ID
     * @return the team details with statistics
     */
    @GetMapping("/{id}")
    public ResponseEntity<TeamDTO.Response> getTeamById(@PathVariable Long id) {
        log.debug("Fetching team by ID: {}", id);

        return teamService.getTeamById(id)
                .map(team -> {
                    TeamService.TeamStats stats = teamService.getTeamStats(team.getId());
                    return teamMapper.toDTO(team, stats);
                })
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get all teams for a user
     * GET /api/teams?userId={userId}
     *
     * @param userId the user ID
     * @return list of teams
     */
    @GetMapping
    public ResponseEntity<List<TeamDTO.Summary>> getTeamsByUserId(@RequestParam Long userId) {
        log.debug("Fetching teams for user: {}", userId);

        List<Team> teams = teamService.getTeamsByUserId(userId);
        List<TeamDTO.Summary> summaries = teams.stream()
                .map(team -> {
                    int replayCount = team.getReplays() != null ? team.getReplays().size() : 0;
                    int matchCount = team.getMatches() != null ? team.getMatches().size() : 0;
                    double winRate = teamService.getTeamStats(team.getId()).winRate();
                    return teamMapper.toSummaryDTO(team, replayCount, matchCount, winRate);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(summaries);
    }

    /**
     * Get teams by user and regulation
     * GET /api/teams/regulation/{regulation}?userId={userId}
     *
     * @param userId the user ID
     * @param regulation the regulation filter
     * @return list of teams
     */
    @GetMapping("/regulation/{regulation}")
    public ResponseEntity<List<TeamDTO.Summary>> getTeamsByRegulation(
            @RequestParam Long userId,
            @PathVariable String regulation) {

        log.debug("Fetching teams for user: {} with regulation: {}", userId, regulation);

        List<Team> teams = teamService.getTeamsByUserIdAndRegulation(userId, regulation);
        List<TeamDTO.Summary> summaries = teams.stream()
                .map(team -> {
                    int replayCount = team.getReplays() != null ? team.getReplays().size() : 0;
                    int matchCount = team.getMatches() != null ? team.getMatches().size() : 0;
                    double winRate = teamService.getTeamStats(team.getId()).winRate();
                    return teamMapper.toSummaryDTO(team, replayCount, matchCount, winRate);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(summaries);
    }

    /**
     * Update a team
     * PATCH /api/teams/{id}?userId={userId}
     *
     * @param id the team ID
     * @param userId the user ID (for ownership verification)
     * @param request the update request
     * @return the updated team
     */
    @PatchMapping("/{id}")
    public ResponseEntity<TeamDTO.Response> updateTeam(
            @PathVariable Long id,
            @RequestParam Long userId,
            @Valid @RequestBody TeamDTO.UpdateRequest request) {

        log.info("Updating team: {} for user: {}", id, userId);

        Team updates = teamMapper.toEntity(request);
        Team updatedTeam = teamService.updateTeam(id, userId, updates);
        TeamService.TeamStats stats = teamService.getTeamStats(updatedTeam.getId());
        TeamDTO.Response response = teamMapper.toDTO(updatedTeam, stats);

        return ResponseEntity.ok(response);
    }

    /**
     * Delete a team
     * DELETE /api/teams/{id}?userId={userId}
     *
     * @param id the team ID
     * @param userId the user ID (for ownership verification)
     * @return no content response
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeam(
            @PathVariable Long id,
            @RequestParam Long userId) {

        log.info("Deleting team: {} for user: {}", id, userId);

        teamService.deleteTeam(id, userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get team statistics
     * GET /api/teams/{id}/stats
     *
     * @param id the team ID
     * @return team statistics
     */
    @GetMapping("/{id}/stats")
    public ResponseEntity<TeamDTO.TeamStats> getTeamStats(@PathVariable Long id) {
        log.debug("Fetching statistics for team: {}", id);

        TeamService.TeamStats stats = teamService.getTeamStats(id);
        TeamDTO.TeamStats response = teamMapper.toStatsDTO(stats);

        return ResponseEntity.ok(response);
    }

    /**
     * Add a showdown username to a team
     * POST /api/teams/{id}/showdown-usernames?userId={userId}
     *
     * @param id the team ID
     * @param userId the user ID (for ownership verification)
     * @param request the username to add
     * @return the updated team
     */
    @PostMapping("/{id}/showdown-usernames")
    public ResponseEntity<TeamDTO.Response> addShowdownUsername(
            @PathVariable Long id,
            @RequestParam Long userId,
            @Valid @RequestBody TeamDTO.ShowdownUsernameRequest request) {

        log.info("Adding showdown username '{}' to team: {}", request.getUsername(), id);

        Team updatedTeam = teamService.addShowdownUsername(id, userId, request.getUsername());
        TeamService.TeamStats stats = teamService.getTeamStats(updatedTeam.getId());
        TeamDTO.Response response = teamMapper.toDTO(updatedTeam, stats);

        return ResponseEntity.ok(response);
    }

    /**
     * Remove a showdown username from a team
     * DELETE /api/teams/{id}/showdown-usernames/{username}?userId={userId}
     *
     * @param id the team ID
     * @param userId the user ID (for ownership verification)
     * @param username the username to remove
     * @return the updated team
     */
    @DeleteMapping("/{id}/showdown-usernames/{username}")
    public ResponseEntity<TeamDTO.Response> removeShowdownUsername(
            @PathVariable Long id,
            @RequestParam Long userId,
            @PathVariable String username) {

        log.info("Removing showdown username '{}' from team: {}", username, id);

        Team updatedTeam = teamService.removeShowdownUsername(id, userId, username);
        TeamService.TeamStats stats = teamService.getTeamStats(updatedTeam.getId());
        TeamDTO.Response response = teamMapper.toDTO(updatedTeam, stats);

        return ResponseEntity.ok(response);
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