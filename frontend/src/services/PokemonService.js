// src/services/PokemonService.js
import StorageService from './StorageService.js';
import { parseShowdownName } from '../utils/pokemonNameUtils';
import SPRITE_MAP from '../data/pokemonSpriteMap.json';

class PokemonService {
    static STORAGE_KEY = 'pokemon_cache';
    static SPRITE_CACHE_KEY = 'pokemon_sprites';
    static CACHE_EXPIRY_DAYS = 7; // Cache data for 7 days

    // Static fallback data for most common VGC Pokemon
    static COMMON_VGC_POKEMON = {
        // Generation 9 VGC 2025 common picks
        'miraidon': { id: 1007, name: 'Miraidon', types: ['electric', 'dragon'] },
        'koraidon': { id: 1008, name: 'Koraidon', types: ['fighting', 'dragon'] },
        'calyrex-shadow': { id: 898, name: 'Calyrex-Shadow', types: ['psychic', 'ghost'] },
        'calyrex-ice': { id: 898, name: 'Calyrex-Ice', types: ['psychic', 'ice'] },
        'urshifu': { id: 892, name: 'Urshifu', types: ['fighting', 'dark'] },
        'urshifu-rapid-strike': { id: 892, name: 'Urshifu-Rapid-Strike', types: ['fighting', 'water'] },
        'kyogre': { id: 382, name: 'Kyogre', types: ['water'] },
        'groudon': { id: 383, name: 'Groudon', types: ['ground'] },
        'rayquaza': { id: 384, name: 'Rayquaza', types: ['dragon', 'flying'] },
        'dialga': { id: 483, name: 'Dialga', types: ['steel', 'dragon'] },
        'palkia': { id: 484, name: 'Palkia', types: ['water', 'dragon'] },
        'giratina': { id: 487, name: 'Giratina', types: ['ghost', 'dragon'] },
        'reshiram': { id: 643, name: 'Reshiram', types: ['dragon', 'fire'] },
        'zekrom': { id: 644, name: 'Zekrom', types: ['dragon', 'electric'] },
        'kyurem-white': { id: 646, name: 'Kyurem-White', types: ['dragon', 'fire'] },
        'kyurem-black': { id: 646, name: 'Kyurem-Black', types: ['dragon', 'ice'] },
        'xerneas': { id: 716, name: 'Xerneas', types: ['fairy'] },
        'yveltal': { id: 717, name: 'Yveltal', types: ['dark', 'flying'] },
        'lunala': { id: 792, name: 'Lunala', types: ['psychic', 'ghost'] },
        'solgaleo': { id: 791, name: 'Solgaleo', types: ['psychic', 'steel'] },
        'necrozma-dawn-wings': { id: 800, name: 'Necrozma-Dawn-Wings', types: ['psychic', 'ghost'] },
        'necrozma-dusk-mane': { id: 800, name: 'Necrozma-Dusk-Mane', types: ['psychic', 'steel'] },
        'zacian': { id: 888, name: 'Zacian', types: ['fairy'] },
        'zacian-crowned': { id: 888, name: 'Zacian-Crowned', types: ['fairy', 'steel'] },
        'zamazenta': { id: 889, name: 'Zamazenta', types: ['fighting'] },
        'zamazenta-crowned': { id: 889, name: 'Zamazenta-Crowned', types: ['fighting', 'steel'] },
        // Popular support Pokemon
        'incineroar': { id: 727, name: 'Incineroar', types: ['fire', 'dark'] },
        'rillaboom': { id: 812, name: 'Rillaboom', types: ['grass'] },
        'grimmsnarl': { id: 861, name: 'Grimmsnarl', types: ['dark', 'fairy'] },
        'whimsicott': { id: 547, name: 'Whimsicott', types: ['grass', 'fairy'] },
        'amoonguss': { id: 591, name: 'Amoonguss', types: ['grass', 'poison'] },
        'tornadus': { id: 641, name: 'Tornadus', types: ['flying'] },
        'landorus': { id: 645, name: 'Landorus', types: ['ground', 'flying'] },
        'thundurus': { id: 642, name: 'Thundurus', types: ['electric', 'flying'] },
        'cresselia': { id: 488, name: 'Cresselia', types: ['psychic'] },
        'flutter-mane': { id: 987, name: 'Flutter Mane', types: ['ghost', 'fairy'] },
        'iron-hands': { id: 992, name: 'Iron Hands', types: ['fighting', 'electric'] },
        'gholdengo': { id: 1000, name: 'Gholdengo', types: ['steel', 'ghost'] },
        'annihilape': { id: 979, name: 'Annihilape', types: ['fighting', 'ghost'] },
        'chien-pao': { id: 1002, name: 'Chien-Pao', types: ['dark', 'ice'] },
        'wo-chien': { id: 1001, name: 'Wo-Chien', types: ['dark', 'grass'] },
        'ting-lu': { id: 1003, name: 'Ting-Lu', types: ['dark', 'ground'] },
        'chi-yu': { id: 1004, name: 'Chi-Yu', types: ['dark', 'fire'] },
        'archaludon': { id: 1018, name: 'Archaludon', types: ['steel', 'dragon'] },
        'terapagos': { id: 1024, name: 'Terapagos', types: ['normal'] },
        'regieleki': { id: 894, name: 'Regieleki', types: ['electric'] },
        'regidrago': { id: 895, name: 'Regidrago', types: ['dragon'] }
    };

