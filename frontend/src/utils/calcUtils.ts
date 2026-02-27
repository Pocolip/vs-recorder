import { Generations, calcStat, NATURES } from "@smogon/calc";
import type { StatsTable } from "@smogon/calc";
import type { StylesConfig } from "react-select";
import type { PokemonState, FieldState, SideState, MoveState, StatSpread, BoostSpread } from "../types";

const gen = Generations.get(9);

const NCP_STAT_MAP: Record<string, keyof StatSpread> = {
  hp: "hp",
  at: "atk",
  df: "def",
  sa: "spa",
  sd: "spd",
  sp: "spe",
};

export const STAT_NAMES: (keyof StatSpread)[] = ["hp", "atk", "def", "spa", "spd", "spe"];
export const STAT_LABELS: Record<keyof StatSpread, string> = {
  hp: "HP",
  atk: "Atk",
  def: "Def",
  spa: "SpA",
  spd: "SpD",
  spe: "Spe",
};

export const DEFAULT_EVS: StatSpread = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
export const DEFAULT_IVS: StatSpread = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
export const DEFAULT_BOOSTS: BoostSpread = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

export const NATURES_LIST: string[] = Object.keys(NATURES).sort();

export const STATUS_OPTIONS = [
  { value: "", label: "Healthy" },
  { value: "brn", label: "Burned" },
  { value: "par", label: "Paralyzed" },
  { value: "psn", label: "Poisoned" },
  { value: "tox", label: "Badly Poisoned" },
  { value: "slp", label: "Asleep" },
  { value: "frz", label: "Frozen" },
] as const;

interface SetdexEntry {
  level?: number;
  nature?: string;
  ability?: string;
  item?: string;
  tera_type?: string;
  evs?: Record<string, number>;
  ivs?: Record<string, number>;
  moves?: string[];
}

export function setdexToState(setdexEntry: SetdexEntry): PokemonState {
  const evs: StatSpread = { ...DEFAULT_EVS };
  const ivs: StatSpread = { ...DEFAULT_IVS };

  if (setdexEntry.evs) {
    for (const [ncpKey, val] of Object.entries(setdexEntry.evs)) {
      const ourKey = NCP_STAT_MAP[ncpKey];
      if (ourKey) evs[ourKey] = val;
    }
  }

  if (setdexEntry.ivs) {
    for (const [ncpKey, val] of Object.entries(setdexEntry.ivs)) {
      const ourKey = NCP_STAT_MAP[ncpKey];
      if (ourKey) ivs[ourKey] = val;
    }
  }

  return {
    species: "",
    level: setdexEntry.level || 50,
    nature: setdexEntry.nature || "Hardy",
    ability: setdexEntry.ability || "",
    item: setdexEntry.item || "",
    teraType: setdexEntry.tera_type || null,
    isTera: false,
    status: "",
    evs,
    ivs,
    boosts: { ...DEFAULT_BOOSTS },
    curHP: 100,
    moves: (setdexEntry.moves || []).map((name) => ({ name, crit: false, bpOverride: null })),
    boostedStat: null,
  };
}

const SPECIES_NAME_MAP: Record<string, string> = {
  "Urshifu-Single Strike": "Urshifu",
  "Urshifu-Rapid Strike": "Urshifu-Rapid-Strike",
  "Calyrex-Ice Rider": "Calyrex-Ice",
  "Calyrex-Shadow Rider": "Calyrex-Shadow",
  "Lycanroc-Midday": "Lycanroc",
  "Terapagos": "Terapagos-Terastal",
};

// --- Terapagos & Ogerpon tera forme handling ---

const OGERPON_TERA_MAP: Record<string, string> = {
  "Ogerpon": "Grass",
  "Ogerpon-Wellspring": "Water",
  "Ogerpon-Hearthflame": "Fire",
  "Ogerpon-Cornerstone": "Rock",
};

const OGERPON_TERA_SPECIES: Record<string, string> = {
  "Ogerpon": "Ogerpon-Teal-Tera",
  "Ogerpon-Wellspring": "Ogerpon-Wellspring-Tera",
  "Ogerpon-Hearthflame": "Ogerpon-Hearthflame-Tera",
  "Ogerpon-Cornerstone": "Ogerpon-Cornerstone-Tera",
};

