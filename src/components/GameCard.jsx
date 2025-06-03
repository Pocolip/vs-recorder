// src/components/GameCard.jsx
import React from 'react';
import { ExternalLink } from 'lucide-react';
import PokemonSprite from './PokemonSprite';
import {formatTimeAgo} from "@/utils/timeUtils";
import {cleanPokemonName} from "@/utils/pokemonNameUtils";
import {getResultDisplay} from "@/utils/resultUtils";

const GameCard = ({ replay }) => {
    // Type icon component for cleaner rendering
    const TypeIcon = ({ type, size = 'w-4 h-4' }) => {
        if (!type) return <span className="text-gray-500">?</span>;

        return (
            <img
                src={`/icons/types/${type}.png`} // Updated to PNG
                alt={type}
                className={`${size} flex-shrink-0`}
                onError={(e) => {
                    // Fallback to emoji if icon fails to load
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'inline';
                }}
            />
        );
    };

    // Keep emoji fallbacks
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
            //console.log('No ELO data found in battleData:', replay.battleData);
            return {
                userElo: { before: null, after: null },
                opponentElo: { before: null, after: null }
            };
        }

        const { eloChanges, userPlayer, opponentPlayer } = replay.battleData;
        //console.log('ELO data found:', { eloChanges, userPlayer, opponentPlayer });

        const userElo = eloChanges[userPlayer] || { before: null, after: null };
        const opponentElo = eloChanges[opponentPlayer] || { before: null, after: null };

        return {
            userElo,
            opponentElo
        };
    };

    const resultDisplay = getResultDisplay(replay.result);
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
                                <div className="flex items-center justify-center rounded-lg border-2 border-slate-600 bg-slate-700 p-1 gap-1">
                                    <PokemonSprite
                                        name={cleanPokemonName(teraData.userTera.pokemon)}
                                        size="sm"
                                        fallbackText="?"
                                        noContainer={true}
                                    />
                                    <TypeIcon type={teraData.userTera.type} size="w-4 h-4" />
                                    <span
                                        className="text-sm hidden"
                                        title={`${teraData.userTera.pokemon} → ${teraData.userTera.type}`}
                                    >
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
                                <div className="flex items-center justify-center rounded-lg border-2 border-slate-600 bg-slate-700 p-1 gap-1">
                                    <PokemonSprite
                                        name={cleanPokemonName(teraData.opponentTera.pokemon)}
                                        size="sm"
                                        fallbackText="?"
                                        noContainer={true}
                                    />
                                    <TypeIcon type={teraData.opponentTera.type} size="w-4 h-4" />
                                    <span
                                        className="text-sm hidden"
                                        title={`${teraData.opponentTera.pokemon} → ${teraData.opponentTera.type}`}
                                    >
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