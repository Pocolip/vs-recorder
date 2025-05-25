// src/components/PokemonTeam.jsx
import React, { useState, useEffect, useMemo } from 'react';
import PokemonSprite from './PokemonSprite';
import PokemonService from '../services/PokemonService';

// Cache for Pokepaste data to prevent duplicate fetches
const pokepasteCache = new Map();

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
        return 'fallback';
    }, [pokepaste, pokemonNames]);

    useEffect(() => {
        loadTeam();
    }, [cacheKey]);

    const loadTeam = async () => {
        try {
            setLoading(true);
            setError(null);

            let pokemonToLoad = [];

            // If we have a pokepaste URL, parse it
            if (pokepaste) {
                pokemonToLoad = await parsePokepaste(pokepaste);
            }
            // Otherwise use the provided pokemon names
            else if (pokemonNames && pokemonNames.length > 0) {
                pokemonToLoad = pokemonNames.slice(0, maxDisplay);
            }
            // Fallback to placeholder Pokemon for demo
            else {
                pokemonToLoad = ['miraidon', 'koraidon', 'calyrex-shadow', 'kyogre', 'incineroar', 'rillaboom'].slice(0, maxDisplay);
            }

            // Load Pokemon data
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

    const parsePokepaste = async (pokepasteUrl) => {
        try {
            // Check cache first
            if (pokepasteCache.has(pokepasteUrl)) {
                return pokepasteCache.get(pokepasteUrl);
            }

            // Extract the pokepaste ID from URL
            const pasteId = pokepasteUrl.split('/').pop();
            const rawUrl = `https://pokepast.es/${pasteId}/raw`;

            // Fetch the raw pokepaste data
            const response = await fetch(rawUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch pokepaste: ${response.status}`);
            }

            const rawText = await response.text();
            const parsedNames = parsePokepasteText(rawText);

            // Cache the result
            pokepasteCache.set(pokepasteUrl, parsedNames);

            return parsedNames;
        } catch (error) {
            console.error('Error parsing pokepaste:', error);
            throw error;
        }
    };

    const parsePokepasteText = (rawText) => {
        const lines = rawText.split('\n');
        const pokemonNames = [];

        let currentPokemon = null;
        let isInPokemonBlock = false;

        for (const line of lines) {
            const trimmedLine = line.trim();

            // Skip empty lines and comments
            if (!trimmedLine || trimmedLine.startsWith('//')) continue;

            // Check if this line starts a new Pokemon block
            // Pokemon names are usually followed by @ (item) or on their own line
            // They don't contain colons (which are used for stats, moves, etc.)
            if (!trimmedLine.includes(':') && !trimmedLine.toLowerCase().includes('nature') &&
                !trimmedLine.toLowerCase().includes('ability') && !trimmedLine.toLowerCase().includes('level') &&
                !trimmedLine.toLowerCase().includes('evs') && !trimmedLine.toLowerCase().includes('ivs') &&
                !trimmedLine.startsWith('-')) {

                // This might be a Pokemon name line
                let pokemonName = trimmedLine;

                // Remove everything after @ (item)
                if (pokemonName.includes('@')) {
                    pokemonName = pokemonName.split('@')[0].trim();
                }

                // Remove nickname in parentheses (e.g., "Pikachu (Sparky)" -> "Pikachu")
                if (pokemonName.includes('(') && pokemonName.includes(')')) {
                    const parts = pokemonName.split('(');
                    pokemonName = parts[0].trim();
                }

                // Remove gender indicators
                pokemonName = pokemonName.replace(/\s*\(M\)|\s*\(F\)/g, '').trim();

                // Clean up the name
                pokemonName = pokemonName.trim();

                // Check if this looks like a valid Pokemon name (not empty, not too short, contains letters)
                if (pokemonName && pokemonName.length > 2 && /[a-zA-Z]/.test(pokemonName) &&
                    pokemonNames.length < maxDisplay) {

                    // Convert to API format (lowercase, hyphens, handle special cases)
                    const apiName = convertToApiName(pokemonName);
                    pokemonNames.push(apiName);
                    isInPokemonBlock = true;
                    currentPokemon = apiName;
                }
            }
            // If we're in a Pokemon block and hit a move line (starts with -), we're still in the same block
            else if (trimmedLine.startsWith('-') && isInPokemonBlock) {
                // This is a move line, continue with current Pokemon
                continue;
            }
            // If we hit a stat line or other data, we're still in the same Pokemon block
            else if ((trimmedLine.includes(':') || trimmedLine.toLowerCase().includes('nature') ||
                    trimmedLine.toLowerCase().includes('ability') || trimmedLine.toLowerCase().includes('level') ||
                    trimmedLine.toLowerCase().includes('evs') || trimmedLine.toLowerCase().includes('ivs')) &&
                isInPokemonBlock) {
                // This is Pokemon data (nature, ability, stats, etc.), continue with current Pokemon
                continue;
            }
            // Empty line or unrecognized format might indicate end of Pokemon block
            else {
                isInPokemonBlock = false;
                currentPokemon = null;
            }
        }

        return pokemonNames.length > 0 ? pokemonNames : ['miraidon', 'koraidon', 'calyrex-shadow', 'kyogre', 'incineroar', 'rillaboom'];
    };

    const convertToApiName = (pokemonName) => {
        // Handle special cases and forms
        const nameMap = {
            'Calyrex-Ice': 'calyrex-ice',
            'Calyrex-Shadow': 'calyrex-shadow',
            'Urshifu-Rapid-Strike': 'urshifu-rapid-strike',
            'Urshifu-Single-Strike': 'urshifu',
            'Kyurem-Black': 'kyurem-black',
            'Kyurem-White': 'kyurem-white',
            'Necrozma-Dawn-Wings': 'necrozma-dawn-wings',
            'Necrozma-Dusk-Mane': 'necrozma-dusk-mane',
            'Zacian-Crowned': 'zacian-crowned',
            'Zamazenta-Crowned': 'zamazenta-crowned',
            'Tornadus-Therian': 'tornadus-therian',
            'Thundurus-Therian': 'thundurus-therian',
            'Landorus-Therian': 'landorus-therian',
            'Flutter Mane': 'flutter-mane',
            'Iron Hands': 'iron-hands',
            'Chien-Pao': 'chien-pao',
            'Wo-Chien': 'wo-chien',
            'Ting-Lu': 'ting-lu',
            'Chi-Yu': 'chi-yu'
        };

        // Check if we have a direct mapping
        if (nameMap[pokemonName]) {
            return nameMap[pokemonName];
        }

        // Convert to standard API format
        return pokemonName.toLowerCase()
            .replace(/\s+/g, '-')           // Replace spaces with hyphens
            .replace(/[^a-z0-9\-]/g, '')    // Remove special characters except hyphens
            .replace(/--+/g, '-')           // Replace multiple hyphens with single hyphen
            .replace(/^-|-$/g, '');         // Remove leading/trailing hyphens
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
            </div>
        );
    }

    return (
        <div className={`grid ${getGridClasses()} gap-2 ${className}`}>
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
    );
};

export default PokemonTeam;