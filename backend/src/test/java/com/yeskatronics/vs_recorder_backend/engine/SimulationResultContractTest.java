package com.yeskatronics.vs_recorder_backend.engine;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeskatronics.vs_recorder_backend.dto.AnalyticsDTO;
import com.yeskatronics.vs_recorder_backend.dto.SimulationResult;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * The engine's sample result deserializes into VS Recorder's own analytics DTOs.
 *
 * A plain ObjectMapper fails on unknown properties, and the {@link AnalyticsDTO} classes
 * don't ignore any, so this also checks {@code metrics} matches them field for field.
 * If it fails after an AnalyticsDTO change, tell the engine's side (its contract check
 * compares the same shapes).
 */
class SimulationResultContractTest {

    static final String FIXTURE = "/engine/simulate-result.sample.json";

    private static SimulationResult result;

    @BeforeAll
    static void load() throws Exception {
        try (InputStream in = SimulationResultContractTest.class.getResourceAsStream(FIXTURE)) {
            assertNotNull(in, "fixture missing");
            result = new ObjectMapper().readValue(in, SimulationResult.class);
        }
    }

    @Test
    void status() {
        assertEquals(SimulationResult.STATUS_COMPLETE, result.getStatus());
        assertNull(result.getError());
    }

    @Test
    void usageStats() {
        AnalyticsDTO.UsageStatsResponse usage = result.getMetrics().getUsageStats();
        assertEquals(480, usage.getTotalGames());
        assertEquals(50, usage.getAverageWinRate());
        assertEquals(6, usage.getPokemonStats().size());
        assertEquals(6, usage.getLeadPairStats().size());

        AnalyticsDTO.PokemonUsageStats pelipper = usage.getPokemonStats().get(0);
        assertEquals("Pelipper", pelipper.getPokemon());
        assertEquals(467, pelipper.getUsage());
        assertEquals(97, pelipper.getUsageRate());
        assertEquals(49, pelipper.getOverallWinRate());
        assertEquals(111, pelipper.getLeadUsage());
        assertEquals(56, pelipper.getLeadWinRate());
        // Champions has no Tera
        assertEquals(0, pelipper.getTeraUsage());
        assertNull(pelipper.getTeraWinRate());

        AnalyticsDTO.LeadPairStats pair = usage.getLeadPairStats().get(0);
        assertNotNull(pair.getPair());
        assertNotNull(pair.getPokemon1());
        assertNotNull(pair.getPokemon2());
    }

    @Test
    void matchupStats() {
        AnalyticsDTO.MatchupStatsResponse matchups = result.getMetrics().getMatchupStats();
        assertEquals(5, matchups.getBestMatchups().size());
        AnalyticsDTO.MatchupStats raichu = matchups.getBestMatchups().get(0);
        assertEquals("Raichu", raichu.getPokemon());
        assertEquals(74, raichu.getGamesAgainst());
        assertEquals(48, raichu.getWinsAgainst());
        assertEquals(65, raichu.getWinRate());
        assertEquals(74, raichu.getTimesOnTeam());
        assertEquals(59, raichu.getTimesBrought());
        assertEquals(80, raichu.getAttendanceRate());
        assertFalse(matchups.getWorstMatchups().isEmpty());
        assertFalse(matchups.getHighestAttendance().isEmpty());
        assertFalse(matchups.getLowestAttendance().isEmpty());
    }

    @Test
    void moveUsage() {
        AnalyticsDTO.PokemonMoveStats archaludon = result.getMetrics().getMoveUsage().getPokemonMoves().get(0);
        assertEquals("Archaludon", archaludon.getPokemon());
        AnalyticsDTO.MoveStats electroShot = archaludon.getMoves().get(0);
        assertEquals("Electro Shot", electroShot.getMove());
        assertEquals(566, electroShot.getTimesUsed());
        assertEquals(39, electroShot.getUsageRate());
    }

    @Test
    void opponents() {
        assertEquals(12, result.getOpponents().size());
        SimulationResult.OpponentRow first = result.getOpponents().get(0);
        assertEquals(List.of("Raichu", "Volcarona", "Rillaboom", "Incineroar", "Basculegion", "Floette-Eternal"),
                first.getSpecies());
        assertEquals(16, first.getGames());
        assertEquals(6, first.getWins());
        assertEquals(0.375, first.getWinRate(), 1e-9);
        assertEquals(1, first.getPlacement());
        assertEquals("search", first.getMode());
    }

    @Test
    void diagnostics() {
        SimulationResult.Diagnostics diagnostics = result.getDiagnostics();
        assertEquals(480, diagnostics.getGames());
        assertEquals(0.4998, diagnostics.getWinRate(), 1e-9);

        assertEquals(6, diagnostics.getMembers().size());
        SimulationResult.Member raichu = diagnostics.getMembers().get(0);
        assertEquals("Raichu", raichu.getSpecies());
        assertEquals(0.3063, raichu.getBroughtRate(), 1e-9);
        assertEquals(0.1771, raichu.getLeadRate(), 1e-9);
        assertEquals(147, raichu.getGamesBrought());
        assertEquals(333, raichu.getGamesBenched());
        assertEquals(0.5077, raichu.getWinRateBrought(), 1e-9);
        assertEquals(0.4916, raichu.getWinRateBenched(), 1e-9);
        assertEquals(0.0161, raichu.getDelta(), 1e-9);
        assertEquals(List.of(-0.1067, 0.1389), raichu.getCi95());
        // delta is nullable
        assertNull(diagnostics.getMembers().get(3).getDelta());

        SimulationResult.Threat garchomp = diagnostics.getThreats().getSpecies().get(0);
        assertEquals(List.of("Garchomp"), garchomp.getSpecies());
        assertEquals(71, garchomp.getGames());
        assertEquals(0.4173, garchomp.getWinRate(), 1e-9);
        assertEquals(-0.0826, garchomp.getDelta(), 1e-9);
        assertEquals(2, diagnostics.getThreats().getPairs().get(0).getSpecies().size());
    }

    @Test
    void provenanceReadsOnlyModelPoolAndCreated() {
        assertEquals("run24-latest-70830fb1", result.getProvenance().getModel());
        assertEquals("2026-10-23", result.getProvenance().getPoolSnapshot());
        assertEquals("2026-11-06T01:37:55+00:00", result.getProvenance().getCreated());
    }

    @Test
    void failedEnvelope() throws Exception {
        String failed = """
                {"schema_version":1,"kind":"simulate","job_id":"x","regulation":"gen9championsvgc2026regmc",
                 "status":"failed","error":{"code":"invalid_team","message":"the team isn't valid: a team has 6 Pokémon, this one 5"}}
                """;
        SimulationResult r = new ObjectMapper().readValue(failed, SimulationResult.class);
        assertEquals(SimulationResult.STATUS_FAILED, r.getStatus());
        assertEquals("invalid_team", r.getError().getCode());
        assertNull(r.getMetrics());
        assertTrue(r.getOpponents().isEmpty());
    }
}
