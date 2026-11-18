package com.yeskatronics.vs_recorder_backend.services;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Pastes made ready for the matchup engine: Mega formes listed as the species they
 * evolve from (with the real registry, so the stones and base species are Showdown's).
 */
class PasteNormalizerTest {

    private static PasteNormalizer normalizer;

    @BeforeAll
    static void load() {
        PokemonService pokemonService = new PokemonService();
        pokemonService.init();
        normalizer = new PasteNormalizer(pokemonService);
    }

    private static String set(String firstLine) {
        return firstLine + "\nAbility: Rough Skin\nLevel: 50\nJolly Nature\n- Protect\n- Earthquake\n";
    }

    @Test
    void aMegaFormeHeldWithItsStoneBecomesItsBaseSpecies() {
        PasteNormalizer.Result result = normalizer.normalize(set("Garchomp-Mega @ Garchompite"));
        assertEquals(set("Garchomp @ Garchompite"), result.text());
        assertEquals(List.of("Garchomp-Mega was sent as Garchomp holding Garchompite."), result.notes());
    }

    @Test
    void nicknamesAndGenderAreKept() {
        assertEquals(set("Chompy (Garchomp) (F) @ Garchompite"),
                normalizer.normalize(set("Chompy (Garchomp-Mega) (F) @ Garchompite")).text());
        assertEquals(set("Charizard (M) @ Charizardite Y"),
                normalizer.normalize(set("Charizard-Mega-Y (M) @ Charizardite Y")).text());
    }

    @Test
    void eachMegaGoesBackToTheSpeciesItEvolvesFrom() {
        // Floette-Mega comes from Floette-Eternal, not plain Floette
        assertEquals(set("Floette-Eternal @ Floettite"), normalizer.normalize(set("Floette-Mega @ Floettite")).text());
        // The Z Megas
        assertEquals(set("Garchomp @ Garchompite Z"), normalizer.normalize(set("Garchomp-Mega-Z @ Garchompite Z")).text());
        assertEquals(set("Absol @ Absolite Z"), normalizer.normalize(set("Absol-Mega-Z @ Absolite Z")).text());
    }

    @Test
    void aMegaFormeWithoutItsStoneIsRefused() {
        IllegalArgumentException wrong = assertThrows(IllegalArgumentException.class,
                () -> normalizer.normalize(set("Charizard-Mega-Y @ Charizardite X")));
        assertTrue(wrong.getMessage().contains("Charizard-Mega-Y needs to hold Charizardite Y"), wrong.getMessage());
        assertTrue(wrong.getMessage().contains("it holds Charizardite X"), wrong.getMessage());

        IllegalArgumentException none = assertThrows(IllegalArgumentException.class,
                () -> normalizer.normalize(set("Garchomp-Mega")));
        assertTrue(none.getMessage().contains("it holds no item"), none.getMessage());
        assertTrue(none.getMessage().contains("List it as Garchomp @ Garchompite"), none.getMessage());
    }

    @Test
    void otherFormesAndPlainSpeciesAreLeftAlone() {
        String paste = String.join("\n",
                set("Rotom-Wash @ Sitrus Berry"),
                set("Indeedee-F @ Psychic Seed"),
                set("Urshifu-Rapid-Strike @ Focus Sash"),
                set("Garchomp @ Garchompite"),
                // A nickname that looks like a forme, on the base species
                set("Garchomp-Mega (Garchomp) @ Garchompite"));
        PasteNormalizer.Result result = normalizer.normalize(paste);
        assertEquals(paste, result.text());
        assertTrue(result.notes().isEmpty());
    }

    @Test
    void onlyEachSetsFirstLineIsLookedAtAndLineEndingsAreKept() {
        String paste = "Garchomp-Mega @ Garchompite\r\nAbility: Rough Skin\r\n- Protect\r\n\r\n"
                + "Incineroar @ Sitrus Berry\r\nAbility: Intimidate\r\n";
        String expected = "Garchomp @ Garchompite\r\nAbility: Rough Skin\r\n- Protect\r\n\r\n"
                + "Incineroar @ Sitrus Berry\r\nAbility: Intimidate\r\n";
        assertEquals(expected, normalizer.normalize(paste).text());
    }

    @Test
    void everyProblemIsReportedAtOnce() {
        String paste = set("Garchomp-Mega @ Life Orb") + "\n" + set("Kangaskhan-Mega @ Sitrus Berry");
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () -> normalizer.normalize(paste));
        assertTrue(e.getMessage().contains("Garchomp-Mega") && e.getMessage().contains("Kangaskhan-Mega"), e.getMessage());
    }
}
