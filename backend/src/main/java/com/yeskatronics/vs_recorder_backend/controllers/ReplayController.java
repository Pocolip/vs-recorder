package com.yeskatronics.vs_recorder_backend.controllers;

import com.yeskatronics.vs_recorder_backend.dto.ErrorResponse;
import com.yeskatronics.vs_recorder_backend.dto.ReplayDTO;
import com.yeskatronics.vs_recorder_backend.entities.Replay;
import com.yeskatronics.vs_recorder_backend.mappers.ReplayMapper;
import com.yeskatronics.vs_recorder_backend.services.ReplayService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

/**
 * REST Controller for Replay operations.
 * Handles replay CRUD, filtering, and match association.
 *
 * Base path: /api/replays
 */
@RestController
@RequestMapping("/api/replays")
@RequiredArgsConstructor
@Slf4j
public class ReplayController {

    private final ReplayService replayService;
    private final ReplayMapper replayMapper;

    /**
     * Create a replay from URL (will fetch battle log from Showdown)
     * POST /api/replays/from-url?teamId={teamId}
     *
     * @param teamId the team ID
     * @param request the replay URL and optional notes
     * @return the created replay
     */
    @PostMapping("/from-url")
    public ResponseEntity<ReplayDTO.Summary> createReplayFromUrl(
            @RequestParam Long teamId,
            @Valid @RequestBody ReplayDTO.CreateFromUrlRequest request) {

        log.info("Creating replay from URL for team: {}", teamId);

        Replay savedReplay = replayService.createReplayFromUrl(teamId, request.getUrl());

        // Update notes if provided
        if (request.getNotes() != null && !request.getNotes().isEmpty()) {
            Replay updates = new Replay();
            updates.setNotes(request.getNotes());
            savedReplay = replayService.updateReplay(savedReplay.getId(), updates);
        }

        ReplayDTO.Summary response = replayMapper.toSummaryDTO(savedReplay);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Create a replay with full data (manual creation)
     * POST /api/replays?teamId={teamId}
     *
     * @param teamId the team ID
     * @param request the replay creation request with all data
     * @return the created replay
     */
    @PostMapping
    public ResponseEntity<ReplayDTO.Response> createReplay(
            @RequestParam Long teamId,
            @Valid @RequestBody ReplayDTO.CreateRequest request) {

        log.info("Creating replay for team: {}", teamId);

        Replay replay = replayMapper.toEntity(request);
        Replay savedReplay = replayService.createReplay(replay, teamId);
        ReplayDTO.Response response = replayMapper.toDTO(savedReplay);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get replay by ID
     * GET /api/replays/{id}
     *
     * @param id the replay ID
     * @return the replay with full battle log
     */
    @GetMapping("/{id}")
    public ResponseEntity<ReplayDTO.Response> getReplayById(@PathVariable Long id) {
        log.debug("Fetching replay by ID: {}", id);

        return replayService.getReplayById(id)
                .map(replayMapper::toDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get all replays for a team
     * GET /api/replays?teamId={teamId}
     *
     * @param teamId the team ID
     * @return list of replays (summary without battle logs)
     */
    @GetMapping
    public ResponseEntity<List<ReplayDTO.Summary>> getReplaysByTeamId(@RequestParam Long teamId) {
        log.debug("Fetching replays for team: {}", teamId);

        List<ReplayDTO.Summary> replays = replayService.getReplaysByTeamIdOrderedByDate(teamId).stream()
                .map(replayMapper::toSummaryDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(replays);
    }

    /**
     * Get standalone replays (not part of any match)
     * GET /api/replays/standalone?teamId={teamId}
     *
     * @param teamId the team ID
     * @return list of standalone replays
     */
    @GetMapping("/standalone")
    public ResponseEntity<List<ReplayDTO.Summary>> getStandaloneReplays(@RequestParam Long teamId) {
        log.debug("Fetching standalone replays for team: {}", teamId);

        List<ReplayDTO.Summary> replays = replayService.getStandaloneReplays(teamId).stream()
                .map(replayMapper::toSummaryDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(replays);
    }

    /**
     * Get replays by match
     * GET /api/replays/match/{matchId}
     *
     * @param matchId the match ID
     * @return list of replays in the match
     */
    @GetMapping("/match/{matchId}")
    public ResponseEntity<List<ReplayDTO.Summary>> getReplaysByMatchId(@PathVariable Long matchId) {
        log.debug("Fetching replays for match: {}", matchId);

        List<ReplayDTO.Summary> replays = replayService.getReplaysByMatchId(matchId).stream()
                .map(replayMapper::toSummaryDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(replays);
    }

    /**
     * Get replays with filters
     * POST /api/replays/filter?teamId={teamId}
     *
     * @param teamId the team ID
     * @param filter the filter criteria
     * @return filtered list of replays
     */
    @PostMapping("/filter")
    public ResponseEntity<List<ReplayDTO.Summary>> getReplaysWithFilters(
            @RequestParam Long teamId,
            @RequestBody ReplayDTO.FilterRequest filter) {

        log.debug("Fetching replays with filters for team: {}", teamId);

        List<ReplayDTO.Summary> replays = replayService.getReplaysWithFilters(
                        teamId,
                        filter.getMatchId(),
                        filter.getOpponent(),
                        filter.getResult(),
                        filter.getStartDate(),
                        filter.getEndDate()
                ).stream()
                .map(replayMapper::toSummaryDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(replays);
    }

    /**
     * Get replays by result (wins or losses)
     * GET /api/replays/result/{result}?teamId={teamId}
     *
     * @param teamId the team ID
     * @param result "win" or "loss"
     * @return list of replays
     */
    @GetMapping("/result/{result}")
    public ResponseEntity<List<ReplayDTO.Summary>> getReplaysByResult(
            @RequestParam Long teamId,
            @PathVariable String result) {

        log.debug("Fetching replays for team: {} with result: {}", teamId, result);

        List<ReplayDTO.Summary> replays = replayService.getReplaysByTeamIdAndResult(teamId, result).stream()
                .map(replayMapper::toSummaryDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(replays);
    }

    /**
     * Get replays by opponent
     * GET /api/replays/opponent/{opponent}?teamId={teamId}
     *
     * @param teamId the team ID
     * @param opponent the opponent name
     * @return list of replays
     */
    @GetMapping("/opponent/{opponent}")
    public ResponseEntity<List<ReplayDTO.Summary>> getReplaysByOpponent(
            @RequestParam Long teamId,
            @PathVariable String opponent) {

        log.debug("Fetching replays for team: {} against opponent: {}", teamId, opponent);

        List<ReplayDTO.Summary> replays = replayService.getReplaysByTeamIdAndOpponent(teamId, opponent).stream()
                .map(replayMapper::toSummaryDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(replays);
    }

    /**
     * Update a replay
     * PATCH /api/replays/{id}
     *
     * @param id the replay ID
     * @param request the update request
     * @return the updated replay
     */
    @PatchMapping("/{id}")
    public ResponseEntity<ReplayDTO.Response> updateReplay(
            @PathVariable Long id,
            @Valid @RequestBody ReplayDTO.UpdateRequest request) {

        log.info("Updating replay: {}", id);

        Replay updates = replayMapper.toEntity(request);
        Replay updatedReplay = replayService.updateReplay(id, updates);
        ReplayDTO.Response response = replayMapper.toDTO(updatedReplay);

        return ResponseEntity.ok(response);
    }

    /**
     * Associate a replay with a match
     * PUT /api/replays/{id}/match
     *
     * @param id the replay ID
     * @param request the match association request
     * @return the updated replay
     */
    @PutMapping("/{id}/match")
    public ResponseEntity<ReplayDTO.Summary> associateReplayWithMatch(
            @PathVariable Long id,
            @Valid @RequestBody ReplayDTO.AssociateMatchRequest request) {

        log.info("Associating replay: {} with match: {}", id, request.getMatchId());

        Replay updatedReplay = replayService.associateReplayWithMatch(id, request.getMatchId());
        ReplayDTO.Summary response = replayMapper.toSummaryDTO(updatedReplay);

        return ResponseEntity.ok(response);
    }

    /**
     * Dissociate a replay from its match
     * DELETE /api/replays/{id}/match
     *
     * @param id the replay ID
     * @return the updated replay
     */
    @DeleteMapping("/{id}/match")
    public ResponseEntity<ReplayDTO.Summary> dissociateReplayFromMatch(@PathVariable Long id) {
        log.info("Dissociating replay: {} from its match", id);

        Replay updatedReplay = replayService.dissociateReplayFromMatch(id);
        ReplayDTO.Summary response = replayMapper.toSummaryDTO(updatedReplay);

        return ResponseEntity.ok(response);
    }

    /**
     * Delete a replay
     * DELETE /api/replays/{id}
     *
     * @param id the replay ID
     * @return no content response
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReplay(@PathVariable Long id) {
        log.info("Deleting replay: {}", id);

        replayService.deleteReplay(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Check if a replay URL exists
     * GET /api/replays/check/url?url={url}
     *
     * @param url the replay URL to check
     * @return boolean indicating if URL exists
     */
    @GetMapping("/check/url")
    public ResponseEntity<Boolean> checkReplayUrlExists(@RequestParam String url) {
        log.debug("Checking if replay URL exists: {}", url);

        boolean exists = replayService.replayUrlExists(url);
        return ResponseEntity.ok(exists);
    }

    /**
     * Get win rate for a team
     * GET /api/replays/stats/win-rate?teamId={teamId}
     *
     * @param teamId the team ID
     * @return win rate percentage
     */
    @GetMapping("/stats/win-rate")
    public ResponseEntity<Double> getWinRate(@RequestParam Long teamId) {
        log.debug("Calculating win rate for team: {}", teamId);

        double winRate = replayService.calculateWinRate(teamId);
        return ResponseEntity.ok(winRate);
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
                requestPath != null ? requestPath : "/api/replays"
        );

        return ResponseEntity.badRequest().body(error);
    }
}