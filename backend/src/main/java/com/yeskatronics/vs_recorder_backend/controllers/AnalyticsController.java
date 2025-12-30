package com.yeskatronics.vs_recorder_backend.controllers;

import com.yeskatronics.vs_recorder_backend.dto.AnalyticsDTO;
import com.yeskatronics.vs_recorder_backend.dto.ErrorResponse;
import com.yeskatronics.vs_recorder_backend.security.CustomUserDetailsService;
import com.yeskatronics.vs_recorder_backend.services.AnalyticsService;
import com.yeskatronics.vs_recorder_backend.services.TeamService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for Analytics operations.
 * Provides statistical analysis of battle replays.
 *
 * Base path: /api/teams/{teamId}/analytics
 */
@RestController
@RequestMapping("/api/teams/{teamId}/analytics")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Analytics", description = "Battle replay analytics and statistics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final TeamService teamService;
    private final CustomUserDetailsService userDetailsService;

    /**
     * Helper method to get user ID from authentication
     */
    private Long getCurrentUserId(Authentication authentication) {
        String username = authentication.getName();
        return userDetailsService.getUserIdByUsername(username);
    }

    /**
     * Helper method to verify team ownership
     */
    private void verifyTeamOwnership(Long teamId, Long userId) {
        teamService.getTeamByIdAndUserId(teamId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found or access denied"));
    }

    /**
     * Get usage statistics for a team
     * GET /api/teams/{teamId}/analytics/usage
     *
     * @param teamId the team ID
     * @param authentication the authenticated user
     * @return usage statistics including Pokemon usage, lead pairs, and win rates
     */
    @GetMapping("/usage")
    @Operation(
            summary = "Get team usage statistics",
            description = "Analyze Pokemon usage rates, lead pairs, and win rates for a team",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Usage statistics retrieved successfully",
                    content = @Content(schema = @Schema(implementation = AnalyticsDTO.UsageStatsResponse.class))
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Team not found or access denied",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))
            )
    })
    public ResponseEntity<AnalyticsDTO.UsageStatsResponse> getUsageStats(
            @Parameter(description = "Team ID", required = true)
            @PathVariable Long teamId,
            Authentication authentication) {

        Long userId = getCurrentUserId(authentication);
        log.debug("Fetching usage stats for team: {} (user: {})", teamId, userId);

        // Verify ownership
        verifyTeamOwnership(teamId, userId);

        AnalyticsDTO.UsageStatsResponse stats = analyticsService.getUsageStats(teamId);
        return ResponseEntity.ok(stats);
    }

    /**
     * Get matchup statistics for a team
     * GET /api/teams/{teamId}/analytics/matchups
     *
     * @param teamId the team ID
     * @param authentication the authenticated user
     * @return matchup statistics including best/worst matchups and attendance rates
     */
    @GetMapping("/matchups")
    @Operation(
            summary = "Get team matchup statistics",
            description = "Analyze performance against opponent Pokemon, including win rates and attendance",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Matchup statistics retrieved successfully",
                    content = @Content(schema = @Schema(implementation = AnalyticsDTO.MatchupStatsResponse.class))
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Team not found or access denied",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))
            )
    })
    public ResponseEntity<AnalyticsDTO.MatchupStatsResponse> getMatchupStats(
            @Parameter(description = "Team ID", required = true)
            @PathVariable Long teamId,
            Authentication authentication) {

        Long userId = getCurrentUserId(authentication);
        log.debug("Fetching matchup stats for team: {} (user: {})", teamId, userId);

        // Verify ownership
        verifyTeamOwnership(teamId, userId);

        AnalyticsDTO.MatchupStatsResponse stats = analyticsService.getMatchupStats(teamId);
        return ResponseEntity.ok(stats);
    }

    /**
     * Analyze win rate against a custom opponent team
     * POST /api/teams/{teamId}/analytics/matchups/custom
     *
     * @param teamId the team ID
     * @param authentication the authenticated user
     * @param request the custom opponent team (4-6 Pokemon)
     * @return custom matchup analysis
     */
    @PostMapping("/matchups/custom")
    @Operation(
            summary = "Analyze custom matchup",
            description = "Calculate win rate and statistics against a specific opponent team composition",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Custom matchup analysis retrieved successfully",
                    content = @Content(schema = @Schema(implementation = AnalyticsDTO.CustomMatchupResponse.class))
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid request - must provide 4-6 Pokemon",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Team not found or access denied",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))
            )
    })
    public ResponseEntity<AnalyticsDTO.CustomMatchupResponse> getCustomMatchupAnalysis(
            @Parameter(description = "Team ID", required = true)
            @PathVariable Long teamId,
            Authentication authentication,
            @Valid @RequestBody AnalyticsDTO.CustomMatchupRequest request) {

        Long userId = getCurrentUserId(authentication);
        log.debug("Analyzing custom matchup for team: {} against: {}", teamId, request.getOpponentPokemon());

        // Verify ownership
        verifyTeamOwnership(teamId, userId);

        // Validate request
        if (request.getOpponentPokemon() == null ||
                request.getOpponentPokemon().size() < 4 ||
                request.getOpponentPokemon().size() > 6) {
            throw new IllegalArgumentException("Must provide 4-6 Pokemon for custom matchup analysis");
        }

        AnalyticsDTO.CustomMatchupResponse stats = analyticsService.getCustomMatchupAnalysis(teamId, request);
        return ResponseEntity.ok(stats);
    }

    /**
     * Get move usage statistics for a team
     * GET /api/teams/{teamId}/analytics/moves
     *
     * @param teamId the team ID
     * @param authentication the authenticated user
     * @return move usage statistics per Pokemon
     */
    @GetMapping("/moves")
    @Operation(
            summary = "Get move usage statistics",
            description = "Analyze which moves are used most frequently by each Pokemon and their win rates",
            security = @SecurityRequirement(name = "bearerAuth")
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Move usage statistics retrieved successfully",
                    content = @Content(schema = @Schema(implementation = AnalyticsDTO.MoveUsageResponse.class))
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Team not found or access denied",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))
            )
    })
    public ResponseEntity<AnalyticsDTO.MoveUsageResponse> getMoveUsageStats(
            @Parameter(description = "Team ID", required = true)
            @PathVariable Long teamId,
            Authentication authentication) {

        Long userId = getCurrentUserId(authentication);
        log.debug("Fetching move usage stats for team: {} (user: {})", teamId, userId);

        // Verify ownership
        verifyTeamOwnership(teamId, userId);

        AnalyticsDTO.MoveUsageResponse stats = analyticsService.getMoveUsageStats(teamId);
        return ResponseEntity.ok(stats);
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
                400,
                "Bad Request",
                ex.getMessage(),
                requestPath != null ? requestPath : "/api/teams/{teamId}/analytics"
        );

        return ResponseEntity.badRequest().body(error);
    }
}