const OGERPON_UNTERA_SPECIES: Record<string, string> = {
  "Ogerpon-Teal-Tera": "Ogerpon",
  "Ogerpon-Wellspring-Tera": "Ogerpon-Wellspring",
  "Ogerpon-Hearthflame-Tera": "Ogerpon-Hearthflame",
  "Ogerpon-Cornerstone-Tera": "Ogerpon-Cornerstone",
};

const OGERPON_EMBODY_ASPECT: Record<string, string> = {
  "Ogerpon": "Embody Aspect (Teal)",
  "Ogerpon-Wellspring": "Embody Aspect (Wellspring)",
  "Ogerpon-Hearthflame": "Embody Aspect (Hearthflame)",
  "Ogerpon-Cornerstone": "Embody Aspect (Cornerstone)",
};

const OGERPON_BASE_ABILITIES: Record<string, string> = {
  "Ogerpon": "Defiant",
  "Ogerpon-Wellspring": "Water Absorb",
  "Ogerpon-Hearthflame": "Mold Breaker",
  "Ogerpon-Cornerstone": "Sturdy",
};

const OGERPON_DEFAULT_ITEMS: Record<string, string> = {
  "Ogerpon-Wellspring": "Wellspring Mask",
  "Ogerpon-Hearthflame": "Hearthflame Mask",
  "Ogerpon-Cornerstone": "Cornerstone Mask",
};

export function getTeraDefaults(species: string): { teraType: string; item?: string } | null {
  if (species === "Terapagos" || species === "Terapagos-Terastal" || species === "Terapagos-Stellar") {
    return { teraType: "Stellar" };
  }
  const ogerponType = OGERPON_TERA_MAP[species];
  if (ogerponType) return { teraType: ogerponType, item: OGERPON_DEFAULT_ITEMS[species] };
  // Also handle tera forme species
  const baseSpecies = OGERPON_UNTERA_SPECIES[species];
  if (baseSpecies) return { teraType: OGERPON_TERA_MAP[baseSpecies], item: OGERPON_DEFAULT_ITEMS[baseSpecies] };
  return null;
}

export function applyTeraFormeChange(
  species: string,
  isTera: boolean,
): { species: string; ability: string; teraType: string } | null {
  if (isTera) {
    // Tera ON
    if (species === "Terapagos-Terastal") {
      return { species: "Terapagos-Stellar", ability: "Teraform Zero", teraType: "Stellar" };
    }
    if (OGERPON_TERA_SPECIES[species]) {
      return {
        species: OGERPON_TERA_SPECIES[species],
        ability: OGERPON_EMBODY_ASPECT[species],
        teraType: OGERPON_TERA_MAP[species],
      };
    }
  } else {
    // Tera OFF
    if (species === "Terapagos-Stellar") {
      return { species: "Terapagos-Terastal", ability: "Tera Shell", teraType: "Stellar" };
    }
    const baseSpecies = OGERPON_UNTERA_SPECIES[species];
    if (baseSpecies) {
      return {
        species: baseSpecies,
        ability: OGERPON_BASE_ABILITIES[baseSpecies],
        teraType: OGERPON_TERA_MAP[baseSpecies],
      };
    }
  }
  return null;
}

export function hasLockedTeraType(species: string): boolean {
  return getTeraDefaults(species) !== null;
}

export function normalizeSpeciesName(name: string): string {
  return SPECIES_NAME_MAP[name] || name;
}

export function getBaseStats(species: string): StatsTable | null {
  if (!species) return null;
  for (const s of gen.species) {
    if (s.name === species) return s.baseStats;
  }
  return null;
}

export function getSpeciesInfo(species: string) {
  if (!species) return null;
  for (const s of gen.species) {
    if (s.name === species) return s;
  }
  return null;
}

export function calcFinalStat(
  statName: string,
  base: number,
  iv: number,
  ev: number,
  level: number,
  nature: string,
): number {
  if (!base) return 0;
  return calcStat(gen, statName as keyof StatsTable, base, iv, ev, level, nature);
}

let _speciesListCache: string[] | null = null;
export function getSpeciesList(): string[] {
  if (_speciesListCache) return _speciesListCache;
  const list: string[] = [];
  for (const s of gen.species) {
    list.push(s.name);
  }
  _speciesListCache = list.sort();
  return _speciesListCache;
}

