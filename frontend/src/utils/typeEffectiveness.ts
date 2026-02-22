import { TYPE_CHART } from "../data/typeChart";
import { ABILITY_TYPE_MODIFIERS } from "../data/abilityTypeModifiers";

/**
 * Calculate defensive multiplier for an attacking type against a defender.
 * Factors in dual types and ability modifiers.
 */
export function calcDefensiveMultiplier(
  attackingType: string,
  defenderTypes: string[],
  defenderAbility?: string
): number {
  // 1. Base = product of type chart multipliers for each defending type
  let multiplier = 1;
  for (const defType of defenderTypes) {
    const chart = TYPE_CHART[attackingType];
    if (chart) {
      multiplier *= chart[defType] ?? 1;
    }
  }

  // 2. Apply ability modifiers
  if (defenderAbility) {
    const mod = ABILITY_TYPE_MODIFIERS[defenderAbility];
    if (mod) {
      if (mod.immunities?.includes(attackingType)) {
        return 0;
      }
      if (mod.resistances?.includes(attackingType)) {
        multiplier *= 0.5;
      }
      if (mod.weaknesses?.includes(attackingType)) {
        multiplier *= 2;
      }
      if (mod.filterEffect && multiplier > 1) {
        multiplier *= 0.5;
      }
    }
  }

  return multiplier;
}
