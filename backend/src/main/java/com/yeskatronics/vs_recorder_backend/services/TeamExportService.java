package com.yeskatronics.vs_recorder_backend.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeskatronics.vs_recorder_backend.dto.ExportDTO;
import com.yeskatronics.vs_recorder_backend.entities.*;
import com.yeskatronics.vs_recorder_backend.exceptions.RateLimitExceededException;
import com.yeskatronics.vs_recorder_backend.repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Service for exporting team data and generating share codes.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TeamExportService {

    private final TeamExportRepository teamExportRepository;
    private final TeamRepository teamRepository;
    private final ReplayRepository replayRepository;
    private final MatchRepository matchRepository;
    private final GamePlanRepository gamePlanRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final TeamAccessService teamAccessService;
    private final ObjectMapper objectMapper;

    // Rate limiting: 10 codes per user per day
    private static final int DAILY_CODE_LIMIT = 10;

    // Characters for code generation (excluding ambiguous: 0,1,I,O)
    private static final String CODE_CHARACTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    /** 32^8, about a trillion codes; codes made before were 6 characters and still work. */
    private static final int CODE_LENGTH = 8;
    /** Codes a user may look up and not find, per hour: enough for typos, not for guessing. */
    static final int MAX_FAILED_LOOKUPS_PER_HOUR = 20;
    private static final Duration FAILED_LOOKUP_WINDOW = Duration.ofHours(1);
    private static final int MAX_CODE_GENERATION_ATTEMPTS = 10;

    private final SecureRandom secureRandom = new SecureRandom();
    /** Each user's recent failed lookups. In memory: there's one backend, and a restart only forgets an hour. */
    private final Map<Long, Deque<Instant>> failedLookups = new ConcurrentHashMap<>();

    /**
     * Compile export data for a team
     */
    @Transactional(readOnly = true)
    public ExportDTO.ExportData compileExportData(Long teamId, Long userId, ExportDTO.ExportOptions options) {
        log.info("Compiling export data for team ID: {} with options: {}", teamId, options);

        // Allow any caller with team access to export (collaborators can fork into their own copy).
        Team team = teamAccessService.resolve(teamId, userId).getTeam();

        // Build team data
        ExportDTO.TeamData teamData = ExportDTO.TeamData.builder()
                .name(team.getName())
                .pokepaste(team.getPokepaste())
                .regulation(team.getRegulation())
                .showdownUsernames(new ArrayList<>(team.getShowdownUsernames()))
                .build();

        // Build team member data
        if (options.isIncludeTeamMembers()) {
            List<TeamMember> members = teamMemberRepository.findByTeamIdOrderBySlotAsc(teamId);
            List<ExportDTO.TeamMemberData> teamMembers = members.stream()
                    .map(m -> ExportDTO.TeamMemberData.builder()
                            .pokemonName(m.getPokemonName())
                            .slot(m.getSlot())
                            .notes(m.getNotes())
                            .calcs(new ArrayList<>(m.getCalcs()))
                            .build())
                    .collect(Collectors.toList());
            teamData.setTeamMembers(teamMembers);
        }

        // Build replay data
        List<ExportDTO.ReplayData> replays = new ArrayList<>();
        if (options.isIncludeReplays()) {
            List<Replay> replayEntities = replayRepository.findByTeamId(teamId);
            replays = replayEntities.stream()
                    .map(r -> ExportDTO.ReplayData.builder()
                            .url(r.getUrl())
                            .battleLog(r.getBattleLog())
                            .opponent(r.getOpponent())
                            .result(r.getResult())
                            .gameNumber(r.getGameNumber())
                            .date(r.getDate())
                            .notes(options.isIncludeReplayNotes() ? r.getNotes() : null)
                            .build())
                    .collect(Collectors.toList());
        }

        // Build match data
        List<ExportDTO.MatchData> matches = new ArrayList<>();
        if (options.isIncludeReplays()) {
            List<Match> matchEntities = matchRepository.findByTeamId(teamId);
            matches = matchEntities.stream()
                    .map(m -> ExportDTO.MatchData.builder()
                            .opponent(m.getOpponent())
                            .notes(options.isIncludeMatchNotes() ? m.getNotes() : null)
                            .tags(new ArrayList<>(m.getTags()))
                            .replayUrls(m.getReplays().stream()
                                    .map(Replay::getUrl)
                                    .collect(Collectors.toList()))
                            .build())
                    .collect(Collectors.toList());
        }

        // Build opponent plan data
        List<ExportDTO.OpponentPlanData> opponentPlans = new ArrayList<>();
        if (options.isIncludeOpponentPlans()) {
            Optional<GamePlan> gamePlan = gamePlanRepository.findFirstByTeamIdAndUserId(teamId, userId);
            if (gamePlan.isPresent()) {
                opponentPlans = gamePlan.get().getTeams().stream()
                        .map(gpt -> ExportDTO.OpponentPlanData.builder()
                                .pokepaste(gpt.getPokepaste())
                                .notes(gpt.getNotes())
                                .compositions(gpt.getCompositions() != null ?
                                        gpt.getCompositions().stream()
                                                .map(c -> ExportDTO.CompositionData.builder()
                                                        .lead1(c.getLead1())
                                                        .lead2(c.getLead2())
                                                        .back1(c.getBack1())
                                                        .back2(c.getBack2())
                                                        .notes(c.getNotes())
                                                        .build())
                                                .collect(Collectors.toList())
                                        : new ArrayList<>())
                                .build())
                        .collect(Collectors.toList());
            }
        }

        return ExportDTO.ExportData.builder()
                .version("1.0")
                .exportedAt(LocalDateTime.now())
                .options(options)
                .team(teamData)
                .replays(replays)
                .matches(matches)
                .opponentPlans(opponentPlans)
                .build();
    }

    /**
     * Generate a share code for a team export
     */
    public ExportDTO.ExportCodeResponse generateExportCode(Long teamId, Long userId, ExportDTO.ExportOptions options) {
        log.info("Generating export code for team ID: {}", teamId);

        // Check rate limit
        checkRateLimit(userId);

        // Compile export data
        ExportDTO.ExportData exportData = compileExportData(teamId, userId, options);

        // Convert to JSON
        String jsonData;
        try {
            jsonData = objectMapper.writeValueAsString(exportData);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize export data", e);
        }

        // Calculate checksum
        String checksum = calculateChecksum(jsonData);

        // Check if identical export already exists
        Optional<TeamExport> existingExport = teamExportRepository.findByTeamIdAndDataChecksum(teamId, checksum);
        if (existingExport.isPresent()) {
            log.info("Found existing export with same checksum, returning existing code");
            TeamExport existing = existingExport.get();
            return ExportDTO.ExportCodeResponse.builder()
                    .code(existing.getCode())
                    .teamName(existing.getTeamName())
                    .createdAt(existing.getCreatedAt())
                    .expiresAt(existing.getExpiresAt())
                    .isExisting(true)
                    .build();
        }

        // Generate unique code
        String code = generateUniqueCode();

        // Convert options to JSON
        String optionsJson;
        try {
            optionsJson = objectMapper.writeValueAsString(options);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to serialize export options", e);
        }

        // Create and save export
        TeamExport teamExport = new TeamExport();
        teamExport.setCode(code);
        teamExport.setUserId(userId);
        teamExport.setTeamId(teamId);
        teamExport.setTeamName(exportData.getTeam().getName());
        teamExport.setExportData(jsonData);
        teamExport.setDataChecksum(checksum);
        teamExport.setExportOptions(optionsJson);
        // No expiration by default - codes persist indefinitely

        TeamExport saved = teamExportRepository.save(teamExport);
        log.info("Export code generated successfully: {}", code);

        return ExportDTO.ExportCodeResponse.builder()
                .code(saved.getCode())
                .teamName(saved.getTeamName())
                .createdAt(saved.getCreatedAt())
                .expiresAt(saved.getExpiresAt())
                .isExisting(false)
                .build();
    }

    /**
     * Get export data by share code
     */
    @Transactional(readOnly = true)
    public ExportDTO.ExportData getExportByCode(String code, Long userId) {
        checkLookupLimit(userId);

        String normalizedCode = code.toUpperCase().trim();

        TeamExport export = teamExportRepository.findByCode(normalizedCode).orElse(null);
        if (export == null) {
            recordFailedLookup(userId);
            throw new IllegalArgumentException("Export not found with that code");
        }

        // Check expiration
        if (export.getExpiresAt() != null && export.getExpiresAt().isBefore(LocalDateTime.now())) {
            recordFailedLookup(userId);
            throw new IllegalArgumentException("Export code has expired");
        }

        try {
            return objectMapper.readValue(export.getExportData(), ExportDTO.ExportData.class);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Failed to parse export data", e);
        }
    }

    /**
     * Get rate limit status for a user
     */
    @Transactional(readOnly = true)
    public ExportDTO.RateLimitStatus getRateLimitStatus(Long userId) {
        LocalDateTime dayStart = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        int codesCreatedToday = teamExportRepository.countByUserIdAndCreatedAtAfter(userId, dayStart);

        return ExportDTO.RateLimitStatus.builder()
                .codesCreatedToday(codesCreatedToday)
                .dailyLimit(DAILY_CODE_LIMIT)
                .remaining(Math.max(0, DAILY_CODE_LIMIT - codesCreatedToday))
                .resetsAt(dayStart.plusDays(1))
                .build();
    }

    /**
     * Get all exports for a user
     */
    @Transactional(readOnly = true)
    public List<ExportDTO.ExportSummary> getUserExports(Long userId) {
        return teamExportRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(e -> ExportDTO.ExportSummary.builder()
                        .id(e.getId())
                        .code(e.getCode())
                        .teamName(e.getTeamName())
                        .teamId(e.getTeamId())
                        .createdAt(e.getCreatedAt())
                        .expiresAt(e.getExpiresAt())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Delete an export code (only the owner can delete)
     */
    public void deleteExport(Long exportId, Long userId) {
        TeamExport export = teamExportRepository.findById(exportId)
                .orElseThrow(() -> new IllegalArgumentException("Export not found"));

        if (!export.getUserId().equals(userId)) {
            throw new IllegalArgumentException("You can only delete your own exports");
        }

        teamExportRepository.delete(export);
        log.info("Export {} deleted by user {}", exportId, userId);
    }

    // ==================== Private Helper Methods ====================

    private void checkRateLimit(Long userId) {
        LocalDateTime dayStart = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
        int codesCreatedToday = teamExportRepository.countByUserIdAndCreatedAtAfter(userId, dayStart);

        if (codesCreatedToday >= DAILY_CODE_LIMIT) {
            throw new IllegalStateException(
                    String.format("Rate limit exceeded. You can create up to %d export codes per day. Try again tomorrow.",
                            DAILY_CODE_LIMIT));
        }
    }

    private void checkLookupLimit(Long userId) {
        Deque<Instant> failures = failedLookups.get(userId);
        if (failures == null) {
            return;
        }
        synchronized (failures) {
            Instant cutoff = Instant.now().minus(FAILED_LOOKUP_WINDOW);
            while (!failures.isEmpty() && failures.peekFirst().isBefore(cutoff)) {
                failures.pollFirst();
            }
            if (failures.size() >= MAX_FAILED_LOOKUPS_PER_HOUR) {
                throw new RateLimitExceededException(
                        "Too many share codes not found. Check the code and try again in an hour.");
            }
        }
    }

    private void recordFailedLookup(Long userId) {
        Deque<Instant> failures = failedLookups.computeIfAbsent(userId, id -> new ArrayDeque<>());
        synchronized (failures) {
            failures.addLast(Instant.now());
        }
    }

    private String generateUniqueCode() {
        for (int attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
            String code = generateRandomCode();
            if (!teamExportRepository.existsByCode(code)) {
                return code;
            }
            log.warn("Code collision on attempt {}, retrying...", attempt + 1);
        }
        throw new RuntimeException("Failed to generate unique code after " + MAX_CODE_GENERATION_ATTEMPTS + " attempts");
    }

    private String generateRandomCode() {
        StringBuilder code = new StringBuilder(CODE_LENGTH);
        for (int i = 0; i < CODE_LENGTH; i++) {
            int index = secureRandom.nextInt(CODE_CHARACTERS.length());
            code.append(CODE_CHARACTERS.charAt(index));
        }
        return code.toString();
    }

    private String calculateChecksum(String data) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not available", e);
        }
    }
}
