// src/utils/calcUtils.js
import { Generations, calcStat, NATURES } from '@smogon/calc';

const gen = Generations.get(9);

// Map NCP setdex stat keys to @smogon/calc keys
const NCP_STAT_MAP = { hp: 'hp', at: 'atk', df: 'def', sa: 'spa', sd: 'spd', sp: 'spe' };

export const STAT_NAMES = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
export const STAT_LABELS = { hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe' };

export const DEFAULT_EVS = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
export const DEFAULT_IVS = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
export const DEFAULT_BOOSTS = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

export const NATURES_LIST = Object.keys(NATURES).sort();

export const STATUS_OPTIONS = [
  { value: '', label: 'Healthy' },
  { value: 'brn', label: 'Burned' },
  { value: 'par', label: 'Paralyzed' },
  { value: 'psn', label: 'Poisoned' },
  { value: 'tox', label: 'Badly Poisoned' },
  { value: 'slp', label: 'Asleep' },
  { value: 'frz', label: 'Frozen' },
];

// Convert NCP setdex entry to our Pokemon state shape
export function setdexToState(setdexEntry) {
  const evs = { ...DEFAULT_EVS };
  const ivs = { ...DEFAULT_IVS };

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
    level: setdexEntry.level || 50,
    nature: setdexEntry.nature || 'Hardy',
    ability: setdexEntry.ability || '',
    item: setdexEntry.item || '',
    teraType: setdexEntry.tera_type || null,
    isTera: false,
    status: '',
    evs,
    ivs,
    boosts: { ...DEFAULT_BOOSTS },
    curHP: 100,
    moves: (setdexEntry.moves || []).map(name => ({ name, crit: false, bpOverride: null })),
  };
}

// Get base stats for a species
export function getBaseStats(species) {
  if (!species) return null;
  for (const s of gen.species) {
    if (s.name === species) return s.baseStats;
  }
  return null;
}

// Get species info (types, abilities, weight)
export function getSpeciesInfo(species) {
  if (!species) return null;
  for (const s of gen.species) {
    if (s.name === species) return s;
  }
  return null;
}

// Calculate final stat value
export function calcFinalStat(statName, base, iv, ev, level, nature) {
  if (!base) return 0;
  return calcStat(gen, statName, base, iv, ev, level, nature);
}

// Get all species names sorted
let _speciesListCache = null;
export function getSpeciesList() {
  if (_speciesListCache) return _speciesListCache;
  const list = [];
  for (const s of gen.species) {
    list.push(s.name);
  }
  _speciesListCache = list.sort();
  return _speciesListCache;
}

// Get all move names sorted
let _moveListCache = null;
export function getMoveList() {
  if (_moveListCache) return _moveListCache;
  const list = [];
  for (const m of gen.moves) {
    list.push(m.name);
  }
  _moveListCache = list.sort();
  return _moveListCache;
}

// Get all item names sorted
let _itemListCache = null;
export function getItemList() {
  if (_itemListCache) return _itemListCache;
  const list = [];
  for (const i of gen.items) {
    list.push(i.name);
  }
  _itemListCache = list.sort();
  return _itemListCache;
}

// Get abilities for a species
export function getAbilitiesForSpecies(species) {
  const info = getSpeciesInfo(species);
  if (!info || !info.abilities) return [];
  return Object.values(info.abilities).filter(Boolean);
}

// Get all type names
export function getTypeList() {
  const list = [];
  for (const t of gen.types) {
    list.push(t.name);
  }
  return list.sort();
}

// Get nature modifier info
export function getNatureInfo(natureName) {
  const nature = NATURES[natureName];
  if (!nature) return { plus: null, minus: null };
  return { plus: nature[0], minus: nature[1] };
}

// Build damage percentage string from a result
export function formatDamageRange(result) {
  if (!result) return '';
  try {
    const [min, max] = result.range();
    const defenderHP = result.defender.maxHP();
    if (defenderHP === 0) return '0 - 0%';
    const minPct = ((min / defenderHP) * 100).toFixed(1);
    const maxPct = ((max / defenderHP) * 100).toFixed(1);
    return `${minPct} - ${maxPct}%`;
  } catch {
    return '';
  }
}

