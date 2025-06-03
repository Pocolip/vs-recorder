// src/components/UsageStatsTab.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { BarChart3, TrendingUp, Users, Star, Trophy, Zap } from 'lucide-react';
import { PokemonSprite } from './index';
import PokepasteService from '../services/PokepasteService';
import { cleanPokemonName } from '../utils/pokemonNameUtils';

const UsageStatsTab = ({ replays, team }) => {
    const [teamPokemon, setTeamPokemon] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Load team Pokemon from Pokepaste
    useEffect(() => {
        loadTeamPokemon();
    }, [team.pokepaste]);

    const loadTeamPokemon = async () => {
        try {
            setLoading(true);
            setError(null);

            if (team.pokepaste) {
                const parsed = await PokepasteService.fetchAndParse(team.pokepaste);
                const pokemonNames = parsed.pokemon
                    .map(p => normalizePokemonName(p.name))
                    .filter(name => name);
                setTeamPokemon(pokemonNames);
            } else {
                // Fallback to common VGC Pokemon if no Pokepaste
                setTeamPokemon(['miraidon', 'koraidon', 'calyrex-shadow', 'kyogre', 'incineroar', 'rillaboom']);
            }
        } catch (err) {
            console.error('Error loading team Pokemon:', err);
            setError(err.message);
            // Fallback on error
            setTeamPokemon(['miraidon', 'koraidon', 'calyrex-shadow', 'kyogre', 'incineroar', 'rillaboom']);
        } finally {
            setLoading(false);
        }
    };

    // Utility function to normalize Pokemon names (special cases like Terapagos)
    const normalizePokemonName = (pokemonName) => {
        const cleaned = cleanPokemonName(pokemonName);

        // Terapagos rule: All forms should be treated as the same Pokemon
        if (cleaned.startsWith('terapagos')) {
            return 'terapagos';
        }

        return cleaned;
    };

    // Utility function to extract leads from replay
    const getLeadsFromReplay = (replay) => {
        // Check if we have the necessary data structure
        if (!replay.battleData?.userPlayer) {
            return [];
        }

        if (!replay.battleData?.actualPicks) {
            return [];
        }

        const userPicks = replay.battleData.actualPicks[replay.battleData.userPlayer];
        if (!Array.isArray(userPicks) || userPicks.length < 2) {
            return [];
        }

        // Return first 2 Pokemon as leads (normalized names)
        return userPicks.slice(0, 2).map(pokemon => normalizePokemonName(pokemon));
    };

    // Utility function to get Tera Pokemon from replay
    const getTeraFromReplay = (replay) => {
        // Check if we have the necessary data structure
        if (!replay.battleData?.userPlayer) {
            return null;
        }

        if (!replay.battleData?.teraEvents) {
            return null;
        }

        const userTeraEvents = replay.battleData.teraEvents[replay.battleData.userPlayer];
        if (!Array.isArray(userTeraEvents) || userTeraEvents.length === 0) {
            return null;
        }

        // Return the first (and should be only) Tera event (normalized name)
        return normalizePokemonName(userTeraEvents[0].pokemon);
    };

    // Memoized statistics calculations
    const usageStats = useMemo(() => {
        if (!replays || replays.length === 0 || teamPokemon.length === 0) {
            return {
                individualStats: [],
                leadPairStats: [],
                bestLeadStats: []
            };
        }

        // Filter replays with actual battle data
        const validReplays = replays.filter(replay =>
            replay.battleData &&
            replay.result &&
            ['win', 'loss'].includes(replay.result)
        );

        if (validReplays.length === 0) {
            return {
                individualStats: [],
                leadPairStats: [],
                bestLeadStats: []
            };
        }

        // Calculate individual Pokemon stats
        const individualStats = teamPokemon.map(pokemon => {
            // Overall usage and wins
            const gamesWithPokemon = validReplays.filter(replay => {
                const picks = replay.battleData.actualPicks?.[replay.battleData.userPlayer] || [];
                return picks.some(pick => normalizePokemonName(pick) === pokemon);
            });

            const winsWithPokemon = gamesWithPokemon.filter(replay => replay.result === 'win');
            const overallWinRate = gamesWithPokemon.length > 0
                ? Math.round((winsWithPokemon.length / gamesWithPokemon.length) * 100)
                : 0;

            // Lead win rate (when this Pokemon was in the lead pair)
            const gamesAsLead = validReplays.filter(replay => {
                const leads = getLeadsFromReplay(replay);
                return leads.includes(pokemon);
            });

            const winsAsLead = gamesAsLead.filter(replay => replay.result === 'win');
            const leadWinRate = gamesAsLead.length > 0
                ? Math.round((winsAsLead.length / gamesAsLead.length) * 100)
                : 0;

            // Tera win rate (when this Pokemon Terastallized)
            const gamesWithTera = validReplays.filter(replay => {
                const teraPokemon = getTeraFromReplay(replay);
                return teraPokemon === pokemon;
            });

            const winsWithTera = gamesWithTera.filter(replay => replay.result === 'win');
            const teraWinRate = gamesWithTera.length > 0
                ? Math.round((winsWithTera.length / gamesWithTera.length) * 100)
                : null; // null if never Terastallized

            return {
                pokemon,
                usage: gamesWithPokemon.length,
                usageRate: Math.round((gamesWithPokemon.length / validReplays.length) * 100),
                overallWinRate,
                leadUsage: gamesAsLead.length,
                leadWinRate,
                teraUsage: gamesWithTera.length,
                teraWinRate
            };
        });

        // Calculate lead pair statistics (most common leads)
        const leadPairCounts = new Map();
        const leadPairWins = new Map();

        validReplays.forEach(replay => {
            const leads = getLeadsFromReplay(replay);
            if (leads.length === 2) {
                // Sort leads to ensure consistent pairing (A+B = B+A)
                const pairKey = [...leads].sort().join(' + ');

                leadPairCounts.set(pairKey, (leadPairCounts.get(pairKey) || 0) + 1);

                if (replay.result === 'win') {
                    leadPairWins.set(pairKey, (leadPairWins.get(pairKey) || 0) + 1);
                }
            }
        });

        // Convert to array and calculate win rates for lead pairs
        const leadPairStats = Array.from(leadPairCounts.entries())
            .map(([pair, count]) => {
                const wins = leadPairWins.get(pair) || 0;
                const winRate = Math.round((wins / count) * 100);
                const [pokemon1, pokemon2] = pair.split(' + ');

                return {
                    pair,
                    pokemon1,
                    pokemon2,
                    usage: count,
                    wins,
                    winRate,
                    usageRate: Math.round((count / validReplays.length) * 100)
                };
            })
            .sort((a, b) => b.usage - a.usage) // Sort by most commonly used
            .slice(0, 6); // Top 6

        // Calculate best lead pairs (highest win rate)
        const bestLeadStats = Array.from(leadPairCounts.entries())
            .map(([pair, count]) => {
                const wins = leadPairWins.get(pair) || 0;
                const winRate = Math.round((wins / count) * 100);
                const [pokemon1, pokemon2] = pair.split(' + ');

                return {
                    pair,
                    pokemon1,
                    pokemon2,
                    usage: count,
                    wins,
                    winRate,
                    usageRate: Math.round((count / validReplays.length) * 100)
                };
            })
            .sort((a, b) => {
                // Sort by win rate, then by usage as tiebreaker
                if (b.winRate === a.winRate) {
                    return b.usage - a.usage;
                }
                return b.winRate - a.winRate;
            })
            .slice(0, 6); // Top 6

        return {
            individualStats,
            leadPairStats,
            bestLeadStats
        };
    }, [replays, teamPokemon]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="text-red-400 mb-4">Error loading team data: {error}</div>
                <button
                    onClick={loadTeamPokemon}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (replays.length === 0) {
        return (
            <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No usage data available</h3>
                <p className="text-gray-400">Add replays to see detailed Pokemon usage statistics</p>
            </div>
        );
    }

    const { individualStats, leadPairStats, bestLeadStats } = usageStats;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-100">Usage Statistics</h3>
                <div className="text-sm text-gray-400">
                    Based on {replays.filter(r => r.result && ['win', 'loss'].includes(r.result)).length} games
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Individual Pokemon Stats */}
                <div className="lg:col-span-2">
                    <div className="bg-slate-700/50 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Team Pokemon Performance
                        </h4>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                <tr className="border-b border-slate-600">
                                    <th className="text-left py-3 px-2 text-gray-300 font-medium">Pokemon</th>
                                    <th className="text-center py-3 px-2 text-gray-300 font-medium">Usage</th>
                                    <th className="text-center py-3 px-2 text-gray-300 font-medium">Win %</th>
                                    <th className="text-center py-3 px-2 text-gray-300 font-medium">Lead Usage</th>
                                    <th className="text-center py-3 px-2 text-gray-300 font-medium">Lead Win %</th>
                                    <th className="text-center py-3 px-2 text-gray-300 font-medium">Tera Usage</th>
                                    <th className="text-center py-3 px-2 text-gray-300 font-medium">Tera Win %</th>
                                </tr>
                                </thead>
                                <tbody>
                                {individualStats.map((stat, index) => (
                                    <tr key={stat.pokemon} className="border-b border-slate-700/50">
                                        <td className="py-3 px-2">
                                            <div className="flex items-center gap-3">
                                                <PokemonSprite
                                                    name={stat.pokemon}
                                                    size="sm"
                                                    fallbackText={(index + 1).toString()}
                                                />
                                                <span className="text-gray-100 capitalize">
                                                        {stat.pokemon.replace('-', ' ')}
                                                    </span>
                                            </div>
                                        </td>
                                        <td className="text-center py-3 px-2">
                                            <div className="text-gray-100">{stat.usage}</div>
                                            <div className="text-xs text-gray-400">({stat.usageRate}%)</div>
                                        </td>
                                        <td className="text-center py-3 px-2">
                                                <span className={`font-semibold ${
                                                    stat.overallWinRate >= 60 ? 'text-green-400' :
                                                        stat.overallWinRate >= 40 ? 'text-yellow-400' : 'text-red-400'
                                                }`}>
                                                    {stat.usage > 0 ? `${stat.overallWinRate}%` : '—'}
                                                </span>
                                        </td>
                                        <td className="text-center py-3 px-2">
                                            <div className="text-gray-100">{stat.leadUsage}</div>
                                        </td>
                                        <td className="text-center py-3 px-2">
                                                <span className={`font-semibold ${
                                                    stat.leadWinRate >= 60 ? 'text-green-400' :
                                                        stat.leadWinRate >= 40 ? 'text-yellow-400' : 'text-red-400'
                                                }`}>
                                                    {stat.leadUsage > 0 ? `${stat.leadWinRate}%` : '—'}
                                                </span>
                                        </td>
                                        <td className="text-center py-3 px-2">
                                            <div className="text-gray-100">{stat.teraUsage}</div>
                                        </td>
                                        <td className="text-center py-3 px-2">
                                            {stat.teraWinRate !== null ? (
                                                <span className={`font-semibold ${
                                                    stat.teraWinRate >= 60 ? 'text-green-400' :
                                                        stat.teraWinRate >= 40 ? 'text-yellow-400' : 'text-red-400'
                                                }`}>
                                                        {stat.teraWinRate}%
                                                    </span>
                                            ) : (
                                                <span className="text-gray-500">—</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Most Common Leads */}
                <div>
                    <div className="bg-slate-700/50 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Most Common Leads
                        </h4>

                        {leadPairStats.length > 0 ? (
                            <div className="space-y-3">
                                {leadPairStats.map((stat, index) => (
                                    <div key={stat.pair} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className="text-gray-400 text-sm w-4">#{index + 1}</span>
                                            <div className="flex items-center gap-2">
                                                <PokemonSprite name={stat.pokemon1} size="sm" />
                                                <span className="text-gray-400">+</span>
                                                <PokemonSprite name={stat.pokemon2} size="sm" />
                                            </div>
                                            <div>
                                                <div className="text-gray-100 text-sm font-medium">
                                                    {stat.pokemon1.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} + {stat.pokemon2.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {stat.usage} games ({stat.usageRate}%)
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-semibold ${
                                                stat.winRate >= 60 ? 'text-green-400' :
                                                    stat.winRate >= 40 ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                                {stat.winRate}%
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {stat.wins}W-{stat.usage - stat.wins}L
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                No lead data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Best Leads */}
                <div>
                    <div className="bg-slate-700/50 rounded-lg p-6">
                        <h4 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
                            <Star className="h-5 w-5" />
                            Best Leads (Win %)
                        </h4>

                        {bestLeadStats.length > 0 ? (
                            <div className="space-y-3">
                                {bestLeadStats.map((stat, index) => (
                                    <div key={stat.pair} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <span className="text-yellow-400 text-sm w-4">#{index + 1}</span>
                                            <div className="flex items-center gap-2">
                                                <PokemonSprite name={stat.pokemon1} size="sm" />
                                                <span className="text-gray-400">+</span>
                                                <PokemonSprite name={stat.pokemon2} size="sm" />
                                            </div>
                                            <div>
                                                <div className="text-gray-100 text-sm font-medium">
                                                    {stat.pokemon1.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')} + {stat.pokemon2.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {stat.usage} games
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-semibold ${
                                                stat.winRate >= 60 ? 'text-green-400' :
                                                    stat.winRate >= 40 ? 'text-yellow-400' : 'text-red-400'
                                            }`}>
                                                {stat.winRate}%
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {stat.wins}W-{stat.usage - stat.wins}L
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400">
                                No lead data available
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UsageStatsTab;