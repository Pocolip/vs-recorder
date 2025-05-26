// src/components/GameCard.jsx
import React from 'react';
import { ExternalLink } from 'lucide-react';
import PokemonSprite from './PokemonSprite';

const GameCard = ({ replay, formatTimeAgo }) => {
    // Type emoji mapping for Terastallization
    const typeEmojis = {
        normal: '⚪',
        fire: '🔥',
        water: '💧',
        electric: '⚡',
        grass: '🌿',
        ice: '❄️',
        fighting: '👊',
        poison: '☠️',
        ground: '🌍',
        flying: '🌤️',
        psychic: '🔮',
        bug: '🐛',
        rock: '🗿',
        ghost: '👻',
        dragon: '🐉',
        dark: '🌑',
        steel: '⚙️',
        fairy: '🧚',
        stellar: '⭐'
    };

    const getResultDisplay = () => {
        if (!replay.result) {
            return {
                text: 'UNKNOWN',
                className: 'bg-gray-600/20 text-gray-400 border border-gray-600/30'
            };
        }

        return replay.result === 'win'
            ? {
                text: 'WIN',
                className: 'bg-green-600/20 text-green-400 border border-green-600/30'
            }
            : {
                text: 'LOSS',
                className: 'bg-red-600/20 text-red-400 border border-red-600/30'
            };
    };

    const getOpponentDisplay = () => {
        if (!replay.opponent) {
            return 'Unknown opponent';
        }

        if (replay.opponent.includes(' vs ')) {
            return replay.opponent;
        }

        return replay.opponent;
    };

    // Extract team data from battleData
    const getTeamData = () => {
        if (!replay.battleData || !replay.battleData.teams) {
            return {
                userTeam: [],
                opponentTeam: [],
                userPicks: [],
                opponentPicks: []
            };
        }

        const { teams, userPlayer, opponentPlayer, actualPicks } = replay.battleData;

        const userTeam = teams[userPlayer] || [];
        const opponentTeam = teams[opponentPlayer] || [];

        // Use actual picks if available and not empty, otherwise show empty arrays
        const userPicks = actualPicks && actualPicks[userPlayer] && actualPicks[userPlayer].length > 0 ?
            actualPicks[userPlayer] :
            [];
        const opponentPicks = actualPicks && actualPicks[opponentPlayer] && actualPicks[opponentPlayer].length > 0 ?
            actualPicks[opponentPlayer] :
            [];

        return {
            userTeam: userTeam.slice(0, 6),
            opponentTeam: opponentTeam.slice(0, 6),
            userPicks,
            opponentPicks
        };
    };

    // Extract Terastallization data
    const getTeraData = () => {
        if (!replay.battleData || !replay.battleData.teraEvents) {
            return {
                userTera: null,
                opponentTera: null
            };
        }

        const { teraEvents, userPlayer, opponentPlayer } = replay.battleData;

        // Get the first (or most recent) tera event for each player
        const userTera = teraEvents[userPlayer] && teraEvents[userPlayer].length > 0 ?
            teraEvents[userPlayer][0] : null;
        const opponentTera = teraEvents[opponentPlayer] && teraEvents[opponentPlayer].length > 0 ?
            teraEvents[opponentPlayer][0] : null;

        return {
            userTera,
            opponentTera
        };
    };

    // Extract ELO data
    const getEloData = () => {
        if (!replay.battleData || !replay.battleData.eloChanges) {
            console.log('No ELO data found in battleData:', replay.battleData);
            return {
                userElo: { before: null, after: null },
                opponentElo: { before: null, after: null }
            };
        }

        const { eloChanges, userPlayer, opponentPlayer } = replay.battleData;
        console.log('ELO data found:', { eloChanges, userPlayer, opponentPlayer });

        const userElo = eloChanges[userPlayer] || { before: null, after: null };
        const opponentElo = eloChanges[opponentPlayer] || { before: null, after: null };

        return {
            userElo,
            opponentElo
        };
    };

    // Clean Pokemon name for display
    const cleanPokemonName = (pokemonName) => {
        if (!pokemonName) return '';

        // Remove level, gender, and other metadata
        let cleanName = pokemonName.split(',')[0];

        // Handle special forms - comprehensive mapping from existing codebase
        const formMappings = {
            // Urshifu forms
            'Urshifu-*': 'urshifu', // Default to Single Strike form
            'Urshifu-Rapid-Strike': 'urshifu-rapid-strike',
            'Urshifu-Single-Strike': 'urshifu',

            // Calyrex forms
            'Calyrex-Shadow': 'calyrex-shadow',
            'Calyrex-Ice': 'calyrex-ice',

            // Kyurem forms
            'Kyurem-Black': 'kyurem-black',
            'Kyurem-White': 'kyurem-white',

            // Necrozma forms
            'Necrozma-Dawn-Wings': 'necrozma-dawn-wings',
            'Necrozma-Dusk-Mane': 'necrozma-dusk-mane',

            // Zacian/Zamazenta forms
            'Zacian-Crowned': 'zacian-crowned',
            'Zamazenta-Crowned': 'zamazenta-crowned',

            // Tornadus/Thundurus/Landorus forms
            'Tornadus-Therian': 'tornadus-therian',
            'Thundurus-Therian': 'thundurus-therian',
            'Landorus-Therian': 'landorus-therian',

            // Paradox Pokemon
            'Iron Hands': 'iron-hands',
            'Iron Bundle': 'iron-bundle',
            'Iron Valiant': 'iron-valiant',
            'Iron Crown': 'iron-crown',
            'Iron Boulder': 'iron-boulder',
            'Flutter Mane': 'flutter-mane',
            'Scream Tail': 'scream-tail',
            'Brute Bonnet': 'brute-bonnet',
            'Roaring Moon': 'roaring-moon',
            'Walking Wake': 'walking-wake',
            'Raging Bolt': 'raging-bolt',

            // Treasures of Ruin
            'Chien-Pao': 'chien-pao',
            'Wo-Chien': 'wo-chien',
            'Ting-Lu': 'ting-lu',
            'Chi-Yu': 'chi-yu',

            // Ogerpon forms - API uses -mask suffix
            'Ogerpon-Hearthflame': 'ogerpon-hearthflame-mask',
            'Ogerpon-Wellspring': 'ogerpon-wellspring-mask',
            'Ogerpon-Cornerstone': 'ogerpon-cornerstone-mask',
            'Ogerpon-Teal': 'ogerpon', // Base form

            // Indeedee forms
            'Indeedee-F': 'indeedee-female',
            'Indeedee-M': 'indeedee', // Male is default

            // Sinistcha forms - fallback to base since forms don't have different sprites
            'Sinistcha-Masterpiece': 'sinistcha',
            'Sinistcha-Counterfeit': 'sinistcha',

            // Poltchageist forms - fallback to base since forms don't have different sprites
            'Poltchageist-Artisan': 'poltchageist',
            'Poltchageist-Counterfeit': 'poltchageist',

            // Meowstic forms
            'Meowstic-F': 'meowstic-female',
            'Meowstic-M': 'meowstic', // Male is default

            // Basculegion forms
            'Basculegion-F': 'basculegion-female',
            'Basculegion-M': 'basculegion', // Male is default

            // Oinkologne forms
            'Oinkologne-F': 'oinkologne-female',
            'Oinkologne-M': 'oinkologne', // Male is default

            // Terapagos forms
            'Terapagos-Terastal': 'terapagos-terastal',
            'Terapagos-Stellar': 'terapagos-stellar',

            // Giratina forms
            'Giratina-Origin': 'giratina-origin',
            'Giratina-Altered': 'giratina',

            // Dialga/Palkia Origin forms
            'Dialga-Origin': 'dialga-origin',
            'Palkia-Origin': 'palkia-origin',

            // Rotom forms
            'Rotom-Heat': 'rotom-heat',
            'Rotom-Wash': 'rotom-wash',
            'Rotom-Frost': 'rotom-frost',
            'Rotom-Fan': 'rotom-fan',
            'Rotom-Mow': 'rotom-mow',

            // Gourgeist forms (use default size)
            'Gourgeist-Small': 'gourgeist',
            'Gourgeist-Large': 'gourgeist',
            'Gourgeist-Super': 'gourgeist',

            // Pumpkaboo forms (use default size)
            'Pumpkaboo-Small': 'pumpkaboo',
            'Pumpkaboo-Large': 'pumpkaboo',
            'Pumpkaboo-Super': 'pumpkaboo'
        };

        // Check if we have a specific mapping
        if (formMappings[cleanName]) {
            return formMappings[cleanName];
        }

        // Convert to API format
        return cleanName.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9\-]/g, '')
            .replace(/--+/g, '-')
            .replace(/^-|-$/g, '');
    };

    const resultDisplay = getResultDisplay();
    const teamData = getTeamData();
    const teraData = getTeraData();
    const eloData = getEloData();

    return (
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-lg p-4 mb-3">
            {/* Main row with all data */}
            <div className="grid grid-cols-12 gap-4 items-center">
                {/* Result + Opponent + Time + Replay Link (2 cols) */}
                <div className="col-span-2">
                    <div className="space-y-2">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${resultDisplay.className}`}>
                            {resultDisplay.text}
                        </span>
                        <div>
                            <p className="text-sm font-medium text-gray-200 truncate">
                                vs {getOpponentDisplay()}
                            </p>
                            <p className="text-xs text-gray-400 mb-2">{formatTimeAgo(replay.createdAt)}</p>
                            <a
                                href={replay.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded text-xs transition-colors"
                            >
                                <ExternalLink className="h-3 w-3" />
                                View Replay
                            </a>
                        </div>
                    </div>
                </div>

                {/* Opposing Team (3 cols) */}
                <div className="col-span-3">
                    <p className="text-xs text-gray-400 mb-1">Opposing Team</p>
                    <div className="bg-gray-100/20 border border-gray-300/30 rounded-lg p-2">
                        <div className="flex gap-1">
                            {teamData.opponentTeam.slice(0, 6).map((pokemon, index) => (
                                <PokemonSprite
                                    key={index}
                                    name={cleanPokemonName(pokemon)}
                                    size="md"
                                    fallbackText={(index + 1).toString()}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Your Picks (2 cols) */}
                <div className="col-span-2">
                    <p className="text-xs text-blue-400 mb-1">Your Picks</p>
                    <div className="bg-blue-200/25 border border-blue-400/40 rounded-lg p-2">
                        <div className="flex gap-1">
                            {/* Show actual picked Pokemon */}
                            {teamData.userPicks.map((pokemon, index) => (
                                <PokemonSprite
                                    key={index}
                                    name={cleanPokemonName(pokemon)}
                                    size="md"
                                    fallbackText={(index + 1).toString()}
                                />
                            ))}
                            {/* Fill remaining slots with placeholders */}
                            {Array.from({ length: Math.max(0, 4 - teamData.userPicks.length) }).map((_, index) => (
                                <div key={`empty-${index}`} className="w-12 h-12 bg-slate-700/50 border-2 border-slate-600 border-dashed rounded-lg flex items-center justify-center">
                                    <span className="text-gray-500 text-xs">—</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Their Picks (2 cols) */}
                <div className="col-span-2">
                    <p className="text-xs text-red-400 mb-1">Their Picks</p>
                    <div className="bg-red-200/25 border border-red-400/40 rounded-lg p-2">
                        <div className="flex gap-1">
                            {/* Show actual picked Pokemon */}
                            {teamData.opponentPicks.map((pokemon, index) => (
                                <PokemonSprite
                                    key={index}
                                    name={cleanPokemonName(pokemon)}
                                    size="md"
                                    fallbackText={(index + 1).toString()}
                                />
                            ))}
                            {/* Fill remaining slots with placeholders */}
                            {Array.from({ length: Math.max(0, 4 - teamData.opponentPicks.length) }).map((_, index) => (
                                <div key={`empty-${index}`} className="w-12 h-12 bg-slate-700/50 border-2 border-slate-600 border-dashed rounded-lg flex items-center justify-center">
                                    <span className="text-gray-500 text-xs">—</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Terastallization (1.5 cols) */}
                <div className="col-span-1">
                    <p className="text-xs text-gray-400 mb-1">Tera</p>
                    <div className="space-y-1">
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-blue-400 w-8">You:</span>
                            {teraData.userTera ? (
                                <div className="flex items-center gap-1">
                                    <PokemonSprite
                                        name={cleanPokemonName(teraData.userTera.pokemon)}
                                        size="sm"
                                        fallbackText="?"
                                    />
                                    <span className="text-lg" title={`${teraData.userTera.pokemon} → ${teraData.userTera.type}`}>
                                        {typeEmojis[teraData.userTera.type] || '❓'}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-xs text-gray-500">—</span>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-red-400 w-8">Opp:</span>
                            {teraData.opponentTera ? (
                                <div className="flex items-center gap-1">
                                    <PokemonSprite
                                        name={cleanPokemonName(teraData.opponentTera.pokemon)}
                                        size="sm"
                                        fallbackText="?"
                                    />
                                    <span className="text-lg" title={`${teraData.opponentTera.pokemon} → ${teraData.opponentTera.type}`}>
                                        {typeEmojis[teraData.opponentTera.type] || '❓'}
                                    </span>
                                </div>
                            ) : (
                                <span className="text-xs text-gray-500">—</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* ELO (2 cols) */}
                <div className="col-span-2">
                    <p className="text-xs text-gray-400 mb-1">ELO Changes</p>
                    <div className="space-y-1">
                        <div>
                            <span className="text-xs text-blue-400">You: </span>
                            {eloData.userElo.before && eloData.userElo.after ? (
                                <span className={`text-xs ${replay.result === 'win' ? 'text-green-400' : 'text-red-400'}`}>
                                    {eloData.userElo.before} → {eloData.userElo.after}
                                    <span className="ml-1">
                                        ({eloData.userElo.change > 0 ? '+' : ''}{eloData.userElo.change})
                                    </span>
                                </span>
                            ) : (
                                <span className="text-xs text-gray-500">Unknown</span>
                            )}
                        </div>
                        <div>
                            <span className="text-xs text-red-400">Opp: </span>
                            {eloData.opponentElo.before && eloData.opponentElo.after ? (
                                <span className={`text-xs ${replay.result === 'loss' ? 'text-green-400' : 'text-red-400'}`}>
                                    {eloData.opponentElo.before} → {eloData.opponentElo.after}
                                    <span className="ml-1">
                                        ({eloData.opponentElo.change > 0 ? '+' : ''}{eloData.opponentElo.change})
                                    </span>
                                </span>
                            ) : (
                                <span className="text-xs text-gray-500">Unknown</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Notes row (if present) */}
            {replay.notes && (
                <div className="mt-3 pt-3 border-t border-slate-600">
                    <p className="text-xs text-gray-400 mb-1">Notes:</p>
                    <p className="text-sm text-gray-300">{replay.notes}</p>
                </div>
            )}
        </div>
    );
};

export default GameCard;