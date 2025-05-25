// src/services/ReplayService.js
import StorageService from './StorageService.js';

class ReplayService {
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
     * Create replay from Showdown URL (fetches and parses automatically)
     */
    static async createFromUrl(teamId, replayUrl, notes = '') {
        try {
            // Check if URL already exists
            if (await this.existsByUrl(replayUrl)) {
                throw new Error('Replay already exists');
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
            let userPlayer = null; // Which player (p1/p2) is the user
            let opponentPlayer = null;

            // Parse the log for battle information
            for (const line of lines) {
                // Extract player information
                if (line.startsWith('|player|')) {
                    const parts = line.split('|');
                    const playerId = parts[2]; // p1 or p2
                    const playerName = parts[3];
                    players[playerId] = playerName;

                    // Check if this player is one of our usernames (case-insensitive exact match)
                    if (teamShowdownUsernames.length > 0 &&
                        teamShowdownUsernames.some(username =>
                            username.toLowerCase() === playerName.toLowerCase()
                        )) {
                        userPlayer = playerId;
                        opponentPlayer = playerId === 'p1' ? 'p2' : 'p1';
                        console.log(`Found user player: ${playerId} (${playerName})`);
                    }
                }

                // Extract team information (pokemon reveals)
                if (line.startsWith('|poke|')) {
                    const parts = line.split('|');
                    const player = parts[2];
                    const pokemon = parts[3].split(',')[0]; // Remove level/gender info
                    teams[player].push(pokemon);
                }

                // Extract winner
                if (line.startsWith('|win|')) {
                    winner = line.split('|')[2];
                    console.log(`Battle winner: "${winner}"`);
                }
            }

            // Determine result and opponent based on our analysis
            let result = null;
            let opponent = null;

            console.log('Player analysis:', {
                players,
                winner,
                userPlayer,
                opponentPlayer,
                teamShowdownUsernames
            });

            if (winner && players.p1 && players.p2) {
                if (userPlayer && opponentPlayer) {
                    // We successfully identified which player is the user
                    opponent = players[opponentPlayer];

                    // Compare winner name with our player name (case-insensitive)
                    const userPlayerName = players[userPlayer];
                    const isUserWinner = winner.toLowerCase() === userPlayerName.toLowerCase();
                    result = isUserWinner ? 'win' : 'loss';

                    console.log(`Result determination: userPlayer=${userPlayer} (${userPlayerName}), winner="${winner}", result=${result}`);
                } else {
                    // Fallback: try to guess based on username patterns
                    const p1Name = players.p1.toLowerCase();
                    const p2Name = players.p2.toLowerCase();

                    console.log('Fallback matching:', { p1Name, p2Name, teamShowdownUsernames });

                    // If we have team usernames, try partial matching
                    if (teamShowdownUsernames.length > 0) {
                        let foundUserPlayer = null;

                        // Check if p1 matches any of our usernames
                        const p1Matches = teamShowdownUsernames.some(username =>
                            p1Name.includes(username.toLowerCase()) ||
                            username.toLowerCase().includes(p1Name)
                        );

                        // Check if p2 matches any of our usernames
                        const p2Matches = teamShowdownUsernames.some(username =>
                            p2Name.includes(username.toLowerCase()) ||
                            username.toLowerCase().includes(p2Name)
                        );

                        if (p1Matches && !p2Matches) {
                            foundUserPlayer = 'p1';
                            opponent = players.p2;
                            result = winner.toLowerCase() === players.p1.toLowerCase() ? 'win' : 'loss';
                        } else if (p2Matches && !p1Matches) {
                            foundUserPlayer = 'p2';
                            opponent = players.p1;
                            result = winner.toLowerCase() === players.p2.toLowerCase() ? 'win' : 'loss';
                        } else if (p1Matches && p2Matches) {
                            // Both players match our usernames - this shouldn't happen normally
                            opponent = `${players.p1} vs ${players.p2}`;
                            result = null;
                        }

                        if (foundUserPlayer) {
                            userPlayer = foundUserPlayer;
                            opponentPlayer = foundUserPlayer === 'p1' ? 'p2' : 'p1';
                            console.log(`Fallback found: userPlayer=${userPlayer}, opponent=${opponent}, result=${result}`);
                        }
                    }

                    // If still no match, leave result as null (unknown)
                    if (!result && !opponent) {
                        opponent = `${players.p1} vs ${players.p2}`;
                        result = null; // Unknown who won from our perspective
                        console.log('No match found, setting unknown result');
                    }
                }
            } else {
                console.log('Missing data for result determination:', { winner, p1: players.p1, p2: players.p2 });
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
                raw: replayData
            };
        }
    }

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
}

export default ReplayService;