package com.yeskatronics.vs_recorder_backend.utils;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;

import java.util.*;
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

    /**
     * Battle data extracted from battle log
     */
    @Data
    public static class BattleData {
        private String winner;
        private Map<String, String> players; // "p1" -> "Username", "p2" -> "Username"
        private Map<String, List<String>> teams; // "p1" -> [pokemon], "p2" -> [pokemon]
        private Map<String, List<String>> actualPicks; // "p1" -> [pokemon brought to battle]
        private Map<String, List<TeraEvent>> teraEvents; // "p1" -> [tera events]
        private Map<String, EloChange> eloChanges; // "p1" -> elo data
        private Map<String, Map<String, Map<String, Integer>>> moveUsage; // "p1" -> {pokemon -> {move -> count}}
    }

    @Data
    public static class TeraEvent {
        private String pokemon;
        private String type;

        public TeraEvent(String pokemon, String type) {
            this.pokemon = pokemon;
            this.type = type;
        }
    }

    @Data
    public static class EloChange {
        private Integer before;
        private Integer after;
        private Integer change;

        public EloChange(Integer before, Integer after) {
            this.before = before;
            this.after = after;
            this.change = after != null && before != null ? after - before : null;
        }
    }

    /**
     * Extract battle data (winner, players, teams) from battle log JSON
     *
     * @param battleLogJson the battle log JSON string
     * @param userShowdownUsernames list of user's Showdown usernames to identify which player is the user
     * @return BattleData with winner, players, and teams
     */
    public static BattleData extractBattleData(String battleLogJson, List<String> userShowdownUsernames) {
        BattleData data = new BattleData();
        data.setPlayers(new HashMap<>());
        data.setTeams(new HashMap<>());
        data.getTeams().put("p1", new ArrayList<>());
        data.getTeams().put("p2", new ArrayList<>());
        data.setActualPicks(new HashMap<>());
        data.getActualPicks().put("p1", new ArrayList<>());
        data.getActualPicks().put("p2", new ArrayList<>());
        data.setTeraEvents(new HashMap<>());
        data.getTeraEvents().put("p1", new ArrayList<>());
        data.getTeraEvents().put("p2", new ArrayList<>());
        data.setEloChanges(new HashMap<>());
        data.setMoveUsage(new HashMap<>());
        data.getMoveUsage().put("p1", new HashMap<>());
        data.getMoveUsage().put("p2", new HashMap<>());

        if (battleLogJson == null || battleLogJson.isEmpty()) {
            return data;
        }

        try {
            JsonNode root = objectMapper.readTree(battleLogJson);
            String logText = root.path("log").asText();

            if (logText.isEmpty()) {
                return data;
            }

            String[] lines = logText.split("\n");
            Set<String> seenPokemon = new HashSet<>();
            Map<String, Set<String>> switchedIn = new HashMap<>();
            switchedIn.put("p1", new HashSet<>());
            switchedIn.put("p2", new HashSet<>());

            // Map position (p1a, p2a, etc.) to species name for handling nicknames
            Map<String, String> positionToSpecies = new HashMap<>();

            for (String line : lines) {
                // Extract player names: |player|p1|Username|...
                if (line.startsWith("|player|")) {
                    String[] parts = line.split("\\|");
                    if (parts.length >= 4) {
                        String player = parts[2];
                        String username = parts[3];
                        data.getPlayers().put(player, username);
                    }
                }
                // Extract winner: |win|Username
                else if (line.startsWith("|win|")) {
                    String[] parts = line.split("\\|");
                    if (parts.length >= 3) {
                        data.setWinner(parts[2]);
                    }
                }
                // Extract team rosters: |poke|p1|PokemonName|...
                else if (line.startsWith("|poke|")) {
                    String[] parts = line.split("\\|");
                    if (parts.length >= 4) {
                        String player = parts[2];
                        String pokemonName = parts[3].split(",")[0];
                        pokemonName = pokemonName.replaceAll("\\s*,\\s*[MF]\\s*$", "");

                        String uniqueKey = player + ":" + pokemonName;
                        if (!seenPokemon.contains(uniqueKey)) {
                            data.getTeams().get(player).add(pokemonName);
                            seenPokemon.add(uniqueKey);
                        }
                    }
                }
                // Parse open team sheet (|showteam|) to resolve hidden formes (e.g., Urshifu-*)
                else if (line.startsWith("|showteam|")) {
                    String[] parts = line.split("\\|");
                    if (parts.length >= 4) {
                        String player = parts[2];
                        String teamData = parts[3];

                        // Parse team data: Pokemon||Item|Ability|Moves...
                        String[] pokemons = teamData.split("\\]");
                        List<String> team = data.getTeams().get(player);
                        if (team != null) {
                            for (String pokeData : pokemons) {
                                String otsName = pokeData.split("\\|")[0].trim();
                                if (otsName.isEmpty()) continue;

                                // Replace wildcard entries (e.g., "Urshifu-*") with resolved forme
                                for (int i = 0; i < team.size(); i++) {
                                    if (team.get(i).contains("-*")) {
                                        String baseName = team.get(i).replace("-*", "");
                                        if (otsName.startsWith(baseName)) {
                                            team.set(i, otsName);
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                // Extract switch-ins to determine actual picks: |switch|p1a: Nickname|Species, L50, F
                else if (line.startsWith("|switch|") || line.startsWith("|drag|")) {
                    String[] parts = line.split("\\|");
                    if (parts.length >= 4) {
                        String playerPoke = parts[2]; // "p1a: Nickname"
                        String position = playerPoke.split(":")[0].trim(); // "p1a"
                        String player = position.substring(0, 2); // "p1" or "p2"
                        String speciesData = parts[3]; // "Species, L50, F" or "Species"
                        String pokemonName = speciesData.split(",")[0].trim(); // Extract species name

                        // Resolve wildcard team entries (e.g., "Urshifu-*" → "Urshifu-Rapid-Strike")
                        List<String> team = data.getTeams().get(player);
                        if (team != null) {
                            for (int i = 0; i < team.size(); i++) {
                                if (team.get(i).contains("-*")) {
                                    String baseName = team.get(i).replace("-*", "");
                                    if (pokemonName.startsWith(baseName)) {
                                        team.set(i, pokemonName);
                                        break;
                                    }
                                }
                            }
                        }

                        // Resolve to team roster entry to handle form changes
                        // (e.g., "Ogerpon-Hearthflame-Tera" → "Ogerpon-Hearthflame")
                        String resolvedName = resolveToTeamEntry(data.getTeams().get(player), pokemonName);

                        // Store position -> species mapping for tera event lookups
                        positionToSpecies.put(position, resolvedName);

                        // Add to actualPicks if not already there
                        if (!switchedIn.get(player).contains(resolvedName)) {
                            switchedIn.get(player).add(resolvedName);
                            data.getActualPicks().get(player).add(resolvedName);
                        }
                    }
                }
                // Extract terastallization: |-terastallize|p1a: Nickname|Type
                else if (line.startsWith("|-terastallize|")) {
                    String[] parts = line.split("\\|");
                    if (parts.length >= 4) {
                        String playerPoke = parts[2]; // "p1a: Nickname"
                        String position = playerPoke.split(":")[0].trim(); // "p1a"
                        String player = position.substring(0, 2); // "p1" or "p2"
                        String teraType = parts[3].toLowerCase();

                        // Look up the actual species from the position mapping
                        String pokemonName = positionToSpecies.getOrDefault(position, "Unknown");

                        data.getTeraEvents().get(player).add(new TeraEvent(pokemonName, teraType));
                    }
                }
                // Extract move usage: |move|p1a: Nickname|Move Name|p2a: Target
                else if (line.startsWith("|move|")) {
                    String[] parts = line.split("\\|");
                    if (parts.length >= 3) {
                        String playerPoke = parts[2]; // "p1a: Nickname"
                        String position = playerPoke.split(":")[0].trim(); // "p1a"
                        String player = position.substring(0, 2); // "p1" or "p2"
                        String moveName = parts[3]; // "Move Name"

                        // Look up the actual species from the position mapping
                        String pokemonName = positionToSpecies.getOrDefault(position, "Unknown");

                        if (pokemonName != null && !pokemonName.equals("Unknown")) {
                            // Get or create the pokemon's move usage map
                            Map<String, Map<String, Integer>> playerMoveUsage = data.getMoveUsage().get(player);
                            Map<String, Integer> pokemonMoveUsage = playerMoveUsage.computeIfAbsent(pokemonName, k -> new HashMap<>());

                            // Increment move count
                            pokemonMoveUsage.put(moveName, pokemonMoveUsage.getOrDefault(moveName, 0) + 1);
                        }
                    }
                }
                // Extract ELO ratings: |raw|Username's rating: 1279 &rarr; <strong>1294</strong><br />(+15 for winning)
                else if (line.startsWith("|raw|") && line.contains("rating:")) {
                    try {
                        // Extract username
                        String username = line.substring(5, line.indexOf("'s rating:")).trim();

                        // Extract ratings using regex to handle HTML tags
                        // Pattern: "BEFORE &rarr; <strong>AFTER</strong>"
                        java.util.regex.Pattern ratingPattern = java.util.regex.Pattern.compile("(\\d+)\\s*&rarr;\\s*<strong>(\\d+)</strong>");
                        java.util.regex.Matcher matcher = ratingPattern.matcher(line);

                        if (matcher.find()) {
                            Integer before = Integer.parseInt(matcher.group(1));
                            Integer after = Integer.parseInt(matcher.group(2));

                            // Find which player this username belongs to
                            for (Map.Entry<String, String> entry : data.getPlayers().entrySet()) {
                                if (entry.getValue().equalsIgnoreCase(username)) {
                                    data.getEloChanges().put(entry.getKey(), new EloChange(before, after));
                                    break;
                                }
                            }
                        }
                    } catch (Exception e) {
                        log.debug("Could not parse ELO from raw line: {}", line);
                    }
                }
            }

        } catch (Exception e) {
            log.error("Error extracting battle data: {}", e.getMessage());
        }

        return data;
    }

    /**
     * Resolve a switch species name to its matching team roster entry.
     * Handles in-battle form changes where a suffix is appended to the team entry name
     * (e.g., "Ogerpon-Hearthflame-Tera" → "Ogerpon-Hearthflame",
     *  future: "Charizard-Mega-Y" → "Charizard").
     *
     * Does NOT resolve when the switch name is a different form than the team entry
     * (e.g., "Urshifu-Rapid-Strike" stays as-is when team has "Urshifu-*").
     */
    private static String resolveToTeamEntry(List<String> team, String pokemonName) {
        if (team == null) return pokemonName;

        // Exact match
        if (team.contains(pokemonName)) {
            return pokemonName;
        }

        // Check if any team entry is a prefix of the switch name (handles added suffixes
        // like -Tera, -Mega-X, etc.)
        for (String entry : team) {
            if (pokemonName.startsWith(entry + "-")) {
                return entry;
            }
        }

        // Check for wildcard entries (e.g., "Urshifu-*")
        for (String entry : team) {
            if (entry.contains("-*")) {
                String baseName = entry.replace("-*", "");
                if (pokemonName.startsWith(baseName)) {
                    return pokemonName; // Return the specific forme
                }
            }
        }

        return pokemonName;
    }
}