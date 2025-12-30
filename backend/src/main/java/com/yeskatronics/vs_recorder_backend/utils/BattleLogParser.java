package com.yeskatronics.vs_recorder_backend.utils;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Utility class for parsing Pokemon Showdown battle logs.
 * Extracts structured data for analytics from raw battle log JSON.
 */
@Slf4j
public class BattleLogParser {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    // Patterns for parsing battle log lines
    private static final Pattern SWITCH_PATTERN = Pattern.compile("\\|switch\\|p([12])([ab]): ([^|]+)\\|([^,|]+)");
    private static final Pattern MOVE_PATTERN = Pattern.compile("\\|move\\|p([12])([ab]): ([^|]+)\\|([^|]+)");
    private static final Pattern TERA_PATTERN = Pattern.compile("\\|-terastallize\\|p([12])([ab]): ([^|]+)\\|([^|]+)");
    private static final Pattern POKE_PATTERN = Pattern.compile("\\|poke\\|p([12])\\|([^,|]+)");

    /**
     * Parsed battle data structure
     */
    @Data
    public static class BattleData {
        private String player1;
        private String player2;
        private List<String> p1Team;      // Team sheet (6 Pokemon)
        private List<String> p2Team;      // Team sheet (6 Pokemon)
        private List<String> p1Picks;     // Actually brought (4 Pokemon)
        private List<String> p2Picks;     // Actually brought (4 Pokemon)
        private List<String> p1Leads;     // First 2 sent out
        private List<String> p2Leads;     // First 2 sent out
        private String p1Tera;            // Pokemon that Terastallized
        private String p2Tera;            // Pokemon that Terastallized
        private Map<String, Set<String>> p1MoveUsage;  // p1 Pokemon -> Set of moves used
        private Map<String, Set<String>> p2MoveUsage;  // p2 Pokemon -> Set of moves used
        private String winner;
        private int turnCount;

        public BattleData() {
            this.p1Team = new ArrayList<>();
            this.p2Team = new ArrayList<>();
            this.p1Picks = new ArrayList<>();
            this.p2Picks = new ArrayList<>();
            this.p1Leads = new ArrayList<>();
            this.p2Leads = new ArrayList<>();
            this.p1MoveUsage = new HashMap<>();
            this.p2MoveUsage = new HashMap<>();
        }
    }

    /**
     * Parse battle log from JSON string
     *
     * @param battleLogJson the battle log JSON from Showdown
     * @return parsed battle data
     */
    public static BattleData parseBattleLog(String battleLogJson) {
        try {
            JsonNode root = objectMapper.readTree(battleLogJson);
            BattleData data = new BattleData();

            // Extract players
            JsonNode playersNode = root.path("players");
            if (playersNode.isArray() && playersNode.size() >= 2) {
                data.setPlayer1(playersNode.get(0).asText());
                data.setPlayer2(playersNode.get(1).asText());
            }

            // Extract battle log text
            String logText = root.path("log").asText();
            if (logText.isEmpty()) {
                log.warn("Battle log is empty");
                return data;
            }

            // Parse log line by line
            String[] lines = logText.split("\n");
            parseLogLines(lines, data);

            // Extract winner from log
            data.setWinner(extractWinner(logText));

            return data;

        } catch (Exception e) {
            log.error("Failed to parse battle log: {}", e.getMessage(), e);
            return new BattleData(); // Return empty data on error
        }
    }

