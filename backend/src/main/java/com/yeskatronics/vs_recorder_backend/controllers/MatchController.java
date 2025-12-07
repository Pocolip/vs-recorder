package com.yeskatronics.vs_recorder_backend.controllers;

import com.yeskatronics.vs_recorder_backend.dto.ErrorResponse;
import com.yeskatronics.vs_recorder_backend.dto.MatchDTO;
import com.yeskatronics.vs_recorder_backend.entities.Match;
import com.yeskatronics.vs_recorder_backend.mappers.MatchMapper;
import com.yeskatronics.vs_recorder_backend.services.MatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * REST Controller for Match operations.
 * Handles Best-of-3 match set CRUD, tags, and statistics.
 *
 * Base path: /api/matches
 */
@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
@Slf4j
public class MatchController {

    private final MatchService matchService;
    private final MatchMapper matchMapper;

    /**
     * Create a new match
     * POST /api/matches?teamId={teamId}
     *
     * @param teamId the team ID
     * @param request the match creation request
     * @return the created match
     */
    @PostMapping
    public ResponseEntity<MatchDTO.Response> createMatch(
            @RequestParam Long teamId,
            @Valid @RequestBody MatchDTO.CreateRequest request) {

        log.info("Creating new match for team: {}", teamId);

        Match match = matchMapper.toEntity(request);
        Match savedMatch = matchService.createMatch(match, teamId);
        MatchService.MatchStats stats = matchService.getMatchStats(savedMatch.getId());
        MatchDTO.Response response = matchMapper.toDTO(savedMatch, stats);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get match by ID
     * GET /api/matches/{id}
     *
     * @param id the match ID
     * @return the match with replays and statistics
     */
    @GetMapping("/{id}")
    public ResponseEntity<MatchDTO.Response> getMatchById(@PathVariable Long id) {
        log.debug("Fetching match by ID: {}", id);

        return matchService.getMatchById(id)
                .map(match -> {
                    MatchService.MatchStats stats = matchService.getMatchStats(match.getId());
                    return matchMapper.toDTO(match, stats);
                })
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get all matches for a team
     * GET /api/matches?teamId={teamId}
     *
     * @param teamId the team ID
     * @return list of matches (summary)
     */
    @GetMapping
    public ResponseEntity<List<MatchDTO.Summary>> getMatchesByTeamId(@RequestParam Long teamId) {
        log.debug("Fetching matches for team: {}", teamId);

        List<MatchDTO.Summary> matches = matchService.getMatchesByTeamIdOrderedByDate(teamId).stream()
                .map(match -> {
                    MatchService.MatchStats stats = matchService.getMatchStats(match.getId());
                    return matchMapper.toSummaryDTO(match, stats);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(matches);
    }

    /**
     * Get all matches for a team with replays loaded
     * GET /api/matches/with-replays?teamId={teamId}
     *
     * @param teamId the team ID
     * @return list of matches with full details
     */
    @GetMapping("/with-replays")
    public ResponseEntity<List<MatchDTO.Response>> getMatchesWithReplays(@RequestParam Long teamId) {
        log.debug("Fetching matches with replays for team: {}", teamId);

        List<MatchDTO.Response> matches = matchService.getMatchesWithReplays(teamId).stream()
                .map(match -> {
                    MatchService.MatchStats stats = matchService.getMatchStats(match.getId());
                    return matchMapper.toDTO(match, stats);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(matches);
    }

    /**
     * Get matches by opponent
     * GET /api/matches/opponent/{opponent}?teamId={teamId}
     *
     * @param teamId the team ID
     * @param opponent the opponent name
     * @return list of matches
     */
    @GetMapping("/opponent/{opponent}")
    public ResponseEntity<List<MatchDTO.Summary>> getMatchesByOpponent(
            @RequestParam Long teamId,
            @PathVariable String opponent) {

        log.debug("Fetching matches for team: {} against opponent: {}", teamId, opponent);

        List<MatchDTO.Summary> matches = matchService.getMatchesByTeamIdAndOpponent(teamId, opponent).stream()
                .map(match -> {
                    MatchService.MatchStats stats = matchService.getMatchStats(match.getId());
                    return matchMapper.toSummaryDTO(match, stats);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(matches);
    }

    /**
     * Get matches by tag
     * GET /api/matches/tag/{tag}?teamId={teamId}
     *
     * @param teamId the team ID
     * @param tag the tag to filter by
     * @return list of matches
     */
    @GetMapping("/tag/{tag}")
    public ResponseEntity<List<MatchDTO.Summary>> getMatchesByTag(
            @RequestParam Long teamId,
            @PathVariable String tag) {

        log.debug("Fetching matches for team: {} with tag: {}", teamId, tag);

        List<MatchDTO.Summary> matches = matchService.getMatchesByTeamIdAndTag(teamId, tag).stream()
                .map(match -> {
                    MatchService.MatchStats stats = matchService.getMatchStats(match.getId());
                    return matchMapper.toSummaryDTO(match, stats);
                })
                .collect(Collectors.toList());

        return ResponseEntity.ok(matches);
    }

    /**
     * Update a match
     * PATCH /api/matches/{id}?teamId={teamId}
     *
     * @param id the match ID
     * @param teamId the team ID (for ownership verification)
     * @param request the update request
     * @return the updated match
     */
    @PatchMapping("/{id}")
    public ResponseEntity<MatchDTO.Response> updateMatch(
            @PathVariable Long id,
            @RequestParam Long teamId,
            @Valid @RequestBody MatchDTO.UpdateRequest request) {

        log.info("Updating match: {} for team: {}", id, teamId);

        Match updates = matchMapper.toEntity(request);
        Match updatedMatch = matchService.updateMatch(id, teamId, updates);
        MatchService.MatchStats stats = matchService.getMatchStats(updatedMatch.getId());
        MatchDTO.Response response = matchMapper.toDTO(updatedMatch, stats);

        return ResponseEntity.ok(response);
    }

    /**
     * Add a tag to a match
     * POST /api/matches/{id}/tags?teamId={teamId}
     *
     * @param id the match ID
     * @param teamId the team ID (for ownership verification)
     * @param request the tag to add
     * @return the updated match
     */
    @PostMapping("/{id}/tags")
    public ResponseEntity<MatchDTO.Response> addTag(
            @PathVariable Long id,
            @RequestParam Long teamId,
            @Valid @RequestBody MatchDTO.TagRequest request) {

        log.info("Adding tag '{}' to match: {}", request.getTag(), id);

        Match updatedMatch = matchService.addTag(id, teamId, request.getTag());
        MatchService.MatchStats stats = matchService.getMatchStats(updatedMatch.getId());
        MatchDTO.Response response = matchMapper.toDTO(updatedMatch, stats);

        return ResponseEntity.ok(response);
    }

    /**
     * Remove a tag from a match
     * DELETE /api/matches/{id}/tags/{tag}?teamId={teamId}
     *
     * @param id the match ID
     * @param teamId the team ID (for ownership verification)
     * @param tag the tag to remove
     * @return the updated match
     */
    @DeleteMapping("/{id}/tags/{tag}")
    public ResponseEntity<MatchDTO.Response> removeTag(
            @PathVariable Long id,
            @RequestParam Long teamId,
            @PathVariable String tag) {

        log.info("Removing tag '{}' from match: {}", tag, id);

        Match updatedMatch = matchService.removeTag(id, teamId, tag);
        MatchService.MatchStats stats = matchService.getMatchStats(updatedMatch.getId());
        MatchDTO.Response response = matchMapper.toDTO(updatedMatch, stats);

        return ResponseEntity.ok(response);
    }

    /**
     * Delete a match
     * DELETE /api/matches/{id}?teamId={teamId}
     *
     * @param id the match ID
     * @param teamId the team ID (for ownership verification)
     * @return no content response
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMatch(
            @PathVariable Long id,
            @RequestParam Long teamId) {

        log.info("Deleting match: {} for team: {}", id, teamId);

        matchService.deleteMatch(id, teamId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Get match statistics
     * GET /api/matches/{id}/stats
     *
     * @param id the match ID
     * @return match statistics
     */
    @GetMapping("/{id}/stats")
    public ResponseEntity<MatchDTO.MatchStats> getMatchStats(@PathVariable Long id) {
        log.debug("Fetching statistics for match: {}", id);

        MatchService.MatchStats stats = matchService.getMatchStats(id);
        MatchDTO.MatchStats response = matchMapper.toStatsDTO(stats);

        return ResponseEntity.ok(response);
    }

    /**
     * Get team-wide match statistics
     * GET /api/matches/stats/team?teamId={teamId}
     *
     * @param teamId the team ID
     * @return team match statistics
     */
    @GetMapping("/stats/team")
    public ResponseEntity<MatchDTO.TeamMatchStatsResponse> getTeamMatchStats(@RequestParam Long teamId) {
        log.debug("Fetching team match statistics for team: {}", teamId);

        MatchService.TeamMatchStats stats = matchService.getTeamMatchStats(teamId);
        MatchDTO.TeamMatchStatsResponse response = matchMapper.toDTO(stats);

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
                requestPath != null ? requestPath : "/api/matches"
        );

        return ResponseEntity.badRequest().body(error);
    }
}