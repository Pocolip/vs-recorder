import { resolveAnalyticsKey } from "./pokemonNameUtils";

/**
 * Which side of a damage calc a Pokemon is on: "offensive" when it's the
 * attacker, "defensive" when it's the target, null when the text can't tell
 * (no " vs. ", the Pokemon isn't named, or it's named on both sides as in a
 * mirror match).
 */
export type CalcSide = "offensive" | "defensive";

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The Pokemon's name as written, not inside a longer word ("Mew" ≠ "Mewtwo"). */
function namesExactly(text: string, name: string): boolean {
  const pattern = escapeRegExp(name.trim()).replace(/[\s-]+/g, "[\\s-]+");
  return new RegExp(`(^|[^a-z0-9])${pattern}($|[^a-z0-9])`, "i").test(text);
}

/**
 * A forme of the Pokemon (Charizard-Mega-Y for Charizard, Floette-Mega for
 * Floette-Eternal): some run of up to three words resolves to the same base
 * species.
 */
function namesForme(
  text: string,
  baseKey: string,
  keyOf: (name: string) => string,
): boolean {
  const words = text.split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length; i++) {
    for (let n = 1; n <= 3 && i + n <= words.length; n++) {
      if (keyOf(words.slice(i, i + n).join(" ")) === baseKey) return true;
    }
  }
  return false;
}

function score(
  text: string,
  name: string,
  baseKey: string,
  keyOf: (name: string) => string,
): number {
  if (namesExactly(text, name)) return 2;
  if (baseKey && namesForme(text, baseKey, keyOf)) return 1;
  return 0;
}

/**
 * Smogon calc text reads "<attacker> <move> vs. <defender>: <damage>", e.g.
 * "+1 0 SpA Volcarona Giga Drain vs. 2 HP / 0 SpD Basculegion in Grassy
 * Terrain: 196-232 (99.4 - 117.7%) -- 93.75% chance to OHKO".
 */
export function calcSide(
  calc: string,
  pokemonName: string,
  keyOf: (name: string) => string = resolveAnalyticsKey,
): CalcSide | null {
  const vs = calc.indexOf(" vs. ");
  if (vs < 0 || !pokemonName.trim()) return null;
  const attacker = calc.slice(0, vs);
  const rest = calc.slice(vs + 5);
  const damage = rest.search(/:\s*\d/);
  const defender = damage < 0 ? rest : rest.slice(0, damage);

  const baseKey = keyOf(pokemonName);
  const a = score(attacker, pokemonName, baseKey, keyOf);
  const d = score(defender, pokemonName, baseKey, keyOf);
  if (a > d) return "offensive";
  if (d > a) return "defensive";
  return null;
}
