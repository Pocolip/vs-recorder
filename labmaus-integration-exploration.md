# LabMaus API Exploration (pre-plan)

Notes from poking at `labmaus.net` toward populating popular-team suggestions in
the Matchup Planner. Probed on 2026-05-19.

## TL;DR

- The endpoint is `GET https://labmaus.net/api/top_teams` with `regulation`,
  `date_range`, `language` query params.
- Auth is a static Bearer token literally hardcoded in their SPA bundle
  (`Discord.Api_Key = "X:F3mz5e4SP6Rcl3co!ou:8y"`). Same token is shipped to
  every visitor; it isn't user-scoped.
- Response is ~2 MB for a one-month window; ~700 KB for one week. ~1.0–1.5 s
  warm. Worth caching on our backend.
- Every individual team entry has a `team_url` pointing at `pokepast.es`, so
  our existing `PokepasteService` already handles ingestion.
- CORS is wide-open (reflects `Origin` + `Allow-Credentials: true`), so the
  frontend *could* call this directly, but proxying through the backend is
  better for caching and to avoid shipping the bearer in our bundle too.
- A small slug-translation layer is needed: LabMaus uses Showdown-ish slugs
  with a handful of differences from our `pokemon-data.json` keys (see
  [Slug mapping](#slug-mapping-vs-our-registry) below).

## Endpoint reference

### `GET /api/top_teams`

Query params (URL-encoded):

| Param | Example | Notes |
|---|---|---|
| `regulation` | `Regulation Set M-A` | Exact string from `/api/all_vgc_regulations` |
| `date_range` | `2026-04-21 to 2026-05-19` | ISO dates, ` to ` separator, inclusive |
| `language` | `en` | Localizes `pokemon_names` display strings |

Required header:

```
Authorization: Bearer X:F3mz5e4SP6Rcl3co!ou:8y
```

Missing/wrong auth → `403`.

### Response shape

Top level is a 3-element array, one entry per "composition" bucket. The
composition is the size of the *shared Pokémon set* used to cluster individual
tournament teams. Each bucket returns the top 30 clusters by aggregate score.

```jsonc
[
  { "composition": 4, "teams": [ /* 30 cluster entries */ ] },
  { "composition": 5, "teams": [ /* 30 */ ] },
  { "composition": 6, "teams": [ /* 30 */ ] }
]
```

- `composition: 6` — exact 6-mon team archetypes.
- `composition: 5` — clusters that share 5/6 (one flex slot varies).
- `composition: 4` — clusters that share a 4-mon core.

Each cluster:

```jsonc
{
  "pokemon":       ["006", "445", "902", "983"],           // LabMaus IDs (see below)
  "pokemon_names": ["Charizard", "Garchomp", "Basculegion ♂", "Kingambit"],
  "wins":   1048,
  "losses": 456,
  "score":  1296,                                          // proprietary weighting
  "teams":  [ /* individual tournament submissions in this cluster */ ]
}
```

Each inner team (these are the actual rentable lists):

```jsonc
{
  "name":                 "mudhiman",
  "placement":            1,
  "record":               "19-1-0",
  "score":                100,
  "pokemon":              ["006","142","445","670","902","983"],
  "pokemon_base_ids":     ["006","142","445","670","902","983"],
  "pokemon_names":        ["Charizard","Aerodactyl","Garchomp","Floette","Basculegion ♂","Kingambit"],
  "team_url":             "https://pokepast.es/348127db40fb7b33",
  "tournament_division":  "Masters",
  "tournament_id":        56298,
  "tournament_name":      "The Grand Champions Festival"
}
```

In the Reg-G sample I pulled, **100% of `team_url` values were `pokepast.es`
URLs**, which is the happy path for us.

### LabMaus Pokémon ID format

3-digit dex number (4 for `>= 1000`), with an optional `-<formeKey>` suffix.
The suffix is **per-species** rather than a consistent meaning:

| Example | Decoded |
|---|---|
| `006` | Charizard |
| `006-my` | Charizard-Mega Y |
| `038-a` | Ninetales-Alola |
| `059-h` | Arcanine-Hisui |
| `115-m` | Kangaskhan-Mega |
| `149-m` | Dragonite-Mega |
| `479-h` / `479-w` / `479-m` | Rotom-Heat / Wash / Mow (suffix = forme initial) |
| `681` | Aegislash-Blade (default!) |
| `888-c` | Zacian-Crowned |
| `892` / `892-r` | Urshifu-Single-Strike / Rapid-Strike |
| `898-i` / `898-s` | Calyrex-Ice / Calyrex-Shadow |
| `902` / `902-f` | Basculegion ♂ / Basculegion ♀ |
| `1017-h` | Ogerpon-Hearthflame-Mask |

The bearer-protected `GET /api/reference_json` returns the authoritative
`{ id -> showdown-style-slug }` map (1219 entries) — this is what we should
use as the source of truth for translation, not a hand-rolled suffix parser.

## Other endpoints surfaced from the SPA bundle

Extracted from `/assets/index-DyEpPOjB.js`:

```
/api/all_vgc_abilities
/api/all_vgc_items
/api/all_vgc_moves
/api/all_vgc_pokemon         (returns 500 — needs params I didn't try)
/api/all_vgc_regulations
/api/all_vgc_types
/api/completed_tournaments
/api/delete_tournament
/api/discover_teams          (flat list of recent submissions, 1280 rows in 1wk window)
/api/filtered_item_trends
/api/filtered_move_trends
/api/filtered_pokemon_trends
/api/get_pokemon_name
/api/pokemon_details
/api/reference_json          (id -> slug map, types, abilities, items, moves)
/api/team_pairings
/api/top_teams               (← the one we want)
/api/top_trending_items
/api/top_trending_moves
/api/top_trending_pokemon
/api/tournament
/api/tournament_item_details
/api/tournament_json
/api/tournament_move_details
/api/tournament_pokemon_details
/api/tournament_tera_details
/api/upcoming_tournaments
/api/upload_tournament
/api/usage_breakdown
/api/user_tournaments
```

The only ones likely relevant to the Matchup Planner are `top_teams`,
`reference_json` (for the slug map), and `all_vgc_regulations` (to know what
regulation strings to send).

## Slug mapping vs our registry

LabMaus slugs vs. keys in `backend/src/main/resources/pokemon-data.json`.
Most match outright; these are the gotchas worth tracking. Suggest a small
hand-maintained adapter in the backend integration layer, OR adding the
LabMaus variants to `scripts/pokemon-aliases.json` so `PokemonService`
resolves them natively.

| LabMaus slug | Our registry key |
|---|---|
| `aegislash-shield` | `aegislash` |
| `basculegion-male` | `basculegion` |
| `basculegion-female` | `basculegion-f` |
| `ogerpon-cornerstone-mask` | `ogerpon-cornerstone` |
| `ogerpon-hearthflame-mask` | `ogerpon-hearthflame` |
| `ogerpon-wellspring-mask` | `ogerpon-wellspring` |
| `urshifu-single-strike` | `urshifu` (verify) |
| `tornadus-incarnate` / `landorus-incarnate` / `thundurus-incarnate` / `enamorus-incarnate` | likely `tornadus` / `landorus` / `thundurus` / `enamorus` (verify) |
| `necrozma-dusk` / `necrozma-dawn` / `necrozma-ultra` | likely `necrozma-duskmane` / `dawnwings` / `ultra` (verify) |

(Spot checks of `calyrex-shadow`, `urshifu-rapid-strike`, `rotom-wash` already
match 1:1.)

Cleanest: extend `scripts/pokemon-aliases.json` so calling
`PokemonService.resolve("basculegion-male")` already returns the canonical
entry — that way the integration code stays naive about LabMaus quirks.

## Operational notes

- **Auth**: Token is in their public bundle. Treat as "anonymous API key";
  copy it into backend config but assume LabMaus can rotate it at any time.
  Build a clear failure path that surfaces "couldn't reach LabMaus" cleanly.
- **CORS**: Reflects `Origin` + `Allow-Credentials: true` → callable from any
  browser. Still recommend a backend proxy for caching and to keep our
  bundle clean.
- **Latency / size**: 1 month Reg M-A ≈ 2.25 MB, ~1.2 s. 1 week ≈ 0.63 MB,
  ~0.75 s. Reg G all-time chunk ≈ 5.3 MB, ~1.6 s. Cache aggressively.
- **Rate limiting**: didn't hit any in three back-to-back fetches; don't
  hammer it. A daily cache refresh is plenty for "popular teams" UX.
- **TOS / etiquette**: Nothing on `labmaus.net/` indicates an open API. If we
  ship this we should probably reach out to the LabMaus author before
  release — at minimum credit them in the UI ("popular teams sourced from
  labmaus.net").

## Suggested next-step shape (sketch, not the plan)

1. Backend: new `LabMausService` + `LabMausController`.
   - `GET /api/labmaus/top-teams?regulation=...&from=...&to=...` → trimmed,
     cached response (Caffeine TTL ~6–24h keyed on the three params).
   - Translate IDs → our canonical slugs via `PokemonService` (so the
     frontend gets the same Pokémon identifiers it already uses).
   - Drop the raw bearer into `application.properties` as a config value.
2. Frontend: in the Matchup Planner, add a "Popular teams" panel:
   - Filter by composition (4/5/6) and current regulation.
   - Each row → 6 sprites + W/L + a "Use this team" CTA that pipes the
     `team_url` straight into the existing pokepaste import flow.
3. Alias coverage: regenerate `pokemon-data.json` after adding LabMaus
   variants to `scripts/pokemon-aliases.json`; run
   `mvn test -Dtest=PokemonServiceTest` to confirm.

## Reproducing the probes

```bash
TOKEN='X:F3mz5e4SP6Rcl3co!ou:8y'

# Top teams, current Reg M-A, one-month window
curl -s "https://labmaus.net/api/top_teams?regulation=Regulation+Set+M-A&date_range=2026-04-21+to+2026-05-19&language=en" \
  -H "authorization: Bearer $TOKEN" | jq .

# Reference data (slug map + type/ability/move/item refs)
curl -s "https://labmaus.net/api/reference_json" -H "authorization: Bearer $TOKEN" | jq .

# Regulation list
curl -s "https://labmaus.net/api/all_vgc_regulations" -H "authorization: Bearer $TOKEN" | jq .
```
