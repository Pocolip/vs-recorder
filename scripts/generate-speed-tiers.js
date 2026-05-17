#!/usr/bin/env node

/**
 * Generate per-regulation speed tier JSON for the Speed Tiers page.
 *
 * Reads:
 *   - frontend/src/data/setdex-gen10.ts (Champions / Reg M-A setdex — species list + items)
 *   - scripts/speed-tier-overrides.json (per-regulation add/remove)
 *   - @smogon/calc Gen 9 dex (base stats, calcStat)
 *   - frontend/src/utils/megaStones.ts (item → mega forme map — parsed as text)
 *
 * Writes:
 *   - frontend/src/data/speedTiers-regM-A.json
 *
 * Usage: node scripts/generate-speed-tiers.js
 */

import { createRequire } from "module";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const require = createRequire(resolve(ROOT, "frontend/package.json"));
const { Generations, calcStat } = require("@smogon/calc");
const gen = Generations.get(9);

// ---------- Load setdex-gen10 (pure object literal in a .ts file) ----------

function loadSetdex(path) {
  const text = readFileSync(path, "utf8");
  const body = text
    .replace(/^export const SETDEX_GEN10 = /, "")
    .replace(/;?\s*$/, "");
  // The file is pure data — no imports, no expressions. Function() eval is safe
  // for a generator script consuming source-controlled content.
  return new Function("return " + body)();
}

// ---------- Load mega stone map (parse the data block from megaStones.ts) ----------

function loadMegaStoneMap(path) {
  const text = readFileSync(path, "utf8");
  const match = text.match(/MEGA_STONE_FORMES:\s*Record<string,\s*string>\s*=\s*({[\s\S]*?\n};)/);
  if (!match) throw new Error("Could not find MEGA_STONE_FORMES literal in " + path);
  // Strip trailing semicolon and TS-specific colon-key shorthand isn't used here.
  const body = match[1].replace(/;\s*$/, "");
  return new Function("return " + body)();
}

// ---------- Build the species list ----------

const SETDEX_PATH = resolve(ROOT, "frontend/src/data/setdex-gen10.ts");
const MEGA_STONES_PATH = resolve(ROOT, "frontend/src/utils/megaStones.ts");
const OVERRIDES_PATH = resolve(ROOT, "scripts/speed-tier-overrides.json");
const OUT_PATH = resolve(ROOT, "frontend/src/data/speedTiers-regM-A.json");

const SETDEX = loadSetdex(SETDEX_PATH);
const MEGA = loadMegaStoneMap(MEGA_STONES_PATH);
const OVERRIDES = JSON.parse(readFileSync(OVERRIDES_PATH, "utf8"));

const REGULATION = "M-A";

// Some setdex names need light remapping to match @smogon/calc species spelling.
const SPECIES_REMAP = {
  Aegislash: "Aegislash-Shield",
};

function normalizeSpecies(name) {
  return SPECIES_REMAP[name] || name;
}

// Look up the base speed of a species. Returns null if unknown.
function lookupBaseSpeed(species) {
  for (const s of gen.species) {
    if (s.name === species) return s.baseStats.spe;
  }
  return null;
}

// Collect species: base setdex keys + mega formes induced by items in their sets.
const speciesMap = new Map(); // species -> baseSpeed
function addSpecies(name, explicitSpeed) {
  const speed = explicitSpeed != null ? explicitSpeed : lookupBaseSpeed(name);
  if (speed == null) {
    console.warn(`[skip] ${name}: not in @smogon/calc and no override base speed`);
    return;
  }
  if (!speciesMap.has(name)) speciesMap.set(name, speed);
}

// Collect every mega forme @smogon/calc knows of, keyed by base species, so we
// can auto-include all megas of any species in the setdex (the setdex itself
// may not have a set using the relevant stone).
const megasByBase = new Map();
for (const s of gen.species) {
  const idx = s.name.indexOf("-Mega");
  if (idx > 0) {
    const base = s.name.slice(0, idx);
    if (!megasByBase.has(base)) megasByBase.set(base, []);
    megasByBase.get(base).push(s.name);
  }
}

for (const rawName of Object.keys(SETDEX)) {
  const species = normalizeSpecies(rawName);
  addSpecies(species);

  // Auto-include all known mega formes of this species.
  for (const mega of megasByBase.get(species) || []) {
    addSpecies(mega);
  }
  // Also pick up mega formes referenced by items in this Pokemon's sets, in
  // case the @smogon/calc forme isn't keyed off the base species name
  // (e.g. Tatsugiri-Curly-Mega has base "Tatsugiri-Curly" not "Tatsugiri").
  const sets = SETDEX[rawName];
  for (const setKey of Object.keys(sets)) {
    const item = sets[setKey].item;
    if (!item) continue;
    const megaForme = MEGA[item];
    if (megaForme) addSpecies(megaForme);
  }
}

// Apply per-regulation overrides
const regOverrides = OVERRIDES[REGULATION] || { add: [], remove: [] };
for (const entry of regOverrides.add || []) {
  const name = typeof entry === "string" ? entry : entry?.species;
  const explicitSpeed = typeof entry === "object" ? entry.baseSpeed : undefined;
  if (!name) continue;
  addSpecies(name, explicitSpeed);
  // Auto-include mega formes of override-added species too.
  for (const mega of megasByBase.get(name) || []) {
    addSpecies(mega);
  }
}
for (const name of regOverrides.remove || []) {
  speciesMap.delete(name);
}

// ---------- Generate the rows ----------

// Champions-era regulations (M-A and onward) display Stat Points instead of
// EVs in the UI. 32 SPs ≡ 252 EVs (formula: sps*8-4), 0 SPs ≡ 0 EVs, so the
// computed speed stat is identical — only the labels change.
const CHAMPIONS_REGULATIONS = new Set(["M-A"]);
const usesSps = CHAMPIONS_REGULATIONS.has(REGULATION);
const STAT_UNIT = usesSps ? "SPs" : "EVs";
const MAX_INVEST = usesSps ? 32 : 252;

const SPREADS = [
  { ev: 252, nature: "Jolly", label: `${MAX_INVEST} ${STAT_UNIT} / +Spe` },
  { ev: 252, nature: "Hardy", label: `${MAX_INVEST} ${STAT_UNIT} / Neutral` },
  { ev: 0,   nature: "Hardy", label: `0 ${STAT_UNIT} / Neutral` },
  { ev: 0,   nature: "Brave", label: `0 ${STAT_UNIT} / -Spe` },
];

const entries = [];
for (const [species, baseSpeed] of speciesMap.entries()) {
  for (const spread of SPREADS) {
    const speedStat = calcStat(gen, "spe", baseSpeed, 31, spread.ev, 50, spread.nature);
    entries.push({
      pokemon: species,
      baseSpeed,
      spread: spread.label,
      speedStat,
    });
  }
}

// Sort descending by speedStat; stable secondary sort by name for determinism.
entries.sort((a, b) => {
  if (b.speedStat !== a.speedStat) return b.speedStat - a.speedStat;
  return a.pokemon.localeCompare(b.pokemon);
});

const today = new Date().toISOString().slice(0, 10);
const output = {
  regulation: REGULATION,
  generatedAt: today,
  speciesCount: speciesMap.size,
  entries,
};

writeFileSync(OUT_PATH, JSON.stringify(output, null, 2) + "\n");

console.log(`Wrote ${entries.length} rows for ${speciesMap.size} species → ${OUT_PATH}`);
