package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.dto.PokepasteDTO;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.client.RestTemplate;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.assertj.core.api.Fail.fail;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@SpringBootTest
class PokepasteServiceTest {

    @Autowired
    private PokepasteService pokepasteService;

    @MockitoBean
    private RestTemplate restTemplate;

    private String loadTestFile(String filename) {
        try {
            Path path = Paths.get("src/test/resources/pastes", filename);
            return Files.readString(path);
        } catch (IOException e) {
            fail("Could not load test file: " + filename);
            return null;
        }
    }

    @Test
    void testFariursa(){
        String pasteText = loadTestFile("fariursa.txt");
        when(restTemplate.getForObject(anyString(), eq(String.class)))
                .thenReturn(pasteText);

        PokepasteDTO.PasteData result = pokepasteService.fetchPasteData(
                "https://pokepast.es/abc123");

        assertNotNull(result);
        assertEquals(6, result.getPokemon().size());

        assertEquals("Farigiraf", result.getPokemon().get(0).getSpecies());
        assertEquals("Pepe", result.getPokemon().get(0).getNickname());
        assertEquals("Sitrus Berry", result.getPokemon().get(0).getItem());
        assertEquals("Armor Tail", result.getPokemon().get(0).getAbility());
        assertEquals("Fairy", result.getPokemon().get(0).getTeraType());
        assertEquals("Psychic", result.getPokemon().get(0).getMoves().get(0));
        assertEquals("Dazzling Gleam", result.getPokemon().get(0).getMoves().get(1));
        assertEquals("Helping Hand", result.getPokemon().get(0).getMoves().get(2));
        assertEquals("Trick Room", result.getPokemon().get(0).getMoves().get(3));

        assertEquals("Ogerpon-Wellspring", result.getPokemon().get(1).getSpecies());
        assertEquals("Wellspring Mask", result.getPokemon().get(1).getItem());
        assertEquals("Water Absorb", result.getPokemon().get(1).getAbility());
        assertEquals("Water", result.getPokemon().get(1).getTeraType());
        assertEquals("Ivy Cudgel", result.getPokemon().get(1).getMoves().get(0));
        assertEquals("Horn Leech", result.getPokemon().get(1).getMoves().get(1));
        assertEquals("Follow Me", result.getPokemon().get(1).getMoves().get(2));
        assertEquals("Spiky Shield", result.getPokemon().get(1).getMoves().get(3));

        assertEquals("Ursaluna-Bloodmoon", result.getPokemon().get(2).getSpecies());
        assertEquals("Life Orb", result.getPokemon().get(2).getItem());
        assertEquals("Mind's Eye", result.getPokemon().get(2).getAbility());
        assertEquals("Normal", result.getPokemon().get(2).getTeraType());
        assertEquals("Protect", result.getPokemon().get(2).getMoves().get(0));
        assertEquals("Hyper Voice", result.getPokemon().get(2).getMoves().get(1));
        assertEquals("Blood Moon", result.getPokemon().get(2).getMoves().get(2));
        assertEquals("Earth Power", result.getPokemon().get(2).getMoves().get(3));

        assertEquals("Urshifu", result.getPokemon().get(3).getSpecies());
        assertEquals("Focus Sash", result.getPokemon().get(3).getItem());
        assertEquals("Unseen Fist", result.getPokemon().get(3).getAbility());
        assertEquals("Dark", result.getPokemon().get(3).getTeraType());
        assertEquals("Detect", result.getPokemon().get(3).getMoves().get(0));
        assertEquals("Close Combat", result.getPokemon().get(3).getMoves().get(1));
        assertEquals("Wicked Blow", result.getPokemon().get(3).getMoves().get(2));
        assertEquals("Sucker Punch", result.getPokemon().get(3).getMoves().get(3));

        assertEquals("Flutter Mane", result.getPokemon().get(4).getSpecies());
        assertEquals("Booster Energy", result.getPokemon().get(4).getItem());
        assertEquals("Protosynthesis", result.getPokemon().get(4).getAbility());
        assertEquals("Grass", result.getPokemon().get(4).getTeraType());
        assertEquals("Protect", result.getPokemon().get(4).getMoves().get(0));
        assertEquals("Icy Wind", result.getPokemon().get(4).getMoves().get(1));
        assertEquals("Moonblast", result.getPokemon().get(4).getMoves().get(2));
        assertEquals("Shadow Ball", result.getPokemon().get(4).getMoves().get(3));

        assertEquals("Incineroar", result.getPokemon().get(5).getSpecies());
        assertEquals("Assault Vest", result.getPokemon().get(5).getItem());
        assertEquals("Intimidate", result.getPokemon().get(5).getAbility());
        assertEquals("Grass", result.getPokemon().get(5).getTeraType());
        assertEquals("Fake Out", result.getPokemon().get(5).getMoves().get(0));
        assertEquals("U-turn", result.getPokemon().get(5).getMoves().get(1));
        assertEquals("Knock Off", result.getPokemon().get(5).getMoves().get(2));
        assertEquals("Flare Blitz", result.getPokemon().get(5).getMoves().get(3));

    }

