package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.dto.PokemonEntry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class PokemonServiceTest {

    @Autowired
    private PokemonService pokemonService;

    // ==================== resolveCanonical ====================

    @Test
    void resolveCanonical_showdownNames() {
        assertEquals("ogerpon-hearthflame", pokemonService.resolveCanonical("Ogerpon-Hearthflame"));
        assertEquals("urshifu-rapid-strike", pokemonService.resolveCanonical("Urshifu-Rapid-Strike"));
        assertEquals("calyrex-shadow", pokemonService.resolveCanonical("Calyrex-Shadow"));
        assertEquals("landorus-therian", pokemonService.resolveCanonical("Landorus-Therian"));
        assertEquals("flutter-mane", pokemonService.resolveCanonical("Flutter Mane"));
        assertEquals("iron-hands", pokemonService.resolveCanonical("Iron Hands"));
        assertEquals("rillaboom", pokemonService.resolveCanonical("Rillaboom"));
        assertEquals("raging-bolt", pokemonService.resolveCanonical("Raging Bolt"));
    }

    @Test
    void resolveCanonical_battleLogFormat() {
        // Battle log format: "Pokemon, L50, F"
        assertEquals("urshifu", pokemonService.resolveCanonical("Urshifu-*, L50, F"));
        assertEquals("terapagos-stellar", pokemonService.resolveCanonical("Terapagos-Stellar, L50, M"));
        assertEquals("ogerpon-hearthflame-tera", pokemonService.resolveCanonical("Ogerpon-Hearthflame-Tera, L50"));
    }

    @Test
    void resolveCanonical_displayNameVariants() {
        assertEquals("calyrex-shadow", pokemonService.resolveCanonical("Calyrex-Shadow Rider"));
        assertEquals("calyrex-ice", pokemonService.resolveCanonical("Calyrex-Ice Rider"));
        assertEquals("ogerpon-hearthflame", pokemonService.resolveCanonical("Ogerpon-Hearthflame Mask"));
        assertEquals("necrozma-dawn-wings", pokemonService.resolveCanonical("Necrozma-Dawn Wings"));
    }

    @Test
    void resolveCanonical_genderForms() {
        assertEquals("indeedee-f", pokemonService.resolveCanonical("Indeedee-F"));
        assertEquals("indeedee", pokemonService.resolveCanonical("Indeedee-M"));
        assertEquals("indeedee-f", pokemonService.resolveCanonical("indeedee-female"));
        assertEquals("meowstic-f", pokemonService.resolveCanonical("Meowstic-F"));
        assertEquals("basculegion-f", pokemonService.resolveCanonical("Basculegion-F"));
    }

    @Test
    void resolveCanonical_nullAndEmpty() {
        assertNull(pokemonService.resolveCanonical(null));
        assertEquals("", pokemonService.resolveCanonical(""));
    }

    @Test
    void resolveCanonical_unknownPokemon_gracefulDegradation() {
        // Should return cleaned input for unknown Pokemon
        String result = pokemonService.resolveCanonical("FakeMon XYZ");
        assertNotNull(result);
        assertFalse(result.isEmpty());
    }

    // ==================== resolveBaseSpecies ====================

    @Test
    void resolveBaseSpecies_cosmeticForms_stripToBase() {
        assertEquals("terapagos", pokemonService.resolveBaseSpecies("Terapagos-Stellar"));
        assertEquals("palafin", pokemonService.resolveBaseSpecies("Palafin-Hero"));
        assertEquals("maushold", pokemonService.resolveBaseSpecies("Maushold"));
    }

    @Test
    void resolveBaseSpecies_competitiveForms_preserved() {
        assertEquals("landorus-therian", pokemonService.resolveBaseSpecies("Landorus-Therian"));
        assertEquals("rotom-wash", pokemonService.resolveBaseSpecies("Rotom-Wash"));
        assertEquals("calyrex-shadow", pokemonService.resolveBaseSpecies("Calyrex-Shadow"));
        assertEquals("ogerpon-hearthflame", pokemonService.resolveBaseSpecies("Ogerpon-Hearthflame"));
        assertEquals("urshifu-rapid-strike", pokemonService.resolveBaseSpecies("Urshifu-Rapid-Strike"));
    }

    @Test
    void resolveBaseSpecies_regionalForms_preserved() {
        assertEquals("articuno-galar", pokemonService.resolveBaseSpecies("Articuno-Galar"));
        assertEquals("ninetales-alola", pokemonService.resolveBaseSpecies("Ninetales-Alola"));
        assertEquals("typhlosion-hisui", pokemonService.resolveBaseSpecies("Typhlosion-Hisui"));
        assertEquals("wooper-paldea", pokemonService.resolveBaseSpecies("Wooper-Paldea"));
    }

    @Test
    void resolveBaseSpecies_teraForms_resolveToCompetitiveForm() {
        assertEquals("ogerpon-hearthflame", pokemonService.resolveBaseSpecies("Ogerpon-Hearthflame-Tera"));
    }

    // ==================== getSpriteInfo ====================

    @Test
    void getSpriteInfo_keyForms() {
        int[] info = pokemonService.getSpriteInfo("Ogerpon-Hearthflame");
        assertNotNull(info);
        assertEquals(1017, info[0]); // num
        assertEquals(2, info[1]);    // form

        info = pokemonService.getSpriteInfo("Urshifu-Rapid-Strike");
        assertNotNull(info);
        assertEquals(892, info[0]);
        assertEquals(1, info[1]);

        info = pokemonService.getSpriteInfo("Rillaboom");
        assertNotNull(info);
        assertEquals(812, info[0]);
        assertEquals(0, info[1]);
    }

    @Test
    void getSpriteInfo_unknownPokemon_returnsNull() {
        assertNull(pokemonService.getSpriteInfo("FakeMon"));
    }

    // ==================== getSpritePath ====================

    @Test
    void getSpritePath_correctFormat() {
        assertEquals("/sprites/icon1017_f02_s0.png", pokemonService.getSpritePath("Ogerpon-Hearthflame", false));
        assertEquals("/sprites/icon1017_f02_s1.png", pokemonService.getSpritePath("Ogerpon-Hearthflame", true));
        assertEquals("/sprites/icon0812_f00_s0.png", pokemonService.getSpritePath("Rillaboom", false));
    }

    // ==================== getDisplayName ====================

    @Test
    void getDisplayName_properCapitalization() {
        assertEquals("Ogerpon Hearthflame", pokemonService.getDisplayName("ogerpon-hearthflame"));
        assertEquals("Rillaboom", pokemonService.getDisplayName("rillaboom"));
        assertEquals("Flutter Mane", pokemonService.getDisplayName("flutter-mane"));
        assertEquals("Iron Hands", pokemonService.getDisplayName("iron-hands"));
    }

    // ==================== getTypes ====================

    @Test
    void getTypes_correctTypes() {
        assertEquals(List.of("Grass", "Fire"), pokemonService.getTypes("Ogerpon-Hearthflame"));
        assertEquals(List.of("Grass"), pokemonService.getTypes("Rillaboom"));
        assertEquals(List.of("Ghost", "Fairy"), pokemonService.getTypes("Flutter Mane"));
    }

    @Test
    void getTypes_unknownPokemon_emptyList() {
        assertTrue(pokemonService.getTypes("FakeMon").isEmpty());
    }

    // ==================== Registry completeness ====================

    @Test
    void registry_allEntriesHaveRequiredFields() {
        Map<String, PokemonEntry> registry = pokemonService.getFullRegistry();
        assertFalse(registry.isEmpty());

        for (Map.Entry<String, PokemonEntry> entry : registry.entrySet()) {
            PokemonEntry pokemon = entry.getValue();
            assertNotNull(pokemon.canonicalName(), "canonicalName null for: " + entry.getKey());
            assertTrue(pokemon.num() > 0, "num <= 0 for: " + entry.getKey());
            assertNotNull(pokemon.name(), "name null for: " + entry.getKey());
            assertNotNull(pokemon.displayName(), "displayName null for: " + entry.getKey());
            assertNotNull(pokemon.baseSpecies(), "baseSpecies null for: " + entry.getKey());
            assertNotNull(pokemon.types(), "types null for: " + entry.getKey());
            assertFalse(pokemon.types().isEmpty(), "types empty for: " + entry.getKey());
        }
    }

    @Test
    void registry_hasReasonableSize() {
        Map<String, PokemonEntry> registry = pokemonService.getFullRegistry();
        assertTrue(registry.size() > 1000, "Registry should have >1000 entries, got: " + registry.size());
    }

    @Test
    void registryVersion_notNull() {
        assertNotNull(pokemonService.getRegistryVersion());
        assertFalse(pokemonService.getRegistryVersion().isEmpty());
    }
}
