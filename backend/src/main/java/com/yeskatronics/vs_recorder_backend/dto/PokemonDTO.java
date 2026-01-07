package com.yeskatronics.vs_recorder_backend.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTOs for Pokemon-related endpoints.
 */
public class PokemonDTO {

    /**
     * Response DTO for pokepaste parsing endpoint
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Response containing species names from a pokepaste")
    public static class PokepasteParseResponse {
        @Schema(description = "List of Pokemon species names", example = "[\"Rillaboom\", \"Incineroar\", \"Flutter Mane\", \"Torkoal\", \"Urshifu\", \"Amoonguss\"]")
        private List<String> species;
    }

    /**
     * Response DTO for Pokemon sprite endpoint
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Schema(description = "Response containing sprite URL for a Pokemon")
    public static class SpriteResponse {
        @Schema(description = "URL to the Pokemon sprite image", example = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/812.png")
        private String url;
    }
}
