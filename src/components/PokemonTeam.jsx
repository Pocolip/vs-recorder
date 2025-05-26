// src/components/PokemonTeam.jsx
import React, { useState, useEffect, useMemo } from 'react';
import PokemonSprite from './PokemonSprite';
import PokemonService from '../services/PokemonService';
import PokepasteService from '../services/PokepasteService';

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
    const [pokepasteMetadata, setPokepasteMetadata] = useState(null);

    // Memoize the cache key to prevent unnecessary re-renders
    const cacheKey = useMemo(() => {
        if (pokepaste) return `pokepaste:${pokepaste}`;
        if (pokemonNames?.length > 0) return `names:${pokemonNames.join(',')}`;
        return 'fallback';
    }, [pokepaste, pokemonNames]);

    useEffect(() => {
        loadTeam();
    }, [cacheKey]);

    const loadTeam = async () => {
        try {
            setLoading(true);
            setError(null);
            setPokepasteMetadata(null);

            let pokemonToLoad = [];

            // If we have a pokepaste URL, use the service to parse it
            if (pokepaste) {
                const parsed = await PokepasteService.fetchAndParse(pokepaste, {
                    maxPokemon: maxDisplay
                });

                // Extract Pokemon names from the parsed data
                pokemonToLoad = parsed.pokemon.map(p => p.name).filter(name => name);
                setPokepasteMetadata(parsed.metadata);

                console.log('Pokepaste parsed successfully:', {
                    url: pokepaste,
                    pokemonCount: pokemonToLoad.length,
                    format: parsed.metadata.format,
                    pokemon: pokemonToLoad
                });
            }
            // Otherwise use the provided pokemon names
            else if (pokemonNames && pokemonNames.length > 0) {
                pokemonToLoad = pokemonNames.slice(0, maxDisplay);
            }
            // Fallback to placeholder Pokemon for demo
            else {
                pokemonToLoad = ['miraidon', 'koraidon', 'calyrex-shadow', 'kyogre', 'incineroar', 'rillaboom'].slice(0, maxDisplay);
            }

            // Load Pokemon data using the Pokemon service
            const pokemonData = await PokemonService.getMultiplePokemon(pokemonToLoad);
            setTeamPokemon(pokemonData);

        } catch (err) {
            console.error('Error loading team:', err);
            setError(err.message);
            // Set fallback Pokemon on error
            setTeamPokemon(generateFallbackTeam());
        } finally {
            setLoading(false);
        }
    };

    const generateFallbackTeam = () => {
        const fallbackNames = ['miraidon', 'koraidon', 'calyrex-shadow', 'kyogre', 'incineroar', 'rillaboom'];
        return fallbackNames.slice(0, maxDisplay).map(name =>
            PokemonService.createUnknownPokemon(name)
        );
    };

    const getGridClasses = () => {
        if (maxDisplay <= 3) return 'grid-cols-3';
        if (maxDisplay <= 4) return 'grid-cols-4';
        return 'grid-cols-6';
    };

    if (loading) {
        return (
            <div className={`grid ${getGridClasses()} gap-2 ${className}`}>
                {Array.from({ length: Math.min(maxDisplay, 6) }).map((_, index) => (
                    <div key={index} className="flex flex-col items-center gap-1">
                        <div className={`${size === 'xs' ? 'w-6 h-6' : size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-12 h-12' : size === 'lg' ? 'w-16 h-16' : 'w-20 h-20'} bg-slate-700 rounded-lg border-2 border-slate-600 flex items-center justify-center`}>
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

    return (
        <div className={className}>
            {/* Optional metadata display for debugging/development */}
            {pokepasteMetadata && process.env.NODE_ENV === 'development' && (
                <div className="mb-2 p-2 bg-slate-800/50 rounded text-xs text-gray-400">
                    Format: {pokepasteMetadata.format} |
                    Pokemon: {pokepasteMetadata.pokemonCount} |
                    {pokepasteMetadata.hasMoves && ' Has Moves'}
                    {pokepasteMetadata.hasAbilities && ' Has Abilities'}
                    {pokepasteMetadata.errors.length > 0 && ` | ${pokepasteMetadata.errors.length} warnings`}
                </div>
            )}

            <div className={`grid ${getGridClasses()} gap-2`}>
                {teamPokemon.map((pokemon, index) => (
                    <PokemonSprite
                        key={pokemon?.name || index}
                        name={pokemon?.name}
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
                        <div className={`${size === 'xs' ? 'w-6 h-6' : size === 'sm' ? 'w-8 h-8' : size === 'md' ? 'w-12 h-12' : size === 'lg' ? 'w-16 h-16' : 'w-20 h-20'} bg-slate-800 rounded-lg border-2 border-slate-600 border-dashed flex items-center justify-center`}>
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