// src/utils/pokemonNameUtils.js

/**
 * Comprehensive mapping of Pokemon forms to their API-compatible names
 * Includes all forms found across VGC and handles special Showdown notation
 */
const POKEMON_FORM_MAPPINGS = {
    // Urshifu forms
    'Urshifu-*': 'urshifu', // Showdown's ambiguous form notation
    'Urshifu-Rapid-Strike': 'urshifu-rapid-strike',
    'Urshifu-Single-Strike': 'urshifu',
    'Urshifu-Single Strike': 'urshifu', // Alternative spacing

    // Calyrex forms
    'Calyrex-Shadow': 'calyrex-shadow',
    'Calyrex-Ice': 'calyrex-ice',
    'Calyrex-Shadow Rider': 'calyrex-shadow', // Alternative naming
    'Calyrex-Ice Rider': 'calyrex-ice',

    // Kyurem forms
    'Kyurem-Black': 'kyurem-black',
    'Kyurem-White': 'kyurem-white',

    // Necrozma forms
    'Necrozma-Dawn-Wings': 'necrozma-dawn-wings',
    'Necrozma-Dusk-Mane': 'necrozma-dusk-mane',
    'Necrozma-Dawn Wings': 'necrozma-dawn-wings', // Alternative spacing
    'Necrozma-Dusk Mane': 'necrozma-dusk-mane',

    // Zacian/Zamazenta forms
    'Zacian-Crowned': 'zacian-crowned',
    'Zamazenta-Crowned': 'zamazenta-crowned',
    'Zacian-Crowned Sword': 'zacian-crowned', // Alternative naming
    'Zamazenta-Crowned Shield': 'zamazenta-crowned',

    // Forces of Nature forms
    'Tornadus-Therian': 'tornadus-therian',
    'Thundurus-Therian': 'thundurus-therian',
    'Landorus-Therian': 'landorus-therian',
    'Enamorus': 'enamorus-incarnate',
    'Enamorus-Therian': 'enamorus-therian',

    // Paradox Pokemon (Generation 9)
    'Iron Hands': 'iron-hands',
    'Iron Bundle': 'iron-bundle',
    'Iron Valiant': 'iron-valiant',
    'Iron Crown': 'iron-crown',
    'Iron Boulder': 'iron-boulder',
    'Iron Moth': 'iron-moth',
    'Iron Thorns': 'iron-thorns',
    'Iron Jugulis': 'iron-jugulis',
    'Iron Treads': 'iron-treads',
    'Iron Leaves': 'iron-leaves',
    'Flutter Mane': 'flutter-mane',
    'Scream Tail': 'scream-tail',
    'Brute Bonnet': 'brute-bonnet',
    'Roaring Moon': 'roaring-moon',
    'Walking Wake': 'walking-wake',
    'Raging Bolt': 'raging-bolt',
    'Gouging Fire': 'gouging-fire',
    'Sandy Shocks': 'sandy-shocks',
    'Great Tusk': 'great-tusk',
    'Slither Wing': 'slither-wing',

    // Treasures of Ruin
    'Chien-Pao': 'chien-pao',
    'Wo-Chien': 'wo-chien',
    'Ting-Lu': 'ting-lu',
    'Chi-Yu': 'chi-yu',

    // Ogerpon forms
    'Ogerpon-Hearthflame': 'ogerpon-hearthflame-mask',
    'Ogerpon-Wellspring': 'ogerpon-wellspring-mask',
    'Ogerpon-Cornerstone': 'ogerpon-cornerstone-mask',
    'Ogerpon-Teal': 'ogerpon',
    'Ogerpon-Hearthflame Mask': 'ogerpon-hearthflame-mask', // Alternative naming
    'Ogerpon-Wellspring Mask': 'ogerpon-wellspring-mask',
    'Ogerpon-Cornerstone Mask': 'ogerpon-cornerstone-mask',

    // Gender-based forms
    'Indeedee-F': 'indeedee-female',
    'Indeedee-M': 'indeedee-male',
    'Indeedee': 'indeedee-male',
    'Meowstic-F': 'meowstic-female',
    'Meowstic-M': 'meowstic',
    'Basculegion-F': 'basculegion-female',
    'Basculegion-M': 'basculegion-male',
    'Basculegion': 'basculegion-male',
    'Oinkologne-F': 'oinkologne-female',
    'Oinkologne-M': 'oinkologne-male',
    'Oinkologne': 'oinkologne-male',

    // Terapagos forms
    'Terapagos-Terastal': 'terapagos-terastal',
    'Terapagos-Stellar': 'terapagos-stellar',

    // Origin forms
    'Giratina-Origin': 'giratina-origin',
    'Giratina-Altered': 'giratina',
    'Dialga-Origin': 'dialga-origin',
    'Palkia-Origin': 'palkia-origin',

    // Rotom forms
    'Rotom-Heat': 'rotom-heat',
    'Rotom-Wash': 'rotom-wash',
    'Rotom-Frost': 'rotom-frost',
    'Rotom-Fan': 'rotom-fan',
    'Rotom-Mow': 'rotom-mow',

    // Size-based forms (normalize to base form)
    'Gourgeist-Small': 'gourgeist',
    'Gourgeist-Large': 'gourgeist',
    'Gourgeist-Super': 'gourgeist',
    'Pumpkaboo-Small': 'pumpkaboo',
    'Pumpkaboo-Large': 'pumpkaboo',
    'Pumpkaboo-Super': 'pumpkaboo',

    // Counterfeit/Artisan forms (normalize to base)
    'Sinistcha-Masterpiece': 'sinistcha',
    'Sinistcha-Counterfeit': 'sinistcha',
    'Poltchageist-Artisan': 'poltchageist',
    'Poltchageist-Counterfeit': 'poltchageist',

    // Alcremie forms (too many variants, normalize to base)
    'Alcremie-Ruby Cream': 'alcremie',
    'Alcremie-Matcha Cream': 'alcremie',
    'Alcremie-Mint Cream': 'alcremie',
    'Alcremie-Lemon Cream': 'alcremie',
    'Alcremie-Salted Cream': 'alcremie',
    'Alcremie-Ruby Swirl': 'alcremie',
    'Alcremie-Caramel Swirl': 'alcremie',
    'Alcremie-Rainbow Swirl': 'alcremie',

    // Maushold forms
    'Maushold': 'maushold-family-of-three',
    'Maushold-Family-of-Three': 'maushold-family-of-three',
    'Maushold-Three': 'maushold-family-of-three',
    'Maushold-Family-of-Four': 'maushold-family-of-four', // if API supports, otherwise 'maushold'
    'Maushold-Four': 'maushold-family-of-four', // if API supports, otherwise 'maushold'

    // Tatsugiri forms
    'Tatsugiri-Curly': 'tatsugiri',
    'Tatsugiri': 'tatsugiri-curly',
    'Tatsugiri-Droopy': 'tatsugiri-droopy',
    'Tatsugiri-Stretchy': 'tatsugiri-stretchy',

    //Palafin
    'Palafin':'palafin-hero',

    //Mimikyu
    'Mimikyu': 'mimikyu-disguised',

    //Tauros
    'Tauros-Paldea-Aqua': 'tauros-paldea-aqua-breed',
    'Tauros-Paldea-Blaze': 'tauros-paldea-blaze-breed',
    'Tauros-Paldea-Combat': 'tauros-paldea-combat-breed',

    //Vivillon
    'Vivillon-Pokeball': 'vivillon',

    //Eiscue
    "Eiscue": "eiscue-ice",

    //Lycanroc
    "Lycanroc": "lycanroc-midday",

    //Toxtricity
    "Toxtricity": "toxtricity-amped",


    // Regional forms
    'Articuno-Galar': 'articuno-galar',
    'Zapdos-Galar': 'zapdos-galar',
    'Moltres-Galar': 'moltres-galar',
    'Slowking-Galar': 'slowking-galar',
    'Corsola-Galar': 'corsola-galar',
    'Cursola': 'cursola', // Evolution of Galarian Corsola
    'Darmanitan-Galar': 'darmanitan-galar',
    'Darmanitan-Galar-Zen': 'darmanitan-galar-zen',

    // Mega forms (if needed for older generations)
    'Charizard-Mega-X': 'charizard-mega-x',
    'Charizard-Mega-Y': 'charizard-mega-y',
    'Mewtwo-Mega-X': 'mewtwo-mega-x',
    'Mewtwo-Mega-Y': 'mewtwo-mega-y'
};

