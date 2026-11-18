package com.yeskatronics.vs_recorder_backend.engine;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeskatronics.vs_recorder_backend.dto.PlanResult;
import com.yeskatronics.vs_recorder_backend.entities.GamePlanTeam;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Objects;

import static org.junit.jupiter.api.Assertions.*;

/**
 * The engine's sample plan result ({@code plan.schema.json}) deserializes into
 * {@link PlanResult}, and its compositions into VS Recorder's own
 * {@link GamePlanTeam.TeamComposition}, with {@code weight} the only extra field.
 * If {@code TeamComposition} changes, tell the engine's side.
 */
class PlanResultContractTest {

    static final String FIXTURE = "/engine/plan-result.sample.json";

    private static String json;
    private static PlanResult result;

    @BeforeAll
    static void load() throws Exception {
        try (InputStream in = PlanResultContractTest.class.getResourceAsStream(FIXTURE)) {
            json = new String(Objects.requireNonNull(in, "fixture missing").readAllBytes(), StandardCharsets.UTF_8);
        }
        result = new ObjectMapper().readValue(json, PlanResult.class);
    }

    @Test
    void outcome() {
        assertEquals("complete", result.getStatus());
        assertNull(result.getError());
        assertEquals(128, result.getGames());
        assertEquals(87, result.getWins());
        assertEquals(41, result.getLosses());
        assertEquals(0, result.getTies());
        assertEquals(0.6797, result.getWinRate(), 1e-9);
        assertEquals(List.of(0.5914, 0.768), result.getCi95());
        assertEquals("favorable", result.getCategory());
        assertEquals("run26-latest-7b58dee0", result.getProvenance().getModel());
    }

    @Test
    void compositions() {
        assertEquals(3, result.getCompositions().size());
        PlanResult.Composition top = result.getCompositions().get(0);
        assertEquals("Golisopod", top.getLead1());
        assertEquals("Pelipper", top.getLead2());
        assertEquals("Basculegion-F", top.getBack1());
        assertEquals("Sneasler", top.getBack2());
        assertEquals("Simulated: 40% of the engine's preview mix.", top.getNotes());
        assertEquals(0.4025, top.getWeight(), 1e-9);

        assertEquals(2, result.getOpponentCompositions().size());
        assertEquals("Garchomp", result.getOpponentCompositions().get(0).getLead1());
        assertTrue(result.getOpponentSummary().startsWith("Simulated: they lead Garchomp + Rillaboom"));
    }

    @Test
    void previewAndOpponent() {
        assertEquals(0.7264, result.getPreview().getValue(), 1e-9);
        assertEquals(0.1364, result.getPreview().getSimplifyCost().getVsBestResponse(), 1e-9);
        assertEquals("sheet", result.getOpponent().getSpreads());
        assertEquals(6, result.getOpponent().getSpecies().size());
        assertEquals(6, result.getTeam().size());
    }

    /** Every composition field but {@code weight} is one of TeamComposition's. */
    @Test
    void compositionsAreTeamCompositionsPlusAWeight() throws Exception {
        ObjectMapper strict = new ObjectMapper().enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
        JsonNode root = strict.readTree(json);
        for (String field : List.of("compositions", "opponentCompositions")) {
            for (JsonNode composition : root.get(field)) {
                assertTrue(composition.has("weight"));
                com.fasterxml.jackson.databind.node.ObjectNode withoutWeight = composition.deepCopy();
                withoutWeight.remove("weight");
                GamePlanTeam.TeamComposition parsed = strict.treeToValue(withoutWeight, GamePlanTeam.TeamComposition.class);
                assertNotNull(parsed.getLead1());
                assertNotNull(parsed.getNotes());
            }
        }
        assertEquals(new GamePlanTeam.TeamComposition("Golisopod", "Pelipper", "Basculegion-F", "Sneasler",
                "Simulated: 40% of the engine's preview mix."), result.getCompositions().get(0).toTeamComposition());
    }
}
