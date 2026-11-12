/**
 * Species resolution against the app's Pokémon registry
 * (backend/src/main/resources/pokemon-data.json — see CLAUDE.md
 * "Pokemon Data Registry").
 *
 * Both direct sources use Showdown-ish identifiers that differ only in
 * punctuation: Limitless sends slugs (`floette-eternal`, `indeedee-f`,
 * `mr-mime`), Reportworm sends names and squashed codes (`Floette-Eternal` /
 * `floetteeternal`). Normalizing to lowercase alphanumerics and indexing the
 * registry key, name, displayName and aliases covers both.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = resolve(__dirname, "../../backend/src/main/resources/pokemon-data.json");

export const normalize = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function createRegistry(data = JSON.parse(readFileSync(REGISTRY_PATH, "utf8"))) {
  const pokemon = data?.pokemon;
  if (!pokemon || typeof pokemon !== "object") {
    throw new Error("pokemon-data.json is missing its `pokemon` map");
  }

  // First writer wins: canonical keys are indexed before aliases so an alias
  // can never shadow a real entry.
  const index = new Map();
  const add = (label, key) => {
    const n = normalize(label);
    if (n && !index.has(n)) index.set(n, key);
  };
  for (const [key, entry] of Object.entries(pokemon)) add(key, key);
  for (const [key, entry] of Object.entries(pokemon)) {
    add(entry.name, key);
    add(entry.displayName, key);
    for (const alias of entry.aliases ?? []) add(alias, key);
  }

  /**
   * Resolve any species identifier to `{ key, name }`. Tries each candidate
   * in order (e.g. slug first, then display name). Throws on unknown species
   * so upstream naming drift fails loudly instead of producing broken sprites.
   */
  function resolveSpecies(...candidates) {
    for (const c of candidates) {
      const key = index.get(normalize(c));
      if (key) return { key, name: pokemon[key].name };
    }
    throw new Error(`Unknown species: ${candidates.filter(Boolean).join(" / ")}`);
  }

  return { resolveSpecies };
}