let _moveListCache: string[] | null = null;
export function getMoveList(): string[] {
  if (_moveListCache) return _moveListCache;
  const list: string[] = [];
  for (const m of gen.moves) {
    list.push(m.name);
  }
  _moveListCache = list.sort();
  return _moveListCache;
}

let _itemListCache: string[] | null = null;
export function getItemList(): string[] {
  if (_itemListCache) return _itemListCache;
  const list: string[] = [];
  for (const i of gen.items) {
    list.push(i.name);
  }
  _itemListCache = list.sort();
  return _itemListCache;
}

export function getAbilitiesForSpecies(species: string): string[] {
  const info = getSpeciesInfo(species);
  if (!info || !info.abilities) return [];
  return Object.values(info.abilities).filter(Boolean) as string[];
}

export function getTypeList(): string[] {
  const list: string[] = [];
  for (const t of gen.types) {
    list.push(t.name);
  }
  return list.sort();
}

export function getNatureInfo(natureName: string): { plus: string | null; minus: string | null } {
  const nature = NATURES[natureName];
  if (!nature) return { plus: null, minus: null };
  return { plus: nature[0] as string | null, minus: nature[1] as string | null };
}

export function formatDamageRange(result: { range: () => [number, number]; defender: { maxHP: () => number } } | null): string {
  if (!result) return "";
  try {
    const [min, max] = result.range();
    const defenderHP = result.defender.maxHP();
    if (defenderHP === 0) return "0 - 0%";
    const minPct = ((min / defenderHP) * 100).toFixed(1);
    const maxPct = ((max / defenderHP) * 100).toFixed(1);
    return `${minPct} - ${maxPct}%`;
  } catch {
    return "";
  }
}

export function getKOChance(result: { desc: () => string } | null): string {
  if (!result) return "";
  try {
    const desc = result.desc();
    const match = desc.match(/--\s*(.+)$/);
    return match ? match[1] : "";
  } catch {
    return "";
  }
}

export function getDamageColor(result: { range: () => [number, number]; defender: { maxHP: () => number } } | null): string {
  if (!result) return "text-gray-400";
  try {
    const [, max] = result.range();
    const defenderHP = result.defender.maxHP();
    const pct = (max / defenderHP) * 100;
    if (pct >= 100) return "text-red-400";
    if (pct >= 75) return "text-orange-400";
    if (pct >= 50) return "text-yellow-400";
    if (pct >= 25) return "text-blue-400";
    return "text-green-400";
  } catch {
    return "text-gray-400";
  }
}

export function createDefaultPokemonState(species = ""): PokemonState {
  return {
    species,
    level: 50,
    nature: "Hardy",
    ability: "",
    item: "",
    teraType: null,
    isTera: false,
    status: "",
    evs: { ...DEFAULT_EVS },
    ivs: { ...DEFAULT_IVS },
    boosts: { ...DEFAULT_BOOSTS },
    curHP: 100,
    moves: [
      { name: "", crit: false, bpOverride: null },
      { name: "", crit: false, bpOverride: null },
      { name: "", crit: false, bpOverride: null },
      { name: "", crit: false, bpOverride: null },
    ],
    boostedStat: null,
  };
}

export function createDefaultSide(): SideState {
  return {
    isReflect: false,
    isLightScreen: false,
    isAuroraVeil: false,
    isHelpingHand: false,
    isTailwind: false,
    isFriendGuard: false,
    isSteelySpiritAlly: false,
    isPowerSpot: false,
    isBattery: false,
    steelsurge: 0,
    spikes: 0,
    isSR: false,
  };
}

export function createDefaultFieldState(): FieldState {
  return {
    gameType: "Doubles",
    terrain: "",
    weather: "",
    isGravity: false,
    isNeutralizingGas: false,
    attackerSide: createDefaultSide(),
    defenderSide: createDefaultSide(),
    isTabletsOfRuin: false,
    isVesselOfRuin: false,
    isSwordOfRuin: false,
    isBeadsOfRuin: false,
  };
}

export type BoostedStat = 'atk' | 'def' | 'spa' | 'spd' | 'spe';

const BOOSTABLE_STATS: BoostedStat[] = ['atk', 'def', 'spa', 'spd', 'spe'];

