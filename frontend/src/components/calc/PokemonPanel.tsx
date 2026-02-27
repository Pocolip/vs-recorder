import { useMemo, useRef, useEffect } from "react";
import Select, { type SingleValue } from "react-select";
import SidebarSlots from "./SidebarSlots";
import StatTable from "./StatTable";
import MoveSlot from "./MoveSlot";
import {
  getSpeciesList,
  getSpeciesInfo,
  getAbilitiesForSpecies,
  getItemList,
  getTypeList,
  NATURES_LIST,
  STATUS_OPTIONS,
  setdexToState,
  getSelectStyles,
  getCompactSelectStyles,
  normalizeSpeciesName,
  computeHighestStat,
  getTeraDefaults,
  applyTeraFormeChange,
  hasLockedTeraType,
} from "../../utils/calcUtils";
import { useTheme } from "../../context/ThemeContext";
import { SETDEX_GEN9 } from "../../data/setdex-gen9";
import type { PokemonState, MoveState } from "../../types";
import type { PokemonData as PokemonFromPaste } from "../../services/pokepasteService";

interface SelectOption {
  value: string;
  label: string;
}

interface SetdexOption {
  value: string;
  label: string;
  pokemon: string;
  setName?: string;
  set?: Record<string, unknown>;
}

interface SetdexGroup {
  label: string;
  options: SetdexOption[];
}

interface PokemonPanelProps {
  state: PokemonState;
  onChange: (changes: Partial<PokemonState>) => void;
  teamPokemon: PokemonFromPaste[] | null;
  hasOppositeSidebar?: boolean;
  side: "p1" | "p2";
  weather?: string;
  terrain?: string;
}

