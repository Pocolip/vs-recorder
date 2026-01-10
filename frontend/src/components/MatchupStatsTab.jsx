// src/components/MatchupStatsTab.jsx
import React, { useMemo, useState } from 'react';
import { Target, TrendingUp, TrendingDown, Users, UserCheck, Search, X } from 'lucide-react';
import { PokemonSprite } from './index';
import { cleanPokemonName } from '../utils/pokemonNameUtils';

const MatchupStatsTab = ({ replays }) => {
    // State for custom team analysis
    const [selectedPokemon, setSelectedPokemon] = useState(Array(6).fill(''));
    const [searchQuery, setSearchQuery] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSlot, setActiveSlot] = useState(null);

    // Utility function to normalize Pokemon names (same as UsageStatsTab)
    const normalizePokemonName = (pokemonName) => {
        const cleaned = cleanPokemonName(pokemonName);

        // Terapagos rule: All forms should be treated as the same Pokemon
        if (cleaned.startsWith('terapagos')) {
            return 'terapagos';
        }

        return cleaned;
    };

    // Get unique opponent Pokemon for autocomplete
    const uniqueOpponentPokemon = useMemo(() => {
        if (!replays || replays.length === 0) return [];

        const validReplays = replays.filter(replay =>
            replay.battleData &&
            replay.battleData.teams &&
            replay.battleData.opponentPlayer &&
            replay.battleData.teams[replay.battleData.opponentPlayer]
        );

        const pokemonSet = new Set();
        validReplays.forEach(replay => {
            const opponentTeam = replay.battleData.teams[replay.battleData.opponentPlayer] || [];
            opponentTeam.forEach(pokemon => {
                const normalized = normalizePokemonName(pokemon);
                if (normalized) pokemonSet.add(normalized);
            });
        });

        return Array.from(pokemonSet).sort();
    }, [replays]);

    // Memoized matchup statistics calculations
    const { matchupStats, allMatchupsMap } = useMemo(() => {
        if (!replays || replays.length === 0) {
            return {
                matchupStats: {
                    bestMatchups: [],
                    worstMatchups: [],
                    highestAttendance: [],
                    lowestAttendance: []
                },
                allMatchupsMap: new Map()
            };
        }

        // Filter replays with valid battle data and results
        const validReplays = replays.filter(replay =>
            replay.battleData &&
            replay.result &&
            ['win', 'loss'].includes(replay.result) &&
            replay.battleData.teams &&
            replay.battleData.opponentPlayer &&
            replay.battleData.teams[replay.battleData.opponentPlayer]
        );

        if (validReplays.length === 0) {
            return {
                matchupStats: {
                    bestMatchups: [],
                    worstMatchups: [],
                    highestAttendance: [],
                    lowestAttendance: []
                },
                allMatchupsMap: new Map()
            };
        }

        // Track opponent Pokemon data
        const opponentPokemonStats = new Map();

        validReplays.forEach(replay => {
            const opponentTeam = replay.battleData.teams[replay.battleData.opponentPlayer] || [];
            const opponentPicks = replay.battleData.actualPicks?.[replay.battleData.opponentPlayer] || [];

            // Normalize team and picks
            const normalizedTeam = opponentTeam.map(normalizePokemonName);
            const normalizedPicks = opponentPicks.map(normalizePokemonName);

            // Process each Pokemon on opponent's team
            normalizedTeam.forEach(pokemon => {
                if (!pokemon) return;

                if (!opponentPokemonStats.has(pokemon)) {
                    opponentPokemonStats.set(pokemon, {
                        pokemon,
                        timesOnTeam: 0,
                        timesBrought: 0,
                        gamesAgainst: 0,
                        winsAgainst: 0
                    });
                }

                const stats = opponentPokemonStats.get(pokemon);
                stats.timesOnTeam++;

                // Check if this Pokemon was actually brought to battle
                if (normalizedPicks.includes(pokemon)) {
                    stats.timesBrought++;
                }

                // This counts as a game against this Pokemon (it was on their team)
                stats.gamesAgainst++;

                if (replay.result === 'win') {
                    stats.winsAgainst++;
                }
            });
        });

        // Convert to array and calculate rates
        const allMatchups = Array.from(opponentPokemonStats.values()).map(stats => ({
            ...stats,
            winRate: stats.gamesAgainst > 0 ? Math.round((stats.winsAgainst / stats.gamesAgainst) * 100) : 0,
            attendanceRate: stats.timesOnTeam > 0 ? Math.round((stats.timesBrought / stats.timesOnTeam) * 100) : 0
        }));

        // Best Matchups (highest win rate against) - minimum 3 encounters
        const bestMatchups = [...allMatchups]
            .filter(stats => stats.gamesAgainst >= 3) // Minimum threshold
            .sort((a, b) => {
                // Sort by win rate, then by games as tiebreaker
                if (b.winRate === a.winRate) {
                    return b.gamesAgainst - a.gamesAgainst;
                }
                return b.winRate - a.winRate;
            })
            .slice(0, 5);

        // Worst Matchups (lowest win rate against) - minimum 3 encounters
        const worstMatchups = [...allMatchups]
            .filter(stats => stats.gamesAgainst >= 3) // Minimum threshold
            .sort((a, b) => {
                // Sort by win rate ascending, then by games as tiebreaker
                if (a.winRate === b.winRate) {
                    return b.gamesAgainst - a.gamesAgainst;
                }
                return a.winRate - b.winRate;
            })
            .slice(0, 5);

        // Highest Attendance (most frequently brought when on team)
        const highestAttendance = [...allMatchups]
            .filter(stats => stats.timesOnTeam > 0) // Only Pokemon that were actually on teams
            .sort((a, b) => {
                // Sort by attendance rate, then by times on team as tiebreaker
                if (b.attendanceRate === a.attendanceRate) {
                    return b.timesOnTeam - a.timesOnTeam;
                }
                return b.attendanceRate - a.attendanceRate;
            })
            .slice(0, 5);

        // Lowest Attendance (least frequently brought when on team)
        const lowestAttendance = [...allMatchups]
            .filter(stats => stats.timesOnTeam > 0) // Only Pokemon that were actually on teams
            .sort((a, b) => {
                // Sort by attendance rate ascending, then by times on team as tiebreaker
                if (a.attendanceRate === b.attendanceRate) {
                    return b.timesOnTeam - a.timesOnTeam;
                }
                return a.attendanceRate - b.attendanceRate;
            })
            .slice(0, 5);

        return {
            matchupStats: {
                bestMatchups,
                worstMatchups,
                highestAttendance,
                lowestAttendance
            },
            allMatchupsMap: opponentPokemonStats
        };
    }, [replays]);

    // Custom team analysis
    const customTeamAnalysis = useMemo(() => {
        const pokemonWithData = selectedPokemon
            .filter(pokemon => pokemon && allMatchupsMap.has(pokemon))
            .map(pokemon => {
                const stats = allMatchupsMap.get(pokemon);
                return {
                    pokemon,
                    winRate: stats.gamesAgainst > 0 ? Math.round((stats.winsAgainst / stats.gamesAgainst) * 100) : 0,
                    wins: stats.winsAgainst,
                    losses: stats.gamesAgainst - stats.winsAgainst,
                    encounters: stats.gamesAgainst
                };
            });

        const averageWinRate = pokemonWithData.length > 0
            ? Math.round(pokemonWithData.reduce((sum, p) => sum + p.winRate, 0) / pokemonWithData.length)
            : 0;

        return {
            pokemonData: pokemonWithData,
            averageWinRate,
            pokemonWithDataCount: pokemonWithData.length
        };
    }, [selectedPokemon, allMatchupsMap]);

    // Search suggestions
    const getSearchSuggestions = () => {
        if (!searchQuery.trim() || searchQuery.length < 1) return [];

        const query = searchQuery.toLowerCase();
        return uniqueOpponentPokemon
            .filter(pokemon => {
                const pokemonLower = pokemon.toLowerCase();
                const displayName = pokemon.replace(/-/g, ' ').toLowerCase();
                return pokemonLower.includes(query) || displayName.includes(query);
            })
            .slice(0, 8);
    };

    const searchSuggestions = getSearchSuggestions();

    // Handlers for custom team analysis
    const handleSlotClick = (slotIndex) => {
        setActiveSlot(slotIndex);
        setSearchQuery(selectedPokemon[slotIndex] || '');
        setShowSuggestions(true);
    };

    const handlePokemonSelect = (pokemon) => {
        if (activeSlot !== null) {
            const newSelection = [...selectedPokemon];
            newSelection[activeSlot] = pokemon;
            setSelectedPokemon(newSelection);
            setActiveSlot(null);
            setSearchQuery('');
            setShowSuggestions(false);
        }
    };

    const handleClearSlot = (slotIndex, e) => {
        e.stopPropagation();
        const newSelection = [...selectedPokemon];
        newSelection[slotIndex] = '';
        setSelectedPokemon(newSelection);
    };

    const handleSearchChange = (value) => {
        setSearchQuery(value);
        setShowSuggestions(true);
    };

    if (replays.length === 0) {
        return (
            <div className="text-center py-12">
                <Target className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No matchup data available</h3>
                <p className="text-gray-400">Add replays to see detailed matchup analysis</p>
            </div>
        );
    }

    const { bestMatchups, worstMatchups, highestAttendance, lowestAttendance } = matchupStats;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-semibold text-gray-100">Matchup Analysis</h3>
                    <p className="text-sm text-gray-400 mt-1">Best/Worst matchups require at least 3 encounters</p>
                </div>
                <div className="text-sm text-gray-400">
                    Based on {replays.filter(r => r.result && ['win', 'loss'].includes(r.result)).length} games
                </div>
            </div>

            {/* Main Stats Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Best Matchups Card */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                    <h4 className="text-base font-semibold text-green-400 mb-3 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        Best Matchups
                    </h4>
                    <div className="space-y-2">
                        {bestMatchups.length > 0 ? (
                            bestMatchups.map((matchup, index) => (
                                <div key={matchup.pokemon} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400 w-3">#{index + 1}</span>
                                        <PokemonSprite name={matchup.pokemon} size="xs" />
                                        <span className="text-gray-200 text-xs capitalize truncate">
                                            {matchup.pokemon.replace('-', ' ')}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-green-400 font-semibold text-xs">
                                            {matchup.winRate}%
                                        </div>
                                        <div className="text-gray-500 text-xs">
                                            {matchup.winsAgainst}W-{matchup.gamesAgainst - matchup.winsAgainst}L
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-4 text-gray-500 text-xs">
                                No data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Worst Matchups Card */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                    <h4 className="text-base font-semibold text-red-400 mb-3 flex items-center gap-2">
                        <TrendingDown className="h-4 w-4" />
                        Worst Matchups
                    </h4>
                    <div className="space-y-2">
                        {worstMatchups.length > 0 ? (
                            worstMatchups.map((matchup, index) => (
                                <div key={matchup.pokemon} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400 w-3">#{index + 1}</span>
                                        <PokemonSprite name={matchup.pokemon} size="xs" />
                                        <span className="text-gray-200 text-xs capitalize truncate">
                                            {matchup.pokemon.replace('-', ' ')}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-red-400 font-semibold text-xs">
                                            {matchup.winRate}%
                                        </div>
                                        <div className="text-gray-500 text-xs">
                                            {matchup.winsAgainst}W-{matchup.gamesAgainst - matchup.winsAgainst}L
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-4 text-gray-500 text-xs">
                                No data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Highest Attendance Card */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                    <h4 className="text-base font-semibold text-blue-400 mb-3 flex items-center gap-2">
                        <UserCheck className="h-4 w-4" />
                        Highest Attendance
                    </h4>
                    <div className="space-y-2">
                        {highestAttendance.length > 0 ? (
                            highestAttendance.map((matchup, index) => (
                                <div key={matchup.pokemon} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400 w-3">#{index + 1}</span>
                                        <PokemonSprite name={matchup.pokemon} size="xs" />
                                        <span className="text-gray-200 text-xs capitalize truncate">
                                            {matchup.pokemon.replace('-', ' ')}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-blue-400 font-semibold text-xs">
                                            {matchup.attendanceRate}%
                                        </div>
                                        <div className="text-gray-500 text-xs">
                                            {matchup.timesBrought}/{matchup.timesOnTeam}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-4 text-gray-500 text-xs">
                                No data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Lowest Attendance Card */}
                <div className="bg-slate-700/50 rounded-lg p-4">
                    <h4 className="text-base font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Lowest Attendance
                    </h4>
                    <div className="space-y-2">
                        {lowestAttendance.length > 0 ? (
                            lowestAttendance.map((matchup, index) => (
                                <div key={matchup.pokemon} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-400 w-3">#{index + 1}</span>
                                        <PokemonSprite name={matchup.pokemon} size="xs" />
                                        <span className="text-gray-200 text-xs capitalize truncate">
                                            {matchup.pokemon.replace('-', ' ')}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-yellow-400 font-semibold text-xs">
                                            {matchup.attendanceRate}%
                                        </div>
                                        <div className="text-gray-500 text-xs">
                                            {matchup.timesBrought}/{matchup.timesOnTeam}
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-4 text-gray-500 text-xs">
                                No data available
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Filter Section - Custom Team Analysis */}
            <div className="bg-slate-700/50 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
                        <Search className="h-5 w-5" />
                        Custom Team Analysis
                    </h4>
                    {customTeamAnalysis.pokemonWithDataCount > 0 && (
                        <div className="bg-emerald-600/20 border border-emerald-600/30 rounded-lg px-3 py-1">
                            <span className="text-emerald-400 font-semibold">
                                Avg: {customTeamAnalysis.averageWinRate}%
                            </span>
                            <span className="text-gray-400 text-sm ml-1">
                                ({customTeamAnalysis.pokemonWithDataCount} Pokémon)
                            </span>
                        </div>
                    )}
                </div>

                <p className="text-gray-400 text-sm mb-6">
                    Build a theoretical opponent team to analyze your matchup rates
                </p>

                {/* Pokemon Selection Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                    {Array.from({ length: 6 }).map((_, index) => {
                        const pokemon = selectedPokemon[index];
                        const pokemonData = pokemon && allMatchupsMap.has(pokemon)
                            ? allMatchupsMap.get(pokemon)
                            : null;

                        return (
                            <div key={index} className="relative">
                                <div
                                    onClick={() => handleSlotClick(index)}
                                    className={`bg-slate-800/50 border-2 rounded-lg p-4 cursor-pointer transition-colors hover:bg-slate-700/50 ${
                                        activeSlot === index ? 'border-emerald-400' : 'border-slate-600'
                                    }`}
                                >
                                    {pokemon ? (
                                        <>
                                            <button
                                                onClick={(e) => handleClearSlot(index, e)}
                                                className="absolute top-1 right-1 text-gray-400 hover:text-red-400 transition-colors"
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                            <div className="flex flex-col items-center">
                                                <PokemonSprite name={pokemon} size="md" />
                                                <h5 className="text-gray-200 text-sm font-medium mt-2 capitalize text-center">
                                                    {pokemon.replace('-', ' ')}
                                                </h5>
                                                {pokemonData ? (
                                                    <div className="text-center mt-2">
                                                        <div className={`font-bold text-sm ${
                                                            pokemonData.gamesAgainst > 0 ? (
                                                                Math.round((pokemonData.winsAgainst / pokemonData.gamesAgainst) * 100) >= 50
                                                                    ? 'text-green-400'
                                                                    : 'text-red-400'
                                                            ) : 'text-gray-400'
                                                        }`}>
                                                            {pokemonData.gamesAgainst > 0
                                                                ? Math.round((pokemonData.winsAgainst / pokemonData.gamesAgainst) * 100)
                                                                : 0}%
                                                        </div>
                                                        <div className="text-xs text-gray-400">
                                                            {pokemonData.winsAgainst}W-{pokemonData.gamesAgainst - pokemonData.winsAgainst}L
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {pokemonData.gamesAgainst} encounters
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="text-center mt-2">
                                                        <div className="font-bold text-sm text-gray-400">0%</div>
                                                        <div className="text-xs text-gray-500">No encounters</div>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-20">
                                            <div className="w-12 h-12 bg-slate-700/50 rounded-lg border-2 border-dashed border-slate-600 flex items-center justify-center mb-2">
                                                <span className="text-gray-500 text-xs">#{index + 1}</span>
                                            </div>
                                            <span className="text-gray-500 text-xs">Click to add</span>
                                        </div>
                                    )}
                                </div>

                                {/* Search dropdown for active slot */}
                                {activeSlot === index && showSuggestions && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto">
                                        <div className="p-2 border-b border-slate-600">
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => handleSearchChange(e.target.value)}
                                                placeholder="Search Pokémon..."
                                                className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-gray-100 text-sm placeholder-gray-400 focus:outline-none focus:border-emerald-400"
                                                autoFocus
                                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                            />
                                        </div>
                                        {searchSuggestions.length > 0 ? (
                                            searchSuggestions.map((pokemon, suggestionIndex) => (
                                                <button
                                                    key={suggestionIndex}
                                                    onClick={() => handlePokemonSelect(pokemon)}
                                                    className="w-full text-left px-3 py-2 hover:bg-slate-700 text-gray-300 hover:text-gray-100 text-sm transition-colors flex items-center gap-2"
                                                >
                                                    <PokemonSprite name={pokemon} size="xs" />
                                                    {pokemon.replace(/-/g, ' ')}
                                                </button>
                                            ))
                                        ) : (
                                            <div className="px-3 py-2 text-gray-500 text-sm">No matches found</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Instructions */}
                <div className="text-center text-gray-400 text-sm">
                    Click on a slot to search and select opponent Pokémon. The average win rate shows your overall performance against the selected team.
                </div>
            </div>
        </div>
    );
};

export default MatchupStatsTab;