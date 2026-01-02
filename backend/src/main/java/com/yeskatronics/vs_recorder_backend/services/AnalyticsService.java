package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.dto.AnalyticsDTO;
import com.yeskatronics.vs_recorder_backend.entities.Replay;
import com.yeskatronics.vs_recorder_backend.entities.Team;
import com.yeskatronics.vs_recorder_backend.repositories.ReplayRepository;
import com.yeskatronics.vs_recorder_backend.repositories.TeamRepository;
import com.yeskatronics.vs_recorder_backend.utils.BattleLogParser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for calculating analytics and statistics from battle replays.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AnalyticsService {

    private final ReplayRepository replayRepository;
    private final TeamRepository teamRepository;

    /**
     * Get usage statistics for a team
     */
    public AnalyticsDTO.UsageStatsResponse getUsageStats(Long teamId) {
        log.info("Calculating usage stats for team: {}", teamId);

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found with ID: " + teamId));

        List<Replay> replays = replayRepository.findByTeamId(teamId);

        if (replays.isEmpty()) {
            return new AnalyticsDTO.UsageStatsResponse(
                    new ArrayList<>(),
                    new ArrayList<>(),
                    0,
                    0
            );
        }

        // Parse all battle logs
        List<ParsedReplay> parsedReplays = parseBattleLogs(replays, team);

        // Calculate Pokemon usage stats
        List<AnalyticsDTO.PokemonUsageStats> pokemonStats = calculatePokemonUsage(parsedReplays, replays);

        // Calculate lead pair stats
        List<AnalyticsDTO.LeadPairStats> leadPairStats = calculateLeadPairStats(parsedReplays, replays.size());

        // Calculate average win rate
        long wins = replays.stream().filter(Replay::isWin).count();
        int averageWinRate = (int) Math.round((wins * 100.0) / replays.size());

        return new AnalyticsDTO.UsageStatsResponse(
                pokemonStats,
                leadPairStats,
                averageWinRate,
                replays.size()
        );
    }

    /**
     * Get matchup statistics for a team
     */
    public AnalyticsDTO.MatchupStatsResponse getMatchupStats(Long teamId) {
        log.info("Calculating matchup stats for team: {}", teamId);

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found with ID: " + teamId));

        List<Replay> replays = replayRepository.findByTeamId(teamId);

        if (replays.isEmpty()) {
            return new AnalyticsDTO.MatchupStatsResponse(
                    new ArrayList<>(),
                    new ArrayList<>(),
                    new ArrayList<>(),
                    new ArrayList<>()
            );
        }

        // Parse all battle logs
        List<ParsedReplay> parsedReplays = parseBattleLogs(replays, team);

        // Track opponent Pokemon statistics
        Map<String, MatchupTracker> opponentStats = new HashMap<>();

        for (ParsedReplay pr : parsedReplays) {
            if (pr == null || pr.battleData == null) continue;

            Replay replay = pr.replay;
            BattleLogParser.BattleData battleData = pr.battleData;

            String playerName = identifyPlayer(team, battleData);
            if (playerName == null) continue;

            List<String> opponentTeam = BattleLogParser.getOpponentTeam(battleData, playerName);
            List<String> opponentPicks = BattleLogParser.getOpponentPicks(battleData, playerName);

            for (String pokemon : opponentTeam) {
                MatchupTracker tracker = opponentStats.computeIfAbsent(
                        pokemon,
                        k -> new MatchupTracker()
                );

                tracker.timesOnTeam++;
                tracker.gamesAgainst++;

                if (opponentPicks.contains(pokemon)) {
                    tracker.timesBrought++;
                }

                if (replay.isWin()) {
                    tracker.winsAgainst++;
                }
            }
        }

        // Convert to DTO and sort
        List<AnalyticsDTO.MatchupStats> allMatchups = opponentStats.entrySet().stream()
                .map(entry -> {
                    MatchupTracker tracker = entry.getValue();
                    int winRate = (int) Math.round((tracker.winsAgainst * 100.0) / tracker.gamesAgainst);
                    Integer attendanceRate = tracker.timesOnTeam > 0
                            ? (int) Math.round((tracker.timesBrought * 100.0) / tracker.timesOnTeam)
                            : null;

                    return new AnalyticsDTO.MatchupStats(
                            entry.getKey(),
                            tracker.gamesAgainst,
                            tracker.winsAgainst,
                            winRate,
                            tracker.timesOnTeam,
                            tracker.timesBrought,
                            attendanceRate
                    );
                })
                .collect(Collectors.toList());

        // Filter and sort for different categories
        List<AnalyticsDTO.MatchupStats> bestMatchups = allMatchups.stream()
                .filter(m -> m.getGamesAgainst() >= 3) // Minimum 3 encounters
                .sorted(Comparator.comparingInt(AnalyticsDTO.MatchupStats::getWinRate).reversed()
                        .thenComparingInt(AnalyticsDTO.MatchupStats::getGamesAgainst).reversed())
                .limit(5)
                .collect(Collectors.toList());

        List<AnalyticsDTO.MatchupStats> worstMatchups = allMatchups.stream()
                .filter(m -> m.getGamesAgainst() >= 3) // Minimum 3 encounters
                .sorted(Comparator.comparingInt(AnalyticsDTO.MatchupStats::getWinRate)
                        .thenComparingInt(AnalyticsDTO.MatchupStats::getGamesAgainst).reversed())
                .limit(5)
                .collect(Collectors.toList());

        List<AnalyticsDTO.MatchupStats> highestAttendance = allMatchups.stream()
                .filter(m -> m.getTimesOnTeam() > 0)
                .filter(m -> m.getAttendanceRate() != null)
                .sorted(Comparator.comparingInt(AnalyticsDTO.MatchupStats::getAttendanceRate).reversed()
                        .thenComparingInt(AnalyticsDTO.MatchupStats::getTimesOnTeam).reversed())
                .limit(5)
                .collect(Collectors.toList());

        List<AnalyticsDTO.MatchupStats> lowestAttendance = allMatchups.stream()
                .filter(m -> m.getTimesOnTeam() > 0)
                .filter(m -> m.getAttendanceRate() != null)
                .sorted(Comparator.comparingInt(AnalyticsDTO.MatchupStats::getAttendanceRate)
                        .thenComparingInt(AnalyticsDTO.MatchupStats::getTimesOnTeam).reversed())
                .limit(5)
                .collect(Collectors.toList());

        return new AnalyticsDTO.MatchupStatsResponse(
                bestMatchups,
                worstMatchups,
                highestAttendance,
                lowestAttendance
        );
    }

    /**
     * Calculate win rate against a custom opponent team
     */
    public AnalyticsDTO.CustomMatchupResponse getCustomMatchupAnalysis(
            Long teamId,
            AnalyticsDTO.CustomMatchupRequest request) {

        log.info("Calculating custom matchup analysis for team: {} against: {}",
                teamId, request.getOpponentPokemon());

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found with ID: " + teamId));

        List<Replay> replays = replayRepository.findByTeamId(teamId);

        if (replays.isEmpty()) {
            return new AnalyticsDTO.CustomMatchupResponse(new ArrayList<>(), 0, 0, 0);
        }

        // Normalize opponent Pokemon names
        Set<String> opponentCore = request.getOpponentPokemon().stream()
                .map(BattleLogParser::normalizePokemonName)
                .collect(Collectors.toSet());

        // Parse battle logs
        List<ParsedReplay> parsedReplays = parseBattleLogs(replays, team);

        // Track stats for each Pokemon
        Map<String, CustomMatchupTracker> pokemonTrackers = new HashMap<>();
        int exactMatchCount = 0;
        int exactMatchWins = 0;
        int anyMatchCount = 0;
        int anyMatchWins = 0;

        for (ParsedReplay pr : parsedReplays) {
            if (pr == null || pr.battleData == null) continue;

            Replay replay = pr.replay;
            BattleLogParser.BattleData battleData = pr.battleData;

            String playerName = identifyPlayer(team, battleData);
            if (playerName == null) continue;

            List<String> opponentTeam = BattleLogParser.getOpponentTeam(battleData, playerName);
            Set<String> opponentTeamSet = new HashSet<>(opponentTeam);

            boolean hadAnyPokemon = false;

            // Check if opponent had each Pokemon from the custom team
            for (String pokemon : opponentCore) {
                if (opponentTeamSet.contains(pokemon)) {
                    hadAnyPokemon = true;

                    CustomMatchupTracker tracker = pokemonTrackers.computeIfAbsent(
                            pokemon,
                            k -> new CustomMatchupTracker()
                    );

                    tracker.gamesAgainst++;
                    if (replay.isWin()) {
                        tracker.winsAgainst++;
                    }
                }
            }

            // Track games where opponent had ANY of the requested Pokemon
            if (hadAnyPokemon) {
                anyMatchCount++;
                if (replay.isWin()) {
                    anyMatchWins++;
                }
            }

            // Check for exact match (opponent had exactly this core)
            if (opponentTeamSet.containsAll(opponentCore)) {
                exactMatchCount++;
                if (replay.isWin()) {
                    exactMatchWins++;
                }
            }
        }

        // Convert to response DTOs
        List<AnalyticsDTO.CustomPokemonAnalysis> pokemonAnalysis = pokemonTrackers.entrySet().stream()
                .map(entry -> {
                    CustomMatchupTracker tracker = entry.getValue();
                    int winRate = tracker.gamesAgainst > 0
                            ? (int) Math.round((tracker.winsAgainst * 100.0) / tracker.gamesAgainst)
                            : 0;

                    return new AnalyticsDTO.CustomPokemonAnalysis(
                            entry.getKey(),
                            tracker.gamesAgainst,
                            tracker.winsAgainst,
                            winRate
                    );
                })
                .sorted(Comparator.comparingInt(AnalyticsDTO.CustomPokemonAnalysis::getGamesAgainst).reversed())
                .collect(Collectors.toList());

        // Team win rate = win rate in games where opponent had ANY of the requested Pokemon
        int teamWinRate = anyMatchCount > 0
                ? (int) Math.round((anyMatchWins * 100.0) / anyMatchCount)
                : 0;

        // Average win rate (simple) = average of individual Pokemon win rates
        int averageWinRate = pokemonAnalysis.isEmpty() ? 0 :
                (int) Math.round(pokemonAnalysis.stream()
                        .mapToInt(AnalyticsDTO.CustomPokemonAnalysis::getWinRate)
                        .average()
                        .orElse(0));


        return new AnalyticsDTO.CustomMatchupResponse(
                pokemonAnalysis,
                teamWinRate,
                averageWinRate,
                exactMatchCount
        );
    }

    /**
     * Get move usage statistics
     */
    public AnalyticsDTO.MoveUsageResponse getMoveUsageStats(Long teamId) {
        log.info("Calculating move usage stats for team: {}", teamId);

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new IllegalArgumentException("Team not found with ID: " + teamId));

        List<Replay> replays = replayRepository.findByTeamId(teamId);

        if (replays.isEmpty()) {
            return new AnalyticsDTO.MoveUsageResponse(new ArrayList<>());
        }

        // Parse battle logs
        List<ParsedReplay> parsedReplays = parseBattleLogs(replays, team);

        // Track move usage per Pokemon
        Map<String, Map<String, MoveUsageTracker>> pokemonMoveUsage = new HashMap<>();

        for (ParsedReplay pr : parsedReplays) {
            if (pr == null || pr.battleData == null) continue;

            Replay replay = pr.replay;
            BattleLogParser.BattleData battleData = pr.battleData;

            String playerName = identifyPlayer(team, battleData);
            if (playerName == null) continue;

            String playerSide = playerName.equalsIgnoreCase(battleData.getPlayer1()) ? "p1" : "p2";
            List<String> playerPicks = BattleLogParser.getPlayerPicks(battleData, playerSide);

            // Process each Pokemon that was brought
            for (String pokemon : playerPicks) {
                Map<String, Integer> moves = BattleLogParser.getPokemonMoves(battleData, pokemon, playerSide);

                Map<String, MoveUsageTracker> moveTrackers = pokemonMoveUsage.computeIfAbsent(
                        pokemon,
                        k -> new HashMap<>()
                );

                // Track each move used (with counts)
                for (Map.Entry<String, Integer> moveEntry : moves.entrySet()) {
                    String move = moveEntry.getKey();
                    int count = moveEntry.getValue();

                    MoveUsageTracker tracker = moveTrackers.computeIfAbsent(
                            move,
                            k -> new MoveUsageTracker()
                    );

                    tracker.timesUsed += count;  // Add the count from this game
                    tracker.gamesWithPokemon++;

                    if (replay.isWin()) {
                        tracker.winsWithMove++;
                    }
                }

                // Increment games count for all moves of this Pokemon
                for (MoveUsageTracker tracker : moveTrackers.values()) {
                    if (!moves.containsKey(tracker.getMoveName())) {
                        // Increment games where Pokemon was brought but move wasn't used
                        tracker.gamesWithPokemon++;
                    }
                }
            }
        }

        // Convert to response DTOs
        List<AnalyticsDTO.PokemonMoveStats> pokemonMoves = pokemonMoveUsage.entrySet().stream()
                .map(entry -> {
                    String pokemon = entry.getKey();
                    Map<String, MoveUsageTracker> moveTrackers = entry.getValue();

                    // Calculate total moves used by this Pokemon across all games
                    int totalMovesUsed = moveTrackers.values().stream()
                            .mapToInt(tracker -> tracker.timesUsed)
                            .sum();

                    List<AnalyticsDTO.MoveStats> moves = moveTrackers.entrySet().stream()
                            .map(moveEntry -> {
                                MoveUsageTracker tracker = moveEntry.getValue();

                                // Usage rate = percentage of total moves used by this Pokemon
                                int usageRate = totalMovesUsed > 0
                                        ? (int) Math.round((tracker.timesUsed * 100.0) / totalMovesUsed)
                                        : 0;

                                // Win rate = games won when this move was used
                                int winRate = tracker.gamesWithPokemon > 0
                                        ? (int) Math.round((tracker.winsWithMove * 100.0) / tracker.gamesWithPokemon)
                                        : 0;

                                return new AnalyticsDTO.MoveStats(
                                        moveEntry.getKey(),
                                        tracker.timesUsed,
                                        usageRate
                                );
                            })
                            .sorted(Comparator.comparingInt(AnalyticsDTO.MoveStats::getTimesUsed).reversed())
                            .collect(Collectors.toList());

                    return new AnalyticsDTO.PokemonMoveStats(pokemon, moves);
                })
                .sorted(Comparator.comparing(AnalyticsDTO.PokemonMoveStats::getPokemon))
                .collect(Collectors.toList());

        return new AnalyticsDTO.MoveUsageResponse(pokemonMoves);
    }

    /**
     * Normalize Pokemon name for analytics grouping
     * Removes temporary forme suffixes like -Tera, -Stellar
     * Keeps competitive formes like -Rapid-Strike, -Hearthflame
     */
    private String normalizeForAnalytics(String pokemonName) {
        return BattleLogParser.normalizePokemonName(pokemonName);
    }

    // ==================== Helper Methods ====================

    /**
     * Helper class for parsed battle data with associated replay
     */
    private static class ParsedReplay {
        BattleLogParser.BattleData battleData;
        Replay replay;
    }

    /**
     * Parse all battle logs for a list of replays
     */
    private List<ParsedReplay> parseBattleLogs(List<Replay> replays, Team team) {
        List<ParsedReplay> parsedReplays = new ArrayList<>();

        for (Replay replay : replays) {
            try {
                BattleLogParser.BattleData parsed = BattleLogParser.parseBattleLog(replay.getBattleLog());
                ParsedReplay pr = new ParsedReplay();
                pr.battleData = parsed;
                pr.replay = replay;
                parsedReplays.add(pr);
            } catch (Exception e) {
                log.warn("Failed to parse battle log for replay {}: {}", replay.getId(), e.getMessage());
                parsedReplays.add(null);
            }
        }

        return parsedReplays;
    }

    /**
     * Identify which player in the battle data corresponds to the team owner
     */
    private String identifyPlayer(Team team, BattleLogParser.BattleData battleData) {
        if (battleData.getPlayer1() == null || battleData.getPlayer2() == null) {
            return null;
        }

        for (String username : team.getShowdownUsernames()) {
            if (battleData.getPlayer1().equalsIgnoreCase(username)) {
                return battleData.getPlayer1();
            }
            if (battleData.getPlayer2().equalsIgnoreCase(username)) {
                return battleData.getPlayer2();
            }
        }

        // Default to player1 if no match
        log.warn("Could not identify player for team {}, defaulting to player1", team.getId());
        return battleData.getPlayer1();
    }

    /**
     * Calculate Pokemon usage statistics
     */
    private List<AnalyticsDTO.PokemonUsageStats> calculatePokemonUsage(
            List<ParsedReplay> parsedReplays,
            List<Replay> replays) {

        Map<String, PokemonUsageTracker> usageTrackers = new HashMap<>();

        for (ParsedReplay pr : parsedReplays) {
            if (pr == null || pr.battleData == null) continue;

            Replay replay = pr.replay;
            BattleLogParser.BattleData battleData = pr.battleData;
            Team team = replay.getTeam();
            String playerName = identifyPlayer(team, battleData);
            if (playerName == null) continue;

            String playerSide = playerName.equalsIgnoreCase(battleData.getPlayer1()) ? "p1" : "p2";
            List<String> picks = BattleLogParser.getPlayerPicks(battleData, playerSide);

            for (String pokemon : picks) {
                // Normalize for grouping (e.g., Ogerpon-Hearthflame-Tera → Ogerpon-Hearthflame)
                String normalizedPokemon = normalizeForAnalytics(pokemon);

                PokemonUsageTracker tracker = usageTrackers.computeIfAbsent(
                        normalizedPokemon,
                        k -> new PokemonUsageTracker()
                );

                tracker.usage++;
                if (replay.isWin()) {
                    tracker.wins++;
                }

                // Check if lead
                if (BattleLogParser.wasLead(battleData, pokemon, playerSide)) {
                    tracker.leadUsage++;
                    if (replay.isWin()) {
                        tracker.leadWins++;
                    }
                }

                // Check if Tera
                if (BattleLogParser.didTerastallize(battleData, pokemon, playerSide)) {
                    tracker.teraUsage++;
                    if (replay.isWin()) {
                        tracker.teraWins++;
                    }
                }
            }
        }

        return usageTrackers.entrySet().stream()
                .map(entry -> {
                    PokemonUsageTracker tracker = entry.getValue();
                    int overallWinRate = (int) Math.round((tracker.wins * 100.0) / tracker.usage);
                    Integer leadWinRate = tracker.leadUsage > 0
                            ? (int) Math.round((tracker.leadWins * 100.0) / tracker.leadUsage)
                            : null;
                    Integer teraWinRate = tracker.teraUsage > 0
                            ? (int) Math.round((tracker.teraWins * 100.0) / tracker.teraUsage)
                            : null;
                    int usageRate = (int) Math.round((tracker.usage * 100.0) / replays.size());

                    return new AnalyticsDTO.PokemonUsageStats(
                            entry.getKey(),
                            tracker.usage,
                            usageRate,
                            overallWinRate,
                            tracker.leadUsage,
                            leadWinRate,
                            tracker.teraUsage,
                            teraWinRate
                    );
                })
                .sorted(Comparator.comparingInt(AnalyticsDTO.PokemonUsageStats::getUsage).reversed())
                .collect(Collectors.toList());
    }

    /**
     * Calculate lead pair statistics
     */
    private List<AnalyticsDTO.LeadPairStats> calculateLeadPairStats(
            List<ParsedReplay> parsedReplays,
            int totalGames) {

        Map<String, LeadPairTracker> pairTrackers = new HashMap<>();

        for (ParsedReplay pr : parsedReplays) {
            if (pr == null || pr.battleData == null || pr.replay == null) continue;

            Team team = pr.replay.getTeam();
            String playerName = identifyPlayer(team, pr.battleData);
            if (playerName == null) continue;

            List<String> leads = playerName.equalsIgnoreCase(pr.battleData.getPlayer1())
                    ? pr.battleData.getP1Leads()
                    : pr.battleData.getP2Leads();

            if (leads.size() == 2) {
                // Normalize both leads for grouping
                String lead1 = normalizeForAnalytics(leads.get(0));
                String lead2 = normalizeForAnalytics(leads.get(1));

                // Sort to ensure consistent pairing
                List<String> sortedLeads = new ArrayList<>(List.of(lead1, lead2));
                Collections.sort(sortedLeads);
                String pairKey = sortedLeads.get(0) + " + " + sortedLeads.get(1);

                LeadPairTracker tracker = pairTrackers.computeIfAbsent(
                        pairKey,
                        k -> new LeadPairTracker(sortedLeads.get(0), sortedLeads.get(1))
                );

                tracker.usage++;
                if (pr.replay.isWin()) {
                    tracker.wins++;
                }
            }
        }

        return pairTrackers.entrySet().stream()
                .map(entry -> {
                    LeadPairTracker tracker = entry.getValue();
                    int winRate = (int) Math.round((tracker.wins * 100.0) / tracker.usage);
                    int usageRate = (int) Math.round((tracker.usage * 100.0) / totalGames);

                    return new AnalyticsDTO.LeadPairStats(
                            entry.getKey(),
                            tracker.pokemon1,
                            tracker.pokemon2,
                            tracker.usage,
                            usageRate,
                            tracker.wins,
                            winRate
                    );
                })
                .sorted(Comparator.comparingInt(AnalyticsDTO.LeadPairStats::getUsage).reversed())
                .limit(6)
                .collect(Collectors.toList());
    }

    // ==================== Tracker Classes ====================

    private static class PokemonUsageTracker {
        int usage = 0;
        int wins = 0;
        int leadUsage = 0;
        int leadWins = 0;
        int teraUsage = 0;
        int teraWins = 0;
    }

    private static class LeadPairTracker {
        String pokemon1;
        String pokemon2;
        int usage = 0;
        int wins = 0;

        LeadPairTracker(String p1, String p2) {
            this.pokemon1 = p1;
            this.pokemon2 = p2;
        }
    }

    private static class MatchupTracker {
        int gamesAgainst = 0;
        int winsAgainst = 0;
        int timesOnTeam = 0;
        int timesBrought = 0;
    }

    private static class CustomMatchupTracker {
        int gamesAgainst = 0;
        int winsAgainst = 0;
    }

    private static class MoveUsageTracker {
        String moveName;
        int timesUsed = 0;
        int gamesWithPokemon = 0;
        int winsWithMove = 0;

        public String getMoveName() {
            return moveName;
        }
    }
}