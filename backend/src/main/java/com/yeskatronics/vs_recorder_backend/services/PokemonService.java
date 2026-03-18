package com.yeskatronics.vs_recorder_backend.services;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.yeskatronics.vs_recorder_backend.dto.PokemonEntry;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.*;

/**
 * Authoritative service for Pokemon name resolution, sprite info, types, and display names.
 * Loaded from generated pokemon-data.json at startup.
 */
@Service
@Slf4j
public class PokemonService {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    /** canonical key -> PokemonEntry */
    private final Map<String, PokemonEntry> registry = new LinkedHashMap<>();

    /** any alias (lowercased, normalized) -> canonical key */
    private final Map<String, String> aliasIndex = new HashMap<>();

    private String registryVersion;

    @PostConstruct
    public void init() {
        try {
            ClassPathResource resource = new ClassPathResource("pokemon-data.json");
            try (InputStream is = resource.getInputStream()) {
                JsonNode root = objectMapper.readTree(is);
                registryVersion = root.path("version").asText("unknown");

                JsonNode pokemonNode = root.path("pokemon");
                Iterator<Map.Entry<String, JsonNode>> fields = pokemonNode.fields();

                while (fields.hasNext()) {
                    Map.Entry<String, JsonNode> field = fields.next();
                    String key = field.getKey();
                    JsonNode node = field.getValue();

                    List<String> types = new ArrayList<>();
                    node.path("types").forEach(t -> types.add(t.asText()));

                    List<String> aliases = new ArrayList<>();
                    node.path("aliases").forEach(a -> aliases.add(a.asText()));

                    PokemonEntry entry = new PokemonEntry(
                            key,
                            node.path("num").asInt(),
                            node.path("form").asInt(),
                            node.path("name").asText(),
                            node.path("displayName").asText(),
                            node.path("baseSpecies").asText(key),
                            types,
                            aliases
                    );

                    registry.put(key, entry);

                    // Index the canonical name
                    aliasIndex.put(key, key);
                    aliasIndex.put(key.replace("-", ""), key);

                    // Index all aliases
                    for (String alias : aliases) {
                        String normalized = normalizeForLookup(alias);
                        aliasIndex.putIfAbsent(normalized, key);
                        // Also add without hyphens
                        String noHyphens = normalized.replace("-", "");
                        aliasIndex.putIfAbsent(noHyphens, key);
                    }

                    // Index the Showdown name
                    String showdownNormalized = normalizeForLookup(node.path("name").asText());
                    aliasIndex.putIfAbsent(showdownNormalized, key);
                }
            }

            log.info("Loaded {} Pokemon entries with {} aliases (version {})",
                    registry.size(), aliasIndex.size(), registryVersion);

        } catch (Exception e) {
            log.error("Failed to load pokemon-data.json: {}", e.getMessage(), e);
        }
    }

    /**
     * Resolve any name variant to its canonical kebab-case key.
     * Handles battle log format (commas, levels, gender), wildcards, and various alias formats.
     *
     * @param anyName any Pokemon name variant
     * @return canonical kebab-case key, or cleaned input if not found
     */
    public String resolveCanonical(String anyName) {
        if (anyName == null || anyName.isEmpty()) {
            return anyName;
        }

        // Step 1: Split on comma, take first part (strips level/gender from battle log format)
        String cleaned = anyName;
        int commaIndex = cleaned.indexOf(',');
        if (commaIndex > 0) {
            cleaned = cleaned.substring(0, commaIndex);
        }
        cleaned = cleaned.trim();

        // Step 2: Remove -* wildcard (Urshifu-*)
        cleaned = cleaned.replace("-*", "");

        // Step 3: Strip (M), (F) gender markers
        cleaned = cleaned.replaceAll("\\s*\\(M\\)|\\s*\\(F\\)", "").trim();

        // Step 4: Look up in aliasIndex (case-insensitive)
        String normalized = normalizeForLookup(cleaned);
        String canonical = aliasIndex.get(normalized);
        if (canonical != null) {
            return canonical;
        }

        // Step 5: Try without hyphens
        String noHyphens = normalized.replace("-", "");
        canonical = aliasIndex.get(noHyphens);
        if (canonical != null) {
            return canonical;
        }

        // Step 6: Try kebab-case conversion
        String kebab = cleaned.toLowerCase()
                .replace("'", "")
                .replace("'", "")
                .replace(".", "")
                .replaceAll("\\s+", "-")
                .replaceAll("[^a-z0-9-]", "")
                .replaceAll("-{2,}", "-")
                .replaceAll("^-|-$", "");
        canonical = aliasIndex.get(kebab);
        if (canonical != null) {
            return canonical;
        }

        // Graceful degradation: return cleaned kebab-case
        return kebab;
    }

