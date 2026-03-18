#!/usr/bin/env node

/**
 * Generate pokemon-data.json from @pkmn/dex, Showdown aliases, sprite map, and app-specific overrides.
 *
 * Usage: node scripts/generate-pokemon-data.js
 * Output: backend/src/main/resources/pokemon-data.json
 */

import { createRequire } from "module";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// Resolve @pkmn/dex from the frontend directory where it's installed
const require = createRequire(resolve(ROOT, "frontend/package.json"));
const { Dex } = require("@pkmn/dex");
// ---------- Load local data ----------

const spriteMap = JSON.parse(
  readFileSync(resolve(ROOT, "frontend/src/data/pokemonSpriteMap.json"), "utf8")
);
delete spriteMap._comment;

const appAliases = JSON.parse(
  readFileSync(resolve(ROOT, "scripts/pokemon-aliases.json"), "utf8")
);

// ---------- Fetch Showdown aliases ----------

async function fetchShowdownAliases() {
  const url =
    "https://raw.githubusercontent.com/smogon/pokemon-showdown/master/data/aliases.ts";
  try {
    const res = await fetch(url);
    const text = await res.text();
    const aliases = {};
    // Lines look like:  pokemon: 'PokemonName',
    // We only want Pokemon aliases (not move/ability/item aliases)
    for (const line of text.split("\n")) {
      const m = line.match(/^\s*(\w[\w\s'-]*\w|\w):\s*'([^']+)'/);
      if (m) {
        aliases[m[1].trim()] = m[2].trim();
      }
    }
    return aliases;
  } catch (e) {
    console.warn("Failed to fetch Showdown aliases, proceeding without:", e.message);
    return {};
  }
}

// ---------- Helpers ----------

/** Convert a Showdown species name to kebab-case key */
function toKey(name) {
  return name
    .toLowerCase()
    .replace(/['']/g, "")
    .replace(/[. ]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

/** Human-friendly display name */
function toDisplayName(name) {
  // Use the Showdown name but replace hyphens with spaces for multi-word forms
  return name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ---------- Main ----------

async function main() {
  const showdownAliases = await fetchShowdownAliases();

  const dex = Dex.forGen(9);
  const pokemon = {};

  // Reverse map: canonical key -> list of aliases
  const aliasCollector = {};

  // Step 1: Iterate all species from @pkmn/dex
  for (const species of dex.species.all()) {
    if (!species.exists) continue;
    if (species.num <= 0) continue; // skip CAP, etc.
    // Skip cosmetic formes that aren't relevant (Pikachu costumes, etc.)
    // But keep competitively distinct forms

    const key = toKey(species.name);
    const num = species.num;

    // Look up sprite form index
    const spriteEntry = spriteMap[key];
    const form = spriteEntry ? spriteEntry.form : 0;

    // Determine base species
    let baseSpecies = key;
    if (species.baseSpecies && species.baseSpecies !== species.name) {
      baseSpecies = toKey(species.baseSpecies);
    }

    // Check baseSpeciesOverrides
    if (appAliases.baseSpeciesOverrides && appAliases.baseSpeciesOverrides[key]) {
      baseSpecies = appAliases.baseSpeciesOverrides[key];
    }

    const types = species.types.slice();
    const displayName = toDisplayName(species.name);

    pokemon[key] = {
      num,
      form,
      name: species.name,
      displayName,
      baseSpecies,
      types,
      aliases: [],
    };

    if (!aliasCollector[key]) aliasCollector[key] = new Set();
  }

  // Step 2: Add Showdown aliases
  for (const [alias, target] of Object.entries(showdownAliases)) {
    const targetKey = toKey(target);
    if (pokemon[targetKey]) {
      if (!aliasCollector[targetKey]) aliasCollector[targetKey] = new Set();
      aliasCollector[targetKey].add(alias);
    }
  }

  // Step 3: Add app-specific aliases
  for (const [alias, target] of Object.entries(appAliases.aliases || {})) {
    const targetKey = typeof target === "string" ? target : toKey(target);
    if (pokemon[targetKey]) {
      if (!aliasCollector[targetKey]) aliasCollector[targetKey] = new Set();
      aliasCollector[targetKey].add(alias);
    }
  }

  // Step 4: Add sprite map entries as aliases
  for (const [spriteKey, spriteData] of Object.entries(spriteMap)) {
    // Find the pokemon entry that matches this sprite data
    for (const [pokemonKey, entry] of Object.entries(pokemon)) {
      if (entry.num === spriteData.id && entry.form === spriteData.form) {
        if (spriteKey !== pokemonKey) {
          if (!aliasCollector[pokemonKey]) aliasCollector[pokemonKey] = new Set();
          aliasCollector[pokemonKey].add(spriteKey);
        }
        // Also update form if we didn't have it from sprite map
        if (!spriteMap[pokemonKey] && spriteData.form > 0) {
          entry.form = spriteData.form;
        }
        break;
      }
    }
  }

  // Step 5: Merge aliases into pokemon entries (deduplicate, exclude self-references)
  for (const [key, aliases] of Object.entries(aliasCollector)) {
    if (!pokemon[key]) continue;
    const uniqueAliases = [...aliases].filter(
      (a) => toKey(a) !== key && a.toLowerCase() !== key
    );
    pokemon[key].aliases = uniqueAliases.sort();
  }

  // Build output
  const output = {
    version: new Date().toISOString().slice(0, 7).replace("-", "."),
    pokemon,
  };

  const outPath = resolve(ROOT, "backend/src/main/resources/pokemon-data.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");

  const count = Object.keys(pokemon).length;
  const aliasCount = Object.values(pokemon).reduce(
    (sum, p) => sum + p.aliases.length,
    0
  );
  console.log(
    `Generated ${outPath}\n  ${count} Pokemon entries, ${aliasCount} aliases`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