    /**
     * Parse all log lines to extract battle data
     */
    private static void parseLogLines(String[] lines, BattleData data) {
        Set<String> p1Switched = new HashSet<>();
        Set<String> p2Switched = new HashSet<>();
        int leadCount1 = 0;
        int leadCount2 = 0;

        for (String line : lines) {
            line = line.trim();

            // Parse team sheets (|poke|)
            Matcher pokeMatcher = POKE_PATTERN.matcher(line);
            if (pokeMatcher.find()) {
                String player = pokeMatcher.group(1);
                String pokemon = normalizePokemonName(pokeMatcher.group(2));

                if ("1".equals(player)) {
                    data.getP1Team().add(pokemon);
                } else {
                    data.getP2Team().add(pokemon);
                }
                continue;
            }

            // Parse switches (|switch|) - identifies picks and leads
            Matcher switchMatcher = SWITCH_PATTERN.matcher(line);
            if (switchMatcher.find()) {
                String player = switchMatcher.group(1);
                String pokemon = normalizePokemonName(switchMatcher.group(4));

                if ("1".equals(player)) {
                    if (!p1Switched.contains(pokemon)) {
                        p1Switched.add(pokemon);
                        data.getP1Picks().add(pokemon);

                        // First 2 switches are leads
                        if (leadCount1 < 2) {
                            data.getP1Leads().add(pokemon);
                            leadCount1++;
                        }
                    }
                } else {
                    if (!p2Switched.contains(pokemon)) {
                        p2Switched.add(pokemon);
                        data.getP2Picks().add(pokemon);

                        // First 2 switches are leads
                        if (leadCount2 < 2) {
                            data.getP2Leads().add(pokemon);
                            leadCount2++;
                        }
                    }
                }
                continue;
            }

            // Parse moves (|move|)
            Matcher moveMatcher = MOVE_PATTERN.matcher(line);
            if (moveMatcher.find()) {
                String player = moveMatcher.group(1);
                String pokemon = normalizePokemonName(moveMatcher.group(3));
                String move = moveMatcher.group(4);

                if ("1".equals(player)) {
                    data.getP1MoveUsage()
                            .computeIfAbsent(pokemon, k -> new HashSet<>())
                            .add(move);
                } else {
                    data.getP2MoveUsage()
                            .computeIfAbsent(pokemon, k -> new HashSet<>())
                            .add(move);
                }
                continue;
            }

            // Parse Terastallization (|-terastallize|)
            Matcher teraMatcher = TERA_PATTERN.matcher(line);
            if (teraMatcher.find()) {
                String player = teraMatcher.group(1);
                String pokemon = normalizePokemonName(teraMatcher.group(3));

                if ("1".equals(player)) {
                    data.setP1Tera(pokemon);
                } else {
                    data.setP2Tera(pokemon);
                }
                continue;
            }

            // Parse turn count (|turn|)
            if (line.startsWith("|turn|")) {
                try {
                    int turn = Integer.parseInt(line.substring(6).trim());
                    data.setTurnCount(Math.max(data.getTurnCount(), turn));
                } catch (NumberFormatException e) {
                    // Ignore invalid turn numbers
                }
            }
        }
    }

    /**
     * Extract winner from battle log
     */
    private static String extractWinner(String logText) {
        Pattern winPattern = Pattern.compile("\\|win\\|([^\\n]+)");
        Matcher matcher = winPattern.matcher(logText);

        if (matcher.find()) {
            return matcher.group(1).trim();
        }

        return null;
    }

