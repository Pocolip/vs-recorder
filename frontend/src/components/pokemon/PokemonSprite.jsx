// src/components/pokemon/PokemonSprite.jsx
import React, { useState, useEffect, memo } from 'react';
import PokemonService from '@/services/PokemonService';
import { getDisplayName } from '@/utils/pokemonNameUtils';

const PokemonSprite = memo(({
    name,
    size = 'md',
    showName = false,
    className = '',
    fallbackText = '?',
    noContainer = false
}) => {
    const [spriteUrl, setSpriteUrl] = useState(null);
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
            loadSprite();
        } else {
            setLoading(false);
            setError(true);
        }
    }, [name]);

    const loadSprite = async () => {
        try {
            setLoading(true);
            setError(false);
            setImageError(false);

            const url = await PokemonService.getSpriteUrl(name);
            setSpriteUrl(url);

            if (!url) {
                setError(true);
            }
        } catch (err) {
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    const handleImageError = () => {
        setImageError(true);
    };

    const getTooltipText = () => {
        if (loading) return 'Loading...';
        if (error || !name) return fallbackText;
        return getDisplayName(name);
    };

    const renderContent = () => {
        const baseClasses = `${sizeClasses[size]} ${className} flex items-center justify-center relative overflow-hidden`;
        const containerClasses = noContainer ?
            baseClasses :
            `${baseClasses} rounded-lg border-2 border-slate-600`;

        const tooltipText = getTooltipText();

        if (loading) {
            return (
                <div
                    className={`${containerClasses} ${noContainer ? '' : 'bg-slate-700'}`}
                    title={tooltipText}
                >
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                </div>
            );
        }

        if (error || !spriteUrl) {
            // Fallback: show Pokemon initial with gradient background
            const displayName = getDisplayName(name || '');
            const initial = displayName ? displayName.charAt(0).toUpperCase() : fallbackText;
            return (
                <div
                    className={`${containerClasses} ${noContainer ? 'bg-gradient-to-br from-slate-600 to-slate-700' : 'bg-gradient-to-br from-slate-600 to-slate-700'} text-white font-bold`}
                    title={tooltipText}
                >
                    <span className={textSizeClasses[size]}>{initial}</span>
                </div>
            );
        }

        if (imageError) {
            // Image failed to load, show initial
            const displayName = getDisplayName(name || '');
            const initial = displayName ? displayName.charAt(0).toUpperCase() : fallbackText;
            return (
                <div
                    className={`${containerClasses} ${noContainer ? 'bg-gradient-to-br from-emerald-600 to-teal-700' : 'bg-gradient-to-br from-emerald-600 to-teal-700'} text-white font-bold`}
                    title={tooltipText}
                >
                    <span className={textSizeClasses[size]}>{initial}</span>
                </div>
            );
        }

        return (
            <div
                className={`${containerClasses} ${noContainer ? '' : 'bg-slate-700'}`}
                title={tooltipText}
            >
                <img
                    src={spriteUrl}
                    alt={getDisplayName(name)}
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
            <span className={`${textSizeClasses[size]} text-gray-300 text-center truncate max-w-full`}>
                {getDisplayName(name)}
            </span>
        </div>
    );
});

PokemonSprite.displayName = 'PokemonSprite';

export default PokemonSprite;
