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

    // ==================== Forme normalization via base species ====================

    @Test
    void teamMatch_megaInPokepasteCollapsesToBaseInPokeLine() {
        // Reporter's follow-up case: pokepaste registers Gengar-Mega (the @Gengarite
        // forme), but the |poke| line emits base "Gengar" until mid-battle Mega Evolve.
        // Tier 1 must still recognize the perish team on the side that brought it.
        List<String> registered = List.of(
                "Gengar-Mega", "Incineroar", "Sinistcha", "Politoed", "Tinkaton", "Kommo-o");
        List<String> revealedP2 = List.of(
                "Gengar", "Incineroar", "Sinistcha", "Politoed", "Tinkaton", "Kommo-o");
        List<String> revealedP1 = List.of(
                "Whimsicott", "Glimmora", "Charizard", "Floette-Eternal", "Basculegion", "Garchomp");

        PlayerIdentifier.Identification id = PlayerIdentifier.identify(
                List.of("testing-toodle", "kevintoodlepoot"),
                registered,
                Map.of("p1", "testing-toodle", "p2", "kevintoodlepoot"),
                Map.of("p1", revealedP1, "p2", revealedP2),
                pokemonService);

        assertEquals("p2", id.userPlayer());
        assertEquals("kevintoodlepoot", id.userUsername());
        assertEquals("testing-toodle", id.opponentUsername());
    }

    @Test
    void teamMatch_teraBurstFormeCollapsesToBaseCompetitiveForm() {
        // Registered roster has Ogerpon-Hearthflame; revealed roster contains the
        // post-Tera-Burst variant. resolveBaseSpecies must collapse them.
        List<String> registered = List.of(
                "Whimsicott", "Charizard", "Basculegion", "Garchomp", "Glimmora", "Ogerpon-Hearthflame");
        List<String> revealedP2 = List.of(
                "Whimsicott", "Charizard", "Basculegion", "Garchomp", "Glimmora", "Ogerpon-Hearthflame-Tera");

        PlayerIdentifier.Identification id = PlayerIdentifier.identify(
                List.of("WrongAlt"),
                registered,
                Map.of("p1", "Stranger1", "p2", "Stranger2"),
                Map.of("p1", RINGER_ROSTER, "p2", revealedP2),
                pokemonService);

        assertEquals("p2", id.userPlayer());
    }

    @Test
    void teamMatch_keepsCompetitivelyDistinctFormesSeparate() {
        // Ogerpon-Hearthflame and Ogerpon-Wellspring are different competitive entities
        // and must NOT cross-match. baseSpecies preserves these (Hearthflame and
        // Wellspring each have their own baseSpecies in the registry).
        List<String> registered = List.of(
                "Whimsicott", "Charizard", "Basculegion", "Garchomp", "Glimmora", "Ogerpon-Hearthflame");
        List<String> revealedP2 = List.of(
                "Whimsicott", "Charizard", "Basculegion", "Garchomp", "Glimmora", "Ogerpon-Wellspring");

        PlayerIdentifier.Identification id = PlayerIdentifier.identify(
                List.of("Alice"),
                registered,
                Map.of("p1", "Stranger1", "p2", "Alice"),
                Map.of("p1", RINGER_ROSTER, "p2", revealedP2),
                pokemonService);

        // p2 has Alice (name match) but team is different, so tier 1 fails for both.
        // Tier 2 (name only) picks p2.
        assertEquals("p2", id.userPlayer());
        // But the team-match tier itself should NOT have fired for p2 — verify by
        // running the same input without any matching name. Should default to p1.
        PlayerIdentifier.Identification noNameMatch = PlayerIdentifier.identify(
                List.of("WrongAlt"),
                registered,
                Map.of("p1", "Stranger1", "p2", "Stranger2"),
                Map.of("p1", RINGER_ROSTER, "p2", revealedP2),
                pokemonService);
        assertEquals("p1", noNameMatch.userPlayer(),
                "Hearthflame and Wellspring must not cross-match");
    }
}
