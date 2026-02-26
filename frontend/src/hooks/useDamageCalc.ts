import { useMemo } from "react";
import { calculate, Generations, Pokemon, Move, Field } from "@smogon/calc";
import type { PokemonState, FieldState, MoveState } from "../types";

const gen = Generations.get(9);

function buildPokemon(state: PokemonState): Pokemon | null {
  if (!state.species) return null;

  const opts: Record<string, unknown> = {
    level: state.level || 50,
    nature: state.nature || undefined,
    ability: state.ability || undefined,
    item: state.item || undefined,
    status: state.status || undefined,
    evs: { ...state.evs },
    ivs: { ...state.ivs },
    boosts: { ...state.boosts },
  };

  if (state.isTera && state.teraType) {
    opts.teraType = state.teraType;
  }

  const pokemon = new Pokemon(gen, state.species, opts);

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

interface CalcResults {
  p1Results: (ReturnType<typeof calculate> | null)[];
  p2Results: (ReturnType<typeof calculate> | null)[];
}

export function useDamageCalc(
  p1State: PokemonState,
  p2State: PokemonState,
  fieldState: FieldState,
): CalcResults | null {
  return useMemo(() => {
    if (!p1State.species || !p2State.species) return null;

    try {
      const p1 = buildPokemon(p1State);
      const p2 = buildPokemon(p2State);
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
            return calculate(gen, p1, p2, buildMove(m, p1State.isTera && p1State.teraType === "Stellar"), field);
          } catch {
            return null;
          }
        });

      const p2Results = p2State.moves
        .filter((m) => m.name)
        .map((m) => {
          try {
            return calculate(gen, p2, p1, buildMove(m, p2State.isTera && p2State.teraType === "Stellar"), reverseField);
          } catch {
            return null;
          }
        });

      return { p1Results, p2Results };
    } catch (e) {
      console.error("Calc error:", e);
      return null;
    }
  }, [p1State, p2State, fieldState]);
}
