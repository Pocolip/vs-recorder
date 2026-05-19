package com.yeskatronics.vs_recorder_backend.utils;

import com.yeskatronics.vs_recorder_backend.services.PokemonService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Regression test for issue #160 using the two real replay JSONs the reporter
 * provided. Both replays are a literal mirror (same 6 species on both sides,
 * both usernames registered to the same team) — the previous if/else would
 * leave opponentPlayer null. With the cascading PlayerIdentifier, we should
 * fall through to "default p1 = user" and the opponent team should still be
 * fully populated.
 */
@SpringBootTest
class PlayerIdentifierIssue160Test {

    @Autowired
    private PokemonService pokemonService;

    private static final List<String> REGISTERED_USERNAMES = List.of("PRLT1 Edras", "larry ayuso");
    private static final List<String> REGISTERED_ROSTER = List.of(
            "Whimsicott", "Charizard", "Basculegion", "Garchomp", "Glimmora", "Kingambit");

    @Test
    void game1_mirrorMatch_resolvesToP1UserP2Opponent() throws Exception {
        String battleLogJson = readReplay("replays/issue160/game1.json");
        ReplayMatcher.BattleData parsed = ReplayMatcher.extractBattleData(
                battleLogJson, REGISTERED_USERNAMES);

        PlayerIdentifier.Identification id = PlayerIdentifier.identify(
                REGISTERED_USERNAMES,
                REGISTERED_ROSTER,
                parsed.getPlayers(),
                parsed.getTeams(),
                pokemonService);

        assertEquals("p1", id.userPlayer());
        assertEquals("p2", id.opponentPlayer());
        assertNotNull(id.opponentUsername(), "opponentPlayer must not be null — that was the #160 bug");
        assertEquals(6, parsed.getTeams().get("p2").size(),
                "opponent team must be fully populated so the frontend can render it");
    }

    @Test
    void game2_mirrorMatch_resolvesToP1UserP2Opponent() throws Exception {
        String battleLogJson = readReplay("replays/issue160/game2.json");
        ReplayMatcher.BattleData parsed = ReplayMatcher.extractBattleData(
                battleLogJson, REGISTERED_USERNAMES);

        PlayerIdentifier.Identification id = PlayerIdentifier.identify(
                REGISTERED_USERNAMES,
                REGISTERED_ROSTER,
                parsed.getPlayers(),
                parsed.getTeams(),
                pokemonService);

        assertEquals("p1", id.userPlayer());
        assertEquals("p2", id.opponentPlayer());
        assertNotNull(id.opponentUsername());
        assertEquals(6, parsed.getTeams().get("p2").size());
    }

    // ==================== Follow-up: two registered usernames, different teams ====================
    //
    // Reporter's second report: team is registered with both kevintoodlepoot and
    // testing-toodle, both play each other on ladder, but only kevintoodlepoot is
    // bringing the registered perish-trap team — testing-toodle brought a different
    // Charizard-Y team. Previously the cascade defaulted to p1 (testing-toodle), so
    // the perish team rendered as the opponent. Should now resolve to p2 via tier 1.

    private static final List<String> FOLLOWUP_USERNAMES =
            List.of("kevintoodlepoot", "testing-toodle");
    private static final List<String> FOLLOWUP_ROSTER = List.of(
            "Gengar-Mega", "Incineroar", "Sinistcha", "Politoed", "Tinkaton", "Kommo-o");

    @Test
    void followupGame1_differentTeams_resolvesToP2WithPerishRoster() throws Exception {
        String battleLogJson = readReplay("replays/issue160-followup/game1.json");
        ReplayMatcher.BattleData parsed = ReplayMatcher.extractBattleData(
                battleLogJson, FOLLOWUP_USERNAMES);

        PlayerIdentifier.Identification id = PlayerIdentifier.identify(
                FOLLOWUP_USERNAMES,
                FOLLOWUP_ROSTER,
                parsed.getPlayers(),
                parsed.getTeams(),
                pokemonService);

        assertEquals("p2", id.userPlayer());
        assertEquals("kevintoodlepoot", id.userUsername());
        assertEquals("testing-toodle", id.opponentUsername());
    }

    @Test
    void followupGame2_differentTeams_resolvesToP2WithPerishRoster() throws Exception {
        String battleLogJson = readReplay("replays/issue160-followup/game2.json");
        ReplayMatcher.BattleData parsed = ReplayMatcher.extractBattleData(
                battleLogJson, FOLLOWUP_USERNAMES);

        PlayerIdentifier.Identification id = PlayerIdentifier.identify(
                FOLLOWUP_USERNAMES,
                FOLLOWUP_ROSTER,
                parsed.getPlayers(),
                parsed.getTeams(),
                pokemonService);

        assertEquals("p2", id.userPlayer());
        assertEquals("kevintoodlepoot", id.userUsername());
        assertEquals("testing-toodle", id.opponentUsername());
    }

    private String readReplay(String path) throws Exception {
        ClassPathResource resource = new ClassPathResource(path);
        return new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
    }
}
