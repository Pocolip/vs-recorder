package com.yeskatronics.vs_recorder_backend.controllers;

import com.yeskatronics.vs_recorder_backend.dto.ErrorResponse;
import com.yeskatronics.vs_recorder_backend.dto.PokepasteDTO;
import com.yeskatronics.vs_recorder_backend.dto.PokemonDTO;
import com.yeskatronics.vs_recorder_backend.services.PokepasteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * REST Controller for Pokemon-related operations.
 * Provides endpoints for pokepaste parsing and Pokemon sprite retrieval.
 *
 * Base path: /api/pokemon
 *
 * Note: These endpoints are public and do not require authentication.
 */
@RestController
@RequestMapping("/api/pokemon")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Pokemon", description = "Pokemon data and utility endpoints")
public class PokemonController {

    private final PokepasteService pokepasteService;
    private final RestTemplate restTemplate;

    // Simple in-memory cache for Pokemon name -> ID mapping (7 day TTL)
    private final Map<String, CacheEntry> spriteCache = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 7L * 24 * 60 * 60 * 1000; // 7 days

    /**
     * Parse a pokepaste or pokebin URL and extract species names
     * GET /api/pokemon/pokepaste/parse?url=...
     *
     * @param url the pokepaste or pokebin URL
     * @return list of Pokemon species names
     */
    @GetMapping("/pokepaste/parse")
    @Operation(
            summary = "Parse pokepaste URL",
            description = "Fetches and parses a pokepaste or pokebin URL to extract the list of Pokemon species names"
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Successfully parsed pokepaste",
                    content = @Content(schema = @Schema(implementation = PokemonDTO.PokepasteParseResponse.class))
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid URL or failed to fetch/parse paste",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))
            )
    })
    public ResponseEntity<PokemonDTO.PokepasteParseResponse> parsePokepaste(
            @Parameter(description = "Pokepaste or Pokebin URL to parse", required = true, example = "https://pokepast.es/abc123")
            @RequestParam String url) {

        log.info("Parsing pokepaste from URL: {}", url);

        try {
            // Fetch paste data using existing service
            PokepasteDTO.PasteData pasteData = pokepasteService.fetchPasteData(url);

            // Extract species names
            List<String> species = pokepasteService.extractSpeciesNames(pasteData);

            log.info("Successfully parsed {} Pokemon species from paste", species.size());

            PokemonDTO.PokepasteParseResponse response = new PokemonDTO.PokepasteParseResponse(species);
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            log.error("Failed to parse pokepaste: {}", e.getMessage());
            throw e; // Will be caught by GlobalExceptionHandler
        }
    }

    /**
     * Fetch full paste data from a pokepaste or pokebin URL
     * GET /api/pokemon/pokepaste/fetch?url=...
     *
     * This endpoint proxies requests to pokepaste/pokebin to avoid CORS issues.
     *
     * @param url the pokepaste or pokebin URL
     * @return full paste data including title, pokemon details, and raw text
     */
    @GetMapping("/pokepaste/fetch")
    @Operation(
            summary = "Fetch full pokepaste data",
            description = "Fetches and returns complete paste data from pokepaste or pokebin URL, including title and full Pokemon details. Use this endpoint to avoid CORS issues with Pokebin."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Successfully fetched paste data",
                    content = @Content(schema = @Schema(implementation = PokepasteDTO.PasteData.class))
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Invalid URL or failed to fetch/parse paste",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))
            )
    })
    public ResponseEntity<PokepasteDTO.PasteData> fetchPokepaste(
            @Parameter(description = "Pokepaste or Pokebin URL to fetch", required = true, example = "https://pokepast.es/abc123")
            @RequestParam String url) {

        log.info("Fetching full paste data from URL: {}", url);

        try {
            PokepasteDTO.PasteData pasteData = pokepasteService.fetchPasteData(url);
            log.info("Successfully fetched paste with {} Pokemon, title: {}",
                    pasteData.getPokemon().size(), pasteData.getTitle());
            return ResponseEntity.ok(pasteData);

        } catch (IllegalArgumentException e) {
            log.error("Failed to fetch paste: {}", e.getMessage());
            throw e;
        }
    }

    /**
     * Get sprite URL for a Pokemon by name
     * GET /api/pokemon/{name}/sprite
     *
     * @param name the Pokemon species name (will be normalized)
     * @return sprite URL
     */
    @GetMapping("/{name}/sprite")
    @Operation(
            summary = "Get Pokemon sprite URL",
            description = "Fetches the sprite URL for a given Pokemon species name from PokeAPI. Results are cached for 7 days."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Successfully retrieved sprite URL",
                    content = @Content(schema = @Schema(implementation = PokemonDTO.SpriteResponse.class))
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Failed to fetch Pokemon data from PokeAPI",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))
            ),
            @ApiResponse(
                    responseCode = "404",
                    description = "Pokemon not found",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))
            )
    })
    public ResponseEntity<PokemonDTO.SpriteResponse> getPokemonSprite(
            @Parameter(description = "Pokemon species name", required = true, example = "rillaboom")
            @PathVariable String name) {

        log.info("Fetching sprite for Pokemon: {}", name);

        try {
            // Normalize the name (lowercase, replace spaces with hyphens)
            String normalizedName = normalizePokemonName(name);

            // Check cache first
            CacheEntry cached = spriteCache.get(normalizedName);
            if (cached != null && !cached.isExpired()) {
                log.debug("Returning cached sprite URL for: {}", normalizedName);
                return ResponseEntity.ok(new PokemonDTO.SpriteResponse(cached.spriteUrl));
            }

            // Fetch from PokeAPI
            String pokeApiUrl = "https://pokeapi.co/api/v2/pokemon/" + normalizedName;
            log.debug("Fetching from PokeAPI: {}", pokeApiUrl);

            // Call PokeAPI to get Pokemon data
            Map<String, Object> response = restTemplate.getForObject(pokeApiUrl, Map.class);

            if (response == null) {
                throw new IllegalArgumentException("Failed to fetch Pokemon data from PokeAPI");
            }

            // Extract sprite URL
            Map<String, Object> sprites = (Map<String, Object>) response.get("sprites");
            if (sprites == null) {
                throw new IllegalArgumentException("No sprite data found for Pokemon: " + normalizedName);
            }

            String spriteUrl = (String) sprites.get("front_default");
            if (spriteUrl == null || spriteUrl.isEmpty()) {
                throw new IllegalArgumentException("No default sprite available for Pokemon: " + normalizedName);
            }

            // Cache the result
            spriteCache.put(normalizedName, new CacheEntry(spriteUrl, System.currentTimeMillis()));

            log.info("Successfully fetched sprite URL for: {}", normalizedName);
            return ResponseEntity.ok(new PokemonDTO.SpriteResponse(spriteUrl));

        } catch (org.springframework.web.client.HttpClientErrorException.NotFound e) {
            log.error("Pokemon not found: {}", name);
            throw new IllegalArgumentException("Pokemon not found: " + name);
        } catch (Exception e) {
            log.error("Error fetching Pokemon sprite: {}", e.getMessage(), e);
            throw new IllegalArgumentException("Failed to fetch Pokemon sprite: " + e.getMessage());
        }
    }

    /**
     * Normalize Pokemon name for PokeAPI
     * - Convert to lowercase
     * - Replace spaces with hyphens
     * - Handle special cases
     */
    private String normalizePokemonName(String name) {
        return name.toLowerCase()
                .trim()
                .replace(" ", "-")
                .replace("'", "")
                .replace(".", "")
                .replace("é", "e");
    }

    /**
     * Simple cache entry with TTL
     */
    private static class CacheEntry {
        private final String spriteUrl;
        private final long timestamp;

        public CacheEntry(String spriteUrl, long timestamp) {
            this.spriteUrl = spriteUrl;
            this.timestamp = timestamp;
        }

        public boolean isExpired() {
            return System.currentTimeMillis() - timestamp > CACHE_TTL_MS;
        }
    }

    /**
     * Exception handler for IllegalArgumentException
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(
            IllegalArgumentException ex,
            @RequestAttribute(required = false) String requestPath) {

        log.warn("Illegal argument: {}", ex.getMessage());

        ErrorResponse error = new ErrorResponse(
                HttpStatus.BAD_REQUEST.value(),
                "Bad Request",
                ex.getMessage(),
                requestPath != null ? requestPath : "/api/pokemon"
        );

        return ResponseEntity.badRequest().body(error);
    }
}