// Determine KO chance text
export function getKOChance(result) {
  if (!result) return '';
  try {
    const desc = result.desc();
    // Extract the KO text from the description (e.g., "guaranteed 2HKO")
    const match = desc.match(/--\s*(.+)$/);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

// Get damage color based on percentage
export function getDamageColor(result) {
  if (!result) return 'text-gray-400';
  try {
    const [, max] = result.range();
    const defenderHP = result.defender.maxHP();
    const pct = (max / defenderHP) * 100;
    if (pct >= 100) return 'text-red-400';
    if (pct >= 75) return 'text-orange-400';
    if (pct >= 50) return 'text-yellow-400';
    if (pct >= 25) return 'text-blue-400';
    return 'text-green-400';
  } catch {
    return 'text-gray-400';
  }
}

// Default empty pokemon state
export function createDefaultPokemonState(species = '') {
  return {
    species,
    level: 50,
    nature: 'Hardy',
    ability: '',
    item: '',
    teraType: null,
    isTera: false,
    status: '',
    evs: { ...DEFAULT_EVS },
    ivs: { ...DEFAULT_IVS },
    boosts: { ...DEFAULT_BOOSTS },
    curHP: 100,
    moves: [
      { name: '', crit: false, bpOverride: null },
      { name: '', crit: false, bpOverride: null },
      { name: '', crit: false, bpOverride: null },
      { name: '', crit: false, bpOverride: null },
    ],
  };
}

// Default field state
export function createDefaultFieldState() {
  return {
    gameType: 'Doubles',
    terrain: '',
    weather: '',
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

export function createDefaultSide() {
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

// Custom styles for react-select to match dark theme
export const reactSelectDarkStyles = {
  control: (base, state) => ({
    ...base,
    backgroundColor: 'rgb(51, 65, 85)', // slate-700
    borderColor: state.isFocused ? 'rgb(16, 185, 129)' : 'rgb(71, 85, 105)', // emerald-500 / slate-600
    '&:hover': { borderColor: 'rgb(16, 185, 129)' },
    boxShadow: state.isFocused ? '0 0 0 1px rgb(16, 185, 129)' : 'none',
    minHeight: '32px',
    fontSize: '0.875rem',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'rgb(30, 41, 59)', // slate-800
    border: '1px solid rgb(71, 85, 105)', // slate-600
    zIndex: 50,
  }),
  menuList: (base) => ({
    ...base,
    maxHeight: '200px',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'rgb(16, 185, 129)' // emerald-500
      : state.isFocused
        ? 'rgb(51, 65, 85)' // slate-700
        : 'transparent',
    color: state.isSelected ? 'white' : 'rgb(209, 213, 219)', // gray-300
    fontSize: '0.875rem',
    padding: '4px 8px',
    '&:active': { backgroundColor: 'rgb(5, 150, 105)' },
  }),
  singleValue: (base) => ({
    ...base,
    color: 'rgb(229, 231, 235)', // gray-200
  }),
  input: (base) => ({
    ...base,
    color: 'rgb(229, 231, 235)', // gray-200
  }),
  placeholder: (base) => ({
    ...base,
    color: 'rgb(107, 114, 128)', // gray-500
  }),
  indicatorSeparator: (base) => ({
    ...base,
    backgroundColor: 'rgb(71, 85, 105)', // slate-600
  }),
  dropdownIndicator: (base) => ({
    ...base,
    color: 'rgb(156, 163, 175)', // gray-400
    padding: '4px',
    '&:hover': { color: 'rgb(229, 231, 235)' },
  }),
  clearIndicator: (base) => ({
    ...base,
    color: 'rgb(156, 163, 175)',
    padding: '4px',
    '&:hover': { color: 'rgb(229, 231, 235)' },
  }),
  group: (base) => ({
    ...base,
    paddingTop: 4,
    paddingBottom: 4,
  }),
  groupHeading: (base) => ({
    ...base,
    color: 'rgb(156, 163, 175)', // gray-400
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  }),
  noOptionsMessage: (base) => ({
    ...base,
    color: 'rgb(107, 114, 128)',
  }),
};

// Compact variant for inline selectors (stats, moves)
export const reactSelectCompactStyles = {
  ...reactSelectDarkStyles,
  control: (base, state) => ({
    ...reactSelectDarkStyles.control(base, state),
    minHeight: '28px',
    fontSize: '0.8rem',
  }),
  valueContainer: (base) => ({
    ...base,
    padding: '0 4px',
  }),
  dropdownIndicator: (base) => ({
    ...base,
    padding: '2px',
    color: 'rgb(156, 163, 175)',
    '&:hover': { color: 'rgb(229, 231, 235)' },
  }),
};