    static pokedexAPI = null;

    /**
     * Initialize the Pokemon service
     */
    static async initialize() {
        try {
            // Dynamic import of pokeapi-js-wrapper
            const PokeAPI = await import('pokeapi-js-wrapper');

            this.pokedexAPI = new PokeAPI.Pokedex({
                cache: true,
                timeout: 10000, // 10 second timeout
                cacheImages: false // We'll handle image caching ourselves
            });

            return true;
        } catch (error) {
            // Fallback to static data - this is expected in some environments
            return false;
        }
    }

    /**
     * Get Pokemon data by name or ID
     * @param {string|number} identifier - Pokemon name or ID
     * @returns {Promise<Object>} Pokemon data
     */
    static async getPokemon(identifier) {
        try {
            // Normalize identifier
            const normalizedName = typeof identifier === 'string'
                ? identifier.toLowerCase().replace(/\s+/g, '-')
                : identifier;

            // Check cache first
            const cached = await this.getCachedPokemon(normalizedName);
            if (cached && !this.isCacheExpired(cached.cached_at) && this.hasLocalSprites(cached.data)) {
                return cached.data;
            }

            // Try API if available
            if (this.pokedexAPI) {
                try {
                    const apiData = await this.pokedexAPI.getPokemonByName(normalizedName);
                    const processedData = this.processPokemonData(apiData);

                    // Cache the result
                    await this.cachePokemon(normalizedName, processedData);
                    return processedData;
                } catch (apiError) {
                    // Only log if it's not a common 404 (unknown Pokemon)
                    if (!apiError.message.includes('404')) {
                        console.warn(`PokemonService: API error for ${normalizedName}:`, apiError.message);
                    }
                }
            }

            // Fallback to static data
            const fallbackData = this.COMMON_VGC_POKEMON[normalizedName];
            if (fallbackData) {
                const enrichedData = this.enrichFallbackData(fallbackData);
                await this.cachePokemon(normalizedName, enrichedData);
                return enrichedData;
            }

            // Final fallback: check if we have sprite info from the sprite map
            // This handles Pokemon forms that aren't in COMMON_VGC_POKEMON but have sprites
            const spriteInfo = this.getSpriteInfo(normalizedName);
            if (spriteInfo) {
                const spriteOnlyData = {
                    id: spriteInfo.id,
                    name: normalizedName,
                    types: ['unknown']
                };
                const enrichedData = this.enrichFallbackData(spriteOnlyData);
                await this.cachePokemon(normalizedName, enrichedData);
                return enrichedData;
            }

            throw new Error(`Pokemon not found: ${identifier}`);
        } catch (error) {
            console.error(`PokemonService: Error getting Pokemon "${identifier}":`, error.message);
            throw error;
        }
    }

    /**
     * Get multiple Pokemon at once
     * @param {Array<string|number>} identifiers - Array of Pokemon names or IDs
     * @returns {Promise<Array<Object>>} Array of Pokemon data
     */
    static async getMultiplePokemon(identifiers) {
        const promises = identifiers.map(id => this.getPokemon(id));
        const results = await Promise.allSettled(promises);

        return results.map((result, index) => {
            if (result.status === 'fulfilled') {
                return result.value;
            } else {
                console.warn(`Failed to load Pokemon ${identifiers[index]}:`, result.reason);
                return this.createUnknownPokemon(identifiers[index]);
            }
        });
    }

    /**
     * Get Pokemon sprite URL
     * @param {string|number} identifier - Pokemon name or ID
     * @param {string} variant - Sprite variant (front_default, back_default, etc.)
     * @returns {Promise<string>} Sprite URL
     */
    static async getSpriteUrl(identifier, variant = 'front_default') {
        try {
            const pokemon = await this.getPokemon(identifier);
            return pokemon.sprites[variant] || pokemon.sprites.front_default || null;
        } catch (error) {
            console.warn(`Failed to get sprite for ${identifier}:`, error);
            return this.getFallbackSpriteUrl(identifier);
        }
    }

