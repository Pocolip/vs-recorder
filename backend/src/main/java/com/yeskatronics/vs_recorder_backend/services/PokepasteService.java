package com.yeskatronics.vs_recorder_backend.services;

import com.yeskatronics.vs_recorder_backend.dto.PokepasteDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Service for fetching and parsing Pokepaste data.
 * Handles communication with Pokepaste to retrieve team compositions.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PokepasteService {

    private final RestTemplate restTemplate;

    private static final String POKEPASTE_BASE = "https://pokepast.es";
    private static final Pattern POKEPASTE_URL_PATTERN = Pattern.compile(
            "https://pokepast\\.es/([a-zA-Z0-9]+)(?:/raw)?"
    );

    /**
     * Fetch and parse team data from Pokepaste
     *
     * @param pokepasteUrl the Pokepaste URL
     * @return parsed team data
     * @throws IllegalArgumentException if URL is invalid or fetch fails
     */
    public PokepasteDTO.PasteData fetchPasteData(String pokepasteUrl) {
        log.info("Fetching Pokepaste data from: {}", pokepasteUrl);

        // Validate URL format
        Matcher matcher = POKEPASTE_URL_PATTERN.matcher(pokepasteUrl);
        if (!matcher.find()) {
            throw new IllegalArgumentException("Invalid Pokepaste URL");
        }

        String pasteId = matcher.group(1);
        String rawUrl = POKEPASTE_BASE + "/" + pasteId + "/raw";

        try {
            // Fetch raw text from Pokepaste
            log.debug("Fetching from: {}", rawUrl);
            String rawText = restTemplate.getForObject(rawUrl, String.class);

            if (rawText == null || rawText.trim().isEmpty()) {
                throw new IllegalArgumentException("Failed to fetch Pokepaste data or paste is empty");
            }

            // Parse the paste
            PokepasteDTO.PasteData pasteData = parsePaste(rawText);
            pasteData.setRawText(rawText);

            log.info("Successfully fetched Pokepaste with {} Pokemon", pasteData.getPokemon().size());

            return pasteData;

        } catch (Exception e) {
            log.error("Error fetching Pokepaste data: {}", e.getMessage(), e);
            throw new IllegalArgumentException("Failed to fetch or parse Pokepaste data: " + e.getMessage());
        }
    }

    /**
     * Parse Pokepaste raw text format
     *
     * Format example:
     * Rillaboom @ Assault Vest
     * Ability: Grassy Surge
     * Tera Type: Fire
     * - Fake Out
     * - Grassy Glide
     * - Wood Hammer
     * - U-turn
     */
    private PokepasteDTO.PasteData parsePaste(String rawText) {
        PokepasteDTO.PasteData pasteData = new PokepasteDTO.PasteData();
        String[] sections = rawText.split("\n\n");

        for (String section : sections) {
            if (section.trim().isEmpty()) continue;

            PokepasteDTO.PokemonData pokemon = parsePokemonSection(section);
            if (pokemon != null && pokemon.getSpecies() != null) {
                pasteData.getPokemon().add(pokemon);
            }
        }

        return pasteData;
    }

    /**
     * Parse a single Pokemon section
     */
    private PokepasteDTO.PokemonData parsePokemonSection(String section) {
        PokepasteDTO.PokemonData pokemon = new PokepasteDTO.PokemonData();
        String[] lines = section.split("\n");

        if (lines.length == 0) return null;

        // First line: Pokemon name and item
        // Format: "Species @ Item" or "Nickname (Species) @ Item"
        String firstLine = lines[0].trim();
        parsePokemonName(firstLine, pokemon);

        // Parse remaining lines
        for (int i = 1; i < lines.length; i++) {
            String line = lines[i].trim();

            if (line.startsWith("Ability:")) {
                pokemon.setAbility(line.substring(8).trim());
            } else if (line.startsWith("Tera Type:")) {
                pokemon.setTeraType(line.substring(10).trim());
            } else if (line.startsWith("-")) {
                // Move
                String move = line.substring(1).trim();
                pokemon.getMoves().add(move);
            }
        }

        return pokemon;
    }

    /**
     * Parse Pokemon name and item from first line
     * Handles formats:
     * - "Rillaboom @ Assault Vest"
     * - "Monkey (Rillaboom) @ Assault Vest"
     * - "Rillaboom"
     */
    private void parsePokemonName(String line, PokepasteDTO.PokemonData pokemon) {
        // Check for item
        String[] parts = line.split("@", 2);
        String namePart = parts[0].trim();

        if (parts.length > 1) {
            pokemon.setItem(parts[1].trim());
        }


        // Remove gender
        namePart = namePart.replace("(M)", "")
                .replace("(F)", "")
                .trim();
        // Check for nickname vs species
        if (namePart.contains("(") && namePart.contains(")")) {
            // Format: Nickname (Species)
            int openParen = namePart.indexOf('(');
            int closeParen = namePart.indexOf(')');

            pokemon.setNickname(namePart.substring(0, openParen).trim());
            pokemon.setSpecies(namePart.substring(openParen + 1, closeParen).trim());
        } else {
            // Just species name
            pokemon.setSpecies(namePart);
        }
    }

    /**
     * Validate a Pokepaste URL format
     */
    public boolean isValidPokepasteUrl(String url) {
        return POKEPASTE_URL_PATTERN.matcher(url).matches();
    }

    /**
     * Extract species names from paste data for quick reference
     */
    public List<String> extractSpeciesNames(PokepasteDTO.PasteData pasteData) {
        List<String> species = new ArrayList<>();
        for (PokepasteDTO.PokemonData pokemon : pasteData.getPokemon()) {
            if (pokemon.getSpecies() != null) {
                species.add(pokemon.getSpecies());
            }
        }
        return species;
    }
}