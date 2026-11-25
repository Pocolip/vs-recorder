package com.yeskatronics.vs_recorder_backend.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * A matchup engine "simulate" result, as published on the job queue.
 *
 * {@code metrics} uses VS Recorder's own {@link AnalyticsDTO} shapes, so the analytics
 * pages render it as they render real replays. Rates in {@code opponents} and
 * {@code diagnostics} are 0-1, unlike the whole percentages in {@code metrics}.
 *
 * Unknown fields are ignored, and only {@code provenance.model},
 * {@code provenance.pool_snapshot} and {@code provenance.created} are read.
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SimulationResult {

    public static final String STATUS_PARTIAL = "partial";
    public static final String STATUS_COMPLETE = "complete";
    public static final String STATUS_FAILED = "failed";

    private String status;
    private Error error;
    private Metrics metrics;
    private List<OpponentRow> opponents = new ArrayList<>();
    private Diagnostics diagnostics;
    private Provenance provenance;

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Error {
        private String code;
        private String message;
    }

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Metrics {
        private AnalyticsDTO.UsageStatsResponse usageStats;
        private AnalyticsDTO.MatchupStatsResponse matchupStats;
        private AnalyticsDTO.MoveUsageResponse moveUsage;
    }

    /**
     * One opposing team. Every game against a row was played against the same six.
     */
    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class OpponentRow {
        private String source;
        private Integer placement;
        private String record;
        private List<String> species = new ArrayList<>();
        private double usageWeight;
        private int games;
        private int wins;
        private double winRate;
        private String category;
        private String mode;
    }

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Diagnostics {
        private int games;
        @JsonAlias("win_rate")
        private Double winRate;
        private List<Member> members = new ArrayList<>();
        private Threats threats = new Threats();
    }

    /**
     * What a member of the team adds when brought. {@code delta} is the win rate
     * brought minus the win rate benched, or null when there's too little data.
     */
    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Member {
        private String species;
        @JsonAlias("brought_rate")
        private Double broughtRate;
        @JsonAlias("lead_rate")
        private Double leadRate;
        @JsonAlias("games_brought")
        private Integer gamesBrought;
        @JsonAlias("games_benched")
        private Integer gamesBenched;
        @JsonAlias("win_rate_brought")
        private Double winRateBrought;
        @JsonAlias("win_rate_benched")
        private Double winRateBenched;
        private Double delta;
        /** The 95% interval of {@code delta}, [low, high]. */
        private List<Double> ci95;
    }

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Threats {
        private List<Threat> species = new ArrayList<>();
        private List<Threat> pairs = new ArrayList<>();
    }

    /**
     * An opposing Pokémon (or pair) and how the team does against it.
     */
    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Threat {
        private List<String> species = new ArrayList<>();
        private int games;
        @JsonAlias("win_rate")
        private Double winRate;
        private Double delta;
    }

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Provenance {
        private String model;
        /** The date of the meta teams it played against, e.g. "2026-11-16". */
        @JsonProperty("pool_snapshot")
        private String poolSnapshot;
        private String created;
    }
}
