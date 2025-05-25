// src/services/ReplayService.js

console.log('🎮 ReplayService module loading...');

export class ReplayService {
    /**
     * Validates and processes a Showdown replay URL
     * @param {string}

     console.log('✅ ReplayService created with methods:', Object.getOwnPropertyNames(ReplayService).filter(name => name !== 'length' && name !== 'name' && name !== 'prototype'));

     // Export both named and default for consistency
     export { ReplayService };
     export default ReplayService; url - The replay URL
     * @returns {Object} - Parsed URL information or null if invalid
     */
    static parseReplayUrl(url) {
        // Remove any trailing .log or .json if already present
        const cleanUrl = url.replace(/\.(log|json)$/, '');

        // Regex to match Showdown replay URLs
        const replayRegex = /^https?:\/\/replay\.pokemonshowdown\.com\/([^-]+)-(\d+)-([a-z0-9]+)$/i;
        const match = cleanUrl.match(replayRegex);

        if (!match) {
            return null;
        }

        const [, format, battleId, authString] = match;

        return {
            originalUrl: cleanUrl,
            format,
            battleId,
            authString,
            logUrl: `${cleanUrl}.log`,
            jsonUrl: `${cleanUrl}.json`,
            battleIdentifier: `${format}-${battleId}-${authString}`
        };
    }

