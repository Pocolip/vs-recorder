// Mega-stone item → @smogon/calc species name.
// Hand-derived from `Generations.get(9).items` + `Generations.get(9).species`
// in @smogon/calc — includes Champions-specific stones (e.g. Hawluchanite,
// Absolite Z). For ambiguous parents (Meowstic gender, Tatsugiri form) the
// most common competitive variant is used as default.
const MEGA_STONE_FORMES: Record<string, string> = {
  // Gen 6/7 originals
  Abomasite: "Abomasnow-Mega",
  Absolite: "Absol-Mega",
  Aerodactylite: "Aerodactyl-Mega",
  Aggronite: "Aggron-Mega",
  Alakazite: "Alakazam-Mega",
  Altarianite: "Altaria-Mega",
  Ampharosite: "Ampharos-Mega",
  Audinite: "Audino-Mega",
  Banettite: "Banette-Mega",
  Beedrillite: "Beedrill-Mega",
  Blastoisinite: "Blastoise-Mega",
  Blazikenite: "Blaziken-Mega",
  Cameruptite: "Camerupt-Mega",
  "Charizardite X": "Charizard-Mega-X",
  "Charizardite Y": "Charizard-Mega-Y",
  Diancite: "Diancie-Mega",
  Galladite: "Gallade-Mega",
  Garchompite: "Garchomp-Mega",
  Gardevoirite: "Gardevoir-Mega",
  Gengarite: "Gengar-Mega",
  Glalitite: "Glalie-Mega",
  Gyaradosite: "Gyarados-Mega",
  Heracronite: "Heracross-Mega",
  Houndoominite: "Houndoom-Mega",
  Kangaskhanite: "Kangaskhan-Mega",
  Latiasite: "Latias-Mega",
  Latiosite: "Latios-Mega",
  Lopunnite: "Lopunny-Mega",
  Lucarionite: "Lucario-Mega",
  Manectite: "Manectric-Mega",
  Mawilite: "Mawile-Mega",
  Medichamite: "Medicham-Mega",
  Metagrossite: "Metagross-Mega",
  "Mewtwonite X": "Mewtwo-Mega-X",
  "Mewtwonite Y": "Mewtwo-Mega-Y",
  Pidgeotite: "Pidgeot-Mega",
  Pinsirite: "Pinsir-Mega",
  Sablenite: "Sableye-Mega",
  Salamencite: "Salamence-Mega",
  Sceptilite: "Sceptile-Mega",
  Scizorite: "Scizor-Mega",
  Sharpedonite: "Sharpedo-Mega",
  Slowbronite: "Slowbro-Mega",
  Steelixite: "Steelix-Mega",
  Swampertite: "Swampert-Mega",
  Tyranitarite: "Tyranitar-Mega",
  Venusaurite: "Venusaur-Mega",

  // CAP / community
  Crucibellite: "Crucibelle-Mega",

  // Pokemon Champions-introduced stones
  "Absolite Z": "Absol-Mega-Z",
  Barbaracite: "Barbaracle-Mega",
  Baxcalibrite: "Baxcalibur-Mega",
  Chandelurite: "Chandelure-Mega",
  Chesnaughtite: "Chesnaught-Mega",
  Chimechite: "Chimecho-Mega",
  Clefablite: "Clefable-Mega",
  Crabominite: "Crabominable-Mega",
  Darkranite: "Darkrai-Mega",
  Delphoxite: "Delphox-Mega",
  Dragalgite: "Dragalge-Mega",
  Dragoninite: "Dragonite-Mega",
  Drampanite: "Drampa-Mega",
  Eelektrossite: "Eelektross-Mega",
  Emboarite: "Emboar-Mega",
  Excadrite: "Excadrill-Mega",
  Falinksite: "Falinks-Mega",
  Feraligite: "Feraligatr-Mega",
  Floettite: "Floette-Mega",
  Froslassite: "Froslass-Mega",
  "Garchompite Z": "Garchomp-Mega-Z",
  Glimmoranite: "Glimmora-Mega",
  Golisopite: "Golisopod-Mega",
  Golurkite: "Golurk-Mega",
  Greninjite: "Greninja-Mega",
  Hawluchanite: "Hawlucha-Mega",
  Heatranite: "Heatran-Mega",
  "Lucarionite Z": "Lucario-Mega-Z",
  Magearnite: "Magearna-Mega",
  Malamarite: "Malamar-Mega",
  Meganiumite: "Meganium-Mega",
  Meowsticite: "Meowstic-M-Mega",
  Pyroarite: "Pyroar-Mega",
  "Raichunite X": "Raichu-Mega-X",
  "Raichunite Y": "Raichu-Mega-Y",
  Scolipite: "Scolipede-Mega",
  Scovillainite: "Scovillain-Mega",
  Scraftinite: "Scrafty-Mega",
  Skarmorite: "Skarmory-Mega",
  Staraptite: "Staraptor-Mega",
  Starminite: "Starmie-Mega",
  Tatsugirinite: "Tatsugiri-Curly-Mega",
  Victreebelite: "Victreebel-Mega",
  Zeraorite: "Zeraora-Mega",
  Zygardite: "Zygarde-Mega",
};

export function getMegaForme(item: string | undefined | null): string | null {
  if (!item) return null;
  return MEGA_STONE_FORMES[item] ?? null;
}

export function getAllMegaStones(): ReadonlyArray<[string, string]> {
  return Object.entries(MEGA_STONE_FORMES);
}

// Item-level speed multipliers applied at runtime. Mega-stone item modifiers
// (no speed effect) are intentionally absent.
const ITEM_SPEED_MULTIPLIER: Record<string, number> = {
  "Choice Scarf": 1.5,
  "Iron Ball": 0.5,
  "Macho Brace": 0.5,
  "Power Anklet": 0.5,
  "Power Band": 0.5,
  "Power Belt": 0.5,
  "Power Bracer": 0.5,
  "Power Lens": 0.5,
  "Power Weight": 0.5,
};

// Quick Powder only doubles Ditto's speed (and only if Ditto isn't transformed).
const DITTO_ONLY_ITEMS: Record<string, number> = {
  "Quick Powder": 2,
};

export function getItemSpeedMultiplier(item: string | undefined | null, species: string): number {
  if (!item) return 1;
  if (item in ITEM_SPEED_MULTIPLIER) return ITEM_SPEED_MULTIPLIER[item];
  if (species === "Ditto" && item in DITTO_ONLY_ITEMS) return DITTO_ONLY_ITEMS[item];
  return 1;
}
