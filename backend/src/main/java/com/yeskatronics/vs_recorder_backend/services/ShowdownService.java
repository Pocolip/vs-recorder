package com.yeskatronics.vs_recorder_backend.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeskatronics.vs_recorder_backend.dto.ShowdownDTO;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.entities.TeamMember;
import com.yeskatronics.vs_recorder_backend.utils.PlayerIdentifier;
import com.yeskatronics.vs_recorder_backend.utils.ReplayMatcher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Service for fetching and parsing Pokemon Showdown replay data.
 * Handles communication with Pokemon Showdown API to retrieve battle logs.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ShowdownService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;
    private final PokemonService pokemonService;

    private static final String SHOWDOWN_REPLAY_BASE = "https://replay.pokemonshowdown.com";
    private static final Pattern REPLAY_URL_PATTERN = Pattern.compile(
            "https://replay\\.pokemonshowdown\\.com/([^/?]+)"
    );

    /**
     * Fetch replay data from Pokemon Showdown and identify which side belongs to the
     * team owner using {@link PlayerIdentifier}'s cascading match (name + team → name →
     * team → default p1). Replaces the historical name-only if/else that returned null
     * when both players were registered usernames on the same team (issue #160).
     */
    public ShowdownDTO.ReplayData fetchReplayData(String replayUrl, Team team) {
        log.info("Fetching replay data from: {}", replayUrl);

        try {
            ParsedReplay parsed = fetchAndParse(replayUrl, team);

            String userUsername = parsed.id.userUsername();
            String opponentUsername = parsed.id.opponentUsername();
            if (userUsername == null || userUsername.isBlank()) {
                userUsername = parsed.player1;
                opponentUsername = parsed.player2;
            }

            String result = determineResult(userUsername, parsed.winner);

            log.info("Successfully fetched replay: {} vs {} ({})", userUsername, opponentUsername, result);

            return new ShowdownDTO.ReplayData(
                    parsed.battleLog, opponentUsername, result, parsed.date,
                    parsed.format, parsed.player1, parsed.player2);

        } catch (Exception e) {
            log.error("Error fetching replay data: {}", e.getMessage(), e);
            throw new IllegalArgumentException("Failed to fetch or parse replay data: " + e.getMessage());
        }
    }

    /**
     * Fetch and parse a replay WITHOUT persisting anything, returning the team-of-six the
     * team owner ran in this battle plus enough signal for the bulk-import preview to group
     * replays. {@code matchesTeam} is true when the identified user side's revealed roster
     * matches this team's registered roster; {@code identified} is false when no username or
     * roster signal matched and {@link PlayerIdentifier} fell back to the default p1 side
     * (i.e. the replay likely doesn't involve this team at all).
     */
    public ShowdownDTO.ReplayPreview previewReplay(String replayUrl, Team team) {
        try {
            ParsedReplay parsed = fetchAndParse(replayUrl, team);

            String userPlayer = parsed.id.userPlayer();
            List<String> userTeam = parsed.parsed.getTeams() == null
                    ? Collections.emptyList()
                    : parsed.parsed.getTeams().getOrDefault(userPlayer, Collections.emptyList());

            boolean matchesTeam = PlayerIdentifier.teamMatches(
                    userTeam, parsed.registeredRoster, pokemonService);

            // "identified" means a real signal pointed at one side rather than the p1 default.
            java.util.Map<String, String> players = parsed.parsed.getPlayers();
            java.util.Map<String, List<String>> teams = parsed.parsed.getTeams();
            boolean nameSignal = PlayerIdentifier.nameMatches(
                        players == null ? null : players.get("p1"), parsed.registeredUsernames)
                    || PlayerIdentifier.nameMatches(
                        players == null ? null : players.get("p2"), parsed.registeredUsernames);
            boolean teamSignal = PlayerIdentifier.teamMatches(
                        teams == null ? null : teams.get("p1"), parsed.registeredRoster, pokemonService)
                    || PlayerIdentifier.teamMatches(
                        teams == null ? null : teams.get("p2"), parsed.registeredRoster, pokemonService);
            boolean identified = nameSignal || teamSignal;

            String userUsername = parsed.id.userUsername();
            String opponentUsername = parsed.id.opponentUsername();
            if (userUsername == null || userUsername.isBlank()) {
                userUsername = parsed.player1;
                opponentUsername = parsed.player2;
            }
            String result = determineResult(userUsername, parsed.winner);

            return new ShowdownDTO.ReplayPreview(
                    replayUrl, opponentUsername, result, userTeam, matchesTeam, identified);

        } catch (Exception e) {
            log.error("Error previewing replay data: {}", e.getMessage(), e);
            throw new IllegalArgumentException("Failed to fetch or parse replay data: " + e.getMessage());
        }
    }

    /**
     * Holder for the shared fetch → parse → identify pipeline reused by both
     * {@link #fetchReplayData} and {@link #previewReplay}.
     */
    private static final class ParsedReplay {
        final String battleLog;
        final String player1;
        final String player2;
        final String format;
        final String winner;
        final LocalDateTime date;
        final ReplayMatcher.BattleData parsed;
        final PlayerIdentifier.Identification id;
        final List<String> registeredUsernames;
        final List<String> registeredRoster;

        ParsedReplay(String battleLog, String player1, String player2, String format,
                     String winner, LocalDateTime date, ReplayMatcher.BattleData parsed,
                     PlayerIdentifier.Identification id, List<String> registeredUsernames,
                     List<String> registeredRoster) {
            this.battleLog = battleLog;
            this.player1 = player1;
            this.player2 = player2;
            this.format = format;
            this.winner = winner;
            this.date = date;
            this.parsed = parsed;
            this.id = id;
            this.registeredUsernames = registeredUsernames;
            this.registeredRoster = registeredRoster;
        }
    }

    private ParsedReplay fetchAndParse(String replayUrl, Team team) throws Exception {
        Matcher matcher = REPLAY_URL_PATTERN.matcher(replayUrl);
        if (!matcher.find()) {
            throw new IllegalArgumentException("Invalid Pokemon Showdown replay URL");
        }

        String battleId = matcher.group(1);
        String jsonUrl = SHOWDOWN_REPLAY_BASE + "/" + battleId + ".json";

        long startTime = System.currentTimeMillis();
        log.debug("Fetching from: {}", jsonUrl);
        String jsonResponse = restTemplate.getForObject(jsonUrl, String.class);
        long fetchDuration = System.currentTimeMillis() - startTime;
        log.info("Fetched replay JSON from Showdown in {}ms", fetchDuration);

        if (jsonResponse == null || jsonResponse.isEmpty()) {
            throw new IllegalArgumentException("Failed to fetch replay data");
        }

        JsonNode root = objectMapper.readTree(jsonResponse);
        String battleLog = jsonResponse;

        String player1 = root.get("players").get(0).asText();
        String player2 = root.get("players").get(1).asText();
        String format = root.path("format").asText();

        String logText = root.path("log").asText();
        String winner = extractWinner(logText);
        LocalDateTime date = extractTimestamp(root);

        List<String> registeredUsernames = team.getShowdownUsernames() == null
                ? Collections.emptyList()
                : team.getShowdownUsernames();
        List<String> registeredRoster = team.getTeamMembers() == null
                ? Collections.emptyList()
                : team.getTeamMembers().stream()
                    .map(TeamMember::getPokemonName)
                    .collect(Collectors.toList());

        ReplayMatcher.BattleData parsed = ReplayMatcher.extractBattleData(
                battleLog, registeredUsernames);

        PlayerIdentifier.Identification id = PlayerIdentifier.identify(
                registeredUsernames,
                registeredRoster,
                parsed.getPlayers(),
                parsed.getTeams(),
                pokemonService
        );

        return new ParsedReplay(battleLog, player1, player2, format, winner, date,
                parsed, id, registeredUsernames, registeredRoster);
    }

    /**
     * Extract winner from battle log
     */
    String extractWinner(String logText) {
        Pattern winPattern = Pattern.compile("\\|win\\|([^\\n]+)");
        Matcher matcher = winPattern.matcher(logText);

        if (matcher.find()) {
            return matcher.group(1).trim();
        }

        return null;
    }

    /**
     * Determine if the user won or lost
     */
    String determineResult(String userPlayer, String winner) {
        if (winner == null) {
            return "unknown";
        }
        if (userPlayer == null) {
            return "unknown";
        }

        return userPlayer.equalsIgnoreCase(winner) ? "win" : "loss";
    }

    /**
     * Extract timestamp from replay JSON
     */
    private LocalDateTime extractTimestamp(JsonNode root) {
        try {
            if (root.has("uploadtime")) {
                long timestamp = root.path("uploadtime").asLong();
                return LocalDateTime.ofEpochSecond(timestamp, 0, java.time.ZoneOffset.UTC);
            }
            return LocalDateTime.now();
        } catch (Exception e) {
            log.warn("Failed to extract timestamp, using current time: {}", e.getMessage());
            return LocalDateTime.now();
        }
    }

    /**
     * Validate a replay URL format
     */
    public boolean isValidReplayUrl(String url) {
        return REPLAY_URL_PATTERN.matcher(url).matches();
    }
}
