// src/services/ReplayService.js - Enhanced with move tracking
import StorageService from './StorageService.js';
import { cleanPokemonName } from '../utils/pokemonNameUtils';

class ReplaysService {
    static STORAGE_KEY = 'replays';

    /**
     * Get all replays
     */
    static async getAll() {
        const replays = await StorageService.get(this.STORAGE_KEY) || {};
        return replays;
    }

    /**
     * Get a single replay by ID
     */
    static async getById(id) {
        const replays = await this.getAll();
        return replays[id] || null;
    }

    /**
     * Create a new replay
     */
    static async create(replayData) {
        const replays = await this.getAll();
        const id = Date.now().toString();

        const replay = {
            id,
            teamId: replayData.teamId,
            url: replayData.url,
            battleData: replayData.battleData || null,
            result: replayData.result || null, // 'win' | 'loss' | null
            opponent: replayData.opponent || null,
            notes: replayData.notes || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        replays[id] = replay;
        await StorageService.set(this.STORAGE_KEY, replays);
        return replay;
    }

    /**
     * Update an existing replay
     */
    static async update(id, updates) {
        const replays = await this.getAll();

        if (!replays[id]) {
            return null;
        }

        replays[id] = {
            ...replays[id],
            ...updates,
            id, // Ensure ID doesn't get overwritten
            updatedAt: new Date().toISOString()
        };

        await StorageService.set(this.STORAGE_KEY, replays);
        return replays[id];
    }

    /**
     * Delete a replay by ID
     */
    static async delete(id) {
        const replays = await this.getAll();

        if (!replays[id]) {
            return false;
        }

        delete replays[id];
        await StorageService.set(this.STORAGE_KEY, replays);
        return true;
    }

    /**
     * Delete all replays for a team
     */
    static async deleteByTeamId(teamId) {
        const replays = await this.getAll();
        const replayIds = Object.keys(replays).filter(id => replays[id].teamId === teamId);

        for (const id of replayIds) {
            delete replays[id];
        }

        await StorageService.set(this.STORAGE_KEY, replays);
        return replayIds.length;
    }

    /**
     * Get replays as array (sorted by most recent)
     */
    static async getList() {
        const replays = await this.getAll();
        return Object.values(replays).sort((a, b) =>
            new Date(b.createdAt) - new Date(a.createdAt)
        );
    }

    /**
     * Get replays for a specific team
     */
    static async getByTeamId(teamId) {
        const replays = await this.getList();
        return replays.filter(replay => replay.teamId === teamId);
    }

    /**
     * Get replays by result (wins/losses)
     */
    static async getByResult(result) {
        const replays = await this.getList();
        return replays.filter(replay => replay.result === result);
    }

    /**
     * Get replays for a team by result
     */
    static async getByTeamIdAndResult(teamId, result) {
        const replays = await this.getByTeamId(teamId);
        return replays.filter(replay => replay.result === result);
    }

    /**
     * Search replays by opponent name or notes
     */
    static async search(query) {
        const replays = await this.getList();
        const lowerQuery = query.toLowerCase();

        return replays.filter(replay =>
            (replay.opponent && replay.opponent.toLowerCase().includes(lowerQuery)) ||
            replay.notes.toLowerCase().includes(lowerQuery) ||
            replay.url.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Check if replay exists
     */
    static async exists(id) {
        const replay = await this.getById(id);
        return replay !== null;
    }

    /**
     * Check if replay URL already exists
     */
    static async existsByUrl(url) {
        const replays = await this.getList();
        return replays.some(replay => replay.url === url);
    }

    /**
     * Get replay count for a team
     */
    static async getCountByTeamId(teamId) {
        const replays = await this.getByTeamId(teamId);
        return replays.length;
    }

    /**
     * Check if replay URL already exists for a specific team
     */
    static async existsByUrlForTeam(url, teamId) {
        const replays = await this.getByTeamId(teamId);
        return replays.some(replay => replay.url === url);
    }

    /**
     * Create replay from Showdown URL (fetches and parses automatically)
     */
    static async createFromUrl(teamId, replayUrl, notes = '') {
        try {
            // Check if URL already exists for this specific team
            if (await this.existsByUrlForTeam(replayUrl, teamId)) {
                throw new Error('This replay is already added to this team');
            }

            // Get team data to access Showdown usernames
            // Import TeamService directly instead of dynamic import
            const { default: TeamService } = await import('./TeamService.js');
            const team = await TeamService.getById(teamId);
            const teamShowdownUsernames = team?.showdownUsernames || [];

            console.log('Team data for replay parsing:', {
                teamId,
                teamName: team?.name,
                teamShowdownUsernames
            });

            // Fetch and parse the replay data
            const battleData = await this.fetchAndParseReplay(replayUrl, teamShowdownUsernames);

            return await this.create({
                teamId,
                url: replayUrl,
                battleData,
                result: battleData.result,
                opponent: battleData.opponent,
                notes
            });
        } catch (error) {
            console.error('Error creating replay from URL:', error);
            throw error;
        }
    }

    /**
     * Fetch replay data from Showdown URL and parse it
     */
    static async fetchAndParseReplay(url, teamShowdownUsernames = []) {
        try {
            // Convert replay URL to JSON endpoint
            const jsonUrl = url.endsWith('.json') ? url : `${url}.json`;

            const response = await fetch(jsonUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch replay: ${response.status}`);
            }

            const replayData = await response.json();
            return this.parseReplayData(replayData, teamShowdownUsernames);
        } catch (error) {
            console.error('Error fetching replay:', error);
            throw new Error('Failed to fetch or parse replay data');
        }
    }

    /**
     * Parse replay JSON data into structured battle information
     */
    static parseReplayData(replayData, teamShowdownUsernames = []) {
        try {
            const log = replayData.log || '';
            const lines = log.split('\n');

            let players = {};
            let winner = null;
            let teams = { p1: [], p2: [] };
            let userPlayer = null;
            let opponentPlayer = null;

            // Enhanced data structures
            let actualPicks = { p1: new Set(), p2: new Set() };
            let pokemonTransformations = new Map();
            let teraEvents = { p1: [], p2: [] };
            let eloChanges = { p1: null, p2: null };

            // NEW: Move usage tracking
            let moveUsage = { p1: new Map(), p2: new Map() }; // Map: pokemon -> Map(move -> count)
            let pokemonToSlot = new Map(); // Maps "Tyranitar" -> "p1a"
            let slotToPokemon = new Map(); // Maps "p1a" -> "Tyranitar"

            let nicknameToSpecies = new Map(); // Maps "p1a: RRRAAAAARW" -> "Tyranitar"
            let slotToNickname = new Map();    // Maps "p1a" -> "RRRAAAAARW"

            // Best-of-3 data structures
            let bestOf3Data = {
                isBestOf3: false,
                matchId: null,
                gameNumber: null,
                gameTitle: null,
                matchUrl: null,
                seriesScore: null // Will store current score like "1-0", "1-1", etc.
            };

            // Parse the log for battle information
            for (const line of lines) {
                // Extract Best-of-3 information
                if (line.includes('|uhtml|bestof|')) {
                    bestOf3Data.isBestOf3 = true;

                    // Extract the HTML content
                    const htmlMatch = line.match(/\|uhtml\|bestof\|(.+)$/);
                    if (htmlMatch) {
                        const htmlContent = htmlMatch[1];
                        console.log('Found Bo3 HTML:', htmlContent);

                        // Extract game number and URL from HTML like:
                        // <h2><strong>Game 1</strong> of <a href="/game-bestof3-gen9vgc2025regibo3-2370418907-63ye7u6d1d90ht3h8obgwvq4uijrl0qpw">a best-of-3</a></h2>
                        const gameMatch = htmlContent.match(/<strong>Game (\d+)<\/strong>/);
                        if (gameMatch) {
                            bestOf3Data.gameNumber = parseInt(gameMatch[1]);
                            bestOf3Data.gameTitle = `Game ${gameMatch[1]}`;
                        }

                        const urlMatch = htmlContent.match(/href="([^"]+)"/);
                        if (urlMatch) {
                            bestOf3Data.matchUrl = urlMatch[1];
                            // Extract match ID from URL (the long string after the last dash)
                            const idMatch = urlMatch[1].match(/-([a-zA-Z0-9]+)$/);
                            if (idMatch) {
                                bestOf3Data.matchId = idMatch[1];
                            }
                        }
                    }
                }

                // Extract series score from HTML table
                if (line.includes('|html|') && line.includes('<table') && line.includes('fa fa-circle')) {
                    const htmlContent = line.substring(line.indexOf('|html|') + 6);
                    console.log('Found series score HTML:', htmlContent);

                    // Count filled circles (wins) for each player
                    // Pattern: <i class="fa fa-circle"></i> for wins, <i class="fa fa-circle-o"></i> for losses/empty
                    const leftWins = (htmlContent.match(/<td align="left">.*?<\/td>/s)?.[0] || '')
                        .split('fa fa-circle"></i>').length - 1;
                    const rightWins = (htmlContent.match(/<td align="right">.*?<\/td>/s)?.[0] || '')
                        .split('fa fa-circle"></i>').length - 1;

                    bestOf3Data.seriesScore = `${leftWins}-${rightWins}`;
                    console.log('Extracted series score:', bestOf3Data.seriesScore);
                }

                // Extract player information
                if (line.startsWith('|player|')) {
                    const parts = line.split('|');
                    const playerId = parts[2]; // p1 or p2
                    const playerName = parts[3];

                    // Only set if we have a valid player name
                    if (playerName && playerName.trim()) {
                        players[playerId] = playerName.trim();
                        console.log(`Found player: ${playerId} = "${playerName.trim()}"`);

                        // Check if this player is one of our usernames
                        if (teamShowdownUsernames.length > 0 &&
                            teamShowdownUsernames.some(username =>
                                username.toLowerCase() === playerName.toLowerCase()
                            )) {
                            userPlayer = playerId;
                            opponentPlayer = playerId === 'p1' ? 'p2' : 'p1';
                            console.log(`Found user player: ${playerId} (${playerName})`);
                        }
                    } else {
                        console.warn(`Empty or invalid player name for ${playerId}: "${playerName}"`);
                    }
                }

                // Extract team information (pokemon reveals)
                if (line.startsWith('|poke|')) {
                    const parts = line.split('|');
                    const player = parts[2];
                    const pokemon = parts[3].split(',')[0]; // Remove level/gender info
                    teams[player].push(pokemon);
                }

                // Extract actual picks (pokemon that entered battle)
                if (line.startsWith('|switch|')) {
                    const parts = line.split('|');
                    const playerSlot = parts[2]; // e.g., "p1a: RRRAAAAARW" or "p2b: Urshifu"
                    const pokemonInfo = parts[3]; // e.g., "Tyranitar, L50, F" or "Urshifu-Rapid-Strike, L50, M"

                    if (playerSlot && pokemonInfo) {
                        const player = playerSlot.substring(0, 2); // Extract "p1" or "p2"
                        const pokemon = pokemonInfo.split(',')[0]; // Extract just the pokemon species name
                        const slot = playerSlot.substring(0, 3); // Extract "p1a" or "p2b"

                        // Store the actual species for usage tracking
                        if (actualPicks[player]) {
                            actualPicks[player].add(pokemon);
                        }

                        // Build nickname mapping for tera events and move tracking
                        if (playerSlot.includes(':')) {
                            const nickname = playerSlot.split(':')[1].trim();
                            nicknameToSpecies.set(playerSlot, pokemon);
                            slotToNickname.set(slot, nickname);
                        }

                        // NEW: Build slot-pokemon mappings for move tracking
                        slotToPokemon.set(slot, pokemon);
                        pokemonToSlot.set(`${player}-${pokemon}`, slot);

                        console.log(`Switch mapping: ${playerSlot} -> ${pokemon} (slot: ${slot})`);
                    }
                }

                // NEW: Track move usage
                if (line.startsWith('|move|')) {
                    const parts = line.split('|');
                    if (parts.length >= 4) {
                        const slot = parts[2]; // e.g., "p1a: RRRAAAAARW" or "p1a"
                        const move = parts[3]; // e.g., "Stone Edge"

                        if (slot && move) {
                            // Extract just the slot identifier (p1a, p2b, etc.)
                            const cleanSlot = slot.includes(':') ? slot.split(':')[0] : slot;
                            const player = cleanSlot.substring(0, 2); // p1 or p2

                            // Get the Pokemon for this slot
                            const pokemon = slotToPokemon.get(cleanSlot);

                            if (pokemon && moveUsage[player]) {
                                // Initialize Pokemon's move map if it doesn't exist
                                if (!moveUsage[player].has(pokemon)) {
                                    moveUsage[player].set(pokemon, new Map());
                                }

                                const pokemonMoves = moveUsage[player].get(pokemon);
                                const currentCount = pokemonMoves.get(move) || 0;
                                pokemonMoves.set(move, currentCount + 1);

                                console.log(`Move usage: ${pokemon} used ${move} (count: ${currentCount + 1})`);
                            }
                        }
                    }
                }

                // Handle Pokemon transformations (like Terapagos Tera Shift)
                if (line.startsWith('|detailschange|')) {
                    const parts = line.split('|');
                    const playerSlot = parts[2]; // e.g., "p2a: Terapagos" or "p1a: Terapagos"
                    const newPokemonInfo = parts[3]; // e.g., "Terapagos-Terastal, L50, M"

                    if (playerSlot && newPokemonInfo) {
                        const slot = playerSlot.substring(0, 3); // Extract "p1a" or "p2a"
                        const originalPokemon = slotToPokemon.get(slot); // Get the original Pokemon name
                        const newPokemon = newPokemonInfo.split(',')[0]; // Get the new form name

                        console.log(`Transformation detected: ${originalPokemon} -> ${newPokemon} (slot: ${slot})`);

                        if (originalPokemon) {
                            // Track the transformation for later normalization
                            pokemonTransformations.set(newPokemon, originalPokemon);

                            // Update slot mapping to the new form (for immediate move tracking)
                            slotToPokemon.set(slot, newPokemon);

                            // If we have move usage data for the new form, we need to transfer it to the original
                            const player = slot.substring(0, 2);
                            if (moveUsage[player] && moveUsage[player].has(newPokemon)) {
                                // Move usage from new form to original form
                                if (!moveUsage[player].has(originalPokemon)) {
                                    moveUsage[player].set(originalPokemon, new Map());
                                }

                                const newFormMoves = moveUsage[player].get(newPokemon);
                                const originalMoves = moveUsage[player].get(originalPokemon);

                                // Merge move usage
                                for (const [move, count] of newFormMoves.entries()) {
                                    const currentCount = originalMoves.get(move) || 0;
                                    originalMoves.set(move, currentCount + count);
                                }

                                // Remove the new form's separate tracking
                                moveUsage[player].delete(newPokemon);
                            }
                        }
                    }
                }

                // Extract terastallization events
                if (line.includes('-terastallize|')) {
                    const parts = line.split('|');
                    if (parts.length >= 4) {
                        const playerSlot = parts[2]; // e.g., "p1b: RRRAAAAARW"
                        const teraType = parts[3]; // e.g., "Fairy"

                        if (playerSlot && teraType) {
                            const player = playerSlot.substring(0, 2); // Extract "p1" or "p2"

                            // Try to get the actual species name from our mapping
                            let pokemon;
                            if (nicknameToSpecies.has(playerSlot)) {
                                // We have a direct mapping from the switch event
                                pokemon = nicknameToSpecies.get(playerSlot);
                            } else if (playerSlot.includes(':')) {
                                // Fallback: extract nickname and try to find it
                                const nickname = playerSlot.split(':')[1].trim();
                                // Search for this nickname in our mappings
                                for (const [key, species] of nicknameToSpecies.entries()) {
                                    if (key.includes(nickname)) {
                                        pokemon = species;
                                        break;
                                    }
                                }

                                // If still not found, use the nickname as-is (will get cleaned later)
                                if (!pokemon) {
                                    pokemon = nickname;
                                    console.warn(`Could not map nickname "${nickname}" to species, using nickname`);
                                }
                            } else {
                                // No colon, assume it's already the species name
                                pokemon = playerSlot.substring(3); // Remove "p1a" prefix
                            }

                            if (teraEvents[player] && pokemon) {
                                teraEvents[player].push({
                                    pokemon: pokemon, // This will now be the actual species name
                                    type: teraType.toLowerCase()
                                });
                                console.log(`Fixed Tera event: ${player} - ${pokemon} (was ${playerSlot}) → ${teraType}`);
                            }
                        }
                    }
                }

                // Extract ELO changes from raw messages
                if (line.startsWith('|raw|') && line.includes('rating:')) {

                    // Parse lines like: "|raw|doctor_mug's rating: 1355 &rarr; <strong>1336</strong><br />(-19 for losing)"
                    // Skip the |raw| prefix and capture the player name
                    const ratingMatch = line.match(/\|raw\|(.+?)'s rating: (\d+) (?:&rarr;|→|&gt;) <strong>(\d+)<\/strong>/);
                    if (ratingMatch) {
                        const playerName = ratingMatch[1].trim();
                        const beforeRating = parseInt(ratingMatch[2]);
                        const afterRating = parseInt(ratingMatch[3]);


                        // Find which player this is (case-insensitive comparison)
                        const playerId = Object.keys(players).find(id =>
                            players[id].toLowerCase() === playerName.toLowerCase()
                        );

                        if (playerId) {
                            eloChanges[playerId] = {
                                before: beforeRating,
                                after: afterRating,
                                change: afterRating - beforeRating
                            };
                        } else {
                            console.log(`Could not find player ID for "${playerName}". Available players:`, players);
                            console.log(`Player names: ${Object.values(players).map(name => `"${name}"`).join(', ')}`);
                        }
                    }
                }

                // Extract winner
                if (line.startsWith('|win|')) {
                    winner = line.split('|')[2];
                    console.log(`Battle winner: "${winner}"`);
                }
            }

            // Apply transformations and convert to final arrays
            const applyTransformations = (pokemonSet) => {
                const result = [];
                for (const pokemon of pokemonSet) {
                    // Check if this Pokemon transformed
                    const finalForm = pokemonTransformations.get(pokemon) || pokemon;

                    // Only add if not already in result (avoid duplicates from transformations)
                    if (!result.includes(finalForm)) {
                        result.push(finalForm);
                    }
                }
                return result;
            };

            const finalPicks = {
                p1: applyTransformations(actualPicks.p1),
                p2: applyTransformations(actualPicks.p2)
            };

            // NEW: Convert move usage Maps to plain objects for serialization
            const finalMoveUsage = {
                p1: this.convertMoveUsageToObject(moveUsage.p1, pokemonTransformations),
                p2: this.convertMoveUsageToObject(moveUsage.p2, pokemonTransformations)
            };

            // Determine result and opponent based on our analysis
            let result = null;
            let opponent = null;

            if (winner && (players.p1 || players.p2)) {
                if (userPlayer && opponentPlayer) {
                    // We successfully identified which player is the user
                    opponent = players[opponentPlayer] || 'Unknown opponent';

                    // Compare winner name with our player name (case-insensitive)
                    const userPlayerName = players[userPlayer];
                    if (userPlayerName) {
                        const isUserWinner = winner.toLowerCase() === userPlayerName.toLowerCase();
                        result = isUserWinner ? 'win' : 'loss';

                    } else {
                        console.warn(`User player name not found for ${userPlayer}`);
                    }
                } else {
                    // Fallback: try to guess based on username patterns
                    const p1Name = (players.p1 || '').toLowerCase();
                    const p2Name = (players.p2 || '').toLowerCase();

                    if (teamShowdownUsernames.length > 0) {
                        let foundUserPlayer = null;

                        // Check if p1 matches any of our usernames
                        const p1Matches = p1Name && teamShowdownUsernames.some(username =>
                            p1Name.includes(username.toLowerCase()) ||
                            username.toLowerCase().includes(p1Name)
                        );

                        // Check if p2 matches any of our usernames
                        const p2Matches = p2Name && teamShowdownUsernames.some(username =>
                            p2Name.includes(username.toLowerCase()) ||
                            username.toLowerCase().includes(p2Name)
                        );

                        if (p1Matches && !p2Matches) {
                            foundUserPlayer = 'p1';
                            opponent = players.p2 || 'Unknown opponent';
                            result = winner.toLowerCase() === p1Name ? 'win' : 'loss';
                        } else if (p2Matches && !p1Matches) {
                            foundUserPlayer = 'p2';
                            opponent = players.p1 || 'Unknown opponent';
                            result = winner.toLowerCase() === p2Name ? 'win' : 'loss';
                        } else if (p1Matches && p2Matches) {
                            opponent = `${players.p1 || 'Player 1'} vs ${players.p2 || 'Player 2'}`;
                            result = null;
                        }

                        if (foundUserPlayer) {
                            userPlayer = foundUserPlayer;
                            opponentPlayer = foundUserPlayer === 'p1' ? 'p2' : 'p1';
                            console.log(`Fallback found: userPlayer=${userPlayer}, opponent=${opponent}, result=${result}`);
                        }
                    }

                    // If still no match, use winner comparison if we have player data
                    if (!result && winner) {
                        if (players.p1 && winner.toLowerCase() === players.p1.toLowerCase()) {
                            // P1 won, determine if that's us
                            if (teamShowdownUsernames.some(username =>
                                username.toLowerCase() === players.p1.toLowerCase())) {
                                result = 'win';
                                opponent = players.p2 || 'Unknown opponent';
                            } else {
                                result = 'loss';
                                opponent = players.p1;
                            }
                        } else if (players.p2 && winner.toLowerCase() === players.p2.toLowerCase()) {
                            // P2 won, determine if that's us
                            if (teamShowdownUsernames.some(username =>
                                username.toLowerCase() === players.p2.toLowerCase())) {
                                result = 'win';
                                opponent = players.p1 || 'Unknown opponent';
                            } else {
                                result = 'loss';
                                opponent = players.p2;
                            }
                        }

                        if (result) {
                        }
                    }

                    // Final fallback
                    if (!result && !opponent) {
                        opponent = `${players.p1 || 'Player 1'} vs ${players.p2 || 'Player 2'}`;
                        result = null;
                        console.log('No match found, setting unknown result');
                    }
                }
            } else {
                console.log('Missing data for result determination:', {
                    winner,
                    p1: players.p1,
                    p2: players.p2,
                    hasWinner: !!winner,
                    hasPlayers: !!(players.p1 || players.p2)
                });
            }

            return {
                players,
                teams,
                winner,
                result,
                opponent,
                userPlayer,
                opponentPlayer,
                teamShowdownUsernames,
                actualPicks: finalPicks,
                teraEvents,
                eloChanges,
                moveUsage: finalMoveUsage, // NEW: Include move usage data
                bestOf3: bestOf3Data,
                raw: replayData
            };
        } catch (error) {
            console.error('Error parsing replay data:', error);
            return {
                players: {},
                teams: { p1: [], p2: [] },
                winner: null,
                result: null,
                opponent: null,
                userPlayer: null,
                opponentPlayer: null,
                teamShowdownUsernames: [],
                actualPicks: { p1: [], p2: [] },
                teraEvents: { p1: [], p2: [] },
                eloChanges: { p1: null, p2: null },
                moveUsage: { p1: {}, p2: {} }, // NEW: Default empty move usage
                // Default Bo3 data for errors
                bestOf3: {
                    isBestOf3: false,
                    matchId: null,
                    gameNumber: null,
                    gameTitle: null,
                    matchUrl: null,
                    seriesScore: null
                },
                raw: replayData
            };
        }
    }

    /**
     * NEW: Convert move usage Maps to plain objects for JSON serialization
     * Also handles Pokemon form normalization using existing utility
     */
    static convertMoveUsageToObject(playerMoveUsage, pokemonTransformations) {
        const result = {};

        for (const [pokemon, movesMap] of playerMoveUsage.entries()) {
            // Use the existing cleanPokemonName utility for normalization
            let normalizedPokemon = cleanPokemonName(pokemon);

            // Check if this Pokemon is a transformation of another
            const originalForm = pokemonTransformations.get(pokemon);
            if (originalForm) {
                normalizedPokemon = cleanPokemonName(originalForm);
            }

            // Initialize the normalized Pokemon's moves if it doesn't exist
            if (!result[normalizedPokemon]) {
                result[normalizedPokemon] = {};
            }

            // Add moves to the normalized Pokemon
            for (const [move, count] of movesMap.entries()) {
                const currentCount = result[normalizedPokemon][move] || 0;
                result[normalizedPokemon][move] = currentCount + count;
            }
        }

        return result;
    }

    /**
     * NEW: Get move usage statistics for a team
     * @param {string} teamId - Team ID
     * @returns {Promise<Object>} Move usage statistics per Pokemon
     */
    static async getMoveUsageStats(teamId) {
        try {
            const replays = await this.getByTeamId(teamId);
            const moveStats = {};

            for (const replay of replays) {
                if (!replay.battleData || !replay.battleData.moveUsage || !replay.battleData.userPlayer) {
                    continue;
                }

                const userMoveUsage = replay.battleData.moveUsage[replay.battleData.userPlayer];
                if (!userMoveUsage) continue;

                // Aggregate move usage across all replays
                for (const [pokemon, moves] of Object.entries(userMoveUsage)) {
                    if (!moveStats[pokemon]) {
                        moveStats[pokemon] = {};
                    }

                    for (const [move, count] of Object.entries(moves)) {
                        const currentCount = moveStats[pokemon][move] || 0;
                        moveStats[pokemon][move] = currentCount + count;
                    }
                }
            }

            return moveStats;
        } catch (error) {
            console.error('Error getting move usage stats:', error);
            return {};
        }
    }

    // ... rest of the existing methods remain the same ...

    /**
     * Batch create replays from multiple URLs
     */
    static async createManyFromUrls(teamId, replayUrls, progressCallback = null) {
        const results = [];
        const errors = [];

        for (let i = 0; i < replayUrls.length; i++) {
            const url = replayUrls[i].trim();
            if (!url) continue;

            try {
                const replay = await this.createFromUrl(teamId, url);
                results.push(replay);
            } catch (error) {
                errors.push({ url, error: error.message });
            }

            // Call progress callback if provided
            if (progressCallback) {
                progressCallback(i + 1, replayUrls.length, results.length, errors.length);
            }

            // Small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        return { results, errors };
    }

    /**
     * Re-process an existing replay (useful if parsing logic improves)
     */
    static async reprocessReplay(id) {
        const replay = await this.getById(id);
        if (!replay) {
            return null;
        }

        try {
            const battleData = await this.fetchAndParseReplay(replay.url);
            return await this.update(id, {
                battleData,
                result: battleData.result,
                opponent: battleData.opponent
            });
        } catch (error) {
            console.error('Error reprocessing replay:', error);
            throw error;
        }
    }

    /**
     * Get replays that are part of Best-of-3 matches
     */
    static async getBestOf3Replays(teamId) {
        const replays = await this.getByTeamId(teamId);
        return replays.filter(replay =>
            replay.battleData?.bestOf3?.isBestOf3
        );
    }

    /**
     * Group Best-of-3 replays by match ID
     */
    static async getBestOf3Matches(teamId) {
        const bo3Replays = await this.getBestOf3Replays(teamId);
        const matches = new Map();

        for (const replay of bo3Replays) {
            const matchId = replay.battleData.bestOf3.matchId;
            if (!matchId) continue;

            if (!matches.has(matchId)) {
                matches.set(matchId, {
                    matchId,
                    opponent: replay.opponent,
                    games: [],
                    completedAt: null,
                    isComplete: false,
                    seriesScore: null,
                    matchUrl: replay.battleData.bestOf3.matchUrl,
                    gameResults: [], // Array of individual game results
                    matchResult: null // Overall match result ('win', 'loss', 'incomplete')
                });
            }

            matches.get(matchId).games.push(replay);
        }

        // Sort games within each match and determine completion status
        for (const [matchId, match] of matches) {
            // Sort games by game number
            match.games.sort((a, b) => {
                const gameA = a.battleData.bestOf3.gameNumber || 0;
                const gameB = b.battleData.bestOf3.gameNumber || 0;
                return gameA - gameB;
            });

            // Build game-by-game results array
            match.gameResults = match.games.map(game => ({
                gameNumber: game.battleData.bestOf3.gameNumber,
                result: game.result, // 'win', 'loss', or null
                replayId: game.id,
                replayUrl: game.url,
                seriesScoreAfter: game.battleData.bestOf3.seriesScore
            }));

            // Determine if match is complete and get final series score
            const gameCount = match.games.length;
            const wins = match.games.filter(game => game.result === 'win').length;
            const losses = match.games.filter(game => game.result === 'loss').length;
            const unknownResults = match.games.filter(game => !game.result).length;

            // Match is complete if:
            // 1. Someone has won 2+ games (normal completion)
            // 2. We have 3 games total (went the distance)
            // 3. Premature ending: fewer than 3 games but someone is clearly ahead
            const normalCompletion = wins >= 2 || losses >= 2 || gameCount >= 3;
            const prematureEnding = gameCount < 3 && gameCount > 0 && (wins > losses || losses > wins);

            match.isComplete = normalCompletion || prematureEnding;
            match.seriesScore = `${wins}-${losses}`;

            // Determine overall match result
            if (match.isComplete) {
                if (wins > losses) {
                    match.matchResult = 'win';
                } else if (losses > wins) {
                    match.matchResult = 'loss';
                } else {
                    // Tied score - should be rare but handle gracefully
                    if (gameCount >= 3) {
                        match.matchResult = 'draw'; // Shouldn't happen in Bo3, but just in case
                    } else {
                        match.matchResult = 'incomplete'; // Still tied, need more games
                    }
                }
            } else {
                match.matchResult = 'incomplete';
            }

            // Add completion reason for debugging/display
            if (match.isComplete) {
                if (wins >= 2 || losses >= 2) {
                    match.completionReason = 'normal'; // Someone reached 2 wins
                } else if (gameCount >= 3) {
                    match.completionReason = 'full_series'; // Went all 3 games
                } else if (prematureEnding) {
                    match.completionReason = 'forfeit'; // Premature ending with clear leader
                }
            }

            // Use the most recent game's timestamp as match completion time
            match.completedAt = match.games[match.games.length - 1]?.createdAt;
        }

        // Convert to array and sort by completion time (most recent first)
        return Array.from(matches.values()).sort((a, b) =>
            new Date(b.completedAt) - new Date(a.completedAt)
        );
    }

    /**
     * Get detailed game results for a specific match
     */
    static getGameByGameResults(match) {
        if (!match || !match.gameResults) return [];

        return match.gameResults.map(game => ({
            ...game,
            displayResult: game.result ? (game.result === 'win' ? 'W' : 'L') : '?',
            resultClass: game.result === 'win' ? 'text-green-400' :
                game.result === 'loss' ? 'text-red-400' : 'text-gray-400'
        }));
    }

    /**
     * Get match summary string (e.g., "Won 2-1", "Lost 0-2", "Won 1-0 (FF)")
     */
    static getMatchSummary(match) {
        if (!match) return 'Unknown';

        const status = match.matchResult === 'win' ? 'Won' :
            match.matchResult === 'loss' ? 'Lost' :
                match.matchResult === 'incomplete' ? 'Incomplete' : 'Unknown';

        let suffix = '';

        // Add forfeit indicator for premature endings
        if (match.isComplete && match.completionReason === 'forfeit') {
            suffix = ' (FF)'; // FF = Forfeit
        }

        return `${status} ${match.seriesScore}${suffix}`;
    }
}

export default ReplaysService;