    /**
     * Fetches the raw log data from a Showdown replay
     * @param {string} url - The replay URL
     * @returns {Promise<string>} - The raw log text
     */
    static async fetchReplayLog(url) {
        const parsedUrl = this.parseReplayUrl(url);

        if (!parsedUrl) {
            throw new Error('Invalid Showdown replay URL');
        }

        try {
            const response = await fetch(parsedUrl.logUrl);

            if (!response.ok) {
                throw new Error(`Failed to fetch replay: ${response.status} ${response.statusText}`);
            }

            const logText = await response.text();

            if (!logText || logText.trim().length === 0) {
                throw new Error('Replay log is empty or unavailable');
            }

            return logText;
        } catch (error) {
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Network error: Unable to connect to Pokemon Showdown');
            }
            throw error;
        }
    }

    /**
     * Fetches the JSON metadata from a Showdown replay
     * @param {string} url - The replay URL
     * @returns {Promise<Object>} - The replay metadata
     */
    static async fetchReplayJson(url) {
        const parsedUrl = this.parseReplayUrl(url);

        if (!parsedUrl) {
            throw new Error('Invalid Showdown replay URL');
        }

        try {
            const response = await fetch(parsedUrl.jsonUrl);

            if (!response.ok) {
                throw new Error(`Failed to fetch replay metadata: ${response.status} ${response.statusText}`);
            }

            const jsonData = await response.json();
            return jsonData;
        } catch (error) {
            if (error.message.includes('Failed to fetch')) {
                throw new Error('Network error: Unable to connect to Pokemon Showdown');
            }
            throw error;
        }
    }

    /**
     * Creates a replay entry immediately without fetching content
     * @param {string} url - The replay URL
     * @param {string} teamId - The team ID this replay belongs to
     * @param {string} notes - Optional notes about the replay
     * @returns {Object} - Replay entry ready for storage (without parsed data)
     */
    static createReplayEntry(url, teamId, notes = '') {
        const parsedUrl = this.parseReplayUrl(url);

        if (!parsedUrl) {
            throw new Error('Invalid Showdown replay URL');
        }

        return {
            id: `replay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            url: parsedUrl.originalUrl,
            battleId: parsedUrl.battleIdentifier,
            teamId,
            notes,
            logText: null, // Will be fetched later
            metadata: null, // Will be fetched later
            parsedData: null, // Will be parsed later
            dateAdded: new Date().toISOString(),
            format: parsedUrl.format,
            status: 'pending', // pending, loading, completed, error
            error: null
        };
    }

    /**
     * Fetches and parses content for an existing replay entry
     * @param {Object} replayEntry - The replay entry to populate
     * @returns {Promise<Object>} - Updated replay entry with content
     */
    static async fetchReplayContent(replayEntry) {
        try {
            // Update status to loading
            const updatedEntry = { ...replayEntry, status: 'loading', error: null };

            // Fetch both log and metadata in parallel
            const [logText, metadata] = await Promise.all([
                this.fetchReplayLog(replayEntry.url),
                this.fetchReplayJson(replayEntry.url).catch(() => null) // JSON is optional
            ]);

            // Parse the log to extract basic battle info
            const parsedData = this.parseLogBasicInfo(logText);

            return {
                ...updatedEntry,
                logText,
                metadata,
                parsedData,
                status: 'completed',
                lastUpdated: new Date().toISOString()
            };
        } catch (error) {
            return {
                ...replayEntry,
                status: 'error',
                error: error.message,
                lastUpdated: new Date().toISOString()
            };
        }
    }

    /**
     * Imports a complete replay with both log and metadata (original method)
     * @param {string} url - The replay URL
     * @param {string} teamId - The team ID this replay belongs to
     * @param {string} notes - Optional notes about the replay
     * @returns {Promise<Object>} - Complete replay data ready for storage
     */
    static async importReplay(url, teamId, notes = '') {
        const parsedUrl = this.parseReplayUrl(url);

        if (!parsedUrl) {
            throw new Error('Invalid Showdown replay URL');
        }

        try {
            // Fetch both log and metadata in parallel
            const [logText, metadata] = await Promise.all([
                this.fetchReplayLog(url),
                this.fetchReplayJson(url).catch(() => null) // JSON is optional, don't fail if unavailable
            ]);

            // Parse the log to extract basic battle info
            const parsedBattle = this.parseLogBasicInfo(logText);

            return {
                id: `replay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                url: parsedUrl.originalUrl,
                battleId: parsedUrl.battleIdentifier,
                teamId,
                notes,
                logText,
                metadata,
                parsedData: parsedBattle,
                dateAdded: new Date().toISOString(),
                format: parsedUrl.format
            };
        } catch (error) {
            throw new Error(`Failed to import replay: ${error.message}`);
        }
    }

    /**
     * Basic log parsing to extract essential battle information
     * This is a minimal parser - we'll expand this in the next task
     * @param {string} logText - The raw log text
     * @returns {Object} - Basic battle information
     */
    static parseLogBasicInfo(logText) {
        const lines = logText.split('\n');
        const info = {
            players: [],
            format: null,
            tier: null,
            winner: null,
            timestamp: null,
            turns: 0
        };

        for (const line of lines) {
            // Extract player information
            if (line.startsWith('|player|')) {
                const parts = line.split('|');
                const playerData = {
                    id: parts[2],
                    name: parts[3],
                    avatar: parts[4],
                    rating: parts[5] ? parseInt(parts[5]) : null
                };
                info.players.push(playerData);
            }

            // Extract format and tier
            if (line.startsWith('|tier|')) {
                info.tier = line.split('|')[2];
            }

            // Extract timestamp
            if (line.startsWith('|t:|')) {
                info.timestamp = parseInt(line.split('|')[2]);
            }

            // Extract winner
            if (line.startsWith('|win|')) {
                info.winner = line.split('|')[2];
            }

            // Count turns
            if (line.startsWith('|turn|')) {
                info.turns = parseInt(line.split('|')[2]);
            }
        }

        return info;
    }

    /**
     * Validates multiple replay URLs at once
     * @param {string[]} urls - Array of replay URLs
     * @returns {Object} - Validation results with valid/invalid URLs
     */
    static validateMultipleUrls(urls) {
        const results = {
            valid: [],
            invalid: []
        };

        for (const url of urls) {
            const parsed = this.parseReplayUrl(url.trim());
            if (parsed) {
                results.valid.push({
                    url: url.trim(),
                    parsed
                });
            } else {
                results.invalid.push({
                    url: url.trim(),
                    reason: 'Invalid Showdown replay URL format'
                });
            }
        }

        return results;
    }

    /**
     * Extracts replay URLs from text (useful for bulk import)
     * @param {string} text - Text containing potential replay URLs
     * @returns {string[]} - Array of found replay URLs
     */
    static extractUrlsFromText(text) {
        const urlRegex = /https?:\/\/replay\.pokemonshowdown\.com\/[^\s]+/gi;
        const matches = text.match(urlRegex) || [];

        // Clean up URLs and remove duplicates
        const cleanUrls = matches
            .map(url => url.replace(/[.,;!?]$/, '')) // Remove trailing punctuation
            .filter((url, index, array) => array.indexOf(url) === index); // Remove duplicates

        return cleanUrls;
    }
}