package com.yeskatronics.vs_recorder_backend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

/**
 * DTOs for Pokepaste team data.
 */
public class PokepasteDTO {

    /**
     * DTO for a single Pokemon from Pokepaste
     */
    @Data
    @NoArgsConstructor
    public static class PokemonData {
        private String species;
        private String nickname;
        private String item;
        private String ability;
        private String teraType;
        private List<String> moves = new ArrayList<>();
    }

    /**
     * DTO for complete paste data
     */
    @Data
    @NoArgsConstructor
    public static class PasteData {
        private String title;
        private List<PokemonData> pokemon = new ArrayList<>();
        private String rawText;
        private String source; // "pokepaste" or "pokebin"
    }
}