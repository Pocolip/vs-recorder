package com.yeskatronics.vs_recorder_backend.utils;

import com.yeskatronics.vs_recorder_backend.services.PokemonService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Covers each tier of the {@link PlayerIdentifier} cascade plus the issue #160 case
 * where two registered usernames bring the identical team (mirror).
 */
@SpringBootTest
class PlayerIdentifierTest {

    @Autowired
    private PokemonService pokemonService;

    private static final List<String> CAT_ROSTER = List.of(
            "Whimsicott", "Charizard", "Basculegion", "Garchomp", "Glimmora", "Kingambit");
    private static final List<String> RINGER_ROSTER = List.of(
            "Incineroar", "Amoonguss", "Rillaboom", "Urshifu", "Ogerpon-Hearthflame", "Tornadus");

    // ==================== Tier 2: name only (today's working path) ====================

    @Test
    void nameOnly_singleRegisteredUsernameOnP1_picksP1() {
        PlayerIdentifier.Identification id = PlayerIdentifier.identify(
                List.of("Alice"),
                CAT_ROSTER,
                Map.of("p1", "Alice", "p2", "Bob"),
                Map.of("p1", CAT_ROSTER, "p2", RINGER_ROSTER),
                pokemonService);

        assertEquals("p1", id.userPlayer());
        assertEquals("p2", id.opponentPlayer());
        assertEquals("Alice", id.userUsername());
        assertEquals("Bob", id.opponentUsername());
    }

    @Test
    void nameOnly_singleRegisteredUsernameOnP2_picksP2() {
        PlayerIdentifier.Identification id = PlayerIdentifier.identify(
                List.of("Alice"),
                CAT_ROSTER,
                Map.of("p1", "Bob", "p2", "Alice"),
                Map.of("p1", RINGER_ROSTER, "p2", CAT_ROSTER),
                pokemonService);

        assertEquals("p2", id.userPlayer());
        assertEquals("p1", id.opponentPlayer());
        assertEquals("Alice", id.userUsername());
    }

    // ==================== Tier 4: default p1 (issue #160 mirror) ====================

    @Test
    void mirror_bothUsernamesRegisteredSameTeam_defaultsToP1() {
        // Reproduces issue #160 — both PRLT1 Edras and larry ayuso are on the team's
        // showdown_usernames list and bring the identical 6-mon team.
        PlayerIdentifier.Identification id = PlayerIdentifier.identify(
                List.of("PRLT1 Edras", "larry ayuso"),
                CAT_ROSTER,
                Map.of("p1", "PRLT1 Edras", "p2", "larry ayuso"),
                Map.of("p1", CAT_ROSTER, "p2", CAT_ROSTER),
                pokemonService);

        assertEquals("p1", id.userPlayer());
        assertEquals("p2", id.opponentPlayer());
        assertEquals("PRLT1 Edras", id.userUsername());
        assertEquals("larry ayuso", id.opponentUsername());
    }

    // ==================== Tier 1: name AND team (strongest signal) ====================

    @Test
    void nameAndTeam_picksSideMatchingBoth_whenOnlyOneSideQualifies() {
        // Both usernames are registered but only p2 actually brought *this* team.
        // Tier 1 picks the side where name + team both fire.
        PlayerIdentifier.Identification id = PlayerIdentifier.identify(
                List.of("Alice", "Bob"),
                CAT_ROSTER,
                Map.of("p1", "Alice", "p2", "Bob"),
                Map.of("p1", RINGER_ROSTER, "p2", CAT_ROSTER),
                pokemonService);

        assertEquals("p2", id.userPlayer());
        assertEquals("Bob", id.userUsername());
    }

    // ==================== Tier 3: team only ====================

    @Test
    void teamOnly_neitherUsernameRegistered_picksTeamMatchSide() {
        // Edge case: user registered a wrong alt, but one side clearly brought our team.
        PlayerIdentifier.Identification id = PlayerIdentifier.identify(
                List.of("WrongAlt"),
                CAT_ROSTER,
                Map.of("p1", "Stranger1", "p2", "Stranger2"),
                Map.of("p1", RINGER_ROSTER, "p2", CAT_ROSTER),
                pokemonService);

        assertEquals("p2", id.userPlayer());
    }

    // ==================== Bo1 no-OTS fallthrough ====================

    @Test
    void bo1NoOts_emptyTeamRosters_fallsThroughToNameMatch() {
        PlayerIdentifier.Identification id = PlayerIdentifier.identify(
                List.of("Alice"),
                CAT_ROSTER,
                Map.of("p1", "Bob", "p2", "Alice"),
                Map.of("p1", Collections.emptyList(), "p2", Collections.emptyList()),
                pokemonService);

        assertEquals("p2", id.userPlayer());
        assertEquals("Alice", id.userUsername());
    }

    // ==================== No signal at all ====================

    @Test
    void noSignal_neitherNameNorTeamMatches_defaultsToP1() {
        PlayerIdentifier.Identification id = PlayerIdentifier.identify(
                List.of("Alice"),
                CAT_ROSTER,
                Map.of("p1", "Stranger1", "p2", "Stranger2"),
                Map.of("p1", RINGER_ROSTER, "p2", RINGER_ROSTER),
                pokemonService);

        assertEquals("p1", id.userPlayer());
        assertEquals("Stranger1", id.userUsername());
    }

    @Test
    void teamMatch_usernameWithDifferentCase_stillMatches() {
        PlayerIdentifier.Identification id = PlayerIdentifier.identify(
                List.of("alice"),
                CAT_ROSTER,
                Map.of("p1", "ALICE", "p2", "Bob"),
                Map.of("p1", CAT_ROSTER, "p2", RINGER_ROSTER),
                pokemonService);

        assertEquals("p1", id.userPlayer());
    }
}
