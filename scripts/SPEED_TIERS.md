# Speed Tier Data

The Speed Tiers page (`/team/:teamId/speed-tiers`) shows a pre-computed table of meta Pokemon speed stats per regulation, with the active team's Pokemon overlaid at their actual paste speeds. The table is generated offline and checked into source control.

## Output

`frontend/src/data/speedTiers-regM-A.json` — one file per regulation. Contains:

```json
{
  "regulation": "M-A",
  "generatedAt": "2026-05-17",
  "speciesCount": 220,
  "entries": [
    { "pokemon": "Absol-Mega-Z", "baseSpeed": 151, "spread": "32 SPs / +Spe", "speedStat": 223 },
    ...
  ]
}
```

Each species gets four rows: max-investment +Spe nature, max-investment neutral, no-investment neutral, no-investment -Spe. Entries are sorted descending by `speedStat`.

Champions-era regulations (M-A and onward) emit `SPs` labels; legacy regulations emit `EVs`. The arithmetic is the same — 32 SPs is equivalent to 252 EVs in the calc — only the label changes.

## How to Update

```bash
# From project root
node scripts/generate-speed-tiers.js

# or from frontend/
npm run generate:speed-tiers
```

The script reads from:

1. **`frontend/src/data/setdex-gen10.ts`** — base species list (Champions tournament setdex). Every top-level key becomes an entry.
2. **`frontend/src/utils/megaStones.ts`** — `MEGA_STONE_FORMES` map, used to detect mega formes referenced by items in the setdex.
3. **`scripts/speed-tier-overrides.json`** — per-regulation `add` / `remove` patches (see below).
4. **`@smogon/calc` Gen 9 dex** — authoritative source for base stats and the `calcStat` formula.

For every base species included, the generator automatically pulls in any mega forme `@smogon/calc` knows about (e.g. `Garchomp` → `Garchomp-Mega`, `Garchomp-Mega-Z`).

## Adding / Removing Pokemon

Edit `scripts/speed-tier-overrides.json`:

```json
{
  "M-A": {
    "add": [
      "Lopunny",
      "Beedrill",
      { "species": "Some-Custom-Species", "baseSpeed": 150 }
    ],
    "remove": ["Zoroark-Hisui"]
  }
}
```

- `add` entries can be a plain species name (the script looks up the base speed via `@smogon/calc`) or `{ species, baseSpeed }` for entries the calc doesn't recognise.
- Megas of override-added species are auto-included.
- `remove` removes a species (and its rows) from the output.

After editing, regenerate and spot-check:

```bash
node scripts/generate-speed-tiers.js
```

The script prints `[skip] <species>: not in @smogon/calc and no override base speed` for any name it can't resolve — provide a `baseSpeed` in the override entry to force inclusion.

## When to Regenerate

- A regulation banlist changes (add/remove from the override JSON, regenerate).
- `setdex-gen10.ts` is updated with new sets or species.
- `@smogon/calc` is bumped and base stats / forme spellings shift.
- New mega stone items appear and `megaStones.ts` is updated.

## Item Speed Modifiers

`frontend/src/utils/megaStones.ts` also maintains:

- `MEGA_STONE_FORMES` — maps mega-stone items to their `@smogon/calc` species names. Hand-curated; new stones must be added here for the page to detect mega evolution from a paste's held item.
- `ITEM_SPEED_MULTIPLIER` — runtime modifiers for Choice Scarf (×1.5), Iron Ball (×0.5), Power items (×0.5), etc. Used only for the team-overlay rows, not the pre-computed table.
- `DITTO_ONLY_ITEMS` — Quick Powder (×2) applied only when species is Ditto.

These are consumed at runtime by `SpeedTiersPage.tsx`. No regeneration needed when editing them.

## Per-Row Scarf Toggle

The page lets the user tap any row to apply a transient ×1.5 Choice Scarf modifier to just that row (floored, amber highlight). This is purely a display-time effect — no underlying data changes.
