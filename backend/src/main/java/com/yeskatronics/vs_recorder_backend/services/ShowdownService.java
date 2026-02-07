package com.yeskatronics.vs_recorder_backend.services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeskatronics.vs_recorder_backend.dto.ShowdownDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

    private static final String SHOWDOWN_REPLAY_BASE = "https://replay.pokemonshowdown.com";
    private static final Pattern REPLAY_URL_PATTERN = Pattern.compile(
            "https://replay\\.pokemonshowdown\\.com/([^/?]+)"
    );

    /**
     * Fetch replay data from Pokemon Showdown
     *
     * @param replayUrl the Pokemon Showdown replay URL
     * @param userShowdownNames list of user's showdown usernames to identify their side
     * @return parsed replay data
     * @throws IllegalArgumentException if URL is invalid or fetch fails
     */
    public ShowdownDTO.ReplayData fetchReplayData(String replayUrl, java.util.List<String> userShowdownNames) {
        log.info("Fetching replay data from: {}", replayUrl);

        // Validate URL format
        Matcher matcher = REPLAY_URL_PATTERN.matcher(replayUrl);
        if (!matcher.find()) {
            throw new IllegalArgumentException("Invalid Pokemon Showdown replay URL");
        }

        String battleId = matcher.group(1);
        String jsonUrl = SHOWDOWN_REPLAY_BASE + "/" + battleId + ".json";

        try {
            // Fetch JSON data from Showdown
            long startTime = System.currentTimeMillis();
            log.debug("Fetching from: {}", jsonUrl);
            String jsonResponse = restTemplate.getForObject(jsonUrl, String.class);
            long fetchDuration = System.currentTimeMillis() - startTime;
            log.info("Fetched replay JSON from Showdown in {}ms", fetchDuration);

            if (jsonResponse == null || jsonResponse.isEmpty()) {
                throw new IllegalArgumentException("Failed to fetch replay data");
            }

            // Parse JSON
            JsonNode root = objectMapper.readTree(jsonResponse);

            // Extract battle log
            String battleLog = jsonResponse; // Store full JSON

            // Extract metadata
            String player1 = root.get("players").get(0).asText();
            String player2 = root.get("players").get(1).asText();
            String format = root.path("format").asText();

            // Extract winner from log
            String logText = root.path("log").asText();
            String winner = extractWinner(logText);

            // Determine user's side and opponent
            String userPlayer = null;
            String opponent = null;

            for (String username : userShowdownNames) {
                if (player1.equalsIgnoreCase(username)) {
                    userPlayer = player1;
                    opponent = player2;
                    break;
                } else if (player2.equalsIgnoreCase(username)) {
                    userPlayer = player2;
                    opponent = player1;
                    break;
                }
            }

            // If no match found, use player1 as default user
            if (userPlayer == null) {
                log.warn("Could not identify user in replay, defaulting to player1");
                userPlayer = player1;
                opponent = player2;
            }

            // Determine result
            String result = determineResult(userPlayer, winner);

            // Extract timestamp
            LocalDateTime date = extractTimestamp(root);

            log.info("Successfully fetched replay: {} vs {} ({})", userPlayer, opponent, result);

            return new ShowdownDTO.ReplayData(battleLog, opponent, result, date, format, player1, player2);

        } catch (Exception e) {
            log.error("Error fetching replay data: {}", e.getMessage(), e);
            throw new IllegalArgumentException("Failed to fetch or parse replay data: " + e.getMessage());
        }
    }

    /**
     * Extract winner from battle log
     */
    private String extractWinner(String logText) {
        // Look for |win| line in log
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
    private String determineResult(String userPlayer, String winner) {
        if (winner == null) {
            return "unknown";
        }

        return userPlayer.equalsIgnoreCase(winner) ? "win" : "loss";
    }

    /**
     * Extract timestamp from replay JSON
     */
    private LocalDateTime extractTimestamp(JsonNode root) {
        try {
            // Try to extract uploadtime or other timestamp field
            if (root.has("uploadtime")) {
                long timestamp = root.path("uploadtime").asLong();
                return LocalDateTime.ofEpochSecond(timestamp, 0, java.time.ZoneOffset.UTC);
            }

            // If no timestamp, use current time
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