    /**
     * Resolve any name variant to its base species canonical name (for analytics grouping).
     * Cosmetic/in-battle forms resolve to base, competitive forms are preserved.
     *
     * @param anyName any Pokemon name variant
     * @return base species canonical key
     */
    public String resolveBaseSpecies(String anyName) {
        String canonical = resolveCanonical(anyName);
        PokemonEntry entry = registry.get(canonical);
        if (entry != null) {
            return entry.baseSpecies();
        }
        return canonical;
    }

    /**
     * Get human-friendly display name for any Pokemon name variant.
     *
     * @param anyName any Pokemon name variant
     * @return display name (e.g., "Ogerpon Hearthflame")
     */
    public String getDisplayName(String anyName) {
        String canonical = resolveCanonical(anyName);
        PokemonEntry entry = registry.get(canonical);
        if (entry != null) {
            return entry.displayName();
        }
        // Fallback: capitalize kebab-case
        return Arrays.stream(canonical.split("-"))
                .map(w -> w.isEmpty() ? w : Character.toUpperCase(w.charAt(0)) + w.substring(1))
                .reduce((a, b) -> a + " " + b)
                .orElse(canonical);
    }

    /**
     * Get sprite info (Pokedex number and form index) for sprite path generation.
     *
     * @param anyName any Pokemon name variant
     * @return int array [num, form], or null if not found
     */
    public int[] getSpriteInfo(String anyName) {
        String canonical = resolveCanonical(anyName);
        PokemonEntry entry = registry.get(canonical);
        if (entry != null) {
            return new int[]{entry.num(), entry.form()};
        }
        return null;
    }

    /**
     * Get local sprite path for a Pokemon.
     *
     * @param anyName any Pokemon name variant
     * @param shiny whether to get shiny sprite
     * @return sprite path (e.g., "/sprites/icon1017_f02_s0.png")
     */
    public String getSpritePath(String anyName, boolean shiny) {
        int[] info = getSpriteInfo(anyName);
        if (info != null) {
            return String.format("/sprites/icon%04d_f%02d_s%d.png", info[0], info[1], shiny ? 1 : 0);
        }
        return "/sprites/icon0000_f00_s0.png";
    }

    /**
     * Get Pokemon types.
     *
     * @param anyName any Pokemon name variant
     * @return list of types, or empty list if not found
     */
    public List<String> getTypes(String anyName) {
        String canonical = resolveCanonical(anyName);
        PokemonEntry entry = registry.get(canonical);
        if (entry != null) {
            return entry.types();
        }
        return Collections.emptyList();
    }

    /**
     * Get the full PokemonEntry for a name variant.
     *
     * @param anyName any Pokemon name variant
     * @return PokemonEntry or null if not found
     */
    public PokemonEntry getEntry(String anyName) {
        String canonical = resolveCanonical(anyName);
        return registry.get(canonical);
    }

    /**
     * Get the full registry for the /registry endpoint.
     */
    public Map<String, PokemonEntry> getFullRegistry() {
        return Collections.unmodifiableMap(registry);
    }

    /**
     * Get the registry version for cache invalidation.
     */
    public String getRegistryVersion() {
        return registryVersion;
    }

    /**
     * Normalize a string for alias lookup: lowercase, trim.
     */
    private String normalizeForLookup(String input) {
        return input.toLowerCase().trim();
    }
}
