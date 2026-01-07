// src/components/pokemon/PokemonTeam.jsx
import React, { useState, useEffect, useMemo } from 'react';
import PokemonSprite from './PokemonSprite';
import apiClient from '@/services/api/client';

const PokemonTeam = ({
    pokepaste = null,
    pokemonNames = [],
    size = 'md',
    showNames = false,
    maxDisplay = 6,
    className = ''
}) => {
    const [teamPokemon, setTeamPokemon] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Memoize the cache key to prevent unnecessary re-renders
    const cacheKey = useMemo(() => {
        if (pokepaste) return `pokepaste:${pokepaste}`;
        if (pokemonNames?.length > 0) return `names:${pokemonNames.join(',')}`;
        return 'empty';
    }, [pokepaste, pokemonNames]);

    useEffect(() => {
        loadTeam();
    }, [cacheKey]);

    const loadTeam = async () => {
        try {
            setLoading(true);
            setError(null);

            let pokemonToLoad = [];

            // If we have a pokepaste URL, use the backend to parse it
            if (pokepaste) {
                try {
                    const response = await apiClient.get(`/api/pokemon/pokepaste/parse`, {
                        params: { url: pokepaste }
                    });
                    pokemonToLoad = response.species || [];
                } catch (err) {
                    console.error('Error parsing pokepaste:', err);
                    throw new Error('Failed to parse pokepaste URL');
                }
            }
            // Otherwise use the provided pokemon names
            else if (pokemonNames && pokemonNames.length > 0) {
                pokemonToLoad = pokemonNames;
            }

            // Limit to maxDisplay
            pokemonToLoad = pokemonToLoad.slice(0, maxDisplay);
            setTeamPokemon(pokemonToLoad);

        } catch (err) {
            console.error('Error loading team:', err);
            setError(err.message);
            setTeamPokemon([]);
        } finally {
            setLoading(false);
        }
    };

    const getGridClasses = () => {
        const count = Math.max(teamPokemon.length, maxDisplay);
        if (count <= 3) return 'grid-cols-3';
        if (count <= 4) return 'grid-cols-4';
        return 'grid-cols-6';
    };

    const getSizeClasses = () => {
        const sizeMap = {
            xs: 'w-6 h-6',
            sm: 'w-8 h-8',
            md: 'w-12 h-12',
            lg: 'w-16 h-16',
            xl: 'w-20 h-20',
            '2xl': 'w-24 h-24'
        };
        return sizeMap[size] || sizeMap.md;
    };

    if (loading) {
        return (
            <div className={`grid ${getGridClasses()} gap-2 ${className}`}>
                {Array.from({ length: Math.min(maxDisplay, 6) }).map((_, index) => (
                    <div key={index} className="flex flex-col items-center gap-1">
                        <div className={`${getSizeClasses()} bg-slate-700 rounded-lg border-2 border-slate-600 flex items-center justify-center`}>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-400"></div>
                        </div>
                        {showNames && (
                            <div className="w-8 h-3 bg-slate-700 rounded animate-pulse"></div>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    if (error) {
        return (
            <div className={`text-center p-4 ${className}`}>
                <p className="text-red-400 text-sm">Failed to load team</p>
                <p className="text-gray-500 text-xs">{error}</p>
                {pokepaste && (
                    <p className="text-gray-500 text-xs mt-1">
                        Check if the Pokepaste URL is valid and accessible
                    </p>
                )}
            </div>
        );
    }

    if (teamPokemon.length === 0 && !pokepaste && pokemonNames.length === 0) {
        return (
            <div className={`text-center p-4 ${className}`}>
                <p className="text-gray-400 text-sm">No team data</p>
            </div>
        );
    }

    return (
        <div className={className}>
            <div className={`grid ${getGridClasses()} gap-2`}>
                {teamPokemon.map((pokemonName, index) => (
                    <PokemonSprite
                        key={pokemonName || index}
                        name={pokemonName}
                        size={size}
                        showName={showNames}
                        fallbackText={(index + 1).toString()}
                    />
                ))}

                {/* Fill remaining slots with placeholders if we have fewer than maxDisplay */}
                {teamPokemon.length < maxDisplay && Array.from({
                    length: maxDisplay - teamPokemon.length
                }).map((_, index) => (
                    <div key={`placeholder-${index}`} className="flex flex-col items-center gap-1">
                        <div className={`${getSizeClasses()} bg-slate-800 rounded-lg border-2 border-slate-600 border-dashed flex items-center justify-center`}>
                            <span className="text-gray-500 text-xs">—</span>
                        </div>
                        {showNames && (
                            <span className="text-xs text-gray-500">Empty</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default PokemonTeam;
