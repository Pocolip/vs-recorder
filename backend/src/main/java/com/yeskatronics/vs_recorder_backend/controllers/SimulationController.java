package com.yeskatronics.vs_recorder_backend.controllers;

import com.yeskatronics.vs_recorder_backend.dto.ErrorResponse;
import com.yeskatronics.vs_recorder_backend.dto.SimulationDTO;
import com.yeskatronics.vs_recorder_backend.entities.SimulationJob;
import com.yeskatronics.vs_recorder_backend.security.CustomUserDetailsService;
import com.yeskatronics.vs_recorder_backend.services.SimulationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Locale;

/**
 * A team's matchup engine simulation: the engine plays the team against the meta's top
 * teams, and the result fills the "Simulated" analytics and the Diagnostics page.
 *
 * Base path: /api/teams/{teamId}/simulation
 */
@RestController
@RequestMapping("/api/teams/{teamId}/simulation")
@RequiredArgsConstructor
@Tag(name = "Simulation", description = "Matchup engine simulations of a team")
public class SimulationController {

    private final SimulationService simulationService;
    private final CustomUserDetailsService userDetailsService;

    @GetMapping
    @Operation(
            summary = "Get the team's simulation status",
            description = "Whether simulations are enabled and can be run, the latest job, and the result the analytics pages show",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    public ResponseEntity<SimulationDTO.StatusResponse> getStatus(
            @PathVariable Long teamId,
            Authentication authentication) {
        Long userId = userDetailsService.getUserIdByUsername(authentication.getName());
        return ResponseEntity.ok(simulationService.getStatus(teamId, userId, authentication.getName()));
    }

    @PostMapping
    @Operation(
            summary = "Run a simulation of the team",
            description = "Queues a matchup engine job for the team's current paste. Owner only.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "202", description = "Job queued"),
            @ApiResponse(responseCode = "400", description = "Unsupported regulation or unreadable paste",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Not allowed, or simulations are off",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "409", description = "A job is unfinished (simulation_unfinished), or the paste is unchanged (simulation_unchanged)",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "429", description = "Daily cap reached",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<SimulationDTO.StatusResponse> submit(
            @PathVariable Long teamId,
            @Parameter(description = "quick (fast games only) or full (the best-placed opponents also played carefully)")
            @RequestParam(defaultValue = "full") String depth,
            @Parameter(description = "Re-run even if the paste is unchanged since the last complete result")
            @RequestParam(defaultValue = "false") boolean force,
            Authentication authentication) {
        SimulationJob.Depth parsed = switch (depth.toLowerCase(Locale.ROOT)) {
            case "quick" -> SimulationJob.Depth.QUICK;
            case "full" -> SimulationJob.Depth.FULL;
            default -> throw new IllegalArgumentException("depth must be quick or full");
        };
        Long userId = userDetailsService.getUserIdByUsername(authentication.getName());
        return ResponseEntity.status(HttpStatus.ACCEPTED)
                .body(simulationService.submit(teamId, userId, authentication.getName(), parsed, force));
    }

    @DeleteMapping
    @Operation(
            summary = "Cancel the team's running simulation",
            description = "The job stays unfinished until the engine confirms. Owner only.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    public ResponseEntity<SimulationDTO.StatusResponse> cancel(
            @PathVariable Long teamId,
            Authentication authentication) {
        Long userId = userDetailsService.getUserIdByUsername(authentication.getName());
        return ResponseEntity.ok(simulationService.cancel(teamId, userId, authentication.getName()));
    }

    @GetMapping("/diagnostics")
    @Operation(
            summary = "Get the simulation's diagnostics",
            description = "What each team member adds when brought, and which opposing Pokémon hurt the team. Rates are 0-1.",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Diagnostics"),
            @ApiResponse(responseCode = "404", description = "No simulation result yet",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class)))
    })
    public ResponseEntity<SimulationDTO.DiagnosticsResponse> getDiagnostics(
            @PathVariable Long teamId,
            Authentication authentication) {
        Long userId = userDetailsService.getUserIdByUsername(authentication.getName());
        return ResponseEntity.ok(simulationService.getDiagnostics(teamId, userId));
    }
}
