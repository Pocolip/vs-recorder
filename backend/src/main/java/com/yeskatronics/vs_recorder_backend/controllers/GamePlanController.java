package com.yeskatronics.vs_recorder_backend.controllers;

import com.yeskatronics.vs_recorder_backend.dto.GamePlanDTO;
import com.yeskatronics.vs_recorder_backend.entities.GamePlan;
import com.yeskatronics.vs_recorder_backend.entities.GamePlanTeam;
import com.yeskatronics.vs_recorder_backend.mappers.GamePlanMapper;
import com.yeskatronics.vs_recorder_backend.security.CustomUserDetailsService;
import com.yeskatronics.vs_recorder_backend.services.GamePlanService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for Game Plan management.
 * Provides endpoints for tournament/match preparation planning.
 */
@RestController
@RequestMapping("/api/game-plans")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Game Plans", description = "Tournament and match preparation planning")
public class GamePlanController {

    private final GamePlanService gamePlanService;
    private final GamePlanMapper gamePlanMapper;
    private final CustomUserDetailsService userDetailsService;

    // ==================== GamePlan Endpoints ====================

    @Operation(summary = "Create a new game plan", description = "Create a new game plan for tournament/match preparation")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Game plan created successfully",
                    content = @Content(schema = @Schema(implementation = GamePlanDTO.GamePlanResponse.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @PostMapping
    public ResponseEntity<GamePlanDTO.GamePlanResponse> createGamePlan(
            Authentication authentication,
            @Valid @RequestBody GamePlanDTO.CreateGamePlanRequest request) {

        Long userId = getCurrentUserId(authentication);
        log.info("Creating game plan for user: {}", userId);

        GamePlan gamePlan = gamePlanMapper.toEntity(request);
        GamePlan savedPlan = gamePlanService.createGamePlan(gamePlan, userId);
        GamePlanDTO.GamePlanResponse response = gamePlanMapper.toResponse(savedPlan);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(summary = "Get all game plans", description = "Get all game plans for the authenticated user")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved game plans"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @GetMapping
    public ResponseEntity<List<GamePlanDTO.GamePlanSummary>> getGamePlans(Authentication authentication) {
        Long userId = getCurrentUserId(authentication);
        log.info("Fetching game plans for user: {}", userId);

        List<GamePlan> gamePlans = gamePlanService.getGamePlansByUserId(userId);
        List<GamePlanDTO.GamePlanSummary> response = gamePlanMapper.toSummaryList(gamePlans);

        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Get game plan by ID", description = "Get a specific game plan with all teams and compositions")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved game plan",
                    content = @Content(schema = @Schema(implementation = GamePlanDTO.GamePlanResponse.class))),
            @ApiResponse(responseCode = "404", description = "Game plan not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @GetMapping("/{id}")
    public ResponseEntity<GamePlanDTO.GamePlanResponse> getGamePlan(
            @PathVariable Long id,
            Authentication authentication) {

        Long userId = getCurrentUserId(authentication);
        log.info("Fetching game plan: {}", id);

        GamePlan gamePlan = gamePlanService.getGamePlanByIdAndUserId(id, userId)
                .orElseThrow(() -> new IllegalArgumentException("Game plan not found"));

        GamePlanDTO.GamePlanResponse response = gamePlanMapper.toResponse(gamePlan);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Update game plan", description = "Update game plan name and/or notes")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Game plan updated successfully",
                    content = @Content(schema = @Schema(implementation = GamePlanDTO.GamePlanResponse.class))),
            @ApiResponse(responseCode = "404", description = "Game plan not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @PatchMapping("/{id}")
    public ResponseEntity<GamePlanDTO.GamePlanResponse> updateGamePlan(
            @PathVariable Long id,
            Authentication authentication,
            @Valid @RequestBody GamePlanDTO.UpdateGamePlanRequest request) {

        Long userId = getCurrentUserId(authentication);
        log.info("Updating game plan: {}", id);

        GamePlan updates = gamePlanMapper.toEntity(new GamePlanDTO.CreateGamePlanRequest(
                request.getName(), request.getNotes(), null));
        GamePlan updatedPlan = gamePlanService.updateGamePlan(id, userId, updates);
        GamePlanDTO.GamePlanResponse response = gamePlanMapper.toResponse(updatedPlan);

        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Delete game plan", description = "Delete a game plan and all associated teams")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Game plan deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Game plan not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGamePlan(
            @PathVariable Long id,
            Authentication authentication) {

        Long userId = getCurrentUserId(authentication);
        log.info("Deleting game plan: {}", id);

        gamePlanService.deleteGamePlan(id, userId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Get or create game plan for team",
               description = "Get existing game plan for a team or create a new one if none exists")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Game plan retrieved or created successfully",
                    content = @Content(schema = @Schema(implementation = GamePlanDTO.GamePlanResponse.class))),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @PostMapping("/for-team/{teamId}")
    public ResponseEntity<GamePlanDTO.GamePlanResponse> getOrCreateForTeam(
            @PathVariable Long teamId,
            Authentication authentication,
            @RequestParam(required = false) String name) {

        Long userId = getCurrentUserId(authentication);
        log.info("Getting or creating game plan for team: {} user: {}", teamId, userId);

        String planName = name != null ? name : "Opponent Plans";
        GamePlan gamePlan = gamePlanService.getOrCreateGamePlanForTeam(teamId, userId, planName);
        GamePlanDTO.GamePlanResponse response = gamePlanMapper.toResponse(gamePlan);

        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Get game plan for team",
               description = "Get existing game plan for a specific team (returns 404 if none exists)")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Game plan retrieved successfully",
                    content = @Content(schema = @Schema(implementation = GamePlanDTO.GamePlanResponse.class))),
            @ApiResponse(responseCode = "404", description = "No game plan found for this team"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @GetMapping("/for-team/{teamId}")
    public ResponseEntity<GamePlanDTO.GamePlanResponse> getForTeam(
            @PathVariable Long teamId,
            Authentication authentication) {

        Long userId = getCurrentUserId(authentication);
        log.info("Getting game plan for team: {} user: {}", teamId, userId);

        GamePlan gamePlan = gamePlanService.getGamePlanByTeamIdAndUserId(teamId, userId)
                .orElseThrow(() -> new IllegalArgumentException("No game plan found for this team"));
        GamePlanDTO.GamePlanResponse response = gamePlanMapper.toResponse(gamePlan);

        return ResponseEntity.ok(response);
    }

    // ==================== GamePlanTeam Endpoints ====================

    @Operation(summary = "Add team to game plan", description = "Add an opponent team (pokepaste) to a game plan")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Team added successfully",
                    content = @Content(schema = @Schema(implementation = GamePlanDTO.GamePlanTeamResponse.class))),
            @ApiResponse(responseCode = "404", description = "Game plan not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @PostMapping("/{gamePlanId}/teams")
    public ResponseEntity<GamePlanDTO.GamePlanTeamResponse> addTeam(
            @PathVariable Long gamePlanId,
            Authentication authentication,
            @Valid @RequestBody GamePlanDTO.AddTeamRequest request) {

        Long userId = getCurrentUserId(authentication);
        log.info("Adding team to game plan: {}", gamePlanId);

        GamePlanTeam team = gamePlanMapper.toEntity(request);
        GamePlanTeam savedTeam = gamePlanService.addTeamToGamePlan(gamePlanId, userId, team);
        GamePlanDTO.GamePlanTeamResponse response = gamePlanMapper.toResponse(savedTeam);

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @Operation(summary = "Get teams in game plan", description = "Get all opponent teams in a game plan")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully retrieved teams"),
            @ApiResponse(responseCode = "404", description = "Game plan not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @GetMapping("/{gamePlanId}/teams")
    public ResponseEntity<List<GamePlanDTO.GamePlanTeamResponse>> getTeams(
            @PathVariable Long gamePlanId,
            Authentication authentication) {

        Long userId = getCurrentUserId(authentication);
        log.info("Fetching teams for game plan: {}", gamePlanId);

        // Verify ownership
        gamePlanService.getGamePlanByIdAndUserId(gamePlanId, userId)
                .orElseThrow(() -> new IllegalArgumentException("Game plan not found"));

        List<GamePlanTeam> teams = gamePlanService.getTeamsByGamePlanId(gamePlanId);
        List<GamePlanDTO.GamePlanTeamResponse> response = gamePlanMapper.toResponseList(teams);

        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Update team", description = "Update team pokepaste and/or notes")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Team updated successfully",
                    content = @Content(schema = @Schema(implementation = GamePlanDTO.GamePlanTeamResponse.class))),
            @ApiResponse(responseCode = "404", description = "Team not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @PatchMapping("/{gamePlanId}/teams/{teamId}")
    public ResponseEntity<GamePlanDTO.GamePlanTeamResponse> updateTeam(
            @PathVariable Long gamePlanId,
            @PathVariable Long teamId,
            Authentication authentication,
            @Valid @RequestBody GamePlanDTO.UpdateTeamRequest request) {

        Long userId = getCurrentUserId(authentication);
        log.info("Updating team: {} in game plan: {}", teamId, gamePlanId);

        GamePlanTeam updates = gamePlanMapper.toEntity(new GamePlanDTO.AddTeamRequest(
                request.getPokepaste(), request.getNotes()));
        GamePlanTeam updatedTeam = gamePlanService.updateGamePlanTeam(teamId, gamePlanId, userId, updates);
        GamePlanDTO.GamePlanTeamResponse response = gamePlanMapper.toResponse(updatedTeam);

        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Delete team", description = "Remove a team from game plan")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Team deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Team not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @DeleteMapping("/{gamePlanId}/teams/{teamId}")
    public ResponseEntity<Void> deleteTeam(
            @PathVariable Long gamePlanId,
            @PathVariable Long teamId,
            Authentication authentication) {

        Long userId = getCurrentUserId(authentication);
        log.info("Deleting team: {} from game plan: {}", teamId, gamePlanId);

        gamePlanService.deleteGamePlanTeam(teamId, gamePlanId, userId);
        return ResponseEntity.noContent().build();
    }

    // ==================== Composition Endpoints ====================

    @Operation(summary = "Add composition", description = "Add a team composition (leads + backs) to an opponent team")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Composition added successfully",
                    content = @Content(schema = @Schema(implementation = GamePlanDTO.GamePlanTeamResponse.class))),
            @ApiResponse(responseCode = "404", description = "Team not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @PostMapping("/{gamePlanId}/teams/{teamId}/compositions")
    public ResponseEntity<GamePlanDTO.GamePlanTeamResponse> addComposition(
            @PathVariable Long gamePlanId,
            @PathVariable Long teamId,
            Authentication authentication,
            @Valid @RequestBody GamePlanDTO.AddCompositionRequest request) {

        Long userId = getCurrentUserId(authentication);
        log.info("Adding composition to team: {}", teamId);

        GamePlanTeam.TeamComposition composition = request.getComposition().toEntity();
        GamePlanTeam updatedTeam = gamePlanService.addComposition(teamId, gamePlanId, userId, composition);
        GamePlanDTO.GamePlanTeamResponse response = gamePlanMapper.toResponse(updatedTeam);

        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Update composition", description = "Update a team composition by index")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Composition updated successfully",
                    content = @Content(schema = @Schema(implementation = GamePlanDTO.GamePlanTeamResponse.class))),
            @ApiResponse(responseCode = "404", description = "Team or composition not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @PatchMapping("/{gamePlanId}/teams/{teamId}/compositions")
    public ResponseEntity<GamePlanDTO.GamePlanTeamResponse> updateComposition(
            @PathVariable Long gamePlanId,
            @PathVariable Long teamId,
            Authentication authentication,
            @Valid @RequestBody GamePlanDTO.UpdateCompositionRequest request) {

        Long userId = getCurrentUserId(authentication);
        log.info("Updating composition {} in team: {}", request.getIndex(), teamId);

        GamePlanTeam.TeamComposition composition = request.getComposition().toEntity();
        GamePlanTeam updatedTeam = gamePlanService.updateComposition(
                teamId, gamePlanId, userId, request.getIndex(), composition);
        GamePlanDTO.GamePlanTeamResponse response = gamePlanMapper.toResponse(updatedTeam);

        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Delete composition", description = "Delete a team composition by index")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Composition deleted successfully",
                    content = @Content(schema = @Schema(implementation = GamePlanDTO.GamePlanTeamResponse.class))),
            @ApiResponse(responseCode = "404", description = "Team or composition not found"),
            @ApiResponse(responseCode = "401", description = "Unauthorized")
    })
    @DeleteMapping("/{gamePlanId}/teams/{teamId}/compositions/{index}")
    public ResponseEntity<GamePlanDTO.GamePlanTeamResponse> deleteComposition(
            @PathVariable Long gamePlanId,
            @PathVariable Long teamId,
            @PathVariable Integer index,
            Authentication authentication) {

        Long userId = getCurrentUserId(authentication);
        log.info("Deleting composition {} from team: {}", index, teamId);

        GamePlanTeam updatedTeam = gamePlanService.deleteComposition(teamId, gamePlanId, userId, index);
        GamePlanDTO.GamePlanTeamResponse response = gamePlanMapper.toResponse(updatedTeam);

        return ResponseEntity.ok(response);
    }

    // ==================== Helper Methods ====================

    private Long getCurrentUserId(Authentication authentication) {
        String username = authentication.getName();
        return userDetailsService.getUserIdByUsername(username);
    }
}