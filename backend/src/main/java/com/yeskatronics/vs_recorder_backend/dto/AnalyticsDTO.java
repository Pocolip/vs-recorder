package com.yeskatronics.vs_recorder_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTOs for analytics endpoints
 */
public class AnalyticsDTO {

    /**
     * Individual Pokemon usage statistics
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PokemonUsageStats {
        private String pokemon;
        private int usage;              // Times brought to battle
        private int usageRate;          // Percentage of total games
        private int overallWinRate;     // Win rate when this Pokemon was brought
        private int leadUsage;          // Times used as a lead
        private Integer leadWinRate;    // Win rate as lead (null if never lead)
        private int teraUsage;          // Times Terastallized
        private Integer teraWinRate;    // Win rate when Tera'd (null if never)
    }

    /**
     * Lead pair statistics
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LeadPairStats {
        private String pair;            // "Rillaboom + Incineroar"
        private String pokemon1;
        private String pokemon2;
        private int usage;              // Times this pair was used
        private int usageRate;          // Percentage of total games
        private int wins;
        private int winRate;
    }

    /**
     * Team usage statistics response
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UsageStatsResponse {
        private List<PokemonUsageStats> pokemonStats;
        private List<LeadPairStats> leadPairStats;
        private int averageWinRate;
        private int totalGames;
    }

    /**
     * Matchup statistics for a single opponent Pokemon
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MatchupStats {
        private String pokemon;
        private int gamesAgainst;       // Games where opponent had this Pokemon
        private int winsAgainst;
        private int winRate;
        private int timesOnTeam;        // Times seen on team sheet
        private int timesBrought;       // Times actually brought to battle
        private Integer attendanceRate; // % brought when on team (null if never on team)
    }

    /**
     * Team matchup statistics response
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MatchupStatsResponse {
        private List<MatchupStats> bestMatchups;        // Top 5 highest win rate
        private List<MatchupStats> worstMatchups;       // Top 5 lowest win rate
        private List<MatchupStats> highestAttendance;   // Top 5 most brought
        private List<MatchupStats> lowestAttendance;    // Top 5 least brought
    }

    /**
     * Request for custom matchup analysis
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomMatchupRequest {
        private List<String> opponentPokemon;  // 4-6 Pokemon to analyze against
    }

    /**
     * Pokemon analysis in custom matchup
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomPokemonAnalysis {
        private String pokemon;
        private int gamesAgainst;
        private int winsAgainst;
        private int winRate;
    }

    /**
     * Custom matchup analysis response
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CustomMatchupResponse {
        private List<CustomPokemonAnalysis> pokemonAnalysis;
        private int teamWinRate;            // Overall win rate against this core
        private int totalEncounters;        // Games against this exact team composition
    }

    /**
     * Move usage for a single Pokemon
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PokemonMoveStats {
        private String pokemon;
        private List<MoveStats> moves;
    }

    /**
     * Statistics for a single move
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MoveStats {
        private String move;
        private int timesUsed;          // Total times this move was used
        private int usageRate;          // % of games where Pokemon was brought
        private int winRate;            // Win rate in games where move was used
    }

    /**
     * Move usage statistics response
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MoveUsageResponse {
        private List<PokemonMoveStats> pokemonMoves;
    }
}