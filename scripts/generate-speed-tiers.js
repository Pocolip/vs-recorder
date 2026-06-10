#!/usr/bin/env node

/**
 * Generate per-regulation speed tier JSON for the Speed Tiers page.
 *
 * Reads:
 *   - scripts/regulation-species/regM-*.json (per-regulation explicit species list)
 *   - @smogon/calc Gen 9 dex (base stats, calcStat, mega forme list)
 *
 * Writes one file per regulation:
 *   - frontend/src/data/speedTiers-reg{REG}.json
 *
 * Each regulation JSON is a flat array of canonical @smogon/calc Gen 9 species
 * names (or { species, baseSpeed } objects for species missing from the dex).
 * Mega formes are auto-expanded — listing the base species is enough.
 *
 * Usage: node scripts/generate-speed-tiers.js
 */

import { createRequire } from "module";
import { readFileSync, writeFileSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const require = createRequire(resolve(ROOT, "frontend/package.json"));
const { Generations, calcStat } = require("@smogon/calc");
const gen = Generations.get(9);

const REG_SPECIES_DIR = resolve(ROOT, "scripts/regulation-species");
const OUT_DIR = resolve(ROOT, "frontend/src/data");

// Champions-era regulations (M-A and onward) display Stat Points instead of
// EVs in the UI. 32 SPs ≡ 252 EVs (formula: sps*8-4), 0 SPs ≡ 0 EVs, so the
// computed speed stat is identical — only the labels change.
const CHAMPIONS_REGULATIONS = new Set(["M-A", "M-B"]);

// Look up the base speed of a species. Returns null if unknown.
function lookupBaseSpeed(species) {
  for (const s of gen.species) {
    if (s.name === species) return s.baseStats.spe;
  }
  return null;
}

// Collect every mega forme @smogon/calc knows of, keyed by base species, so we
// can auto-include all megas of any species in the regulation list (the list
// itself only names the base species — Charizard implies Mega-X and Mega-Y).
const megasByBase = new Map();
for (const s of gen.species) {
  const idx = s.name.indexOf("-Mega");
  if (idx > 0) {
    const base = s.name.slice(0, idx);
    if (!megasByBase.has(base)) megasByBase.set(base, []);
    megasByBase.get(base).push(s.name);
  }
}

function discoverRegulations() {
  const files = readdirSync(REG_SPECIES_DIR).filter((f) => /^regM-[A-Z]\.json$/i.test(f));
  return files
    .map((f) => ({ file: f, reg: f.replace(/^reg/, "").replace(/\.json$/, "") }))
    .sort((a, b) => a.reg.localeCompare(b.reg));
}

function buildSpeciesMap(speciesList) {
  const speciesMap = new Map(); // species -> baseSpeed
  function addSpecies(name, explicitSpeed) {
    const speed = explicitSpeed != null ? explicitSpeed : lookupBaseSpeed(name);
    if (speed == null) {
      console.warn(`[skip] ${name}: not in @smogon/calc and no override base speed`);
      return;
    }
    if (!speciesMap.has(name)) speciesMap.set(name, speed);
  }

  for (const entry of speciesList) {
    const name = typeof entry === "string" ? entry : entry?.species;
    const explicitSpeed = typeof entry === "object" ? entry.baseSpeed : undefined;
    if (!name) continue;
    addSpecies(name, explicitSpeed);
    for (const mega of megasByBase.get(name) || []) {
      addSpecies(mega);
    }
  }
  return speciesMap;
}

function generateRegulation({ file, reg }) {
  const path = resolve(REG_SPECIES_DIR, file);
  const speciesList = JSON.parse(readFileSync(path, "utf8"));
  const speciesMap = buildSpeciesMap(speciesList);

  const usesSps = CHAMPIONS_REGULATIONS.has(reg);
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
      entries.push({ pokemon: species, baseSpeed, spread: spread.label, speedStat });
    }
  }

  entries.sort((a, b) => {
    if (b.speedStat !== a.speedStat) return b.speedStat - a.speedStat;
    return a.pokemon.localeCompare(b.pokemon);
  });

  const today = new Date().toISOString().slice(0, 10);
  const output = {
    regulation: reg,
    generatedAt: today,
    speciesCount: speciesMap.size,
    entries,
  };

  const outPath = resolve(OUT_DIR, `speedTiers-reg${reg}.json`);
  writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
  console.log(`Wrote ${entries.length} rows for ${speciesMap.size} species → ${outPath}`);
}

const regs = discoverRegulations();
if (regs.length === 0) {
  console.error(`No regulation files found in ${REG_SPECIES_DIR}`);
  process.exit(1);
}
for (const r of regs) generateRegulation(r);
