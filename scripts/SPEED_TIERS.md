# Speed Tier Data

The Speed Tiers page (`/team/:teamId/speed-tiers`) shows a pre-computed table of meta Pokemon speed stats per regulation, with the active team's Pokemon overlaid at their actual paste speeds. The tables are generated offline (one file per regulation) and checked into source control.

## Output

One file per regulation under `frontend/src/data/`:

- `speedTiers-regM-A.json`
- `speedTiers-regM-B.json`
- (future regulations follow the same `speedTiers-reg{X}.json` pattern)

Each file:

```json
{
  "regulation": "M-A",
  "generatedAt": "2026-06-10",
  "speciesCount": 265,
  "entries": [
    { "pokemon": "Absol-Mega-Z", "baseSpeed": 151, "spread": "32 SPs / +Spe", "speedStat": 223 },
    ...
  ]
}
```

Each species gets four rows: max-investment +Spe nature, max-investment neutral, no-investment neutral, no-investment -Spe. Entries are sorted descending by `speedStat` (ties broken by name).

Champions-era regulations (M-A onward) emit `SPs` labels; legacy regulations emit `EVs`. The arithmetic is the same — 32 SPs is equivalent to 252 EVs in the calc — only the label changes. The `CHAMPIONS_REGULATIONS` set inside `generate-speed-tiers.js` controls which regulations use SPs.

## Source of truth: per-regulation species lists

Each regulation has an explicit species list at `scripts/regulation-species/regM-{X}.json` — a flat JSON array of canonical `@smogon/calc` Gen 9 species names:

```json
[
  "Abomasnow",
  "Absol",
  "Aegislash-Shield",
  ...
]
```

For species `@smogon/calc` doesn't know about, use the object form:

```json
[
  "Abomasnow",
  { "species": "Some-Custom-Species", "baseSpeed": 150 }
]
```

**Megas are auto-expanded** — listing the base species (e.g. `Charizard`) implicitly covers `Charizard-Mega-X` and `Charizard-Mega-Y`. Only list the base form.

The M-A list was seeded from [Serebii's Reg M-A page](https://www.serebii.net/pokemonchampions/rankedbattle/regulationm-a.shtml) and includes a handful of competitively distinct sub-formes that Serebii lumps under the base species (`Maushold-Four`, `Rotom-Heat`, `Rotom-Wash`).

## Regenerating

```bash
# From project root
node scripts/generate-speed-tiers.js

# or from frontend/
npm run generate:speed-tiers
```

The script discovers every `scripts/regulation-species/regM-*.json` and emits a matching `speedTiers-reg{X}.json`. It reads:

1. **`scripts/regulation-species/regM-*.json`** — the explicit species list per regulation
2. **`@smogon/calc` Gen 9 dex** — base stats, `calcStat`, and the full mega forme list (used to auto-expand each base species)

The script prints `[skip] <species>: not in @smogon/calc and no override base speed` for any name it can't resolve — provide a `baseSpeed` in an object entry to force inclusion.

## Adding a new regulation

1. Create `scripts/regulation-species/regM-{X}.json` with the allowed species list.
2. Run the generator.
3. Import the new `speedTiers-reg{X}.json` in `frontend/src/pages/Team/SpeedTiersPage.tsx` and add it to the `REGULATIONS` map.
4. If it's a Champions-era regulation, add `"M-{X}"` to `CHAMPIONS_REGULATIONS` in `generate-speed-tiers.js` so spread labels read `SPs`.
5. Add the new output path to `add-paths` in `.github/workflows/data-refresh.yml`.

## Editing an existing regulation

Hand-edit the relevant `scripts/regulation-species/regM-*.json` (add/remove species names), regenerate, spot-check the diff:

```bash
node scripts/generate-speed-tiers.js
git diff frontend/src/data/speedTiers-reg*.json
```

## When to Regenerate

- A regulation's legal species list changed (hand-edit the regulation JSON, regenerate).
- `@smogon/calc` is bumped and base stats / forme spellings shift.

The damage-calculator's preset-sets dropdown still uses `frontend/src/data/setdex-gen10.ts` (mirrored from NCP weekly), but that file is no longer an input to the speed tier generator.

## Item Speed Modifiers

`frontend/src/utils/megaStones.ts` maintains:

- `MEGA_STONE_FORMES` — maps mega-stone items to their `@smogon/calc` species names. Hand-curated; new stones must be added here for the page to detect mega evolution from a paste's held item.
- `ITEM_SPEED_MULTIPLIER` — runtime modifiers for Choice Scarf (×1.5), Iron Ball (×0.5), Power items (×0.5), etc. Used only for the team-overlay rows, not the pre-computed table.
- `DITTO_ONLY_ITEMS` — Quick Powder (×2) applied only when species is Ditto.

These are consumed at runtime by `SpeedTiersPage.tsx`. No regeneration needed when editing them.

## Per-Row Scarf Toggle

The page lets the user tap any row to apply a transient ×1.5 Choice Scarf modifier to just that row (floored, amber highlight). This is purely a display-time effect — no underlying data changes.