    /**
     * Process raw API data into our standardized format
     * @param {Object} apiData - Raw API response
     * @returns {Object} Processed Pokemon data
     */
    static processPokemonData(apiData) {
        // Use form-aware sprite generation based on Pokemon name, with ID fallback
        const sprites = this.generateSpriteUrls(apiData.name, null, apiData.id);

        return {
            id: apiData.id,
            name: apiData.name,
            displayName: this.formatDisplayName(apiData.name),
            types: apiData.types.map(t => t.type.name),
            sprites: {
                // Form-aware local sprites
                front_default: sprites.front_default,
                front_shiny: sprites.front_shiny,
                // Keep remote as fallbacks
                front_default_remote: apiData.sprites.front_default,
                front_shiny_remote: apiData.sprites.front_shiny,
                back_default: apiData.sprites.back_default,
                back_shiny: apiData.sprites.back_shiny,
                dream_world: apiData.sprites.other?.dream_world?.front_default,
                official_artwork: apiData.sprites.other?.['official-artwork']?.front_default
            },
            stats: apiData.stats.reduce((acc, stat) => {
                acc[stat.stat.name] = stat.base_stat;
                return acc;
            }, {}),
            abilities: apiData.abilities.map(a => ({
                name: a.ability.name,
                hidden: a.is_hidden
            })),
            height: apiData.height,
            weight: apiData.weight,
            species: apiData.species.name
        };
    }

    /**
     * Enrich fallback data with sprite URLs and formatting
     * @param {Object} fallbackData - Static fallback data
     * @returns {Object} Enriched Pokemon data
     */
    static enrichFallbackData(fallbackData) {
        // Use form-aware sprite generation based on Pokemon name, with ID fallback
        const sprites = this.generateSpriteUrls(fallbackData.name, null, fallbackData.id);

        return {
            ...fallbackData,
            displayName: this.formatDisplayName(fallbackData.name),
            sprites,
            stats: {}, // Unknown stats
            abilities: [], // Unknown abilities
            height: null,
            weight: null,
            species: fallbackData.name,
            fromFallback: true
        };
    }

    /**
     * Look up sprite info (ID and form index) from Pokemon name
     * Uses the sprite map for form-aware lookups
     * @param {string} pokemonName - Pokemon name (e.g., 'tornadus-therian', 'ogerpon-wellspring')
     * @returns {Object|null} { id, form } or null if not found
     */
    static getSpriteInfo(pokemonName) {
        if (!pokemonName) return null;
        const normalized = pokemonName.toLowerCase().replace(/\s+/g, '-');
        return SPRITE_MAP[normalized] || null;
    }

    /**
     * Generate local sprite path for a Pokemon ID
     * Local sprites use naming: icon{4-digit-ID}_f{2-digit-form}_s{shiny}.png
     * @param {number} id - Pokemon ID
     * @param {number} form - Form index (default 0)
     * @param {boolean} shiny - Whether shiny variant (default false)
     * @returns {string} Local sprite path
     */
    static getLocalSpritePath(id, form = 0, shiny = false) {
        if (!id || id < 0) return null;
        const paddedId = String(id).padStart(4, '0');
        const paddedForm = String(form).padStart(2, '0');
        const shinyFlag = shiny ? '1' : '0';
        return `/sprites/icon${paddedId}_f${paddedForm}_s${shinyFlag}.png`;
    }

    /**
     * Generate sprite URLs for a Pokemon
     * Prefers local sprites with form-awareness, falls back to PokeAPI
     * @param {number|string} idOrName - Pokemon ID or name
     * @param {number} formOverride - Optional form index override
     * @param {number} idFallback - Optional ID fallback when name lookup fails
     * @returns {Object} Sprite URLs
     */
    static generateSpriteUrls(idOrName, formOverride = null, idFallback = null) {
        let id, form;

        if (typeof idOrName === 'string') {
            // Normalize name for lookups
            const normalized = idOrName.toLowerCase().replace(/\s+/g, '-');

            // Look up form-aware sprite info from name
            const spriteInfo = this.getSpriteInfo(idOrName);
            if (spriteInfo) {
                id = spriteInfo.id;
                form = formOverride ?? spriteInfo.form;
            } else {
                // Fallback to COMMON_VGC_POKEMON, then to idFallback
                const fallback = this.COMMON_VGC_POKEMON[normalized];
                id = fallback?.id ?? idFallback;
                form = formOverride ?? 0;
            }
        } else {
            id = idOrName;
            form = formOverride ?? 0;
        }

        const localDefault = this.getLocalSpritePath(id, form, false);
        const localShiny = this.getLocalSpritePath(id, form, true);
        const baseUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

        return {
            // Prefer local sprites for front_default
            front_default: localDefault,
            front_shiny: localShiny,
            // Remote fallbacks
            front_default_remote: `${baseUrl}/${id}.png`,
            front_shiny_remote: `${baseUrl}/shiny/${id}.png`,
            back_default: `${baseUrl}/back/${id}.png`,
            back_shiny: `${baseUrl}/back/shiny/${id}.png`,
            dream_world: `${baseUrl}/other/dream-world/${id}.svg`,
            official_artwork: `${baseUrl}/other/official-artwork/${id}.png`
        };
    }