const PokemonPanel: React.FC<PokemonPanelProps> = ({
  state,
  onChange,
  teamPokemon,
  hasOppositeSidebar = false,
  side,
  weather = "",
  terrain = "",
}) => {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const selectStyles = useMemo(() => getSelectStyles(dark), [dark]);
  const compactStyles = useMemo(() => getCompactSelectStyles(dark), [dark]);

  // Build species + set options: setdex Pokemon with sets, then all remaining species
  const speciesOptions = useMemo((): SetdexGroup[] => {
    const allSpecies = getSpeciesList();
    const setdexEntries = SETDEX_GEN9 as Record<string, Record<string, Record<string, unknown>>>;
    const setdexNames = new Set(Object.keys(setdexEntries));

    // Pokemon with setdex entries (grouped by Pokemon, each set is an option)
    const withSets: SetdexGroup[] = Object.keys(setdexEntries)
      .sort()
      .map((name) => ({
        label: name,
        options: Object.keys(setdexEntries[name]).map((setName) => ({
          value: `${name}|${setName}`,
          label: `${name} - ${setName}`,
          pokemon: name,
          setName,
          set: setdexEntries[name][setName],
        })),
      }));

    // All remaining species without setdex data
    const withoutSets: SetdexOption[] = allSpecies
      .filter((name) => !setdexNames.has(name))
      .map((name) => ({
        value: name,
        label: name,
        pokemon: name,
      }));

    return [...withSets, { label: "Other Pokemon", options: withoutSets }];
  }, []);

  // Current selected value for species select
  const selectedSpeciesOption = useMemo(() => {
    if (!state.species) return null;
    return { value: state.species, label: state.species };
  }, [state.species]);

  // Ability options for current species
  const abilityOptions = useMemo(() => {
    const abilities = getAbilitiesForSpecies(state.species);
    return abilities.map((a) => ({ value: a, label: a }));
  }, [state.species]);

  // Item options
  const itemOptions = useMemo(() => {
    return getItemList().map((i) => ({ value: i, label: i }));
  }, []);

  // Nature options
  const natureOptions = useMemo(() => {
    return NATURES_LIST.map((n) => ({ value: n, label: n }));
  }, []);

  // Type options (for tera)
  const typeOptions = useMemo(() => {
    const types = getTypeList();
    return [{ value: "Stellar", label: "Stellar" }, ...types.map((t) => ({ value: t, label: t }))];
  }, []);

  const speciesInfo = getSpeciesInfo(state.species);

  // Auto-check boostedStat when Booster Energy / Proto / Quark conditions are met
  const prevAbilityRef = useRef(state.ability);
  const prevItemRef = useRef(state.item);
  const prevWeatherRef = useRef(weather);
  const prevTerrainRef = useRef(terrain);

  useEffect(() => {
    const abilityChanged = prevAbilityRef.current !== state.ability;
    const itemChanged = prevItemRef.current !== state.item;
    const weatherChanged = prevWeatherRef.current !== weather;
    const terrainChanged = prevTerrainRef.current !== terrain;

    prevAbilityRef.current = state.ability;
    prevItemRef.current = state.item;
    prevWeatherRef.current = weather;
    prevTerrainRef.current = terrain;

    if (!abilityChanged && !itemChanged && !weatherChanged && !terrainChanged) return;
    if (!state.species) return;

    const isProto = state.ability === "Protosynthesis";
    const isQuark = state.ability === "Quark Drive";

    const shouldAutoBoost =
      (itemChanged && state.item === "Booster Energy" && (isProto || isQuark)) ||
      (abilityChanged && (isProto || isQuark) && state.item === "Booster Energy") ||
      (weatherChanged && weather === "Sun" && isProto) ||
      (terrainChanged && terrain === "Electric" && isQuark);

    if (shouldAutoBoost) {
      const highest = computeHighestStat(state.species, state.evs, state.ivs, state.level, state.nature);
      if (highest) {
        onChange({ boostedStat: highest });
      }
    }
  }, [state.ability, state.item, state.species, state.evs, state.ivs, state.level, state.nature, weather, terrain, onChange]);

  const statusForItem = (item: string | undefined): string => {
    if (item === "Flame Orb") return "brn";
    if (item === "Toxic Orb") return "tox";
    return "";
  };

  const handleSpeciesSelect = (option: SingleValue<SetdexOption>) => {
    if (!option) {
      onChange({ species: "", ability: "", item: "", nature: "Hardy", teraType: null });
      return;
    }

    // If it's a setdex entry (has set data)
    if (option.set) {
      const setData = setdexToState(option.set as Parameters<typeof setdexToState>[0]);
      const species = normalizeSpeciesName(option.pokemon);
      // Default to first ability if setdex doesn't specify one
      if (!setData.ability) {
        const abilities = getAbilitiesForSpecies(species);
        setData.ability = abilities[0] || "";
      }
      if (!setData.status) {
        setData.status = statusForItem(setData.item);
      }
      // Auto-compute boostedStat if the set has Booster Energy
      if (setData.item === "Booster Energy" && (setData.ability === "Protosynthesis" || setData.ability === "Quark Drive")) {
        setData.boostedStat = computeHighestStat(species, setData.evs, setData.ivs, setData.level, setData.nature) ?? null;
      } else {
        setData.boostedStat = null;
      }

      // Apply tera/item defaults for Terapagos/Ogerpon
      const teraDefaults = getTeraDefaults(species);
      if (teraDefaults) {
        if (!setData.teraType) setData.teraType = teraDefaults.teraType;
        if (!setData.item && teraDefaults.item) setData.item = teraDefaults.item;
      }

      onChange({
        ...setData,
        species,
      });
    } else {
      // Plain species selection
      const species = normalizeSpeciesName(option.value);
      const info = getSpeciesInfo(species);
      const abilities = info?.abilities ? Object.values(info.abilities).filter(Boolean) : [];
      const teraDefaults = getTeraDefaults(species);
      onChange({
        species,
        ability: (abilities[0] as string) || "",
        ...(teraDefaults ? { teraType: teraDefaults.teraType, item: teraDefaults.item || "" } : {}),
      });
    }
  };

  const handleTeamSlotSelect = (mon: PokemonFromPaste) => {
    const species = normalizeSpeciesName(mon.name);
    const teraDefaults = getTeraDefaults(species);
    const changes: Partial<PokemonState> = {
      species,
      ability: mon.ability || "",
      item: mon.item || "",
      nature: mon.nature || "Hardy",
      teraType: teraDefaults ? teraDefaults.teraType : (mon.tera_type || null),
      status: statusForItem(mon.item),
      level: mon.level || 50,
      moves: (mon.moves || []).slice(0, 4).map((name) => ({
        name: typeof name === "string" ? name : "",
        crit: false,
        bpOverride: null,
      })),
    };

    // Pad moves to 4
    while (changes.moves!.length < 4) {
      changes.moves!.push({ name: "", crit: false, bpOverride: null });
    }

    changes.evs = {
      hp: mon.evs?.HP ?? mon.evs?.hp ?? 0,
      atk: mon.evs?.Atk ?? mon.evs?.atk ?? 0,
      def: mon.evs?.Def ?? mon.evs?.def ?? 0,
      spa: mon.evs?.SpA ?? mon.evs?.spa ?? 0,
      spd: mon.evs?.SpD ?? mon.evs?.spd ?? 0,
      spe: mon.evs?.Spe ?? mon.evs?.spe ?? 0,
    };

    changes.ivs = {
      hp: mon.ivs?.HP ?? mon.ivs?.hp ?? 31,
      atk: mon.ivs?.Atk ?? mon.ivs?.atk ?? 31,
      def: mon.ivs?.Def ?? mon.ivs?.def ?? 31,
      spa: mon.ivs?.SpA ?? mon.ivs?.spa ?? 31,
      spd: mon.ivs?.SpD ?? mon.ivs?.spd ?? 31,
      spe: mon.ivs?.Spe ?? mon.ivs?.spe ?? 31,
    };

    // Auto-compute boostedStat if Booster Energy + Proto/Quark
    const ability = changes.ability || "";
    if (changes.item === "Booster Energy" && (ability === "Protosynthesis" || ability === "Quark Drive")) {
      changes.boostedStat = computeHighestStat(species, changes.evs!, changes.ivs!, changes.level || 50, changes.nature || "Hardy") ?? null;
    } else {
      changes.boostedStat = null;
    }

    onChange(changes);
  };

  const handleMoveChange = (index: number, newMove: MoveState) => {
    const newMoves = [...state.moves];
    newMoves[index] = newMove;
    onChange({ moves: newMoves });
  };

  return (
    <div className="space-y-2">
      {/* Team sidebar slots (p1) or spacer (p2) to keep panels aligned */}
      {side === "p1" && teamPokemon && (
        <SidebarSlots
          teamPokemon={teamPokemon}
          activeSpecies={state.species}
          onSelect={handleTeamSlotSelect}
        />
      )}
      {side === "p2" && hasOppositeSidebar && <div className="h-8 mb-2" />}

      {/* Pokemon selector (setdex grouped) */}
      <Select<SetdexOption, false, SetdexGroup>
        value={selectedSpeciesOption as SetdexOption | null}
        onChange={handleSpeciesSelect}
        options={speciesOptions}
        styles={selectStyles as any}
        placeholder="Search Pokemon / Set..."
        isClearable
        isSearchable
        filterOption={(option, input) => {
          if (!input) return true;
          return option.data.pokemon.toLowerCase().includes(input.toLowerCase());
        }}
        menuPlacement="auto"
      />

      {/* Types display */}
      {speciesInfo && (
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {speciesInfo.types.map((type) => (
              <TypeBadge key={type} type={type} />
            ))}
          </div>
          {state.isTera && state.teraType && (
            <div className="flex items-center gap-1">
              <span className="text-xs text-gray-500">Tera:</span>
              <TypeBadge type={state.teraType} tera />
            </div>
          )}
        </div>
      )}

      {/* Info row: Nature, Ability, Item */}
      <div className="grid grid-cols-3 gap-1">
        <div>
          <label className="text-xs text-gray-500 block mb-0.5">Nature</label>
          <Select<SelectOption>
            value={state.nature ? { value: state.nature, label: state.nature } : null}
            onChange={(opt: SingleValue<SelectOption>) => onChange({ nature: opt ? opt.value : "Hardy" })}
            options={natureOptions}
            styles={compactStyles as any}
            placeholder="Nature"
            isSearchable
            menuPlacement="auto"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-0.5">Ability</label>
          <Select<SelectOption>
            value={state.ability ? { value: state.ability, label: state.ability } : null}
            onChange={(opt: SingleValue<SelectOption>) => onChange({ ability: opt ? opt.value : "" })}
            options={abilityOptions}
            styles={compactStyles as any}
            placeholder="Ability"
            isSearchable
            menuPlacement="auto"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-0.5">Item</label>
          <Select<SelectOption>
            value={state.item ? { value: state.item, label: state.item } : null}
            onChange={(opt: SingleValue<SelectOption>) => onChange({ item: opt ? opt.value : "" })}
            options={itemOptions}
            styles={compactStyles as any}
            placeholder="Item"
            isClearable
            isSearchable
            menuPlacement="auto"
          />
        </div>
      </div>

      {/* Tera + Status row */}
      <div className="grid grid-cols-2 gap-1">
        <div className="flex items-center gap-1">
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={state.isTera}
              onChange={(e) => {
                const checked = e.target.checked;
                const formeChange = applyTeraFormeChange(state.species, checked);
                if (formeChange) {
                  onChange({ isTera: checked, species: formeChange.species, ability: formeChange.ability, teraType: formeChange.teraType });
                } else {
                  onChange({ isTera: checked });
                }
              }}
              className="rounded border-gray-300 bg-white dark:border-slate-600 dark:bg-slate-700 text-emerald-500 focus:ring-emerald-500 w-3 h-3"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">Tera</span>
          </label>
          <div className="flex-1">
            <Select<SelectOption>
              value={state.teraType ? { value: state.teraType, label: state.teraType } : null}
              onChange={(opt: SingleValue<SelectOption>) => onChange({ teraType: opt ? opt.value : null })}
              options={typeOptions}
              styles={compactStyles as any}
              placeholder="Type"
              isClearable={!hasLockedTeraType(state.species)}
              isSearchable={!hasLockedTeraType(state.species)}
              isDisabled={hasLockedTeraType(state.species)}
              menuPlacement="auto"
            />
          </div>
        </div>
        <div>
          <Select<SelectOption>
            value={STATUS_OPTIONS.find((o) => o.value === state.status) || { ...STATUS_OPTIONS[0] }}
            onChange={(opt: SingleValue<SelectOption>) => onChange({ status: opt ? opt.value : "" })}
            options={[...STATUS_OPTIONS]}
            styles={compactStyles as any}
            isSearchable={false}
            menuPlacement="auto"
          />
        </div>
      </div>

      {/* HP Bar */}
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 w-8">HP%</label>
        <input
          type="range"
          min={0}
          max={100}
          value={state.curHP}
          onChange={(e) => onChange({ curHP: parseInt(e.target.value) })}
          className="flex-1 h-1.5 accent-emerald-500"
        />
        <input
          type="number"
          min={0}
          max={100}
          value={state.curHP}
          onChange={(e) =>
            onChange({ curHP: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) })
          }
          className="w-12 bg-white border border-gray-300 text-gray-800 dark:bg-slate-700 dark:border-slate-600 dark:text-gray-200 rounded text-xs text-center py-0.5 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Stats table */}
      <StatTable
        species={state.species}
        evs={state.evs}
        ivs={state.ivs}
        boosts={state.boosts}
        nature={state.nature}
        level={state.level}
        boostedStat={state.boostedStat}
        onChange={onChange}
      />

      {/* Moves */}
      <div>
        <label className="text-xs text-gray-500 block mb-1">Moves</label>
        <div className="space-y-1">
          {state.moves.map((move, i) => (
            <MoveSlot
              key={i}
              move={move}
              index={i}
              onChange={(newMove) => handleMoveChange(i, newMove)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// Type badge component
const TYPE_COLORS: Record<string, string> = {
  Normal: "bg-gray-500",
  Fire: "bg-red-500",
  Water: "bg-blue-500",
  Electric: "bg-yellow-500",
  Grass: "bg-green-500",
  Ice: "bg-cyan-400",
  Fighting: "bg-red-700",
  Poison: "bg-purple-500",
  Ground: "bg-amber-600",
  Flying: "bg-indigo-400",
  Psychic: "bg-pink-500",
  Bug: "bg-lime-500",
  Rock: "bg-amber-700",
  Ghost: "bg-purple-700",
  Dragon: "bg-indigo-600",
  Dark: "bg-stone-700",
  Steel: "bg-slate-500",
  Fairy: "bg-pink-400",
  Stellar: "bg-gradient-to-r from-blue-400 to-pink-400",
};

const TypeBadge: React.FC<{ type: string; tera?: boolean }> = ({ type, tera }) => (
  <span
    className={`px-1.5 py-0.5 text-[10px] font-medium rounded text-white ${TYPE_COLORS[type] || "bg-gray-600"} ${
      tera ? "ring-1 ring-white/30" : ""
    }`}
  >
    {type}
  </span>
);

export default PokemonPanel;