    /**
     * Normalize Pokemon name (remove forme indicators, gender, level)
     * Examples:
     * - "Urshifu-*, L50, F" -> "Urshifu"
     * - "Terapagos-Terastal, L50, M" -> "Terapagos"
     * - "Calyrex-Shadow, L50" -> "Calyrex-Shadow"
     */
    public static String normalizePokemonName(String name) {
        if (name == null || name.isEmpty()) {
            return name;
        }

        // Remove everything after comma (level, gender, etc.)
        int commaIndex = name.indexOf(',');
        if (commaIndex > 0) {
            name = name.substring(0, commaIndex);
        }

        // Remove asterisk forme indicator (Urshifu-*)
        name = name.replace("-*", "");

        // Misc
        name = name
                //genies
                .replace("-Therian", "")
                //dpp
                .replace("-Origin", "")
                //swsh
                .replace("-Crowned", "")
                //greninja
                .replace("-Bond", "")
                .replace("-Ash", "")
                //keldeo
                .replace("-Resolute", "")
                //female
                .replace("-F", "")
                //tauros
                .replace("-Paldea-Aqua", "")
                .replace("-Paldea-Blaze", "")
                .replace("-Paldea-Combat", "")
                //toxtricity
                .replace("-Low-Key", "")
                //maushold
                .replace("-Four", "")
                //dudunsparce
                .replace("-Three-Segment", "")
                //tatsugiri
                .replace("-Droopy", "")
                .replace("-Stretchy", "")
                //basculin
                .replace("-Blue-Striped", "")
                .replace("-White-Striped", "")
                //lycanroc
                .replace("-Midnight", "")
                //necrozma
                .replace("-Dawn-Wings", "")
                .replace("-Dusk-Mane", "")
                //regional
                .replace("-Hisui", "")
                .replace("-Alola", "")
                .replace("-Galar", "")
                //darm
                .replace("-Zen", "")
                .replace("-Galar-Zen", "")

                //palafin
                .replace("-Hero", "")
                //shaymin
                .replace("-Sky", "")
                //ursa
                .replace("-Bloodmoon", "")
                //urshi
                .replace("-Rapid-Strike", "")
                .replace("-Single-Strike", "")
                //sinis/polt
                .replace("-Antique", "")
                .replace("-Masterpiece", "")
                //pagos
                .replace("-Terastal", "")
                .replace("-Stellar", "")
                //vivillon
                .replace("-Fancy", "")
                .replace("-Pokeball", "")

                //oricorio
                .replace("-Pa'u", "")
                .replace("-Pom-Pom", "")
                .replace("-Sensu", "")
                //rotom
                .replace("-Fan", "")
                .replace("-Frost", "")
                .replace("-Heat", "")
                .replace("-Mow", "")
                .replace("-Wash", "")
                //deoxys
                .replace("-Speed", "")
                .replace("-Attack", "")
                .replace("-Defense", "")
                //sqwak
                .replace("-Blue", "")
                .replace("-White", "")
                .replace("-Yellow", "")

                //castform
                .replace("-Snowy", "")
                .replace("-Rainy", "")
                .replace("-Sunny", "")
                //cherrim
                .replace("-Sunshine", "")

                //Arceus
                .replace("-Bug", "")
                .replace("-Dark", "")
                .replace("-Dragon", "")
                .replace("-Electric", "")
                .replace("-Fairy", "")
                .replace("-Fighting", "")
                .replace("-Fire", "")
                .replace("-Flying", "")
                .replace("-Ghost", "")
                .replace("-Grass", "")
                .replace("-Ground", "")
                .replace("-Ice", "")
                .replace("-Poison", "")
                .replace("-Psychic", "")
                .replace("-Rock", "")
                .replace("-Steel", "")
                .replace("-Water", "")
                //meloetta
                .replace("-Pirouette", "")
                //morpeko
                .replace("-Hangry", "")
                //pump
                .replace("-Large", "")
                .replace("-Small", "")
                .replace("-Super", "")
                //wormadam
                .replace("-Sandy", "")
                .replace("-Trash", "")
                //zygarde
                .replace("-10%", "")
                .replace("-Complete", "")
                //calyrex
                .replace("-Shadow", "")
                .replace("-Ice", "")
                //ogerpon
                .replace("-Hearthflame-Tera", "")
                .replace("-Hearthflame", "")
                .replace("-Wellspring-Tera", "")
                .replace("-Wellspring", "")
                .replace("-Cornerstone-Tera", "")
                .replace("-Cornerstone", "");

        return name.trim();
    }

    /**
     * Get move usage for a specific Pokemon and player
     */
    public static Set<String> getPokemonMoves(BattleData data, String pokemon, String player) {
        if ("p1".equalsIgnoreCase(player) || "1".equals(player)) {
            return data.getP1MoveUsage().getOrDefault(pokemon, Collections.emptySet());
        } else {
            return data.getP2MoveUsage().getOrDefault(pokemon, Collections.emptySet());
        }
    }

    /**
     * Check if a Pokemon was a lead
     */
    public static boolean wasLead(BattleData data, String pokemon, String player) {
        if ("p1".equalsIgnoreCase(player) || "1".equals(player)) {
            return data.getP1Leads().contains(pokemon);
        } else {
            return data.getP2Leads().contains(pokemon);
        }
    }

    /**
     * Check if a Pokemon Terastallized
     */
    public static boolean didTerastallize(BattleData data, String pokemon, String player) {
        if ("p1".equalsIgnoreCase(player) || "1".equals(player)) {
            return pokemon.equals(data.getP1Tera());
        } else {
            return pokemon.equals(data.getP2Tera());
        }
    }

    /**
     * Get the player's picks (4 Pokemon brought)
     */
    public static List<String> getPlayerPicks(BattleData data, String player) {
        if ("p1".equalsIgnoreCase(player) || "1".equals(player)) {
            return data.getP1Picks();
        } else {
            return data.getP2Picks();
        }
    }

    /**
     * Get opponent's picks based on player name
     */
    public static List<String> getOpponentPicks(BattleData data, String playerName) {
        if (playerName.equalsIgnoreCase(data.getPlayer1())) {
            return data.getP2Picks();
        } else if (playerName.equalsIgnoreCase(data.getPlayer2())) {
            return data.getP1Picks();
        }
        return Collections.emptyList();
    }

    /**
     * Get opponent's team based on player name
     */
    public static List<String> getOpponentTeam(BattleData data, String playerName) {
        if (playerName.equalsIgnoreCase(data.getPlayer1())) {
            return data.getP2Team();
        } else if (playerName.equalsIgnoreCase(data.getPlayer2())) {
            return data.getP1Team();
        }
        return Collections.emptyList();
    }
}