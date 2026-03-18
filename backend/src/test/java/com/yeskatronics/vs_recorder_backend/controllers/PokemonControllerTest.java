package com.yeskatronics.vs_recorder_backend.controllers;

import com.yeskatronics.vs_recorder_backend.dto.PokepasteDTO;
import com.yeskatronics.vs_recorder_backend.services.PokepasteService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.client.RestTemplate;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests for PokemonController endpoints.
 */
@SpringBootTest
@AutoConfigureMockMvc
class PokemonControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PokepasteService pokepasteService;

    @MockitoBean
    private RestTemplate restTemplate;

    @Test
    void testParsePokepaste_Success() throws Exception {
        // Setup
        String testUrl = "https://pokepast.es/abc123";
        List<String> species = Arrays.asList("Rillaboom", "Incineroar", "Flutter Mane", "Torkoal", "Urshifu", "Amoonguss");

        PokepasteDTO.PasteData mockPasteData = new PokepasteDTO.PasteData();
        for (String sp : species) {
            PokepasteDTO.PokemonData pokemon = new PokepasteDTO.PokemonData();
            pokemon.setSpecies(sp);
            mockPasteData.getPokemon().add(pokemon);
        }

        when(pokepasteService.fetchPasteData(testUrl)).thenReturn(mockPasteData);
        when(pokepasteService.extractSpeciesNames(mockPasteData)).thenReturn(species);

        // Execute & Verify
        mockMvc.perform(get("/api/pokemon/pokepaste/parse")
                        .param("url", testUrl)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.species").isArray())
                .andExpect(jsonPath("$.species.length()").value(6))
                .andExpect(jsonPath("$.species[0]").value("Rillaboom"))
                .andExpect(jsonPath("$.species[1]").value("Incineroar"));
    }

    @Test
    void testParsePokepaste_InvalidUrl() throws Exception {
        // Setup
        String invalidUrl = "https://invalid.com/notapaste";

        when(pokepasteService.fetchPasteData(invalidUrl))
                .thenThrow(new IllegalArgumentException("Invalid URL - must be a Pokepaste or Pokebin URL"));

        // Execute & Verify
        mockMvc.perform(get("/api/pokemon/pokepaste/parse")
                        .param("url", invalidUrl)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid URL - must be a Pokepaste or Pokebin URL"));
    }

    @Test
    void testGetPokemonSprite_Success() throws Exception {
        // Rillaboom is in the Pokemon registry, so it returns a local sprite path
        String pokemonName = "rillaboom";

        // Execute & Verify
        mockMvc.perform(get("/api/pokemon/" + pokemonName + "/sprite")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.url").value("/sprites/icon0812_f00_s0.png"));
    }

    @Test
    void testGetPokemonSprite_NotFound() throws Exception {
        // Setup
        String pokemonName = "fakemon";

        when(restTemplate.getForObject(anyString(), eq(Map.class)))
                .thenThrow(org.springframework.web.client.HttpClientErrorException.NotFound.create(
                        org.springframework.http.HttpStatus.NOT_FOUND,
                        "Not Found",
                        org.springframework.http.HttpHeaders.EMPTY,
                        new byte[0],
                        null));

        // Execute & Verify
        mockMvc.perform(get("/api/pokemon/" + pokemonName + "/sprite")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Pokemon not found: " + pokemonName));
    }

    @Test
    void testGetPokemonSprite_WithSpaces() throws Exception {
        // Flutter Mane is in the Pokemon registry, so it returns a local sprite path
        String pokemonName = "Flutter Mane";

        // Execute & Verify
        mockMvc.perform(get("/api/pokemon/" + pokemonName + "/sprite")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.url").value("/sprites/icon0987_f00_s0.png"));
    }
}