    @Test
    void testFormes(){
        String pasteText = loadTestFile("formes.txt");
        when(restTemplate.getForObject(anyString(), eq(String.class)))
                .thenReturn(pasteText);

        PokepasteDTO.PasteData result = pokepasteService.fetchPasteData(
                "https://pokepast.es/abc123");

        assertNotNull(result);
        assertEquals(6, result.getPokemon().size());

        assertEquals("Calyrex-Shadow", result.getPokemon().get(0).getSpecies());

        assertEquals("Urshifu-Rapid-Strike", result.getPokemon().get(1).getSpecies());

        assertEquals("Sinistcha-Masterpiece", result.getPokemon().get(2).getSpecies());

        assertEquals("Maushold", result.getPokemon().get(3).getSpecies());

        assertEquals("Tatsugiri-Droopy", result.getPokemon().get(4).getSpecies());

        assertEquals("Oricorio-Pom-Pom", result.getPokemon().get(5).getSpecies());
    }

    @Test
    void testHoohbasc(){
        String pasteText = loadTestFile("hoohbasc.txt");
        when(restTemplate.getForObject(anyString(), eq(String.class)))
                .thenReturn(pasteText);

        PokepasteDTO.PasteData result = pokepasteService.fetchPasteData(
                "https://pokepast.es/abc123");

        assertNotNull(result);
        assertEquals(6, result.getPokemon().size());

        assertEquals("Ho-Oh", result.getPokemon().get(0).getSpecies());

        assertEquals("Basculegion-F", result.getPokemon().get(1).getSpecies());

        assertEquals("Terapagos-Stellar", result.getPokemon().get(2).getSpecies());

        assertEquals("Arcanine-Hisui", result.getPokemon().get(3).getSpecies());

        assertEquals("Avalugg", result.getPokemon().get(4).getSpecies());

        assertEquals("Porygon-Z", result.getPokemon().get(5).getSpecies());
    }

    @Test
    void testOger(){
        String pasteText = loadTestFile("oger.txt");
        when(restTemplate.getForObject(anyString(), eq(String.class)))
                .thenReturn(pasteText);

        PokepasteDTO.PasteData result = pokepasteService.fetchPasteData(
                "https://pokepast.es/abc123");

        assertNotNull(result);
        assertEquals(6, result.getPokemon().size());

        assertEquals("Grimmsnarl", result.getPokemon().get(0).getSpecies());

        assertEquals("Landorus", result.getPokemon().get(1).getSpecies());

        assertEquals("Urshifu-Rapid-Strike", result.getPokemon().get(2).getSpecies());

        assertEquals("Ogerpon-Hearthflame", result.getPokemon().get(3).getSpecies());

        assertEquals("Raging Bolt", result.getPokemon().get(4).getSpecies());

        assertEquals("Chien-Pao", result.getPokemon().get(5).getSpecies());
    }
}