/**
 * Clean and normalize a Pokemon name from various sources (Showdown, Pokepaste, etc.)
 * @param {string} pokemonName - Raw Pokemon name that may include metadata
 * @returns {string} Cleaned, API-compatible Pokemon name
 */
export const cleanPokemonName = (pokemonName) => {
    if (!pokemonName || typeof pokemonName !== 'string') {
        return '';
    }

    // Remove metadata commonly found in Showdown logs
    let cleanName = pokemonName
        .split(',')[0] // Remove level, gender, etc. (e.g., "Pikachu, L50, M" -> "Pikachu")
        .trim();

    // Remove nickname in parentheses (e.g., "Pikachu (Sparky)" -> "Pikachu")
    if (cleanName.includes('(') && cleanName.includes(')')) {
        cleanName = cleanName.split('(')[0].trim();
    }

    // Remove gender indicators that might be standalone
    cleanName = cleanName.replace(/\s*\(M\)|\s*\(F\)/g, '').trim();

    // Check if we have a direct mapping for this specific form
    if (POKEMON_FORM_MAPPINGS[cleanName]) {
        return POKEMON_FORM_MAPPINGS[cleanName];
    }

    // Convert to API-compatible format
    return cleanName
        .toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with hyphens
        .replace(/[^a-z0-9\-]/g, '')    // Remove special characters except hyphens
        .replace(/--+/g, '-')           // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, '');         // Remove leading/trailing hyphens
};

