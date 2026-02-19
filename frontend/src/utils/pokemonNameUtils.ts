const POKEMON_FORM_MAPPINGS: Record<string, string> = {
  // Urshifu forms
  "Urshifu-*": "urshifu",
  "Urshifu-Rapid-Strike": "urshifu-rapid-strike",
  "Urshifu-Single-Strike": "urshifu",
  "Urshifu-Single Strike": "urshifu",

  // Calyrex forms
  "Calyrex-Shadow": "calyrex-shadow",
  "Calyrex-Ice": "calyrex-ice",
  "Calyrex-Shadow Rider": "calyrex-shadow",
  "Calyrex-Ice Rider": "calyrex-ice",

  // Kyurem forms
  "Kyurem-Black": "kyurem-black",
  "Kyurem-White": "kyurem-white",

  // Necrozma forms
  "Necrozma-Dawn-Wings": "necrozma-dawn-wings",
  "Necrozma-Dusk-Mane": "necrozma-dusk-mane",
  "Necrozma-Dawn Wings": "necrozma-dawn-wings",
  "Necrozma-Dusk Mane": "necrozma-dusk-mane",

  // Zacian/Zamazenta forms
  "Zacian-Crowned": "zacian-crowned",
  "Zamazenta-Crowned": "zamazenta-crowned",
  "Zacian-Crowned Sword": "zacian-crowned",
  "Zamazenta-Crowned Shield": "zamazenta-crowned",

  // Forces of Nature forms
  "Tornadus-Therian": "tornadus-therian",
  "Thundurus-Therian": "thundurus-therian",
  "Landorus-Therian": "landorus-therian",
  "Enamorus": "enamorus-incarnate",
  "Enamorus-Therian": "enamorus-therian",

  // Paradox Pokemon (Generation 9)
  "Iron Hands": "iron-hands",
  "Iron Bundle": "iron-bundle",
  "Iron Valiant": "iron-valiant",
  "Iron Crown": "iron-crown",
  "Iron Boulder": "iron-boulder",
  "Iron Moth": "iron-moth",
  "Iron Thorns": "iron-thorns",
  "Iron Jugulis": "iron-jugulis",
  "Iron Treads": "iron-treads",
  "Iron Leaves": "iron-leaves",
  "Flutter Mane": "flutter-mane",
  "Scream Tail": "scream-tail",
  "Brute Bonnet": "brute-bonnet",
  "Roaring Moon": "roaring-moon",
  "Walking Wake": "walking-wake",
  "Raging Bolt": "raging-bolt",
  "Gouging Fire": "gouging-fire",
  "Sandy Shocks": "sandy-shocks",
  "Great Tusk": "great-tusk",
  "Slither Wing": "slither-wing",

  // Treasures of Ruin
  "Chien-Pao": "chien-pao",
  "Wo-Chien": "wo-chien",
  "Ting-Lu": "ting-lu",
  "Chi-Yu": "chi-yu",

  // Ogerpon forms
  "Ogerpon-Hearthflame": "ogerpon-hearthflame-mask",
  "Ogerpon-Wellspring": "ogerpon-wellspring-mask",
  "Ogerpon-Cornerstone": "ogerpon-cornerstone-mask",
  "Ogerpon-Teal": "ogerpon",
  "Ogerpon-Hearthflame Mask": "ogerpon-hearthflame-mask",
  "Ogerpon-Wellspring Mask": "ogerpon-wellspring-mask",
  "Ogerpon-Cornerstone Mask": "ogerpon-cornerstone-mask",

  // Gender-based forms
  "Indeedee-F": "indeedee-female",
  "Indeedee-M": "indeedee-male",
  "Indeedee": "indeedee-male",
  "Meowstic-F": "meowstic-female",
  "Meowstic-M": "meowstic",
  "Basculegion-F": "basculegion-female",
  "Basculegion-M": "basculegion-male",
  "Basculegion": "basculegion-male",
  "Oinkologne-F": "oinkologne-female",
  "Oinkologne-M": "oinkologne-male",
  "Oinkologne": "oinkologne-male",

  // Terapagos forms
  "Terapagos-Terastal": "terapagos-terastal",
  "Terapagos-Stellar": "terapagos-stellar",

  // Origin forms
  "Giratina-Origin": "giratina-origin",
  "Giratina-Altered": "giratina",
  "Dialga-Origin": "dialga-origin",
  "Palkia-Origin": "palkia-origin",

  // Rotom forms
  "Rotom-Heat": "rotom-heat",
  "Rotom-Wash": "rotom-wash",
  "Rotom-Frost": "rotom-frost",
  "Rotom-Fan": "rotom-fan",
  "Rotom-Mow": "rotom-mow",

  // Size-based forms
  "Gourgeist-Small": "gourgeist",
  "Gourgeist-Large": "gourgeist",
  "Gourgeist-Super": "gourgeist",
  "Pumpkaboo-Small": "pumpkaboo",
  "Pumpkaboo-Large": "pumpkaboo",
  "Pumpkaboo-Super": "pumpkaboo",

  // Counterfeit/Artisan forms
  "Sinistcha-Masterpiece": "sinistcha",
  "Sinistcha-Counterfeit": "sinistcha",
  "Poltchageist-Artisan": "poltchageist",
  "Poltchageist-Counterfeit": "poltchageist",

  // Alcremie forms
  "Alcremie-Ruby Cream": "alcremie",
  "Alcremie-Matcha Cream": "alcremie",
  "Alcremie-Mint Cream": "alcremie",
  "Alcremie-Lemon Cream": "alcremie",
  "Alcremie-Salted Cream": "alcremie",
  "Alcremie-Ruby Swirl": "alcremie",
  "Alcremie-Caramel Swirl": "alcremie",
  "Alcremie-Rainbow Swirl": "alcremie",

  // Maushold forms
  "Maushold": "maushold-family-of-three",
  "Maushold-Family-of-Three": "maushold-family-of-three",
  "Maushold-Three": "maushold-family-of-three",
  "Maushold-Family-of-Four": "maushold-family-of-four",
  "Maushold-Four": "maushold-family-of-four",

  // Tatsugiri forms
  "Tatsugiri-Curly": "tatsugiri",
  "Tatsugiri": "tatsugiri-curly",
  "Tatsugiri-Droopy": "tatsugiri-droopy",
  "Tatsugiri-Stretchy": "tatsugiri-stretchy",

  // Misc
  "Palafin": "palafin-hero",
  "Mimikyu": "mimikyu-disguised",
  "Tauros-Paldea-Aqua": "tauros-paldea-aqua",
  "Tauros-Paldea-Blaze": "tauros-paldea-blaze",
  "Tauros-Paldea-Combat": "tauros-paldea-combat",
  "Vivillon-Pokeball": "vivillon",
  "Eiscue": "eiscue-ice",
  "Lycanroc": "lycanroc-midday",
  "Toxtricity": "toxtricity-amped",

  // Regional forms
  "Articuno-Galar": "articuno-galar",
  "Zapdos-Galar": "zapdos-galar",
  "Moltres-Galar": "moltres-galar",
  "Slowking-Galar": "slowking-galar",
  "Corsola-Galar": "corsola-galar",
  "Cursola": "cursola",
  "Darmanitan-Galar": "darmanitan-galar",
  "Darmanitan-Galar-Zen": "darmanitan-galar-zen",

  // Mega forms
  "Charizard-Mega-X": "charizard-mega-x",
  "Charizard-Mega-Y": "charizard-mega-y",
  "Mewtwo-Mega-X": "mewtwo-mega-x",
  "Mewtwo-Mega-Y": "mewtwo-mega-y",
};

