#!/usr/bin/env node
// Run after updating @pkmn/dex or the Pokémon registry.
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const { Dex } = require("@pkmn/dex");
const id = (name) => name.toLowerCase().replace(/[^a-z0-9]/g, "");
const aliases = {};
const formBases = {};
const itemRules = {};
for (const species of Dex.species.all()) {
  if (id(species.name) !== id(species.baseSpecies)) {
    formBases[id(species.name)] = id(species.baseSpecies);
  }
}
const registry = JSON.parse(readFileSync(new URL("../backend/src/main/resources/pokemon-data.json", import.meta.url)));
for (const [key, species] of Object.entries(registry.pokemon)) {
  const canonical = id(Dex.species.get(species.name).name);
  for (const alias of [key, ...species.aliases]) {
    const aliasId = id(alias);
    const resolved = Dex.species.get(alias);
    // Never collapse a real competitive forme just because a sprite alias does.
    if (aliasId !== canonical && !(resolved.exists && id(resolved.name) === aliasId)) {
      aliases[aliasId] = canonical;
    }
  }
}
for (const item of Dex.items.all()) {
  if (!item.megaStone) continue;
  const formes = Object.fromEntries(Object.entries(item.megaStone).map(([species, forme]) => [id(species), id(forme)]));
  itemRules[id(item.name)] = { species: Object.keys(formes), formes };
}
writeFileSync(new URL("../frontend/src/data/matchupMatching.json", import.meta.url),
  JSON.stringify({ aliases, formBases, itemRules }, null, 2) + "\n");
