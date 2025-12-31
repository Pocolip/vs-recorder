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
                log.warn("Battle log is empty. ID = {}", root.get("id"));
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
     * Known Pokemon forme suffixes that should be removed during normalization.
     * Ordered by length (longest first) to avoid partial matching issues.
     * Examples: "-Galar-Zen" must come before "-Galar", "-Hearthflame-Tera" before "-Terastal"
     * NOTE: We only want to cover formes that imply a different Pokemon competitively,
     * Indeedee-F is very different to male, Calyice is different to Calydow, etc.,
     * but we don't care if it's Darm Zen to regular, as they represent the same Pokemon.
     */
    private static final Set<String> FORME_SUFFIXES = new LinkedHashSet<>(Arrays.asList(
            // Ogerpon (longest Tera forms first)
            //"-Hearthflame-Tera", "-Wellspring-Tera", "-Cornerstone-Tera",
            //"-Hearthflame", "-Wellspring", "-Cornerstone",

            // Darmanitan (Galar-Zen before Galar)
            //"-Galar-Zen",

            // Tauros Paldea forms
            //"-Paldea-Aqua", "-Paldea-Blaze", "-Paldea-Combat",

            // Necrozma
            //"-Dawn-Wings", "-Dusk-Mane",

            // Basculin
            "-Blue-Striped", "-White-Striped",

            // Urshifu
            //"-Rapid-Strike", "-Single-Strike",

            // Dudunsparce
            "-Three-Segment",

            // Zygarde
            "-Complete", "-10%",

            // Forces of Nature (Genies)
            //"-Therian",

            // Dialga/Palkia/Giratina
            //"-Origin",

            // Zacian/Zamazenta
            "-Crowned",

            // Greninja
            "-Bond", "-Ash",

            // Keldeo
            "-Resolute",

            // Gender forme
            //"-F",

            // Toxtricity
            "-Low-Key",

            // Maushold
            "-Four",

            // Tatsugiri
            "-Droopy", "-Stretchy",

            // Lycanroc
            //"-Midnight",

            // Regional forms
            //"-Hisui", "-Alola", "-Galar",

            // Darmanitan
            "-Zen",

            // Palafin
            "-Hero",

            // Shaymin
            //"-Sky",

            // Ursaluna
            //"-Bloodmoon",

            // Sinistea/Polteageist
            "-Antique", "-Masterpiece",

            // Terapagos
            "-Terastal", "-Stellar",

            // Vivillon
            "-Fancy", "-Pokeball",

            // Oricorio
            //"-Pa'u", "-Sensu", "Pom-Pom",

            // Rotom (continued)
            //"-Fan", "-Frost", "-Heat", "-Mow", "-Wash",

            // Deoxys
            //"-Speed", "-Attack", "-Defense",

            // Squawkabilly
            "-Blue", "-White", "-Yellow",

            // Castform
            "-Snowy", "-Rainy", "-Sunny",

            // Cherrim
            "-Sunshine",

            // Arceus types
            //"-Bug", "-Dark", "-Dragon", "-Electric", "-Fairy", "-Fighting", "-Fire",
            //"-Flying", "-Ghost", "-Grass", "-Ground", "-Ice", "-Poison", "-Psychic",
            //"-Rock", "-Steel", "-Water",

            // Meloetta
            "-Pirouette",

            // Morpeko
            "-Hangry",

            // Pumpkaboo/Gourgeist
            //"-Large", "-Small", "-Super",

            // Wormadam
            //"-Sandy", "-Trash",

            // Calyrex riders (Shadow/Ice)
            //"-Shadow", "-Ice"

            // Ogerpon (just the Tera form)
            "-Tera"
    ));

    /**
     * Normalize Pokemon name (remove forme indicators, gender, level)
     * Examples:
     * - "Urshifu-*, L50, F" -> "Urshifu"
     * - "Terapagos-Terastal, L50, M" -> "Terapagos"
     * - "Calyrex-Shadow, L50" -> "Calyrex"
     * - "Ogerpon-Hearthflame-Tera, L50" -> "Ogerpon"
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

        // Check if name ends with any known suffix (longest first to avoid partial matches)
        for (String suffix : FORME_SUFFIXES) {
            if (name.endsWith(suffix)) {
                return name.substring(0, name.length() - suffix.length()).trim();
            }
        }

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