    /**
     * Format Pokemon name for display
     * @param {string} name - Raw Pokemon name
     * @returns {string} Formatted display name
     */
    static formatDisplayName(name) {
        return name
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Create unknown Pokemon data for failed lookups
     * @param {string|number} identifier - Pokemon identifier
     * @returns {Object} Unknown Pokemon data
     */
    static createUnknownPokemon(identifier) {
        return {
            id: null,
            name: String(identifier).toLowerCase(),
            displayName: String(identifier),
            types: ['unknown'],
            sprites: {
                front_default: null,
                front_shiny: null,
                back_default: null,
                back_shiny: null,
                dream_world: null,
                official_artwork: null
            },
            stats: {},
            abilities: [],
            height: null,
            weight: null,
            species: String(identifier),
            unknown: true
        };
    }

    /**
     * Get fallback sprite URL
     * @param {string|number} identifier - Pokemon identifier
     * @returns {string} Fallback sprite URL or null
     */
    static getFallbackSpriteUrl(identifier) {
        // Try to extract ID from identifier
        const fallbackData = this.COMMON_VGC_POKEMON[String(identifier).toLowerCase()];
        if (fallbackData?.id) {
            return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${fallbackData.id}.png`;
        }
        return null;
    }

    /**
     * Cache Pokemon data
     * @param {string} identifier - Pokemon identifier
     * @param {Object} data - Pokemon data to cache
     */
    static async cachePokemon(identifier, data) {
        try {
            const cache = await StorageService.get(this.STORAGE_KEY) || {};
            cache[identifier] = {
                data,
                cached_at: new Date().toISOString()
            };
            await StorageService.set(this.STORAGE_KEY, cache);
        } catch (error) {
            console.warn('Failed to cache Pokemon data:', error);
        }
    }

    /**
     * Get cached Pokemon data
     * @param {string} identifier - Pokemon identifier
     * @returns {Object|null} Cached Pokemon data
     */
    static async getCachedPokemon(identifier) {
        try {
            const cache = await StorageService.get(this.STORAGE_KEY) || {};
            return cache[identifier] || null;
        } catch (error) {
            console.warn('Failed to get cached Pokemon data:', error);
            return null;
        }
    }

    /**
     * Check if cached data is expired
     * @param {string} cachedAt - ISO date string
     * @returns {boolean} Whether cache is expired
     */
    static isCacheExpired(cachedAt) {
        const cacheDate = new Date(cachedAt);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() - this.CACHE_EXPIRY_DAYS);
        return cacheDate < expiryDate;
    }

    /**
     * Check if cached Pokemon data has local sprite URLs
     * Used to invalidate old cache entries that only have remote URLs
     * @param {Object} data - Cached Pokemon data
     * @returns {boolean} Whether data has local sprites
     */
    static hasLocalSprites(data) {
        if (!data || !data.sprites) return false;
        // Local sprites start with /sprites/
        const frontDefault = data.sprites.front_default;
        return frontDefault && frontDefault.startsWith('/sprites/');
    }

    /**
     * Clear Pokemon cache
     */
    static async clearCache() {
        try {
            await StorageService.remove(this.STORAGE_KEY);
            await StorageService.remove(this.SPRITE_CACHE_KEY);
        } catch (error) {
            console.error('Failed to clear Pokemon cache:', error);
        }
    }

    /**
     * Get cache statistics
     * @returns {Promise<Object>} Cache statistics
     */
    static async getCacheStats() {
        try {
            const cache = await StorageService.get(this.STORAGE_KEY) || {};
            const total = Object.keys(cache).length;
            const expired = Object.values(cache)
                .filter(entry => this.isCacheExpired(entry.cached_at)).length;

            return {
                total,
                active: total - expired,
                expired,
                expiryDays: this.CACHE_EXPIRY_DAYS
            };
        } catch (error) {
            console.error('Failed to get cache stats:', error);
            return { total: 0, active: 0, expired: 0, expiryDays: this.CACHE_EXPIRY_DAYS };
        }
    }

    /**
     * Get type effectiveness data (for future advanced analysis)
     * @param {string} attackingType - The attacking type
     * @param {Array<string>} defendingTypes - The defending Pokemon's types
     * @returns {number} Effectiveness multiplier
     */
    static getTypeEffectiveness(attackingType, defendingTypes) {
        // This is a simplified version - in a full implementation, you'd want
        // a complete type chart. For now, return 1.0 (neutral)
        // TODO: Implement full type effectiveness chart
        return 1.0;
    }
}

export default PokemonService;