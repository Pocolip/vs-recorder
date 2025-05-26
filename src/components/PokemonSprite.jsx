// src/components/PokemonSprite.jsx
import React, { useState, useEffect, memo } from 'react';
import PokemonService from '../services/PokemonService';

const PokemonSprite = memo(({
                                name,
                                size = 'md',
                                variant = 'front_default',
                                showName = false,
                                className = '',
                                fallbackText = '?',
                                noContainer = false
                            }) => {
    const [pokemon, setPokemon] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [imageError, setImageError] = useState(false);

    // Size mappings
    const sizeClasses = {
        xs: 'w-6 h-6',
        sm: 'w-8 h-8',
        md: 'w-12 h-12',
        lg: 'w-16 h-16',
        xl: 'w-20 h-20',
        '2xl': 'w-24 h-24'
    };

    const textSizeClasses = {
        xs: 'text-xs',
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
        xl: 'text-lg',
        '2xl': 'text-xl'
    };

    useEffect(() => {
        if (name) {
            loadPokemon();
        } else {
            setLoading(false);
            setError(true);
        }
    }, [name]);

    const loadPokemon = async () => {
        try {
            setLoading(true);
            setError(false);
            setImageError(false);

            const pokemonData = await PokemonService.getPokemon(name);
            setPokemon(pokemonData);
        } catch (err) {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleImageError = () => {
        setImageError(true);
    };

    const getSpriteUrl = () => {
        if (!pokemon || !pokemon.sprites) return null;
        return pokemon.sprites[variant] || pokemon.sprites.front_default;
    };

    const getTypeColors = (types) => {
        const typeColorMap = {
            normal: 'bg-gray-400',
            fire: 'bg-red-500',
            water: 'bg-blue-500',
            electric: 'bg-yellow-400',
            grass: 'bg-green-500',
            ice: 'bg-blue-300',
            fighting: 'bg-red-700',
            poison: 'bg-purple-500',
            ground: 'bg-yellow-600',
            flying: 'bg-indigo-400',
            psychic: 'bg-pink-500',
            bug: 'bg-green-400',
            rock: 'bg-yellow-800',
            ghost: 'bg-purple-700',
            dragon: 'bg-indigo-700',
            dark: 'bg-gray-800',
            steel: 'bg-gray-500',
            fairy: 'bg-pink-300',
            unknown: 'bg-gray-600'
        };

        if (!types || types.length === 0) return 'bg-gray-600';

        // Use the first type for the primary color
        return typeColorMap[types[0]] || 'bg-gray-600';
    };

    const renderContent = () => {
        const spriteUrl = getSpriteUrl();
        const baseClasses = `${sizeClasses[size]} ${className} flex items-center justify-center relative overflow-hidden`;
        const containerClasses = noContainer ?
            baseClasses :
            `${baseClasses} rounded-lg border-2 border-slate-600`;

        if (loading) {
            return (
                <div className={`${containerClasses} ${noContainer ? '' : 'bg-slate-700'}`}>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                </div>
            );
        }

        if (error || !pokemon) {
            return (
                <div className={`${containerClasses} ${noContainer ? '' : 'bg-slate-700'} text-gray-400`}>
                    <span className={textSizeClasses[size]}>{fallbackText}</span>
                </div>
            );
        }

        const typeColor = getTypeColors(pokemon.types);

        if (imageError || !spriteUrl) {
            // Show Pokemon initial with type-based background color
            const initial = pokemon.displayName ? pokemon.displayName.charAt(0).toUpperCase() : '?';
            return (
                <div className={`${containerClasses} ${noContainer ? typeColor : `${typeColor}`} text-white font-bold`}>
                    <span className={textSizeClasses[size]}>{initial}</span>
                </div>
            );
        }

        return (
            <div className={`${containerClasses} ${noContainer ? '' : 'bg-slate-700'}`}>
                <img
                    src={spriteUrl}
                    alt={pokemon.displayName || pokemon.name}
                    className="w-full h-full object-contain"
                    onError={handleImageError}
                    loading="lazy"
                />
            </div>
        );
    };

    if (!showName) {
        return renderContent();
    }

    return (
        <div className="flex flex-col items-center gap-1">
            {renderContent()}
            {pokemon && (
                <span className={`${textSizeClasses[size]} text-gray-300 text-center truncate max-w-full`}>
                    {pokemon.displayName || pokemon.name}
                </span>
            )}
        </div>
    );
});

PokemonSprite.displayName = 'PokemonSprite';

export default PokemonSprite;