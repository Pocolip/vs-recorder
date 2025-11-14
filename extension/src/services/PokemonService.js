// src/services/PokemonService.js
import StorageService from './StorageService.js';
import { parseShowdownName } from '../utils/pokemonNameUtils';

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

            console.log('PokemonService initialized with PokeAPI wrapper');
            return true;
        } catch (error) {
            console.warn('Failed to initialize PokeAPI wrapper, using fallback data only:', error);
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
            if (cached && !this.isCacheExpired(cached.cached_at)) {
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
        return {
            id: apiData.id,
            name: apiData.name,
            displayName: this.formatDisplayName(apiData.name),
            types: apiData.types.map(t => t.type.name),
            sprites: {
                front_default: apiData.sprites.front_default,
                front_shiny: apiData.sprites.front_shiny,
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
        const sprites = this.generateSpriteUrls(fallbackData.id);

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
     * Generate sprite URLs for a Pokemon ID
     * @param {number} id - Pokemon ID
     * @returns {Object} Sprite URLs
     */
    static generateSpriteUrls(id) {
        const baseUrl = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
        return {
            front_default: `${baseUrl}/${id}.png`,
            front_shiny: `${baseUrl}/shiny/${id}.png`,
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
     * Clear Pokemon cache
     */
    static async clearCache() {
        try {
            await StorageService.remove(this.STORAGE_KEY);
            await StorageService.remove(this.SPRITE_CACHE_KEY);
            console.log('Pokemon cache cleared');
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