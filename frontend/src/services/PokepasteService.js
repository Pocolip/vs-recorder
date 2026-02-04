// src/services/PokepasteService.js
import StorageService from './StorageService.js';
import { extractPokemonFromPokepaste, isValidPokemonName } from '../utils/pokemonNameUtils';
import apiClient from './api/client';

class PokepasteService {
    static CACHE_KEY = 'pokepaste_cache_v2';
    static CACHE_EXPIRY_HOURS = 24; // Cache for 24 hours

    // URL patterns
    static POKEPASTE_PATTERN = /^https?:\/\/(www\.)?pokepast\.es\/([a-zA-Z0-9]+)\/?$/;
    static POKEBIN_PATTERN = /^https?:\/\/(www\.)?pokebin\.com\/([a-zA-Z0-9]+)\/?$/;

    /**
     * Determine the paste service type from URL
     * @param {string} url - Paste URL
     * @returns {Object|null} Service info with type and pasteId
     */
    static detectPasteService(url) {
        if (!url || typeof url !== 'string') return null;

        const pokepasteMatch = url.trim().match(this.POKEPASTE_PATTERN);
        if (pokepasteMatch) {
            return { type: 'pokepaste', pasteId: pokepasteMatch[2] };
        }

        const pokebinMatch = url.trim().match(this.POKEBIN_PATTERN);
        if (pokebinMatch) {
            return { type: 'pokebin', pasteId: pokebinMatch[2] };
        }

        return null;
    }

    /**
     * Fetch and parse a Pokepaste or Pokebin from URL
     * @param {string} pasteUrl - The paste URL (pokepaste or pokebin)
     * @param {Object} options - Parsing options
     * @param {boolean} options.useCache - Whether to use cached results (default: true)
     * @param {number} options.maxPokemon - Maximum number of Pokemon to return (default: 6)
     * @returns {Promise<Object>} Parsed paste data
     */
    static async fetchAndParse(pasteUrl, options = {}) {
        const {
            useCache = true,
            maxPokemon = 6
        } = options;

        try {
            // Detect service type
            const serviceInfo = this.detectPasteService(pasteUrl);
            if (!serviceInfo) {
                throw new Error('Invalid paste URL - must be from pokepast.es or pokebin.com');
            }

            // Check cache first
            if (useCache) {
                const cached = await this.getCachedPokepaste(pasteUrl);
                // Only use cache if not expired AND has title field (invalidate old cache format)
                if (cached && !this.isCacheExpired(cached.cachedAt) && 'title' in cached.data) {
                    return cached.data;
                }
            }

            // Fetch based on service type
            let result;
            if (serviceInfo.type === 'pokepaste') {
                result = await this.fetchPokepaste(serviceInfo.pasteId, pasteUrl, maxPokemon);
            } else {
                result = await this.fetchPokebin(serviceInfo.pasteId, pasteUrl, maxPokemon);
            }

            // Cache the result
            if (useCache) {
                await this.cachePokepaste(pasteUrl, result);
            }

            return result;
        } catch (error) {
            console.error('Error fetching/parsing paste:', error);
            throw new Error(`Failed to process paste: ${error.message}`);
        }
    }

