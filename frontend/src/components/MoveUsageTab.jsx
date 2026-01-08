// src/components/MoveUsageTab.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Zap, AlertTriangle, Info } from 'lucide-react';
import { PokemonSprite } from './index';
import PokepasteService from '../services/PokepasteService';
import { analyticsApi } from '../services/api';

const MoveUsageTab = ({ replays, team }) => {
    const [teamMovesets, setTeamMovesets] = useState({});
    const [moveUsageStats, setMoveUsageStats] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Color palette for pie chart sections
    const moveColors = [
        '#3b82f6', // Blue
        '#8b5cf6', // Purple
        '#06b6d4', // Cyan
        '#f59e0b', // Amber
        '#ec4899', // Pink
        '#10b981', // Emerald
        '#f97316', // Orange
        '#84cc16', // Lime
        '#6366f1', // Indigo
        '#14b8a6', // Teal
    ];

    // Load team movesets from Pokepaste and move usage from backend API
    useEffect(() => {
        loadMoveData();
    }, [team.id, team.pokepaste]); // Reload when team changes

    const loadMoveData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Load team movesets from Pokepaste
            let pokepasteMovesets = {};
            if (team.pokepaste) {
                try {
                    const parsed = await PokepasteService.fetchAndParse(team.pokepaste);
                    pokepasteMovesets = parsed.pokemon.reduce((acc, pokemon) => {
                        // Use raw pokemon name - no normalization
                        const pokemonName = pokemon.name;
                        if (pokemonName && pokemon.moves) {
                            // If we already have moves for this name, merge them
                            if (acc[pokemonName]) {
                                // Merge unique moves
                                const existingMoves = new Set(acc[pokemonName]);
                                pokemon.moves.forEach(move => {
                                    if (move && move.trim()) {
                                        existingMoves.add(move.trim());
                                    }
                                });
                                acc[pokemonName] = Array.from(existingMoves);
                            } else {
                                acc[pokemonName] = pokemon.moves.filter(move => move && move.trim());
                            }
                        }
                        return acc;
                    }, {});
                    console.log('Loaded Pokepaste movesets:', pokepasteMovesets);
                } catch (pokepasteError) {
                    console.warn('Failed to load Pokepaste movesets:', pokepasteError);
                    // Continue without Pokepaste data
                }
            }

            // Fetch move usage statistics from backend API
            const backendMoveData = await analyticsApi.getMoveUsage(team.id);
            console.log('Backend move usage data:', backendMoveData);

            // Transform backend data format to match our internal format
            // Backend returns: { pokemonMoves: [{ pokemon: string, moves: [{ move: string, timesUsed: number, usageRate: number }] }] }
            const usageStats = {};
            if (backendMoveData && backendMoveData.pokemonMoves) {
                backendMoveData.pokemonMoves.forEach(({ pokemon, moves }) => {
                    if (!usageStats[pokemon]) {
                        usageStats[pokemon] = {};
                    }
                    moves.forEach(({ move, timesUsed }) => {
                        usageStats[pokemon][move] = timesUsed;
                    });
                });
            }
            console.log('Transformed move usage stats:', usageStats);

            setTeamMovesets(pokepasteMovesets);
            setMoveUsageStats(usageStats);
        } catch (err) {
            console.error('Error loading move data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };


    // Custom label function for pie chart
    const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name, value, inPokepaste }) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 1.2; // Position outside the pie
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        // Only show label if percentage is above a threshold to avoid overcrowding
        if (percent < 0.05) return null; // Don't show labels for moves used less than 5% of the time

        return (
            <text
                x={x}
                y={y}
                fill={inPokepaste ? '#10b981' : '#ef4444'}
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                fontSize="11"
                fontWeight="500"
            >
                {`${name} ${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    // Process data for visualization
    const chartData = useMemo(() => {
        const results = {};

        // Get all Pokemon that either have movesets or usage stats
        const allPokemon = new Set([
            ...Object.keys(teamMovesets),
            ...Object.keys(moveUsageStats)
        ]);

        for (const pokemon of allPokemon) {
            const pokepasteMoveset = teamMovesets[pokemon] || [];
            const usageData = moveUsageStats[pokemon] || {};

            // Create chart data for this Pokemon
            const moveData = new Map();

            // Create a normalized moveset for comparison (trim and lowercase)
            const normalizedPokepasteMoveset = new Set(
                pokepasteMoveset.map(move => move.trim().toLowerCase())
            );

            // Add moves from Pokepaste (even if unused, show them with 0 usage)
            pokepasteMoveset.forEach(move => {
                if (move && move.trim()) {
                    const trimmedMove = move.trim();
                    moveData.set(trimmedMove, {
                        name: trimmedMove,
                        value: usageData[trimmedMove] || 0,
                        inPokepaste: true
                    });
                }
            });

            // Add moves from actual usage
            Object.entries(usageData).forEach(([move, count]) => {
                const trimmedMove = move.trim();

                if (!moveData.has(trimmedMove)) {
                    // Check if this move exists in pokepaste (case-insensitive)
                    const isInPokepaste = normalizedPokepasteMoveset.has(trimmedMove.toLowerCase());

                    moveData.set(trimmedMove, {
                        name: trimmedMove,
                        value: count,
                        inPokepaste: isInPokepaste
                    });
                } else {
                    // Update the value if the move already exists from pokepaste
                    const existingMove = moveData.get(trimmedMove);
                    existingMove.value = count;
                }
            });

            // Convert to array, sort by usage, and assign colors
            const chartArray = Array.from(moveData.values())
                .sort((a, b) => b.value - a.value)
                .map((move, index) => ({
                    ...move,
                    color: moveColors[index % moveColors.length] // Cycle through colors
                }));

            // Calculate statistics
            const totalUsage = chartArray.reduce((sum, move) => sum + move.value, 0);
            const undocumentedMoves = chartArray.filter(move => !move.inPokepaste && move.value > 0);
            const unusedPokepasteMoves = chartArray.filter(move => move.inPokepaste && move.value === 0);

            results[pokemon] = {
                chartData: chartArray,
                totalUsage,
                undocumentedCount: undocumentedMoves.length,
                unusedPokepasteCount: unusedPokepasteMoves.length,
                hasData: totalUsage > 0 || chartArray.length > 0,
                undocumentedMoves: undocumentedMoves.map(m => m.name),
                unusedPokepasteMoves: unusedPokepasteMoves.map(m => m.name)
            };
        }

        return results;
    }, [teamMovesets, moveUsageStats]);

    // Custom tooltip for the pie charts
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length > 0) {
            const data = payload[0].payload;
            return (
                <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
                    <p className="text-gray-100 font-medium">{data.name}</p>
                    <p className="text-gray-300">
                        Uses: <span className="font-semibold">{data.value}</span>
                    </p>
                    <p className={`text-xs ${data.inPokepaste ? 'text-green-400' : 'text-red-400'}`}>
                        {data.inPokepaste ? '✓ In Pokepaste' : '⚠ Not in Pokepaste'}
                    </p>
                </div>
            );
        }
        return null;
    };

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
                <div className="text-red-400 mb-4">Error loading move data: {error}</div>
                <button
                    onClick={loadMoveData}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                    Try Again
                </button>
            </div>
        );
    }

    const pokemonWithData = Object.entries(chartData).filter(([_, data]) => data.hasData);

    if (pokemonWithData.length === 0) {
        return (
            <div className="text-center py-12">
                <Zap className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-300 mb-2">No move usage data available</h3>
                <p className="text-gray-400 mb-4">Add replays to see detailed move usage analysis</p>
                {!team.pokepaste && (
                    <p className="text-gray-500 text-sm">
                        Add a Pokepaste URL to your team to see intended movesets
                    </p>
                )}
            </div>
        );
    }

    return (
        <div>
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-semibold text-gray-100">Move Usage Analysis</h3>
                    <p className="text-gray-400">
                        Move statistics from all recorded games
                    </p>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        <span className="text-sm text-gray-300">In Pokepaste</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                        <span className="text-sm text-gray-300">Not in Pokepaste</span>
                    </div>
                </div>
            </div>

            {/* Summary Statistics - Removed undocumented/unused alerts */}
            {/* Keeping only the legend for reference */}

            {/* Pokemon Move Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pokemonWithData.map(([pokemon, data]) => (
                    <PokemonMoveChart
                        key={pokemon}
                        pokemon={pokemon}
                        data={data}
                        CustomTooltip={CustomTooltip}
                        renderCustomLabel={renderCustomLabel}
                    />
                ))}
            </div>
        </div>
    );
};

// Individual Pokemon Move Chart Component
const PokemonMoveChart = ({ pokemon, data, CustomTooltip, renderCustomLabel }) => {
    return (
        <div className="bg-slate-700/50 rounded-lg p-4">
            {/* Pokemon Header */}
            <div className="flex items-center gap-3 mb-4">
                <PokemonSprite
                    name={pokemon}
                    size="md"
                    fallbackText={pokemon.charAt(0).toUpperCase()}
                />
                <div>
                    <h4 className="text-lg font-semibold text-gray-100 capitalize">
                        {pokemon.replace('-', ' ')}
                    </h4>
                    <p className="text-sm text-gray-400">
                        {data.totalUsage} total uses
                    </p>
                </div>
            </div>

            {/* Chart */}
            {data.chartData.length > 0 && data.totalUsage > 0 ? (
                <div className="h-80"> {/* Increased height to accommodate outside labels */}
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data.chartData.filter(move => move.value > 0)}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={renderCustomLabel}
                                outerRadius={70} // Reduced radius to leave room for labels
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {data.chartData.filter(move => move.value > 0).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            ) : (
                <div className="h-80 flex items-center justify-center">
                    <div className="text-center">
                        <Zap className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">No move usage data</p>
                    </div>
                </div>
            )}

            {/* Move List for smaller percentages and additional info */}
            {data.chartData.filter(move => move.value > 0 && move.value / data.totalUsage < 0.05).length > 0 && (
                <div className="mt-4 p-3 bg-slate-800/50 rounded-lg">
                    <h5 className="text-sm font-medium text-gray-300 mb-2">Other moves:</h5>
                    <div className="flex flex-wrap gap-1">
                        {data.chartData
                            .filter(move => move.value > 0 && move.value / data.totalUsage < 0.05)
                            .map((move, index) => (
                                <span
                                    key={index}
                                    className={`text-xs px-2 py-1 rounded ${
                                        move.inPokepaste
                                            ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                                            : 'bg-red-600/20 text-red-400 border border-red-600/30'
                                    }`}
                                >
                                    {move.name} ({((move.value / data.totalUsage) * 100).toFixed(1)}%)
                                </span>
                            ))
                        }
                    </div>
                </div>
            )}
        </div>
    );
};

export default MoveUsageTab;