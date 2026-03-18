package com.yeskatronics.vs_recorder_backend.controllers;

import com.yeskatronics.vs_recorder_backend.dto.ErrorResponse;
import com.yeskatronics.vs_recorder_backend.dto.PokepasteDTO;
import com.yeskatronics.vs_recorder_backend.dto.PokemonDTO;
import com.yeskatronics.vs_recorder_backend.dto.PokemonEntry;
import com.yeskatronics.vs_recorder_backend.services.PokemonService;
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
 * Provides endpoints for pokepaste parsing, Pokemon registry, and sprite retrieval.
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
    private final PokemonService pokemonService;
    private final RestTemplate restTemplate;

    // PokeAPI cache for fallback sprite lookups
    private final Map<String, CacheEntry> spriteCache = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 7L * 24 * 60 * 60 * 1000; // 7 days

    /**
     * Get the full Pokemon registry
     * GET /api/pokemon/registry
     */
    @GetMapping("/registry")
    @Operation(
            summary = "Get Pokemon registry",
            description = "Returns the full Pokemon registry with all entries, aliases, types, and sprite info. Use the version field for cache busting."
    )
    public ResponseEntity<Map<String, Object>> getRegistry() {
        Map<String, Object> response = Map.of(
                "version", pokemonService.getRegistryVersion(),
                "pokemon", pokemonService.getFullRegistry()
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Resolve a Pokemon name to its full entry
     * GET /api/pokemon/{name}/resolve
     */
    @GetMapping("/{name}/resolve")
    @Operation(
            summary = "Resolve Pokemon name",
            description = "Resolves any Pokemon name variant to its canonical entry with types, sprite info, and base species."
    )
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Successfully resolved Pokemon"),
            @ApiResponse(responseCode = "404", description = "Pokemon not found in registry")
    })
    public ResponseEntity<PokemonEntry> resolvePokemon(
            @Parameter(description = "Pokemon name in any format", required = true, example = "Ogerpon-Hearthflame")
            @PathVariable String name) {

        PokemonEntry entry = pokemonService.getEntry(name);
        if (entry != null) {
            return ResponseEntity.ok(entry);
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * Parse a pokepaste or pokebin URL and extract species names
     * GET /api/pokemon/pokepaste/parse?url=...
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
            PokepasteDTO.PasteData pasteData = pokepasteService.fetchPasteData(url);
            List<String> species = pokepasteService.extractSpeciesNames(pasteData);

            log.info("Successfully parsed {} Pokemon species from paste", species.size());

            PokemonDTO.PokepasteParseResponse response = new PokemonDTO.PokepasteParseResponse(species);
            return ResponseEntity.ok(response);

        } catch (IllegalArgumentException e) {
            log.error("Failed to parse pokepaste: {}", e.getMessage());
            throw e;
        }
    }

    /**
     * Fetch full paste data from a pokepaste or pokebin URL
     * GET /api/pokemon/pokepaste/fetch?url=...
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
     * Uses PokemonService for local sprites, falls back to PokeAPI for unknown Pokemon.
     */
    @GetMapping("/{name}/sprite")
    @Operation(
            summary = "Get Pokemon sprite URL",
            description = "Returns the sprite path for a given Pokemon. Uses local sprite registry first, falls back to PokeAPI."
    )
    @ApiResponses(value = {
            @ApiResponse(
                    responseCode = "200",
                    description = "Successfully retrieved sprite URL",
                    content = @Content(schema = @Schema(implementation = PokemonDTO.SpriteResponse.class))
            ),
            @ApiResponse(
                    responseCode = "400",
                    description = "Failed to fetch Pokemon data",
                    content = @Content(schema = @Schema(implementation = ErrorResponse.class))
            )
    })
    public ResponseEntity<PokemonDTO.SpriteResponse> getPokemonSprite(
            @Parameter(description = "Pokemon species name", required = true, example = "rillaboom")
            @PathVariable String name) {

        log.info("Fetching sprite for Pokemon: {}", name);

        // Try PokemonService first (local sprites)
        PokemonEntry entry = pokemonService.getEntry(name);
        if (entry != null) {
            String spritePath = pokemonService.getSpritePath(name, false);
            return ResponseEntity.ok(new PokemonDTO.SpriteResponse(spritePath));
        }

        // Fall back to PokeAPI for unknown Pokemon
        try {
            String normalizedName = name.toLowerCase().trim()
                    .replace(" ", "-").replace("'", "")
                    .replace(".", "").replace("\u00e9", "e");

            CacheEntry cached = spriteCache.get(normalizedName);
            if (cached != null && !cached.isExpired()) {
                return ResponseEntity.ok(new PokemonDTO.SpriteResponse(cached.spriteUrl));
            }

            String pokeApiUrl = "https://pokeapi.co/api/v2/pokemon/" + normalizedName;
            Map<String, Object> response = restTemplate.getForObject(pokeApiUrl, Map.class);

            if (response == null) {
                throw new IllegalArgumentException("Failed to fetch Pokemon data from PokeAPI");
            }

            Map<String, Object> sprites = (Map<String, Object>) response.get("sprites");
            if (sprites == null) {
                throw new IllegalArgumentException("No sprite data found for Pokemon: " + normalizedName);
            }

            String spriteUrl = (String) sprites.get("front_default");
            if (spriteUrl == null || spriteUrl.isEmpty()) {
                throw new IllegalArgumentException("No default sprite available for Pokemon: " + normalizedName);
            }

            spriteCache.put(normalizedName, new CacheEntry(spriteUrl, System.currentTimeMillis()));
            return ResponseEntity.ok(new PokemonDTO.SpriteResponse(spriteUrl));

        } catch (org.springframework.web.client.HttpClientErrorException.NotFound e) {
            log.error("Pokemon not found: {}", name);
            throw new IllegalArgumentException("Pokemon not found: " + name);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Error fetching Pokemon sprite: {}", e.getMessage(), e);
            throw new IllegalArgumentException("Failed to fetch Pokemon sprite: " + e.getMessage());
        }
    }

    /**
     * Simple cache entry with TTL for PokeAPI fallback
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
