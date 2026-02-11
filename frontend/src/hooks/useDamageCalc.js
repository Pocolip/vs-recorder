// src/hooks/useDamageCalc.js
import { useMemo } from 'react';
import { calculate, Generations, Pokemon, Move, Field } from '@smogon/calc';

const gen = Generations.get(9);

function buildPokemon(state) {
  if (!state.species) return null;

  const opts = {
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

  // Convert percentage HP to absolute value
  if (state.curHP < 100) {
    pokemon.originalCurHP = Math.round((state.curHP / 100) * pokemon.maxHP());
  }

  return pokemon;
}

function buildField(fieldState) {
  return new Field({
    gameType: fieldState.gameType || 'Doubles',
    terrain: fieldState.terrain || undefined,
    weather: fieldState.weather || undefined,
    isGravity: fieldState.isGravity || false,
    attackerSide: { ...fieldState.attackerSide },
    defenderSide: { ...fieldState.defenderSide },
    // Ruin abilities
    isTabletsOfRuin: fieldState.isTabletsOfRuin || false,
    isVesselOfRuin: fieldState.isVesselOfRuin || false,
    isSwordOfRuin: fieldState.isSwordOfRuin || false,
    isBeadsOfRuin: fieldState.isBeadsOfRuin || false,
  });
}

// Moves whose BP doubles under certain conditions that the library doesn't handle
const STATUS_DOUBLE_BP_MOVES = {
  'Facade': 'attacker',  // doubles when attacker has status
  'Hex': 'defender',      // doubles when defender has status
};

function buildMove(moveState, attackerStatus, defenderStatus) {
  const opts = { isCrit: moveState.crit };

  // Determine effective BP
  let bpOverride = null;

  if (moveState.bpOverride) {
    // Manual BP override takes priority
    bpOverride = moveState.bpOverride;
  } else {
    // Auto-double BP for Facade/Hex when status conditions apply
    const doubleRule = STATUS_DOUBLE_BP_MOVES[moveState.name];
    if (doubleRule === 'attacker' && attackerStatus) {
      const base = new Move(gen, moveState.name);
      bpOverride = base.bp * 2;
    } else if (doubleRule === 'defender' && defenderStatus) {
      const base = new Move(gen, moveState.name);
      bpOverride = base.bp * 2;
    }
  }

  if (bpOverride) {
    opts.overrides = { basePower: bpOverride };
  }

  return new Move(gen, moveState.name, opts);
}

export function useDamageCalc(p1State, p2State, fieldState) {
  return useMemo(() => {
    if (!p1State.species || !p2State.species) return null;

    try {
      const p1 = buildPokemon(p1State);
      const p2 = buildPokemon(p2State);
      if (!p1 || !p2) return null;

      const field = buildField(fieldState);
      // For p2→p1 calc, swap the sides
      const reverseField = buildField({
        ...fieldState,
        attackerSide: fieldState.defenderSide,
        defenderSide: fieldState.attackerSide,
      });

      const p1Results = p1State.moves
        .filter(m => m.name)
        .map(m => {
          try {
            return calculate(gen, p1, p2, buildMove(m, p1State.status, p2State.status), field);
          } catch {
            return null;
          }
        });

      const p2Results = p2State.moves
        .filter(m => m.name)
        .map(m => {
          try {
            return calculate(gen, p2, p1, buildMove(m, p2State.status, p1State.status), reverseField);
          } catch {
            return null;
          }
        });

      return { p1Results, p2Results };
    } catch (e) {
      console.error('Calc error:', e);
      return null;
    }
  }, [p1State, p2State, fieldState]);
}
