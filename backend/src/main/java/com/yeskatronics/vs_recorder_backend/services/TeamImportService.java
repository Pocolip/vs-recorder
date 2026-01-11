package com.yeskatronics.vs_recorder_backend.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeskatronics.vs_recorder_backend.dto.ExportDTO;
import com.yeskatronics.vs_recorder_backend.entities.*;
import com.yeskatronics.vs_recorder_backend.repositories.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.HtmlUtils;

import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Service for importing team data from share codes or JSON.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class TeamImportService {

    private final TeamExportService teamExportService;
    private final TeamRepository teamRepository;
    private final ReplayRepository replayRepository;
    private final MatchRepository matchRepository;
    private final GamePlanRepository gamePlanRepository;
    private final GamePlanTeamRepository gamePlanTeamRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    // Validation patterns
    private static final Pattern POKEPASTE_URL_PATTERN = Pattern.compile(
            "^https://(pokepast\\.es|pokebin\\.com)/[a-zA-Z0-9]+$"
    );
    private static final Pattern REPLAY_URL_PATTERN = Pattern.compile(
            "^https://replay\\.pokemonshowdown\\.com/[a-zA-Z0-9-]+$"
    );
    private static final int MAX_STRING_LENGTH = 10000;
    private static final int MAX_NOTES_LENGTH = 5000;
    private static final int MAX_NAME_LENGTH = 100;

    /**
     * Import a team from a share code
     */
    public ExportDTO.ImportResult importFromCode(String code, Long userId) {
        log.info("Importing team from code: {} for user: {}", code, userId);

        // Fetch export data
        ExportDTO.ExportData exportData = teamExportService.getExportByCode(code);

        // Import the data
        return importExportData(exportData, userId);
    }

    /**
     * Import a team from JSON string
     */
    public ExportDTO.ImportResult importFromJson(String jsonData, Long userId) {
        log.info("Importing team from JSON for user: {}", userId);

        // Parse JSON
        ExportDTO.ExportData exportData;
        try {
            exportData = objectMapper.readValue(jsonData, ExportDTO.ExportData.class);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("Invalid JSON format: " + e.getMessage());
        }

        // Import the data
        return importExportData(exportData, userId);
    }

    /**
     * Import export data into the user's account
     */
    private ExportDTO.ImportResult importExportData(ExportDTO.ExportData exportData, Long userId) {
        List<String> errors = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        // Validate export data
        validateExportData(exportData, errors);
        if (!errors.isEmpty()) {
            return ExportDTO.ImportResult.builder()
                    .errors(errors)
                    .build();
        }

        // Get user
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Create team
        Team team = createTeamFromExport(exportData.getTeam(), user);
        log.info("Created team with ID: {}", team.getId());

        // Import replays sequentially (parallel imports have transaction isolation issues)
        Map<String, Replay> replaysByUrl = new HashMap<>();
        int replaysImported = 0;
        if (exportData.getReplays() != null && !exportData.getReplays().isEmpty()) {
            log.info("Starting import of {} replays", exportData.getReplays().size());
            long startTime = System.currentTimeMillis();

            for (ExportDTO.ReplayData replayData : exportData.getReplays()) {
                try {
                    Replay replay = createReplayFromExport(replayData, team);
                    replaysByUrl.put(replay.getUrl(), replay);
                    replaysImported++;
                } catch (Exception e) {
                    warnings.add("Failed to import replay: " + replayData.getUrl() + " - " + e.getMessage());
                    log.warn("Failed to import replay: {}", e.getMessage());
                }
            }

            long duration = System.currentTimeMillis() - startTime;
            log.info("Completed replay import in {}ms: {} succeeded out of {}",
                     duration, replaysImported, exportData.getReplays().size());
        }

        // Import matches
        int matchesImported = 0;
        if (exportData.getMatches() != null) {
            for (ExportDTO.MatchData matchData : exportData.getMatches()) {
                try {
                    createMatchFromExport(matchData, team, replaysByUrl);
                    matchesImported++;
                } catch (Exception e) {
                    warnings.add("Failed to import match: " + matchData.getOpponent() + " - " + e.getMessage());
                    log.warn("Failed to import match: {}", e.getMessage());
                }
            }
        }

        // Import opponent plans
        int opponentPlansImported = 0;
        if (exportData.getOpponentPlans() != null && !exportData.getOpponentPlans().isEmpty()) {
            try {
                opponentPlansImported = importOpponentPlans(exportData.getOpponentPlans(), team.getId(), user);
            } catch (Exception e) {
                warnings.add("Failed to import opponent plans: " + e.getMessage());
                log.warn("Failed to import opponent plans: {}", e.getMessage());
            }
        }

        log.info("Import complete: {} replays, {} matches, {} opponent plans",
                replaysImported, matchesImported, opponentPlansImported);

        return ExportDTO.ImportResult.builder()
                .teamId(team.getId())
                .teamName(team.getName())
                .replaysImported(replaysImported)
                .matchesImported(matchesImported)
                .opponentPlansImported(opponentPlansImported)
                .errors(errors)
                .warnings(warnings)
                .build();
    }

    // ==================== Private Helper Methods ====================

    private void validateExportData(ExportDTO.ExportData exportData, List<String> errors) {
        if (exportData == null) {
            errors.add("Export data is null");
            return;
        }

        if (exportData.getTeam() == null) {
            errors.add("Team data is missing");
            return;
        }

        ExportDTO.TeamData teamData = exportData.getTeam();

        // Validate team name
        if (teamData.getName() == null || teamData.getName().trim().isEmpty()) {
            errors.add("Team name is required");
        } else if (teamData.getName().length() > MAX_NAME_LENGTH) {
            errors.add("Team name exceeds maximum length of " + MAX_NAME_LENGTH);
        }

        // Validate pokepaste URL
        if (teamData.getPokepaste() == null || teamData.getPokepaste().trim().isEmpty()) {
            errors.add("Pokepaste URL is required");
        } else if (!POKEPASTE_URL_PATTERN.matcher(teamData.getPokepaste()).matches()) {
            errors.add("Invalid Pokepaste URL format");
        }

        // Validate replays
        if (exportData.getReplays() != null) {
            for (int i = 0; i < exportData.getReplays().size(); i++) {
                ExportDTO.ReplayData replay = exportData.getReplays().get(i);
                if (replay.getUrl() != null && !REPLAY_URL_PATTERN.matcher(replay.getUrl()).matches()) {
                    errors.add("Invalid replay URL format at index " + i);
                }
                if (replay.getBattleLog() != null && replay.getBattleLog().length() > MAX_STRING_LENGTH * 10) {
                    errors.add("Battle log too large at index " + i);
                }
            }
        }

        // Validate opponent plans
        if (exportData.getOpponentPlans() != null) {
            for (int i = 0; i < exportData.getOpponentPlans().size(); i++) {
                ExportDTO.OpponentPlanData plan = exportData.getOpponentPlans().get(i);
                if (plan.getPokepaste() != null && !POKEPASTE_URL_PATTERN.matcher(plan.getPokepaste()).matches()) {
                    errors.add("Invalid opponent pokepaste URL format at index " + i);
                }
            }
        }
    }

    private Team createTeamFromExport(ExportDTO.TeamData teamData, User user) {
        Team team = new Team();
        team.setUser(user);
        team.setName(sanitizeString(teamData.getName(), MAX_NAME_LENGTH));
        team.setPokepaste(teamData.getPokepaste());
        team.setRegulation(sanitizeString(teamData.getRegulation(), 50));

        if (teamData.getShowdownUsernames() != null) {
            team.setShowdownUsernames(teamData.getShowdownUsernames().stream()
                    .map(u -> sanitizeString(u, 50))
                    .filter(u -> !u.isEmpty())
                    .collect(Collectors.toList()));
        }

        return teamRepository.save(team);
    }

    private Replay createReplayFromExport(ExportDTO.ReplayData replayData, Team team) {
        // Check for duplicate URL within the same team only
        if (replayRepository.existsByUrlAndTeamId(replayData.getUrl(), team.getId())) {
            throw new IllegalArgumentException("Replay URL already exists in this team");
        }

        Replay replay = new Replay();
        replay.setTeam(team);
        replay.setUrl(replayData.getUrl());
        replay.setBattleLog(replayData.getBattleLog()); // Already validated for size
        replay.setOpponent(sanitizeString(replayData.getOpponent(), 100));
        replay.setResult(replayData.getResult());
        replay.setGameNumber(replayData.getGameNumber());
        replay.setDate(replayData.getDate());
        replay.setNotes(sanitizeString(replayData.getNotes(), MAX_NOTES_LENGTH));

        return replayRepository.save(replay);
    }

    private Match createMatchFromExport(ExportDTO.MatchData matchData, Team team, Map<String, Replay> replaysByUrl) {
        Match match = new Match();
        match.setTeam(team);
        match.setOpponent(sanitizeString(matchData.getOpponent(), 100));
        match.setNotes(sanitizeString(matchData.getNotes(), MAX_NOTES_LENGTH));

        if (matchData.getTags() != null) {
            match.setTags(matchData.getTags().stream()
                    .map(t -> sanitizeString(t, 50))
                    .filter(t -> !t.isEmpty())
                    .collect(Collectors.toList()));
        }

        Match savedMatch = matchRepository.save(match);

        // Link replays to match
        if (matchData.getReplayUrls() != null) {
            for (String replayUrl : matchData.getReplayUrls()) {
                Replay replay = replaysByUrl.get(replayUrl);
                if (replay != null) {
                    replay.setMatch(savedMatch);
                    replayRepository.save(replay);
                }
            }
        }

        return savedMatch;
    }

    private int importOpponentPlans(List<ExportDTO.OpponentPlanData> opponentPlans, Long teamId, User user) {
        // Create or get game plan for this team
        GamePlan gamePlan = gamePlanRepository.findByTeamIdAndUserId(teamId, user.getId())
                .orElseGet(() -> {
                    GamePlan newPlan = new GamePlan();
                    newPlan.setUser(user);
                    newPlan.setTeamId(teamId);
                    newPlan.setName("Imported Opponent Plans");
                    return gamePlanRepository.save(newPlan);
                });

        int imported = 0;
        for (ExportDTO.OpponentPlanData planData : opponentPlans) {
            GamePlanTeam gamePlanTeam = new GamePlanTeam();
            gamePlanTeam.setGamePlan(gamePlan);
            gamePlanTeam.setPokepaste(planData.getPokepaste());
            gamePlanTeam.setNotes(sanitizeString(planData.getNotes(), MAX_NOTES_LENGTH));

            if (planData.getCompositions() != null) {
                List<GamePlanTeam.TeamComposition> compositions = planData.getCompositions().stream()
                        .map(c -> new GamePlanTeam.TeamComposition(
                                sanitizeString(c.getLead1(), 50),
                                sanitizeString(c.getLead2(), 50),
                                sanitizeString(c.getBack1(), 50),
                                sanitizeString(c.getBack2(), 50),
                                sanitizeString(c.getNotes(), MAX_NOTES_LENGTH)
                        ))
                        .collect(Collectors.toList());
                gamePlanTeam.setCompositions(compositions);
            }

            gamePlanTeamRepository.save(gamePlanTeam);
            imported++;
        }

        return imported;
    }

    /**
     * Sanitize a string for safe storage
     * - HTML escape to prevent XSS
     * - Trim and limit length
     */
    private String sanitizeString(String input, int maxLength) {
        if (input == null) {
            return null;
        }
        String trimmed = input.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        // HTML escape
        String escaped = HtmlUtils.htmlEscape(trimmed);
        // Limit length
        if (escaped.length() > maxLength) {
            escaped = escaped.substring(0, maxLength);
        }
        return escaped;
    }
}
