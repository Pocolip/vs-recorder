import type { PokemonData } from "../services/pokepasteService";
import {
  CHAMPIONS_GEN, createDefaultPokemonState, normalizeSpeciesName,
  getTeraDefaults, computeHighestStat, STAT_NAMES, STAT_LABELS,
} from "./calcUtils";

/** Loading a set replaces all Pokémon state, including temporary battle settings. */
export function pasteToCalc(mon: PokemonData, gen: number) {
  const species = normalizeSpeciesName(mon.name);
  const state = createDefaultPokemonState(species);
  const teraDefaults = getTeraDefaults(species);
  state.ability = mon.ability || "";
  state.item = mon.item || teraDefaults?.item || "";
  state.nature = mon.nature || "Hardy";
  state.teraType = teraDefaults?.teraType ?? mon.tera_type ?? null;
  state.status = state.item === "Flame Orb" ? "brn" : state.item === "Toxic Orb" ? "tox" : "";
  for (const stat of STAT_NAMES) {
    const value = mon.evs?.[STAT_LABELS[stat]] ?? mon.evs?.[stat] ?? 0;
    if (gen === CHAMPIONS_GEN) {
      state.sps[stat] = value;
    } else {
      state.evs[stat] = value;
      state.ivs[stat] = mon.ivs?.[STAT_LABELS[stat]] ?? mon.ivs?.[stat] ?? 31;
    }
  }
  state.moves = state.moves.map((move, i) => ({ ...move, name: mon.moves?.[i] ?? "" }));
  if (state.item === "Booster Energy" &&
      (state.ability === "Protosynthesis" || state.ability === "Quark Drive")) {
    state.boostedStat = computeHighestStat(species, state.evs, state.ivs, state.level, state.nature);
  }
  return state;
}
