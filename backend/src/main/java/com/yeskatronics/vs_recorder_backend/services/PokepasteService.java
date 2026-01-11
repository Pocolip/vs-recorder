package com.yeskatronics.vs_recorder_backend.services;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeskatronics.vs_recorder_backend.dto.PokepasteDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import com.fasterxml.jackson.databind.JsonNode;
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

    private final ObjectMapper objectMapper;

    private static final String POKEPASTE_BASE = "https://pokepast.es";

    private static final String POKEBIN_BASE = "https://pokebin.com";

    private static final Pattern POKEPASTE_URL_PATTERN = Pattern.compile(
            "https://pokepast\\.es/([a-zA-Z0-9]+)(?:/raw)?"
    );
    private static final Pattern POKEBIN_URL_PATTERN = Pattern.compile(
            "https://pokebin\\.com/([a-zA-Z0-9]+)(?:/json)?"
    );


    /**
     * Fetch and parse team data from Pokepaste
     *
     * @param url the Pokepaste URL
     * @return parsed team data
     * @throws IllegalArgumentException if URL is invalid or fetch fails
     */
    public PokepasteDTO.PasteData fetchPasteData(String url) {
        log.info("Fetching paste data from: {}", url);

        // Check if it's a Pokebin URL
        Matcher pokebinMatcher = POKEBIN_URL_PATTERN.matcher(url);
        if (pokebinMatcher.find()) {
            return fetchPokebinData(url, pokebinMatcher.group(1));
        }

        // Check if it's a Pokepaste URL
        Matcher pokepasteMatcher = POKEPASTE_URL_PATTERN.matcher(url);
        if (pokepasteMatcher.find()) {
            return fetchPokepasteData(url, pokepasteMatcher.group(1));
        }

        throw new IllegalArgumentException("Invalid URL - must be a Pokepaste or Pokebin URL");
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

        // Normalize line endings to Unix format to handle Windows/Mac line endings
        String normalizedText = rawText.replace("\r\n", "\n").replace("\r", "\n");

        String[] sections = normalizedText.split("\n\n");
        log.debug("Split paste into {} sections", sections.length);

        for (String section : sections) {
            if (section.trim().isEmpty()) continue;

            PokepasteDTO.PokemonData pokemon = parsePokemonSection(section);
            if (pokemon != null && pokemon.getSpecies() != null) {
                log.debug("Parsed Pokemon: {}", pokemon.getSpecies());
                pasteData.getPokemon().add(pokemon);
            }
        }

        return pasteData;
    }

    /**
     * Fetch data from Pokepaste
     */
    private PokepasteDTO.PasteData fetchPokepasteData(String originalUrl, String pasteId) {
        log.info("Fetching from Pokepaste: {}", pasteId);
        String rawUrl = POKEPASTE_BASE + "/" + pasteId + "/raw";
        String jsonUrl = POKEPASTE_BASE + "/" + pasteId + "/json";

        try {
            // Fetch raw text from Pokepaste
            long startTime = System.currentTimeMillis();
            log.debug("Fetching from: {}", rawUrl);
            String rawText = restTemplate.getForObject(rawUrl, String.class);
            long fetchDuration = System.currentTimeMillis() - startTime;
            log.info("Fetched Pokepaste data in {}ms", fetchDuration);

            if (rawText == null || rawText.trim().isEmpty()) {
                throw new IllegalArgumentException("Failed to fetch Pokepaste data or paste is empty");
            }

            // Parse the paste
            long parseStart = System.currentTimeMillis();
            PokepasteDTO.PasteData pasteData = parsePaste(rawText);
            log.debug("Parsed Pokepaste in {}ms", System.currentTimeMillis() - parseStart);
            pasteData.setRawText(rawText);
            pasteData.setSource("pokepaste");

            // Try to fetch title from JSON endpoint
            try {
                String jsonResponse = restTemplate.getForObject(jsonUrl, String.class);
                if (jsonResponse != null) {
                    JsonNode root = objectMapper.readTree(jsonResponse);
                    String title = root.path("title").asText(null);
                    if (title != null && !title.isEmpty()) {
                        pasteData.setTitle(title);
                    }
                }
            } catch (Exception e) {
                log.debug("Could not fetch title from Pokepaste JSON endpoint: {}", e.getMessage());
            }

            log.info("Successfully fetched Pokepaste with {} Pokemon", pasteData.getPokemon().size());

            return pasteData;

        } catch (Exception e) {
            log.error("Error fetching Pokepaste data: {}", e.getMessage(), e);
            throw new IllegalArgumentException("Failed to fetch or parse Pokepaste data: " + e.getMessage());
        }
    }

    /**
     * Fetch data from Pokebin
     */
    private PokepasteDTO.PasteData fetchPokebinData(String originalUrl, String pasteId) {
        log.info("Fetching from Pokebin: {}", pasteId);
        String jsonUrl = POKEBIN_BASE + "/" + pasteId + "/json";

        try {
            // Fetch JSON from Pokebin
            long startTime = System.currentTimeMillis();
            log.debug("Fetching from: {}", jsonUrl);
            String jsonResponse = restTemplate.getForObject(jsonUrl, String.class);
            long fetchDuration = System.currentTimeMillis() - startTime;
            log.info("Fetched Pokebin data in {}ms", fetchDuration);

            if (jsonResponse == null || jsonResponse.trim().isEmpty()) {
                throw new IllegalArgumentException("Failed to fetch Pokebin data or paste is empty");
            }

            // Parse JSON to extract content
            JsonNode root = objectMapper.readTree(jsonResponse);
            JsonNode dataNode = root.path("data");

            if (dataNode.isMissingNode()) {
                throw new IllegalArgumentException("Invalid Pokebin response - missing 'data' field");
            }

            String content = dataNode.path("content").asText();
            String title = dataNode.path("title").asText(null);

            if (content == null || content.trim().isEmpty()) {
                throw new IllegalArgumentException("Pokebin paste is empty or missing 'content' field");
            }

            // Parse the content (same format as Pokepaste)
            PokepasteDTO.PasteData pasteData = parsePaste(content);
            pasteData.setRawText(content);
            pasteData.setSource("pokebin");
            if (title != null && !title.isEmpty()) {
                pasteData.setTitle(title);
            }

            log.info("Successfully fetched Pokebin with {} Pokemon", pasteData.getPokemon().size());

            return pasteData;

        } catch (Exception e) {
            log.error("Error fetching Pokebin data: {}", e.getMessage(), e);
            throw new IllegalArgumentException("Failed to fetch or parse Pokebin data: " + e.getMessage());
        }
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
     * Validate a Pokepaste or Pokebin URL format
     */
    public boolean isValidPokepasteUrl(String url) {
        return POKEPASTE_URL_PATTERN.matcher(url).matches() ||
                POKEBIN_URL_PATTERN.matcher(url).matches();
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