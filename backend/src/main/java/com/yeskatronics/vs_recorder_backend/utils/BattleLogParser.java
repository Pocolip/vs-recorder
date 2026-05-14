package com.yeskatronics.vs_recorder_backend.utils;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeskatronics.vs_recorder_backend.services.PokemonService;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;

import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Utility class for parsing Pokemon Showdown battle logs.
 * Extracts structured data for analytics from raw battle log JSON.
 *
 * <p>Two entry points: {@link #parseBattleLog(String)} (legacy, naive prefix matching) and
 * {@link #parseBattleLog(String, PokemonService)} (forme-aware — uses the registry to keep
 * the team list in sync with reveals like {@code Zamazenta-Crowned} or mid-battle Mega evolutions).
 * Production callers should always pass the service; the no-arg version exists for legacy tests.
 */
@Slf4j
public class BattleLogParser {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    // Patterns for parsing battle log lines
    private static final Pattern SWITCH_PATTERN = Pattern.compile("\\|switch\\|p([12])([ab]): ([^|]+)\\|([^,|]+)");
    private static final Pattern MOVE_PATTERN = Pattern.compile("\\|move\\|p([12])([ab]): ([^|]+)\\|([^|]+)");
    private static final Pattern TERA_PATTERN = Pattern.compile("\\|-terastallize\\|p([12])([ab]): ([^|]+)\\|([^|]+)");
    private static final Pattern POKE_PATTERN = Pattern.compile("\\|poke\\|p([12])\\|([^,|]+)");
    private static final Pattern SHOWTEAM_PATTERN = Pattern.compile("\\|showteam\\|p([12])\\|(.+)");
    private static final Pattern DETAILSCHANGE_PATTERN = Pattern.compile("\\|detailschange\\|p([12])([ab]): ([^|]+)\\|([^,|]+)");

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
        private String p1Mega;            // Pokemon that Mega Evolved (team-list name)
        private String p2Mega;            // Pokemon that Mega Evolved (team-list name)
        private Map<String, Map<String, Integer>> p1MoveUsage;  // p1 Pokemon -> Move -> Count
        private Map<String, Map<String, Integer>> p2MoveUsage;  // p2 Pokemon -> Move -> Count
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
     * Parse battle log without forme-aware normalization. Falls back to naive prefix
     * matching; safe for replays where paste names match Showdown's emitted names exactly.
     */
    public static BattleData parseBattleLog(String battleLogJson) {
        return parseBattleLog(battleLogJson, null);
    }

    /**
     * Parse battle log using {@link PokemonService} to keep the team list in sync with
     * mid-battle forme reveals (Zamazenta-Crowned, Mega evolutions, OTS reveals).
     */
    public static BattleData parseBattleLog(String battleLogJson, PokemonService pokemonService) {
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
            parseLogLines(lines, data, pokemonService);

            // Extract winner from log
            data.setWinner(extractWinner(logText));

            return data;

        } catch (Exception e) {
            log.error("Failed to parse battle log: {}", e.getMessage(), e);
            return new BattleData(); // Return empty data on error
        }
    }

    /**
     * Parse all log lines to extract battle data.
     */
    private static void parseLogLines(String[] lines, BattleData data, PokemonService pokemonService) {
        Set<String> p1Switched = new HashSet<>();
        Set<String> p2Switched = new HashSet<>();
        Map<String, String> p1NicknameMap = new HashMap<>();
        Map<String, String> p2NicknameMap = new HashMap<>();
        int leadCount1 = 0;
        int leadCount2 = 0;

        for (String line : lines) {
            line = line.trim();

            // Parse team sheets (|poke|)
            Matcher pokeMatcher = POKE_PATTERN.matcher(line);
            if (pokeMatcher.find()) {
                String player = pokeMatcher.group(1);
                String pokemon = pokeMatcher.group(2); // Keep full name with forme

                if ("1".equals(player)) {
                    data.getP1Team().add(pokemon);
                } else {
                    data.getP2Team().add(pokemon);
                }
                continue;
            }

            // Parse open team sheet (|showteam|) - reveals actual formes (Urshifu, Zamazenta-Crowned, etc.)
            Matcher showteamMatcher = SHOWTEAM_PATTERN.matcher(line);
            if (showteamMatcher.find()) {
                String player = showteamMatcher.group(1);
                String teamData = showteamMatcher.group(2);
                List<String> team = "1".equals(player) ? data.getP1Team() : data.getP2Team();

                // Format: Pokemon||Item|Ability|Move1,Move2,...]Pokemon||...
                for (String pokeData : teamData.split("\\]")) {
                    String revealedName = pokeData.split("\\|")[0].trim();
                    if (revealedName.isEmpty()) continue;
                    revealTeamForme(team, revealedName, pokemonService);
                }
                continue;
            }

            // Parse switches (|switch|) - identifies picks and leads, may reveal hidden formes
            Matcher switchMatcher = SWITCH_PATTERN.matcher(line);
            if (switchMatcher.find()) {
                String player = switchMatcher.group(1);
                String nickname = switchMatcher.group(3).trim();
                String switchedRaw = switchMatcher.group(4);
                String switchedSpecies = switchedRaw.split(",")[0].trim();

                List<String> team = "1".equals(player) ? data.getP1Team() : data.getP2Team();

                // Reveal hidden formes (e.g. Urshifu-* → Urshifu-Rapid-Strike, or |poke| had base
                // Zamazenta but switch reveals Zamazenta-Crowned).
                if (!switchedSpecies.contains("*")) {
                    revealTeamForme(team, switchedSpecies, pokemonService);
                }

                // Map switch species to team entry
                String fullTeamEntry = findTeamEntry(team, switchedSpecies, pokemonService);

                // Store nickname -> species mapping
                String resolvedName = fullTeamEntry != null ? fullTeamEntry : switchedRaw;
                if ("1".equals(player)) {
                    p1NicknameMap.put(nickname, resolvedName);
                } else {
                    p2NicknameMap.put(nickname, resolvedName);
                }

                if (fullTeamEntry != null) {
                    if ("1".equals(player)) {
                        if (!p1Switched.contains(fullTeamEntry)) {
                            p1Switched.add(fullTeamEntry);
                            data.getP1Picks().add(fullTeamEntry);

                            // First 2 switches are leads
                            if (leadCount1 < 2) {
                                data.getP1Leads().add(fullTeamEntry);
                                leadCount1++;
                            }
                        }
                    } else {
                        if (!p2Switched.contains(fullTeamEntry)) {
                            p2Switched.add(fullTeamEntry);
                            data.getP2Picks().add(fullTeamEntry);

                            // First 2 switches are leads
                            if (leadCount2 < 2) {
                                data.getP2Leads().add(fullTeamEntry);
                                leadCount2++;
                            }
                        }
                    }
                }
                continue;
            }

            // Parse mid-battle forme changes (|detailschange|) - Mega evolution, Primal reversion, etc.
            // Tera/Ogerpon mask transforms also use this line; we filter to Mega/Primal here so we
            // don't mistakenly overwrite a Tera-form team-list slot.
            Matcher detailsMatcher = DETAILSCHANGE_PATTERN.matcher(line);
            if (detailsMatcher.find()) {
                String player = detailsMatcher.group(1);
                String nickname = detailsMatcher.group(3).trim();
                String newSpecies = detailsMatcher.group(4).trim();

                if (isMegaOrPrimalForme(newSpecies)) {
                    List<String> team = "1".equals(player) ? data.getP1Team() : data.getP2Team();
                    Map<String, String> nicknameMap = "1".equals(player) ? p1NicknameMap : p2NicknameMap;

                    // Find the team slot for this nickname's current species and overwrite it.
                    String currentSpecies = nicknameMap.getOrDefault(nickname, null);
                    if (currentSpecies != null) {
                        int slot = findTeamIndex(team, currentSpecies, pokemonService);
                        if (slot >= 0) {
                            team.set(slot, newSpecies);
                            nicknameMap.put(nickname, newSpecies);

                            // Carry pick/lead/move tracking from the old name to the new one.
                            renamePickEntries(data, player, currentSpecies, newSpecies);

                            if ("1".equals(player)) {
                                data.setP1Mega(newSpecies);
                            } else {
                                data.setP2Mega(newSpecies);
                            }
                        }
                    }
                }
                continue;
            }

            // Parse moves (|move|)
            Matcher moveMatcher = MOVE_PATTERN.matcher(line);
            if (moveMatcher.find()) {
                String player = moveMatcher.group(1);
                String moveNickname = moveMatcher.group(3).trim();
                String move = moveMatcher.group(4);

                // Resolve nickname to species
                Map<String, String> nicknameMap = "1".equals(player) ? p1NicknameMap : p2NicknameMap;
                String moveSpecies = nicknameMap.getOrDefault(moveNickname, moveNickname);

                // Map to full team entry
                List<String> team = "1".equals(player) ? data.getP1Team() : data.getP2Team();
                String fullTeamEntry = findTeamEntry(team, moveSpecies, pokemonService);

                if (fullTeamEntry != null) {
                    if ("1".equals(player)) {
                        data.getP1MoveUsage()
                                .computeIfAbsent(fullTeamEntry, k -> new HashMap<>())
                                .merge(move, 1, Integer::sum);
                    } else {
                        data.getP2MoveUsage()
                                .computeIfAbsent(fullTeamEntry, k -> new HashMap<>())
                                .merge(move, 1, Integer::sum);
                    }
                }
                continue;
            }

            // Parse Terastallization (|-terastallize|)
            Matcher teraMatcher = TERA_PATTERN.matcher(line);
            if (teraMatcher.find()) {
                String player = teraMatcher.group(1);
                String teraNickname = teraMatcher.group(3).trim();

                // Resolve nickname to species
                Map<String, String> nicknameMap = "1".equals(player) ? p1NicknameMap : p2NicknameMap;
                String teraSpecies = nicknameMap.getOrDefault(teraNickname, teraNickname);

                // Map to full team entry
                List<String> team = "1".equals(player) ? data.getP1Team() : data.getP2Team();
                String fullTeamEntry = findTeamEntry(team, teraSpecies, pokemonService);

                if (fullTeamEntry != null) {
                    if ("1".equals(player)) {
                        data.setP1Tera(fullTeamEntry);
                    } else {
                        data.setP2Tera(fullTeamEntry);
                    }
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
     * If {@code revealedName} shares a Pokedex number with an existing team-list entry that
     * is either a wildcard ({@code Urshifu-*}) or differs from the reveal (paste had
     * {@code Zamazenta} but battle reveals {@code Zamazenta-Crowned}), overwrite the slot.
     * Matching on dex number rather than {@code baseSpecies} is intentional — formes like
     * Zamazenta-Crowned have their own {@code baseSpecies} for analytics grouping, so they
     * wouldn't otherwise match their hero/wildcard slot.
     * Without {@link PokemonService} this only handles the legacy {@code Urshifu-*} case.
     */
    private static void revealTeamForme(List<String> team, String revealedName, PokemonService pokemonService) {
        if (revealedName == null || revealedName.isEmpty()) return;

        // Legacy path: only handle Urshifu wildcard.
        if (pokemonService == null) {
            if (revealedName.startsWith("Urshifu-")) {
                for (int i = 0; i < team.size(); i++) {
                    if (team.get(i).startsWith("Urshifu-*")) {
                        team.set(i, revealedName);
                        return;
                    }
                }
            }
            return;
        }

        int[] revealedInfo = pokemonService.getSpriteInfo(revealedName);
        if (revealedInfo == null) return;
        int revealedNum = revealedInfo[0];
        String revealedCanonical = pokemonService.resolveCanonical(revealedName);

        // First pass: prefer wildcard slots ({@code X-*}) so we don't accidentally rewrite
        // a different team member who happens to share a dex number.
        for (int i = 0; i < team.size(); i++) {
            String entry = team.get(i);
            if (entry.contains("-*")) {
                int[] entryInfo = pokemonService.getSpriteInfo(entry);
                if (entryInfo != null && entryInfo[0] == revealedNum) {
                    team.set(i, revealedName);
                    return;
                }
            }
        }

        // Second pass: rewrite a same-dex entry whose canonical differs from the reveal.
        // Skip if the slot is already exactly the revealed name.
        for (int i = 0; i < team.size(); i++) {
            String entry = team.get(i);
            if (entry.equals(revealedName)) return;
            int[] entryInfo = pokemonService.getSpriteInfo(entry);
            if (entryInfo != null && entryInfo[0] == revealedNum
                    && !pokemonService.resolveCanonical(entry).equals(revealedCanonical)) {
                team.set(i, revealedName);
                return;
            }
        }
    }

    /**
     * Find the team list entry that matches the given species. Uses canonical name resolution
     * when {@link PokemonService} is available; falls back to the legacy prefix/contains match.
     */
    private static String findTeamEntry(List<String> team, String species, PokemonService pokemonService) {
        int idx = findTeamIndex(team, species, pokemonService);
        return idx >= 0 ? team.get(idx) : null;
    }

    private static int findTeamIndex(List<String> team, String species, PokemonService pokemonService) {
        if (species == null || species.isEmpty()) return -1;

        if (pokemonService != null) {
            String targetCanonical = pokemonService.resolveCanonical(species);
            int[] targetInfo = pokemonService.getSpriteInfo(species);
            int targetNum = targetInfo != null ? targetInfo[0] : -1;

            // Prefer an exact canonical match (handles teams that contain both base and forme,
            // even though species clause makes that rare).
            for (int i = 0; i < team.size(); i++) {
                if (pokemonService.resolveCanonical(team.get(i)).equals(targetCanonical)) {
                    return i;
                }
            }
            // Fall back to dex number match (covers an unrevealed wildcard slot or a base/forme
            // split where revealTeamForme didn't fire — e.g., paste has plain Zamazenta and
            // battle never reveals the Crowned form, or vice versa).
            if (targetNum > 0) {
                for (int i = 0; i < team.size(); i++) {
                    int[] entryInfo = pokemonService.getSpriteInfo(team.get(i));
                    if (entryInfo != null && entryInfo[0] == targetNum) {
                        return i;
                    }
                }
            }
            return -1;
        }

        // Legacy fallback: prefix match on the chunk before the first hyphen.
        String legacyBase = species.split("-")[0];
        for (int i = 0; i < team.size(); i++) {
            String teamEntry = team.get(i);
            if (teamEntry.startsWith(legacyBase) || teamEntry.contains(legacyBase)) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Detect Mega / Primal formes by suffix. Tera and Ogerpon mask formes also fire
     * {@code |detailschange|}, so we filter to the species-changing transforms here.
     */
    private static boolean isMegaOrPrimalForme(String species) {
        if (species == null) return false;
        return species.endsWith("-Mega")
                || species.endsWith("-Mega-X")
                || species.endsWith("-Mega-Y")
                || species.endsWith("-Primal");
    }

    /**
     * After a mid-battle forme change, port any picks/leads/move-usage entries keyed by the
     * pre-change name over to the new name so analytics see a single mega-evolved Pokemon
     * rather than two separate entries.
     */
    private static void renamePickEntries(BattleData data, String player, String oldName, String newName) {
        if (oldName.equals(newName)) return;

        List<String> picks = "1".equals(player) ? data.getP1Picks() : data.getP2Picks();
        List<String> leads = "1".equals(player) ? data.getP1Leads() : data.getP2Leads();
        Map<String, Map<String, Integer>> moveUsage =
                "1".equals(player) ? data.getP1MoveUsage() : data.getP2MoveUsage();

        replaceInList(picks, oldName, newName);
        replaceInList(leads, oldName, newName);

        Map<String, Integer> moves = moveUsage.remove(oldName);
        if (moves != null) {
            moveUsage.merge(newName, moves, (a, b) -> {
                a.forEach((k, v) -> b.merge(k, v, Integer::sum));
                return b;
            });
        }

        if (oldName.equals(data.getP1Tera())) data.setP1Tera(newName);
        if (oldName.equals(data.getP2Tera())) data.setP2Tera(newName);
    }

    private static void replaceInList(List<String> list, String oldName, String newName) {
        for (int i = 0; i < list.size(); i++) {
            if (oldName.equals(list.get(i))) {
                list.set(i, newName);
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
     *
     * @deprecated Use {@link com.yeskatronics.vs_recorder_backend.services.PokemonService#resolveBaseSpecies(String)} instead.
     */
    @Deprecated
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
     * Normalize Pokemon name (remove forme indicators, gender, level).
     *
     * @deprecated Use {@link com.yeskatronics.vs_recorder_backend.services.PokemonService#resolveBaseSpecies(String)} instead,
     *             which uses a comprehensive generated registry for accurate normalization.
     *
     * Examples:
     * - "Urshifu-*, L50, F" -> "Urshifu"
     * - "Terapagos-Terastal, L50, M" -> "Terapagos"
     * - "Calyrex-Shadow, L50" -> "Calyrex"
     * - "Ogerpon-Hearthflame-Tera, L50" -> "Ogerpon"
     */
    @Deprecated
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
     * Get move usage for a specific Pokemon and player (with counts)
     */
    public static Map<String, Integer> getPokemonMoves(BattleData data, String pokemon, String player) {
        if ("p1".equalsIgnoreCase(player) || "1".equals(player)) {
            log.debug("p1 {}", data.getP1MoveUsage().getOrDefault(pokemon, Collections.emptyMap()).toString());
            return data.getP1MoveUsage().getOrDefault(pokemon, Collections.emptyMap());
        } else {
            log.debug("p2 {}", data.getP2MoveUsage().getOrDefault(pokemon, Collections.emptyMap()).toString());

            return data.getP2MoveUsage().getOrDefault(pokemon, Collections.emptyMap());
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
     * Check if a Pokemon Mega Evolved (or Primal Reverted).
     */
    public static boolean didMegaEvolve(BattleData data, String pokemon, String player) {
        if ("p1".equalsIgnoreCase(player) || "1".equals(player)) {
            return pokemon.equals(data.getP1Mega());
        } else {
            return pokemon.equals(data.getP2Mega());
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