export function computeHighestStat(
  species: string,
  evs: StatSpread,
  ivs: StatSpread,
  level: number,
  nature: string,
): BoostedStat | null {
  const baseStats = getBaseStats(species);
  if (!baseStats) return null;

  let best: BoostedStat = 'atk';
  let bestVal = 0;
  for (const stat of BOOSTABLE_STATS) {
    const val = calcFinalStat(stat, baseStats[stat], ivs[stat], evs[stat], level, nature);
    if (val > bestVal) {
      bestVal = val;
      best = stat;
    }
  }
  return best;
}

// Suppress unused imports warning — these types are re-exported for consumers
export type { PokemonState, FieldState, SideState, MoveState, StatSpread, BoostSpread };

export function getSelectStyles(dark: boolean): StylesConfig {
  return {
    control: (base, state) => ({
      ...base,
      backgroundColor: dark ? "rgb(51, 65, 85)" : "rgb(255, 255, 255)",
      borderColor: state.isFocused ? "rgb(16, 185, 129)" : dark ? "rgb(71, 85, 105)" : "rgb(209, 213, 219)",
      "&:hover": { borderColor: "rgb(16, 185, 129)" },
      boxShadow: state.isFocused ? "0 0 0 1px rgb(16, 185, 129)" : "none",
      minHeight: "32px",
      fontSize: "0.875rem",
    }),
    menu: (base) => ({
      ...base,
      backgroundColor: dark ? "rgb(30, 41, 59)" : "rgb(255, 255, 255)",
      border: `1px solid ${dark ? "rgb(71, 85, 105)" : "rgb(229, 231, 235)"}`,
      zIndex: 50,
    }),
    menuList: (base) => ({
      ...base,
      maxHeight: "200px",
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "rgb(16, 185, 129)"
        : state.isFocused
          ? dark ? "rgb(51, 65, 85)" : "rgb(243, 244, 246)"
          : "transparent",
      color: state.isSelected ? "white" : dark ? "rgb(209, 213, 219)" : "rgb(55, 65, 81)",
      fontSize: "0.875rem",
      padding: "4px 8px",
      "&:active": { backgroundColor: "rgb(5, 150, 105)" },
    }),
    singleValue: (base) => ({
      ...base,
      color: dark ? "rgb(229, 231, 235)" : "rgb(31, 41, 55)",
    }),
    input: (base) => ({
      ...base,
      color: dark ? "rgb(229, 231, 235)" : "rgb(31, 41, 55)",
    }),
    placeholder: (base) => ({
      ...base,
      color: "rgb(107, 114, 128)",
    }),
    indicatorSeparator: (base) => ({
      ...base,
      backgroundColor: dark ? "rgb(71, 85, 105)" : "rgb(209, 213, 219)",
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: "rgb(156, 163, 175)",
      padding: "4px",
      "&:hover": { color: dark ? "rgb(229, 231, 235)" : "rgb(55, 65, 81)" },
    }),
    clearIndicator: (base) => ({
      ...base,
      color: "rgb(156, 163, 175)",
      padding: "4px",
      "&:hover": { color: dark ? "rgb(229, 231, 235)" : "rgb(55, 65, 81)" },
    }),
    group: (base) => ({
      ...base,
      paddingTop: 4,
      paddingBottom: 4,
    }),
    groupHeading: (base) => ({
      ...base,
      color: dark ? "rgb(156, 163, 175)" : "rgb(107, 114, 128)",
      fontSize: "0.75rem",
      fontWeight: 600,
      textTransform: "uppercase" as const,
      letterSpacing: "0.05em",
    }),
    noOptionsMessage: (base) => ({
      ...base,
      color: "rgb(107, 114, 128)",
    }),
  };
}

export function getCompactSelectStyles(dark: boolean): StylesConfig {
  const base = getSelectStyles(dark);
  return {
    ...base,
    control: (b, state) => ({
      ...(base.control as (b: object, state: object) => object)(b, state),
      minHeight: "28px",
      fontSize: "0.8rem",
    }),
    valueContainer: (b) => ({
      ...b,
      padding: "0 4px",
    }),
    dropdownIndicator: (b) => ({
      ...b,
      padding: "2px",
      color: "rgb(156, 163, 175)",
      "&:hover": { color: dark ? "rgb(229, 231, 235)" : "rgb(55, 65, 81)" },
    }),
  };
}
