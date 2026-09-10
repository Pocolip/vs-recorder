import { useMemo } from "react";
import { calculate, Generations, Pokemon, Move, Field } from "@smogon/calc";
import { AURA_GUARD, CHAMPIONS_GEN, DEFAULT_IVS, spsToEvs } from "../utils/calcUtils";
import type { PokemonState, FieldState, MoveState } from "../types";

// Champions damage math reuses the Gen 9 engine (the Smogon calc lib has no
// Gen 10 yet); SPs are remapped to EVs and IVs locked to 31 at build time.
const gen = Generations.get(9);

function buildPokemon(state: PokemonState, selectedGen: number): Pokemon | null {
  if (!state.species) return null;

  const isChampions = selectedGen === CHAMPIONS_GEN;

  const opts: Record<string, unknown> = {
    level: 50,
    nature: state.nature || undefined,
    ability: state.ability || undefined,
    item: state.item || undefined,
    status: state.status || undefined,
    evs: isChampions ? spsToEvs(state.sps) : { ...state.evs },
    ivs: isChampions ? { ...DEFAULT_IVS } : { ...state.ivs },
    boosts: { ...state.boosts },
  };

  if (state.isTera && state.teraType) {
    opts.teraType = state.teraType;
  }

  if (state.boostedStat) {
    opts.boostedStat = state.boostedStat;
  }

  let pokemon: Pokemon;
  try {
    pokemon = new Pokemon(gen, state.species, opts);
  } catch (e) {
    // Species (or item/ability) doesn't resolve in Smogon's Gen 9 dex.
    // Return null so the calc bails on this side without killing the other,
    // letting move names still render via MoveResults.
    console.warn(`[calc] failed to build ${state.species}:`, (e as Error).message);
    return null;
  }

  if (state.curHP < 100) {
    pokemon.originalCurHP = Math.round((state.curHP / 100) * pokemon.maxHP());
  }

  return pokemon;
}

function buildSide(side: FieldState["attackerSide"]) {
  return {
    isReflect: side.isReflect,
    isLightScreen: side.isLightScreen,
    isAuroraVeil: side.isAuroraVeil,
    isHelpingHand: side.isHelpingHand,
    isTailwind: side.isTailwind,
    isFriendGuard: side.isFriendGuard,
    isSteelySpiritAlly: side.isSteelySpiritAlly,
    isPowerSpot: side.isPowerSpot,
    isBattery: side.isBattery,
    steelsurge: side.steelsurge > 0,
    spikes: side.spikes,
    isSR: side.isSR,
  };
}

function buildField(fieldState: FieldState): Field {
  return new Field({
    gameType: fieldState.gameType as "Singles" | "Doubles",
    terrain: (fieldState.terrain || undefined) as "Electric" | "Grassy" | "Misty" | "Psychic" | undefined,
    weather: (fieldState.weather || undefined) as "Sun" | "Rain" | "Sand" | "Hail" | "Snow" | undefined,
    isGravity: fieldState.isGravity || false,
    attackerSide: buildSide(fieldState.attackerSide),
    defenderSide: buildSide(fieldState.defenderSide),
    isTabletsOfRuin: fieldState.isTabletsOfRuin || false,
    isVesselOfRuin: fieldState.isVesselOfRuin || false,
    isSwordOfRuin: fieldState.isSwordOfRuin || false,
    isBeadsOfRuin: fieldState.isBeadsOfRuin || false,
  });
}

function buildMove(moveState: MoveState, isStellarTera = false): Move {
  const opts: Record<string, unknown> = { isCrit: moveState.crit };

  if (moveState.bpOverride) {
    opts.overrides = { basePower: moveState.bpOverride };
  }

  if (isStellarTera) {
    opts.isStellarFirstUse = true;
  }

  return new Move(gen, moveState.name, opts);
}

type CalcResult = ReturnType<typeof calculate>;

// Aura Guard (Mega Lucario Z, new in Regulation M-C) halves the damage its
// holder takes from contact moves. @smogon/calc has no such ability, so scale
// the result after the fact. `range()` and `desc()` both derive from `damage`,
// so mutating it keeps the percentages and KO chances consistent.
function applyAuraGuard(result: CalcResult, defenderState: PokemonState, move: Move): CalcResult {
  if (defenderState.ability !== AURA_GUARD || !move.flags.contact) return result;

  const halve = (d: number) => Math.floor(d / 2);
  const damage = result.damage;
  // Damage is a single roll, 16 rolls, or (multi-hit) rolls per hit.
  result.damage = (
    Array.isArray(damage)
      ? (damage as (number | number[])[]).map((d) => (Array.isArray(d) ? d.map(halve) : halve(d)))
      : halve(damage)
  ) as CalcResult["damage"];

  return result;
}

interface CalcResults {
  p1Results: (CalcResult | null)[];
  p2Results: (CalcResult | null)[];
}

export function useDamageCalc(
  p1State: PokemonState,
  p2State: PokemonState,
  fieldState: FieldState,
  selectedGen: number,
): CalcResults | null {
  return useMemo(() => {
    if (!p1State.species || !p2State.species) return null;

    try {
      const p1 = buildPokemon(p1State, selectedGen);
      const p2 = buildPokemon(p2State, selectedGen);
      if (!p1 || !p2) return null;

      const field = buildField(fieldState);
      const reverseField = buildField({
        ...fieldState,
        attackerSide: fieldState.defenderSide,
        defenderSide: fieldState.attackerSide,
      });

      const p1Results = p1State.moves
        .filter((m) => m.name)
        .map((m) => {
          try {
            const move = buildMove(m, p1State.isTera && p1State.teraType === "Stellar");
            return applyAuraGuard(calculate(gen, p1, p2, move, field), p2State, move);
          } catch {
            return null;
          }
        });

      const p2Results = p2State.moves
        .filter((m) => m.name)
        .map((m) => {
          try {
            const move = buildMove(m, p2State.isTera && p2State.teraType === "Stellar");
            return applyAuraGuard(calculate(gen, p2, p1, move, reverseField), p1State, move);
          } catch {
            return null;
          }
        });

      return { p1Results, p2Results };
    } catch (e) {
      console.error("Calc error:", e);
      return null;
    }
  }, [p1State, p2State, fieldState, selectedGen]);
}
