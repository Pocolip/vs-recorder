package com.yeskatronics.vs_recorder_backend.controllers;

import com.yeskatronics.vs_recorder_backend.dto.ExportDTO;
import com.yeskatronics.vs_recorder_backend.security.CustomUserDetailsService;
import com.yeskatronics.vs_recorder_backend.services.TeamExportService;
import com.yeskatronics.vs_recorder_backend.services.TeamImportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for Team Export/Import operations.
 * Handles export code generation, export retrieval, and imports.
 *
 * Base paths:
 * - /api/teams/{teamId}/export - Export operations for a specific team
 * - /api/export - Public export code lookup
 * - /api/import - Import operations
 */
@RestController
@RequiredArgsConstructor
@Slf4j
public class ExportController {

    private final TeamExportService teamExportService;
    private final TeamImportService teamImportService;
    private final CustomUserDetailsService userDetailsService;

    /**
     * Helper method to get user ID from authentication
     */
    private Long getCurrentUserId(Authentication authentication) {
        String username = authentication.getName();
        return userDetailsService.getUserIdByUsername(username);
    }

    // ==================== Export Operations ====================

    /**
     * Preview export data for a team (without generating code)
     * POST /api/teams/{teamId}/export
     *
     * @param teamId the team ID
     * @param authentication the authenticated user
     * @param options export options (what to include)
     * @return the export data preview
     */
    @PostMapping("/api/teams/{teamId}/export")
    public ResponseEntity<ExportDTO.ExportData> previewExport(
            @PathVariable Long teamId,
            Authentication authentication,
            @RequestBody(required = false) ExportDTO.ExportOptions options) {

        Long userId = getCurrentUserId(authentication);
        log.info("Previewing export for team {} by user {}", teamId, userId);

        // Use default options if not provided
        if (options == null) {
            options = ExportDTO.ExportOptions.builder().build();
        }

        ExportDTO.ExportData exportData = teamExportService.compileExportData(teamId, userId, options);
        return ResponseEntity.ok(exportData);
    }

    /**
     * Generate a share code for a team export
     * POST /api/teams/{teamId}/export/code
     *
     * @param teamId the team ID
     * @param authentication the authenticated user
     * @param options export options (what to include)
     * @return the generated export code
     */
    @PostMapping("/api/teams/{teamId}/export/code")
    public ResponseEntity<ExportDTO.ExportCodeResponse> generateExportCode(
            @PathVariable Long teamId,
            Authentication authentication,
            @RequestBody(required = false) ExportDTO.ExportOptions options) {

        Long userId = getCurrentUserId(authentication);
        log.info("Generating export code for team {} by user {}", teamId, userId);

        // Use default options if not provided
        if (options == null) {
            options = ExportDTO.ExportOptions.builder().build();
        }

        ExportDTO.ExportCodeResponse response = teamExportService.generateExportCode(teamId, userId, options);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Get rate limit status for the current user
     * GET /api/export/rate-limit
     *
     * @param authentication the authenticated user
     * @return rate limit status
     */
    @GetMapping("/api/export/rate-limit")
    public ResponseEntity<ExportDTO.RateLimitStatus> getRateLimitStatus(Authentication authentication) {
        Long userId = getCurrentUserId(authentication);
        ExportDTO.RateLimitStatus status = teamExportService.getRateLimitStatus(userId);
        return ResponseEntity.ok(status);
    }

    /**
     * Get all exports created by the current user
     * GET /api/export/my-exports
     *
     * @param authentication the authenticated user
     * @return list of export summaries
     */
    @GetMapping("/api/export/my-exports")
    public ResponseEntity<List<ExportDTO.ExportSummary>> getMyExports(Authentication authentication) {
        Long userId = getCurrentUserId(authentication);
        List<ExportDTO.ExportSummary> exports = teamExportService.getUserExports(userId);
        return ResponseEntity.ok(exports);
    }

    /**
     * Delete an export (only the owner can delete)
     * DELETE /api/export/{exportId}
     *
     * @param exportId the export ID
     * @param authentication the authenticated user
     * @return no content on success
     */
    @DeleteMapping("/api/export/{exportId}")
    public ResponseEntity<Void> deleteExport(
            @PathVariable Long exportId,
            Authentication authentication) {

        Long userId = getCurrentUserId(authentication);
        log.info("Deleting export {} by user {}", exportId, userId);

        teamExportService.deleteExport(exportId, userId);
        return ResponseEntity.noContent().build();
    }

    // ==================== Public Export Lookup ====================

    /**
     * Get export data by share code (public endpoint - no auth required for viewing)
     * GET /api/export/{code}
     *
     * Note: This endpoint is public to allow sharing export codes.
     * The actual import still requires authentication.
     *
     * @param code the 6-character share code
     * @return the export data
     */
    @GetMapping("/api/export/{code}")
    public ResponseEntity<ExportDTO.ExportData> getExportByCode(@PathVariable String code) {
        log.info("Fetching export by code: {}", code);

        // Basic validation
        if (code == null || code.length() != 6) {
            return ResponseEntity.badRequest().build();
        }

        ExportDTO.ExportData exportData = teamExportService.getExportByCode(code);
        return ResponseEntity.ok(exportData);
    }

    // ==================== Import Operations ====================

    /**
     * Import a team from a share code
     * POST /api/import/code
     *
     * @param authentication the authenticated user
     * @param request the import code request
     * @return the import result
     */
    @PostMapping("/api/import/code")
    public ResponseEntity<ExportDTO.ImportResult> importFromCode(
            Authentication authentication,
            @Valid @RequestBody ExportDTO.ImportCodeRequest request) {

        Long userId = getCurrentUserId(authentication);
        log.info("Importing team from code {} for user {}", request.getCode(), userId);

        ExportDTO.ImportResult result = teamImportService.importFromCode(request.getCode(), userId);

        if (result.getTeamId() == null) {
            return ResponseEntity.badRequest().body(result);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    /**
     * Import a team from JSON data
     * POST /api/import/json
     *
     * @param authentication the authenticated user
     * @param request the import JSON request
     * @return the import result
     */
    @PostMapping("/api/import/json")
    public ResponseEntity<ExportDTO.ImportResult> importFromJson(
            Authentication authentication,
            @Valid @RequestBody ExportDTO.ImportJsonRequest request) {

        Long userId = getCurrentUserId(authentication);
        log.info("Importing team from JSON for user {}", userId);

        ExportDTO.ImportResult result = teamImportService.importFromJson(request.getJsonData(), userId);

        if (result.getTeamId() == null) {
            return ResponseEntity.badRequest().body(result);
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }
}
