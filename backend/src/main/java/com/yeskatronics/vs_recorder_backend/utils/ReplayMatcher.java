package com.yeskatronics.vs_recorder_backend.utils;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * TODO: consolidate log parsing
 * Utility for detecting and matching Bo3 replay sets from Pokemon Showdown battle logs.
 *
 * Showdown Bo3 logs contain:
 * - Tier line: |tier|[Gen 9] VGC 2026 Reg F (Bo3)
 * - Best-of line: |uhtml|bestof|<h2><strong>Game 1</strong> of <a href="/game-bestof3-...-matchid">
 *
 * The match ID in the href is shared across all games in the Bo3 set.
 *
 * For Bo1 replays:
 * - Tier line: |tier|[Gen 9] VGC 2026 Reg F (without "Bo3")
 * - No bestof line present
 */
@Slf4j
public class ReplayMatcher {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    // Pattern to extract game number and match ID from bestof line
    // Example: |uhtml|bestof|<h2><strong>Game 2</strong> of <a href="/game-bestof3-gen9vgc2026regfbo3-2493790532-owbra3llb90b5mu5sg8dkkq3yx8s6uqpw">
    private static final Pattern BESTOF_PATTERN = Pattern.compile(
            "\\|uhtml\\|bestof\\|.*?<strong>Game (\\d+)</strong>.*?href=\"/game-bestof3-([^\"]+)\""
    );

    // Pattern to check if tier contains "Bo3"
    private static final Pattern BO3_TIER_PATTERN = Pattern.compile("\\|tier\\|.*?\\(Bo3\\)");

    /**
     * Bo3 match information extracted from battle log
     */
    @Data
    public static class Bo3MatchInfo {
        private String matchId;         // Shared match ID across all games
        private int gameNumber;         // 1, 2, or 3
        private boolean isBo3;          // true if this is a Bo3 replay

        public Bo3MatchInfo(String matchId, int gameNumber) {
            this.matchId = matchId;
            this.gameNumber = gameNumber;
            this.isBo3 = true;
        }

        /**
         * Create a Bo1 match info (not part of a Bo3)
         */
        public static Bo3MatchInfo createBo1() {
            Bo3MatchInfo info = new Bo3MatchInfo(null, 0);
            info.isBo3 = false;
            return info;
        }
    }

    /**
     * Parse Bo3 information from a battle log JSON
     *
     * @param battleLogJson the battle log JSON string
     * @return Bo3 match info, or Bo1 info if not a Bo3 replay
     */
    public static Bo3MatchInfo parseBattleLog(String battleLogJson) {
        if (battleLogJson == null || battleLogJson.isEmpty()) {
            log.debug("Empty battle log, treating as Bo1");
            return Bo3MatchInfo.createBo1();
        }

        try {
            // Parse JSON to get the log field
            JsonNode root = objectMapper.readTree(battleLogJson);
            String logText = root.path("log").asText();

            if (logText.isEmpty()) {
                log.debug("No log field in battle log JSON, treating as Bo1");
                return Bo3MatchInfo.createBo1();
            }

            // Check if tier contains "Bo3"
            Matcher tierMatcher = BO3_TIER_PATTERN.matcher(logText);
            if (!tierMatcher.find()) {
                log.debug("Tier does not contain 'Bo3', treating as Bo1");
                return Bo3MatchInfo.createBo1();
            }

            // Extract game number and match ID from bestof line
            Matcher bestofMatcher = BESTOF_PATTERN.matcher(logText);
            if (bestofMatcher.find()) {
                int gameNumber = Integer.parseInt(bestofMatcher.group(1));
                String matchId = bestofMatcher.group(2);

                log.debug("Detected Bo3 - Game {}, Match ID: {}", gameNumber, matchId);
                return new Bo3MatchInfo(matchId, gameNumber);
            }

            // Tier says Bo3 but no bestof line found - shouldn't happen but treat as Bo1
            log.warn("Tier indicates Bo3 but no bestof line found, treating as Bo1");
            return Bo3MatchInfo.createBo1();

        } catch (Exception e) {
            log.error("Error parsing battle log for Bo3 info: {}", e.getMessage());
            return Bo3MatchInfo.createBo1();
        }
    }

    /**
     * Check if a battle log is from a Bo3 replay
     *
     * @param battleLogJson the battle log JSON string
     * @return true if this is a Bo3 replay
     */
    public static boolean isBo3Replay(String battleLogJson) {
        Bo3MatchInfo info = parseBattleLog(battleLogJson);
        return info.isBo3();
    }

    /**
     * Get the game number from a battle log
     *
     * @param battleLogJson the battle log JSON string
     * @return game number (1, 2, 3) or null if Bo1
     */
    public static Integer getGameNumber(String battleLogJson) {
        Bo3MatchInfo info = parseBattleLog(battleLogJson);
        return info.isBo3() ? info.getGameNumber() : null;
    }

    /**
     * Get the match ID from a battle log
     *
     * @param battleLogJson the battle log JSON string
     * @return match ID (shared across all games in Bo3) or null if Bo1
     */
    public static String getMatchId(String battleLogJson) {
        Bo3MatchInfo info = parseBattleLog(battleLogJson);
        return info.isBo3() ? info.getMatchId() : null;
    }

    /**
     * Check if two battle logs are from the same Bo3 match
     *
     * @param battleLog1 first battle log JSON
     * @param battleLog2 second battle log JSON
     * @return true if both are Bo3 and have the same match ID
     */
    public static boolean areSameMatch(String battleLog1, String battleLog2) {
        Bo3MatchInfo info1 = parseBattleLog(battleLog1);
        Bo3MatchInfo info2 = parseBattleLog(battleLog2);

        if (!info1.isBo3() || !info2.isBo3()) {
            return false;
        }

        return info1.getMatchId().equals(info2.getMatchId());
    }
}