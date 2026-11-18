package com.yeskatronics.vs_recorder_backend.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.yeskatronics.vs_recorder_backend.entities.GamePlanTeam;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * A matchup engine "plan" result, as published on the job queue: the user's team
 * against one Matchup Planner entry.
 *
 * The compositions are {@link GamePlanTeam.TeamComposition} plus a weight. A partial
 * result has the compositions but no games, win rate or category yet.
 *
 * Unknown fields are ignored, and only {@code provenance.model} and
 * {@code provenance.created} are read.
 */
@Data
@NoArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PlanResult {

    private String status;
    private SimulationResult.Error error;
    /** The user's species, in team-sheet order. */
    private List<String> team = new ArrayList<>();
    private Opponent opponent;
    /** What to bring: the likeliest options until 80% of the engine's mix, at most 4, likeliest first. */
    private List<Composition> compositions = new ArrayList<>();
    /** What the opponent brings, the same way. */
    private List<Composition> opponentCompositions = new ArrayList<>();
    private String opponentSummary;
    private Integer games;
    private Integer wins;
    private Integer losses;
    private Integer ties;
    /** 0-1, a tie as half a win. */
    private Double winRate;
    /** The 95% interval of {@code winRate}, [low, high]. */
    private List<Double> ci95;
    /** favorable, even or unfavorable. */
    private String category;
    private Preview preview;
    private SimulationResult.Provenance provenance;

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Opponent {
        private List<String> species = new ArrayList<>();
        /** sheet: no stat points in the paste, so the meta's were used; paste: the paste's own. */
        private String spreads;
    }

    /**
     * One option: two leads and two in the back, species named as in the paste.
     * {@code notes} already says it's simulated ("Simulated: 40% of the engine's
     * preview mix."), so it can be stored as a TeamComposition as it is.
     */
    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Composition {
        private String lead1;
        private String lead2;
        private String back1;
        private String back2;
        private String notes;
        /** The option's share of the engine's mix, 0-1. */
        private Double weight;

        public GamePlanTeam.TeamComposition toTeamComposition() {
            return new GamePlanTeam.TeamComposition(lead1, lead2, back1, back2, notes);
        }
    }

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Preview {
        /** The user's expected score from the preview mixes alone, 0-1. */
        private Double value;
        private SimplifyCost simplifyCost;
    }

    @Data
    @NoArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class SimplifyCost {
        /**
         * What always bringing the top composition costs against an opponent who
         * expects it. A large value means varying the bring matters.
         */
        @JsonAlias("vs_best_response")
        private Double vsBestResponse;
    }
}