    /**
     * Fetch data from Pokepaste
     * @param {string} pasteId - Paste ID
     * @param {string} originalUrl - Original URL
     * @param {number} maxPokemon - Max Pokemon to parse
     * @returns {Promise<Object>} Parsed data
     */
    static async fetchPokepaste(pasteId, originalUrl, maxPokemon) {
        const rawUrl = `https://pokepast.es/${pasteId}/raw`;
        const jsonUrl = `https://pokepast.es/${pasteId}/json`;

        // Fetch metadata (title)
        let title = null;
        try {
            const metaResponse = await fetch(jsonUrl);
            if (metaResponse.ok) {
                const metaData = await metaResponse.json();
                title = metaData.title || null;
            }
        } catch (err) {
            console.warn('Could not fetch pokepaste metadata:', err);
        }

        // Fetch raw content
        const response = await fetch(rawUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch Pokepaste: ${response.status} ${response.statusText}`);
        }

        const rawText = await response.text();

        // Parse the content
        const parsedData = this.parsePokepasteText(rawText, { maxPokemon });

        return {
            url: originalUrl,
            pasteId,
            rawText,
            title,
            pokemon: parsedData.pokemon,
            metadata: {
                ...parsedData.metadata,
                parsedAt: new Date().toISOString(),
                source: 'pokepast.es'
            }
        };
    }

    /**
     * Fetch data from Pokebin
     * Uses backend proxy to avoid CORS issues
     * @param {string} pasteId - Paste ID
     * @param {string} originalUrl - Original URL
     * @param {number} maxPokemon - Max Pokemon to parse
     * @returns {Promise<Object>} Parsed data
     */
    static async fetchPokebin(pasteId, originalUrl, maxPokemon) {
        // Use backend proxy to avoid CORS issues with Pokebin
        const backendData = await apiClient.get('/api/pokemon/pokepaste/fetch', {
            params: { url: originalUrl }
        });

        const rawText = backendData.rawText;
        const title = backendData.title || null;

        if (!rawText) {
            throw new Error('Pokebin paste is empty or missing content');
        }

        // Transform backend pokemon data to frontend format
        const pokemon = (backendData.pokemon || []).slice(0, maxPokemon).map(p => ({
            name: p.species,
            nickname: p.nickname || null,
            item: p.item || null,
            ability: p.ability || null,
            teraType: p.teraType || null,
            moves: p.moves || []
        }));

        return {
            url: originalUrl,
            pasteId,
            rawText,
            title,
            pokemon,
            metadata: {
                pokemonCount: pokemon.length,
                parsedAt: new Date().toISOString(),
                source: 'pokebin.com'
            }
        };
    }

    /**
     * Parse Pokepaste text content into structured data
     * @param {string} rawText - Raw Pokepaste text
     * @param {Object} options - Parsing options
     * @param {number} options.maxPokemon - Maximum number of Pokemon to parse
     * @returns {Object} Parsed data with Pokemon list and metadata
     */
    static parsePokepasteText(rawText, options = {}) {
        const { maxPokemon = 6 } = options;

        try {
            // Use the utility function for basic Pokemon extraction
            const pokemonNames = extractPokemonFromPokepaste(rawText);

            // Enhanced parsing for additional metadata
            const lines = rawText.split('\n');
            const pokemonBlocks = this.splitIntoPokemonBlocks(lines);

            const pokemon = [];
            const metadata = {
                totalLines: lines.length,
                pokemonCount: 0,
                hasNicknames: false,
                hasItems: false,
                hasMoves: false,
                hasAbilities: false,
                hasEvs: false,
                hasIvs: false,
                hasNatures: false,
                format: this.detectFormat(rawText),
                errors: []
            };

            // Process each Pokemon block for detailed information
            for (let i = 0; i < Math.min(pokemonBlocks.length, maxPokemon); i++) {
                const block = pokemonBlocks[i];
                try {
                    const pokemonData = this.parsePokemonBlock(block, i);

                    if (pokemonData && isValidPokemonName(pokemonData.name)) {
                        pokemon.push(pokemonData);

                        // Update metadata flags
                        if (pokemonData.nickname) metadata.hasNicknames = true;
                        if (pokemonData.item) metadata.hasItems = true;
                        if (pokemonData.moves.length > 0) metadata.hasMoves = true;
                        if (pokemonData.ability) metadata.hasAbilities = true;
                        if (pokemonData.evs && Object.keys(pokemonData.evs).length > 0) metadata.hasEvs = true;
                        if (pokemonData.ivs && Object.keys(pokemonData.ivs).length > 0) metadata.hasIvs = true;
                        if (pokemonData.nature) metadata.hasNatures = true;
                    }
                } catch (blockError) {
                    metadata.errors.push(`Error parsing Pokemon ${i + 1}: ${blockError.message}`);
                }
            }

            metadata.pokemonCount = pokemon.length;

            return {
                pokemon,
                metadata
            };
        } catch (error) {
            throw new Error(`Failed to parse Pokepaste text: ${error.message}`);
        }
    }

    /**
     * Split Pokepaste text into individual Pokemon blocks
     * @param {Array<string>} lines - Lines of text
     * @returns {Array<Array<string>>} Array of Pokemon blocks
     */
    static splitIntoPokemonBlocks(lines) {
        const blocks = [];
        let currentBlock = [];

        for (const line of lines) {
            const trimmed = line.trim();

            // Skip empty lines and comments
            if (!trimmed || trimmed.startsWith('//')) {
                continue;
            }

            // Check if this line starts a new Pokemon (doesn't contain colons and isn't a move)
            // ` @ ` only appears on Pokemon name lines (e.g. "Koraidon @ Ability Shield")
            const hasItemSeparator = trimmed.includes(' @ ');
            const looksLikePokemonName = hasItemSeparator || (
                !trimmed.includes(':') &&
                !trimmed.startsWith('-') &&
                !trimmed.toLowerCase().includes('nature') &&
                !trimmed.toLowerCase().includes('level')
            );

            if (looksLikePokemonName && currentBlock.length > 0) {
                // Save previous block and start new one
                blocks.push([...currentBlock]);
                currentBlock = [trimmed];
            } else {
                currentBlock.push(trimmed);
            }
        }

        // Add the last block
        if (currentBlock.length > 0) {
            blocks.push(currentBlock);
        }

        return blocks;
    }

    /**
     * Parse a single Pokemon block into structured data
     * @param {Array<string>} blockLines - Lines for this Pokemon
     * @param {number} index - Pokemon index (for error reporting)
     * @returns {Object} Parsed Pokemon data
     */
    static parsePokemonBlock(blockLines, index = 0) {
        if (!blockLines || blockLines.length === 0) {
            return null;
        }

        const pokemon = {
            name: null,
            nickname: null,
            item: null,
            ability: null,
            level: 50,
            nature: null,
            teraType: null,
            moves: [],
            evs: {},
            ivs: {},
            gender: null,
            shiny: false,
            happiness: null
        };

        // Parse the first line (Pokemon name/nickname)
        const firstLine = blockLines[0];
        const nameInfo = this.parseNameLine(firstLine);
        pokemon.name = nameInfo.name;
        pokemon.nickname = nameInfo.nickname;
        pokemon.item = nameInfo.item;
        pokemon.gender = nameInfo.gender;

        // Parse remaining lines
        for (let i = 1; i < blockLines.length; i++) {
            const line = blockLines[i].trim();

            if (line.startsWith('-')) {
                // Move line
                const move = line.substring(1).trim();
                if (move && pokemon.moves.length < 4) {
                    pokemon.moves.push(move);
                }
            } else if (line.toLowerCase().includes('ability:')) {
                pokemon.ability = line.split(':')[1].trim();
            } else if (line.toLowerCase().includes('nature')) {
                pokemon.nature = line.replace(/nature/i, '').trim();
            } else if (line.toLowerCase().includes('tera type:')) {
                pokemon.teraType = line.split(':')[1].trim();
            } else if (line.toLowerCase().includes('level:')) {
                const level = parseInt(line.split(':')[1].trim());
                if (!isNaN(level)) pokemon.level = level;
            } else if (line.toLowerCase().includes('evs:')) {
                pokemon.evs = this.parseStats(line);
            } else if (line.toLowerCase().includes('ivs:')) {
                pokemon.ivs = this.parseStats(line);
            } else if (line.toLowerCase().includes('shiny')) {
                pokemon.shiny = true;
            }
        }

        return pokemon;
    }

    /**
     * Parse the Pokemon name line (first line of each block)
     * @param {string} line - The name line
     * @returns {Object} Parsed name information
     */
    static parseNameLine(line) {
        let name = line;
        let nickname = null;
        let item = null;
        let gender = null;

        // Extract item (after @)
        if (name.includes('@')) {
            const parts = name.split('@');
            name = parts[0].trim();
            item = parts[1].trim();
        }

        // Extract gender
        if (name.includes('(M)')) {
            gender = 'M';
            name = name.replace('(M)', '').trim();
        } else if (name.includes('(F)')) {
            gender = 'F';
            name = name.replace('(F)', '').trim();
        }

        // Handle nickname vs species name
        if (name.includes('(') && name.includes(')')) {
            const match = name.match(/^(.+?)\s*\((.+?)\)$/);
            if (match) {
                nickname = match[1].trim();
                name = match[2].trim();
            }
        }

        return {
            name: name.trim(),
            nickname,
            item,
            gender
        };
    }

    /**
     * Parse stat lines (EVs/IVs)
     * @param {string} line - The stat line
     * @returns {Object} Parsed stats
     */
    static parseStats(line) {
        const stats = {};
        const statPart = line.split(':')[1];
        if (!statPart) return stats;

        const statPairs = statPart.split('/');
        const statNames = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

        statPairs.forEach((pair, index) => {
            const value = parseInt(pair.trim());
            if (!isNaN(value) && statNames[index]) {
                stats[statNames[index]] = value;
            }
        });

        return stats;
    }

    /**
     * Detect the format from Pokepaste content
     * @param {string} rawText - Raw Pokepaste text
     * @returns {string} Detected format
     */
    static detectFormat(rawText) {
        const text = rawText.toLowerCase();

        if (text.includes('vgc') || text.includes('doubles')) {
            if (text.includes('2025')) return 'VGC 2025';
            if (text.includes('2024')) return 'VGC 2024';
            if (text.includes('2023')) return 'VGC 2023';
            return 'VGC';
        }

        if (text.includes('battle stadium') || text.includes('bss')) {
            return 'BSS';
        }

        if (text.includes('ou')) return 'OU';
        if (text.includes('uber')) return 'Ubers';

        return 'Unknown';
    }

    /**
     * Validate if a URL is a valid paste URL (Pokepaste or Pokebin)
     * @param {string} url - URL to validate
     * @returns {boolean} True if valid
     */
    static isValidPokepasteUrl(url) {
        return this.detectPasteService(url) !== null;
    }

    /**
     * Extract paste ID from paste URL
     * @param {string} url - Paste URL
     * @returns {string|null} Paste ID
     */
    static extractPasteId(url) {
        const serviceInfo = this.detectPasteService(url);
        return serviceInfo ? serviceInfo.pasteId : null;
    }

    /**
     * Cache a parsed Pokepaste
     * @param {string} url - Pokepaste URL
     * @param {Object} data - Parsed data
     */
    static async cachePokepaste(url, data) {
        try {
            const cache = await StorageService.get(this.CACHE_KEY) || {};
            cache[url] = {
                data,
                cachedAt: new Date().toISOString()
            };
            await StorageService.set(this.CACHE_KEY, cache);
        } catch (error) {
            console.warn('Failed to cache Pokepaste:', error);
        }
    }

    /**
     * Get cached Pokepaste data
     * @param {string} url - Pokepaste URL
     * @returns {Object|null} Cached data
     */
    static async getCachedPokepaste(url) {
        try {
            const cache = await StorageService.get(this.CACHE_KEY) || {};
            return cache[url] || null;
        } catch (error) {
            console.warn('Failed to get cached Pokepaste:', error);
            return null;
        }
    }

    /**
     * Check if cached data is expired
     * @param {string} cachedAt - ISO date string
     * @returns {boolean} True if expired
     */
    static isCacheExpired(cachedAt) {
        const cacheDate = new Date(cachedAt);
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() - this.CACHE_EXPIRY_HOURS);
        return cacheDate < expiryDate;
    }

    /**
     * Clear Pokepaste cache
     */
    static async clearCache() {
        try {
            await StorageService.remove(this.CACHE_KEY);
        } catch (error) {
            console.error('Failed to clear Pokepaste cache:', error);
        }
    }

    /**
     * Get cache statistics
     * @returns {Promise<Object>} Cache stats
     */
    static async getCacheStats() {
        try {
            const cache = await StorageService.get(this.CACHE_KEY) || {};
            const total = Object.keys(cache).length;
            const expired = Object.values(cache)
                .filter(entry => this.isCacheExpired(entry.cachedAt)).length;

            return {
                total,
                active: total - expired,
                expired,
                expiryHours: this.CACHE_EXPIRY_HOURS
            };
        } catch (error) {
            console.error('Failed to get cache stats:', error);
            return { total: 0, active: 0, expired: 0, expiryHours: this.CACHE_EXPIRY_HOURS };
        }
    }

    /**
     * Get just the Pokemon names from a Pokepaste URL (simplified interface)
     * @param {string} pokepasteUrl - Pokepaste URL
     * @param {number} maxPokemon - Maximum Pokemon to return
     * @returns {Promise<Array<string>>} Array of Pokemon names
     */
    static async getPokemonNames(pokepasteUrl, maxPokemon = 6) {
        try {
            const parsed = await this.fetchAndParse(pokepasteUrl, { maxPokemon });
            return parsed.pokemon.map(p => p.name).filter(name => name);
        } catch (error) {
            console.error('Error getting Pokemon names:', error);
            return [];
        }
    }

    /**
     * Validate a paste by trying to fetch and parse it
     * @param {string} pasteUrl - Paste URL to validate
     * @returns {Promise<Object>} Validation result
     */
    static async validatePokepaste(pasteUrl) {
        try {
            if (!this.isValidPokepasteUrl(pasteUrl)) {
                return {
                    valid: false,
                    error: 'Invalid URL format',
                    details: 'URL must be from pokepast.es or pokebin.com'
                };
            }

            const parsed = await this.fetchAndParse(pasteUrl, { useCache: false });

            return {
                valid: true,
                pokemonCount: parsed.pokemon.length,
                format: parsed.metadata.format,
                title: parsed.title,
                hasCompleteData: parsed.metadata.hasMoves && parsed.metadata.hasAbilities,
                metadata: parsed.metadata
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message,
                details: 'Could not fetch or parse the paste'
            };
        }
    }
}

export default PokepasteService;