// src/services/PokemonService.js
import apiClient from './api/client';
import { cleanPokemonName } from '@/utils/pokemonNameUtils';

/**
 * Pokemon sprite service using backend API with client-side caching
 */
class PokemonService {
    static CACHE_KEY_PREFIX = 'pokemon_sprite_';
    static CACHE_EXPIRY_DAYS = 7;

    /**
     * Get Pokemon sprite URL
     * @param {string} pokemonName - Pokemon name (will be normalized)
     * @returns {Promise<string>} Sprite URL
     */
    static async getSpriteUrl(pokemonName) {
        if (!pokemonName) {
            return null;
        }

        // Normalize the name
        const normalizedName = cleanPokemonName(pokemonName);
        if (!normalizedName) {
            return null;
        }

        // Check cache first
        const cached = this.getCachedSprite(normalizedName);
        if (cached && !this.isCacheExpired(cached.timestamp)) {
            return cached.url;
        }

        try {
            // Fetch from backend (which handles PokeAPI integration)
            const response = await apiClient.get(`/api/pokemon/${encodeURIComponent(normalizedName)}/sprite`);
            const spriteUrl = response.url;

            // Cache the result
            if (spriteUrl) {
                this.cacheSprite(normalizedName, spriteUrl);
            }

            return spriteUrl;
        } catch (error) {
            console.warn(`Failed to get sprite for ${pokemonName}:`, error);

            // Fallback: generate direct sprite URL from GitHub
            return this.getFallbackSpriteUrl(normalizedName);
        }
    }

    /**
     * Get multiple sprite URLs in parallel
     * @param {string[]} pokemonNames - Array of Pokemon names
     * @returns {Promise<Object>} Map of normalized name -> sprite URL
     */
    static async getMultipleSpriteUrls(pokemonNames) {
        if (!pokemonNames || pokemonNames.length === 0) {
            return {};
        }

        const promises = pokemonNames.map(async (name) => {
            const normalizedName = cleanPokemonName(name);
            const url = await this.getSpriteUrl(name);
            return { name: normalizedName, url };
        });

        const results = await Promise.allSettled(promises);

        const spriteMap = {};
        results.forEach((result) => {
            if (result.status === 'fulfilled' && result.value) {
                spriteMap[result.value.name] = result.value.url;
            }
        });

        return spriteMap;
    }

    /**
     * Cache sprite URL in localStorage
     * @param {string} pokemonName - Normalized Pokemon name
     * @param {string} spriteUrl - Sprite URL to cache
     */
    static cacheSprite(pokemonName, spriteUrl) {
        try {
            const cacheKey = this.CACHE_KEY_PREFIX + pokemonName;
            const cacheData = {
                url: spriteUrl,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        } catch (error) {
            console.warn('Failed to cache sprite:', error);
        }
    }

    /**
     * Get cached sprite from localStorage
     * @param {string} pokemonName - Normalized Pokemon name
     * @returns {Object|null} Cached data or null
     */
    static getCachedSprite(pokemonName) {
        try {
            const cacheKey = this.CACHE_KEY_PREFIX + pokemonName;
            const cached = localStorage.getItem(cacheKey);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            console.warn('Failed to read sprite cache:', error);
            return null;
        }
    }

    /**
     * Check if cached data is expired
     * @param {string} timestamp - ISO timestamp
     * @returns {boolean} True if expired
     */
    static isCacheExpired(timestamp) {
        const cacheDate = new Date(timestamp);
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() - this.CACHE_EXPIRY_DAYS);
        return cacheDate < expiryDate;
    }

    /**
     * Generate fallback sprite URL directly from GitHub
     * @param {string} pokemonName - Normalized Pokemon name
     * @returns {string} Fallback sprite URL
     */
    static getFallbackSpriteUrl(pokemonName) {
        // Try to generate URL for common Pokemon by name
        // This is a best-effort fallback - some forme-specific Pokemon may not work
        return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonName}.png`;
    }

    /**
     * Clear all cached sprites
     */
    static clearCache() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.CACHE_KEY_PREFIX)) {
                    localStorage.removeItem(key);
                }
            });
            console.log('Pokemon sprite cache cleared');
        } catch (error) {
            console.error('Failed to clear sprite cache:', error);
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    static getCacheStats() {
        try {
            const keys = Object.keys(localStorage);
            const spriteKeys = keys.filter(key => key.startsWith(this.CACHE_KEY_PREFIX));

            let expired = 0;
            spriteKeys.forEach(key => {
                const cached = localStorage.getItem(key);
                if (cached) {
                    const data = JSON.parse(cached);
                    if (this.isCacheExpired(data.timestamp)) {
                        expired++;
                    }
                }
            });

            return {
                total: spriteKeys.length,
                active: spriteKeys.length - expired,
                expired,
                expiryDays: this.CACHE_EXPIRY_DAYS
            };
        } catch (error) {
            console.error('Failed to get cache stats:', error);
            return { total: 0, active: 0, expired: 0, expiryDays: this.CACHE_EXPIRY_DAYS };
        }
    }
}

export default PokemonService;
