package com.yeskatronics.vs_recorder_backend.controllers;

import com.yeskatronics.vs_recorder_backend.dto.ErrorResponse;
import com.yeskatronics.vs_recorder_backend.dto.PlanDTO;
import com.yeskatronics.vs_recorder_backend.security.CustomUserDetailsService;
import com.yeskatronics.vs_recorder_backend.services.PlanSimulationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * Simulated Matchup Planner plans: for each planner entry, what to bring, what that
 * team brings, and how the matchup goes, from the matchup engine.
 *
 * Base path: /api/teams/{teamId}/simulation/plans
 */
@RestController
@RequestMapping("/api/teams/{teamId}/simulation/plans")
@RequiredArgsConstructor
@Tag(name = "Simulation", description = "Matchup engine simulations of a team")
public class PlanSimulationController {

    private final PlanSimulationService planSimulationService;
    private final CustomUserDetailsService userDetailsService;

    @GetMapping
    @Operation(
            summary = "Get the simulated plans of the team's Matchup Planner",
            description = "Each entry's latest plan job and the plan shown, and whether the caller can submit more",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    public ResponseEntity<PlanDTO.StatusResponse> getStatus(
            @PathVariable Long teamId,
            Authentication authentication) {
        Long userId = userDetailsService.getUserIdByUsername(authentication.getName());
        return ResponseEntity.ok(planSimulationService.getStatus(teamId, userId, authentication.getName()));
    }

    @PostMapping
    @Operation(
            summary = "Simulate plans for Matchup Planner entries",
            description = "Queues one job per entry and starts the engine once. Each entry gets an outcome: "
                    + "queued, or why not (already running, up to date, daily cap, unreadable paste). Owner only.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "202", description = "Submitted; see each entry's outcome"),
            @ApiResponse(responseCode = "400", description = "Unsupported regulation, the team's own paste is unreadable, or an entry isn't in the planner",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Not allowed, or simulations are off",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<PlanDTO.SubmitResponse> submit(
            @PathVariable Long teamId,
            @Valid @RequestBody PlanDTO.SubmitRequest request,
            Authentication authentication) {
        Long userId = userDetailsService.getUserIdByUsername(authentication.getName());
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(planSimulationService.submit(
                teamId, userId, authentication.getName(), request.getGamePlanTeamIds(), request.isForce()));
    }

    @DeleteMapping("/{gamePlanTeamId}")
    @Operation(
            summary = "Cancel an entry's running plan",
            description = "The job stays unfinished until the engine confirms. Owner only.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    public ResponseEntity<PlanDTO.StatusResponse> cancel(
            @PathVariable Long teamId,
            @PathVariable Long gamePlanTeamId,
            Authentication authentication) {
        Long userId = userDetailsService.getUserIdByUsername(authentication.getName());
        return ResponseEntity.ok(planSimulationService.cancel(teamId, gamePlanTeamId, userId, authentication.getName()));
    }
}
