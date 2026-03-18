package com.yeskatronics.vs_recorder_backend.dto;

import java.util.List;

/**
 * Immutable record representing a Pokemon entry from the generated pokemon-data.json registry.
 */
public record PokemonEntry(
    String canonicalName,
    int num,
    int form,
    String name,
    String displayName,
    String baseSpecies,
    List<String> types,
    List<String> aliases
) {}