export const cleanPokemonName = (pokemonName: string): string => {
  if (!pokemonName || typeof pokemonName !== "string") {
    return "";
  }

  let cleanName = pokemonName.split(",")[0].trim();

  if (cleanName.includes("(") && cleanName.includes(")")) {
    cleanName = cleanName.split("(")[0].trim();
  }

  cleanName = cleanName.replace(/\s*\(M\)|\s*\(F\)/g, "").trim();

  if (POKEMON_FORM_MAPPINGS[cleanName]) {
    return POKEMON_FORM_MAPPINGS[cleanName];
  }

  return cleanName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/--+/g, "-")
    .replace(/^-|-$/g, "");
};

export const parseShowdownName = (showdownName: string): string => {
  if (!showdownName) return "";

  if (showdownName.includes("-*")) {
    const baseName = showdownName.replace("-*", "");
    return cleanPokemonName(baseName);
  }

  return cleanPokemonName(showdownName);
};

export const convertDisplayNameToApi = (displayName: string): string => {
  if (!displayName) return "";

  let name = displayName;
  if (name.includes("@")) {
    name = name.split("@")[0].trim();
  }

  if (name.includes("(") && name.includes(")")) {
    const parts = name.split("(");
    if (parts.length === 2) {
      const beforeParen = parts[0].trim();
      const inParen = parts[1].replace(")", "").trim();

      if (
        inParen.includes("-") ||
        POKEMON_FORM_MAPPINGS[inParen] ||
        ["M", "F", "Male", "Female"].includes(inParen)
      ) {
        name = beforeParen;
      } else {
        name = inParen;
      }
    }
  }

  return cleanPokemonName(name);
};

export const getDisplayName = (apiName: string): string => {
  if (!apiName) return "";

  return apiName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export const isValidPokemonName = (pokemonName: string): boolean => {
  if (!pokemonName || typeof pokemonName !== "string") {
    return false;
  }

  const cleaned = cleanPokemonName(pokemonName);
  return cleaned.length >= 3 && /[a-z]/.test(cleaned);
};

export const matchesPokemonTags = (pokemonNames: string[], tags: string[]): boolean => {
  if (!tags || tags.length === 0) return true;
  if (!pokemonNames || pokemonNames.length === 0) return false;

  return tags.every((tag) => {
    const lowerTag = tag.toLowerCase();
    return pokemonNames.some((name) => {
      const lowerName = name.toLowerCase();
      return lowerName.includes(lowerTag) || lowerName.replace(/-/g, " ").includes(lowerTag);
    });
  });
};

export const getOpponentPokemonFromReplay = (replay: {
  battleData?: { teams?: Record<string, string[]>; opponentPlayer?: string } | null;
}): string[] => {
  if (!replay?.battleData?.teams || !replay.battleData.opponentPlayer) {
    return [];
  }
  const opponentTeam = replay.battleData.teams[replay.battleData.opponentPlayer] || [];
  return opponentTeam.map((name) => cleanPokemonName(name));
};

export const extractPokemonFromPokepaste = (pokepasteText: string): string[] => {
  if (!pokepasteText) return [];

  const lines = pokepasteText.split("\n");
  const pokemonNames: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();

    const hasItemSeparator = trimmedLine.includes(" @ ");
    if (
      !trimmedLine ||
      trimmedLine.startsWith("//") ||
      (!hasItemSeparator &&
        (trimmedLine.includes(":") ||
          trimmedLine.startsWith("-") ||
          trimmedLine.toLowerCase().includes("nature") ||
          trimmedLine.toLowerCase().includes("level")))
    ) {
      continue;
    }

    const pokemonName = convertDisplayNameToApi(trimmedLine);

    if (isValidPokemonName(pokemonName) && !pokemonNames.includes(pokemonName)) {
      pokemonNames.push(pokemonName);
    }
  }

  return pokemonNames;
};