/**
 * Parse Pokemon name from Showdown format, handling special cases
 * @param {string} showdownName - Pokemon name from Showdown (e.g., "Urshifu-*", "Calyrex-Shadow")
 * @returns {string} Normalized Pokemon name for API use
 */
export const parseShowdownName = (showdownName) => {
    if (!showdownName) return '';

    // Handle special Showdown notation like "Urshifu-*"
    if (showdownName.includes('-*')) {
        // This indicates an ambiguous form in team preview
        // Default to the base form or most common variant
        const baseName = showdownName.replace('-*', '');
        return cleanPokemonName(baseName);
    }

    return cleanPokemonName(showdownName);
};

/**
 * Convert a display name (from Pokepaste) to API format
 * Handles the full parsing pipeline from team building tools
 * @param {string} displayName - Human-readable Pokemon name
 * @returns {string} API-compatible name
 */
export const convertDisplayNameToApi = (displayName) => {
    if (!displayName) return '';

    // Remove everything after @ (held item)
    let name = displayName;
    if (name.includes('@')) {
        name = name.split('@')[0].trim();
    }

    // Remove nickname in parentheses
    if (name.includes('(') && name.includes(')')) {
        // Handle cases like "Nickname (Species)" vs "Species (Form)"
        const parts = name.split('(');
        if (parts.length === 2) {
            const beforeParen = parts[0].trim();
            const inParen = parts[1].replace(')', '').trim();

            // If what's in parentheses looks like a Pokemon name, use that
            // Otherwise, use what's before the parentheses
            if (inParen.includes('-') || POKEMON_FORM_MAPPINGS[inParen] ||
                ['M', 'F', 'Male', 'Female'].includes(inParen)) {
                name = beforeParen;
            } else {
                // Probably a nickname situation
                name = inParen;
            }
        }
    }

    return cleanPokemonName(name);
};

/**
 * Get display name from API name (reverse operation)
 * @param {string} apiName - API-compatible Pokemon name
 * @returns {string} Human-readable display name
 */
export const getDisplayName = (apiName) => {
    if (!apiName) return '';

    // Convert API format back to readable format
    return apiName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};

/**
 * Check if a Pokemon name represents a valid Pokemon
 * @param {string} pokemonName - Pokemon name to validate
 * @returns {boolean} True if the name appears to be a valid Pokemon
 */
export const isValidPokemonName = (pokemonName) => {
    if (!pokemonName || typeof pokemonName !== 'string') {
        return false;
    }

    const cleaned = cleanPokemonName(pokemonName);

    // Basic validation: should be at least 3 characters and contain letters
    return cleaned.length >= 3 && /[a-z]/.test(cleaned);
};

/**
 * Extract Pokemon names from a Pokepaste text block
 * @param {string} pokepasteText - Raw text from a Pokepaste
 * @returns {string[]} Array of cleaned Pokemon names
 */
export const extractPokemonFromPokepaste = (pokepasteText) => {
    if (!pokepasteText) return [];

    const lines = pokepasteText.split('\n');
    const pokemonNames = [];

    for (const line of lines) {
        const trimmedLine = line.trim();

        // Skip empty lines, comments, and stat/move lines
        if (!trimmedLine ||
            trimmedLine.startsWith('//') ||
            trimmedLine.includes(':') ||
            trimmedLine.startsWith('-') ||
            trimmedLine.toLowerCase().includes('nature') ||
            trimmedLine.toLowerCase().includes('ability') ||
            trimmedLine.toLowerCase().includes('level') ||
            trimmedLine.toLowerCase().includes('evs') ||
            trimmedLine.toLowerCase().includes('ivs')) {
            continue;
        }

        // This should be a Pokemon name line
        const pokemonName = convertDisplayNameToApi(trimmedLine);

        if (isValidPokemonName(pokemonName) && !pokemonNames.includes(pokemonName)) {
            pokemonNames.push(pokemonName);
        }
    }

    return pokemonNames;
};