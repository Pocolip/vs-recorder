import data from "../data/matchupMatching.json";
import type { PokemonData } from "../services/pokepasteService";
import type { Replay } from "../types";

export type MatchConfidence = "confirmed" | "possible" | "none";
export interface ItemRule { species: string[]; formes?: Record<string, string> }
// Extend this table for future team-defining items (e.g. Ogerpon masks).
// Keys and species use Showdown IDs; optional formes equate an explicit forme
// with its base species holding that item.
export const MATCHUP_ITEM_RULES: Record<string, ItemRule> = { ...data.itemRules };
const aliases: Record<string, string> = {
  ...data.aliases,
  urshifusinglestrike: "urshifu", landorusincarnate: "landorus",
  tornadusincarnate: "tornadus", thundurusincarnate: "thundurus",
  enamorusincarnate: "enamorus", tatsugiricurly: "tatsugiri",
  palafinhero: "palafin", terapagosterastal: "terapagos", terapagosstellar: "terapagos",
  aegislashblade: "aegislash",
};
const formBases: Record<string, string> = data.formBases;
export const matchingId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
function speciesId(name: string) {
  const id = matchingId(name.split(",")[0]);
  return aliases[id] ?? id;
}

interface Member { species: string; item: string | null; wildcard?: boolean }
function normalize(member: Member, rules: Record<string, ItemRule>): Member {
  let species = speciesId(member.species);
  let item = member.item === null ? null : matchingId(member.item);
  // Tera activation is temporary; mask formes remain distinct.
  if (species.startsWith("ogerpon") && species.endsWith("tera")) {
    species = species.slice(0, -4);
  }
  for (const [stone, rule] of Object.entries(rules)) {
    const base = Object.entries(rule.formes ?? {}).find(([, forme]) => forme === species)?.[0];
    if (base) {
      species = base;
      item ??= stone;
      if (item === "") item = stone;
      break;
    }
  }
  return { species, item, wildcard: member.species.includes("*") };
}

function compareMember(a: Member, b: Member, rules: Record<string, ItemRule>): MatchConfidence {
  let possible = false;
  if (a.wildcard || b.wildcard) {
    if ((formBases[a.species] ?? a.species) !== (formBases[b.species] ?? b.species)) return "none";
    possible = true;
  } else if (a.species !== b.species) return "none";
  const relevant = (item: string | null) => item !== null && rules[item] ? item : "";
  if (a.item !== null && b.item !== null) {
    if (relevant(a.item) !== relevant(b.item)) return "none";
  } else if (Object.values(rules).some((r) => r.species.includes(a.species) || r.species.includes(b.species))) {
    possible = true;
  }
  return possible ? "possible" : "confirmed";
}

/** Exact multiset matching, retaining uncertainty instead of guessing hidden formes/items. */
export function matchReplayTeam(
  paste: PokemonData[],
  replay: Replay,
  rules = MATCHUP_ITEM_RULES,
): MatchConfidence {
  const battle = replay.battleData;
  const player = battle?.opponentPlayer;
  if (!player || !battle || paste.length !== 6) return "none";
  const details = battle.teamDetails?.[player];
  const roster = details?.length === 6 ? details :
    battle.teams?.[player]?.map((species) => ({ species, item: null })) ?? [];
  if (roster.length !== 6) return "none";
  const expected = paste.map((m) => normalize({ species: m.name, item: m.item ?? "" }, rules));
  const actual = roster.map((m) => {
    const member = normalize(m, rules);
    // Compatibility with summaries that only contain Mega events.
    if (member.item === null) {
      const event = battle.megaEvents?.[player]?.find((e) => speciesId(e.pokemon) === member.species);
      const stone = event && Object.entries(rules).find(([, r]) => Object.values(r.formes ?? {}).includes(speciesId(event.megaForme)));
      if (stone) member.item = stone[0];
    }
    return member;
  });
  if ([...expected, ...actual].some((m) => !m.species)) return "none";
  function match(index: number, used: number, uncertain: boolean): MatchConfidence {
    if (index === 6) return uncertain ? "possible" : "confirmed";
    let best: MatchConfidence = "none";
    for (let i = 0; i < 6; i++) {
      if (used & (1 << i)) continue;
      const confidence = compareMember(expected[index], actual[i], rules);
      if (confidence === "none") continue;
      const result = match(index + 1, used | (1 << i), uncertain || confidence === "possible");
      if (result === "confirmed") return result;
      if (result === "possible") best = result;
    }
    return best;
  }
  return match(0, 0, false);
}
