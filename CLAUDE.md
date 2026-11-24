# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VS Recorder is a Pokemon VGC (Video Game Championships) replay analysis application consisting of two components:
- **Backend**: REST API server (Spring Boot + H2/PostgreSQL)
- **Frontend**: Web application (React 18 + Tailwind CSS + Webpack 5)

The application imports Pokemon Showdown replays, analyzes team performance, tracks matchup statistics, and provides game planning tools for competitive players.

## Build & Run Commands

### Backend (Spring Boot)
```bash
cd backend

# Build the project
mvn clean install

# Run the backend server (port 8080)
mvn spring-boot:run

# Run tests
mvn test

# Run specific test class
mvn test -Dtest=ServiceNameTest

# Run specific test method
mvn test -Dtest=ServiceNameTest#testMethodName
```

**H2 Console Access**: http://localhost:8080/h2-console
- JDBC URL: `jdbc:h2:file:./data/vsrecorder`
- Username: `sa`
- Password: (blank)

**API Documentation**: http://localhost:8080/swagger-ui.html (when server is running)

### Frontend (React)
```bash
cd frontend

# Install dependencies
npm install

# Start development server (port 3000, proxies to backend)
npm run start

# Production build
npm run build

# Clean build directory
npm run clean
```

### Full Stack (Docker, prod-like)
Builds images from the working tree and runs them as prod does: the `prod` profile on Postgres, prod's JVM options and 576M memory limit, and Redis with the matchup engine feature on. Needs Docker (OrbStack on the dev Mac).

```bash
scripts/local.sh up        # build + start, waits until healthy (app :3000, API :8080)
scripts/local.sh status    # health and memory use
scripts/local.sh logs backend
scripts/local.sh worker    # play the matchup engine's worker for the next simulation job
scripts/local.sh psql | redis | down | reset   # `help` lists everything
```

Settings go in a gitignored `.env` at the repo root (e.g. `ENGINE_ALLOWED_USERS=<username>`). The backend image is `linux/amd64` (prod is x86, and its Alpine JRE base has no ARM build), so it runs under Rosetta on Apple Silicon.

## Architecture

### Backend Architecture

**Package Structure** (`com.yeskatronics.vs_recorder_backend`):
- `entities/` - JPA entities (User, Team, Replay, Match, GamePlan, GamePlanTeam)
- `repositories/` - Spring Data JPA repositories
- `services/` - Business logic layer
- `controllers/` - REST API endpoints
- `dto/` - Data Transfer Objects for API requests/responses
- `mappers/` - MapStruct interfaces for entity ↔ DTO conversion
- `security/` - JWT authentication and Spring Security configuration
- `config/` - Application configuration (CORS, security, etc.)
- `utils/` - Utility classes (pokepaste parsing, showdown API integration)

**Database Design**:
- Uses H2 (file-based) for development with auto-schema generation
- Designed for PostgreSQL migration in production
- JSON storage: battle logs stored as JSONB/TEXT with `@JdbcTypeCode(SqlTypes.JSON)`
- Array storage: Uses `@ElementCollection` (H2) → migrates to native arrays (PostgreSQL)
- See DATABASE.md for full schema details

**Entity Relationships**:
```
User ─(1:N)─> Team ─(1:N)─> Replay
               │              │
               └──(1:N)─> Match ─(1:N)─┘
                          (optional grouping)

User ─(1:N)─> GamePlan ─(1:N)─> GamePlanTeam
```

**Key Services**:
- `ShowdownService` - Fetches battle logs from Pokemon Showdown replay URLs
- `PokepasteService` - Parses team data from Pokepaste URLs
- `PokemonService` - Authoritative source for Pokemon name resolution, types, sprites, and base species (loaded from `pokemon-data.json`)
- `AnalyticsService` - Calculates win rates, usage stats, matchup analysis (uses `PokemonService` for name normalization)
- `ReplayService` - Manages replay CRUD and parsing
- `MatchService` - Groups replays into Bo3 (Best of 3) sets
- `GamePlanService` - Tournament preparation and opponent team planning

**Authentication**:
- JWT-based auth with Spring Security
- Secret key configured in `application.properties` (change for production!)
- Tokens expire after 24 hours (configurable via `jwt.expiration`)

### Frontend Architecture

**Directory Structure** (`frontend/src`):
- `pages/` - Page components (HomePage, TeamPage, ExportPage, etc.)
- `components/` - Reusable UI components (cards/, modals/, tabs/)
- `contexts/` - React Context providers (AuthContext)
- `services/api/` - Backend API clients (Axios-based)
- `hooks/` - Custom React hooks
- `utils/` - Utility functions
- `styles/` - CSS and Tailwind configuration

**Tech Stack**:
- React 18, React Router 6 (BrowserRouter), Tailwind CSS 3, Webpack 5, Axios

**State Management & Auth**:
- React Context API (AuthContext) for authentication state
- JWT-based auth with automatic token refresh via Axios interceptors
- API communication through centralized Axios instance with auth headers

## Development Workflow

### Backend Development
1. Entities are defined with JPA annotations - schema auto-generated on startup
2. Use `spring.jpa.hibernate.ddl-auto=create-drop` during early development
3. Change to `update` once schema stabilizes to persist data between restarts
4. All DTOs use MapStruct for automatic mapping - processors run during compilation
5. Lombok generates getters/setters/constructors - use annotations instead of boilerplate

### Frontend Development
1. Run `npm run start` for dev server with hot reload on port 3000
2. Dev server proxies API requests to backend on port 8080
3. Use React DevTools to inspect component state
4. Environment config in `.env.development` / `.env.production` (`VITE_API_BASE_URL`)

## Pokemon Data Registry

The app uses a centralized Pokemon data registry (`backend/src/main/resources/pokemon-data.json`) as the single source of truth for Pokemon name resolution, types, sprite info, and base species grouping.

### How It Works
- `PokemonService` (backend) loads `pokemon-data.json` at startup and provides name resolution for analytics, sprites, and API endpoints
- The frontend fetches the registry via `GET /api/pokemon/registry` on app init and caches it in localStorage
- Existing offline fallbacks (`pokemonSpriteMap.json`, `COMMON_VGC_POKEMON`, `POKEMON_FORM_MAPPINGS`) remain as fallbacks if the registry is unavailable

### Updating the Registry

Re-run the generation script when new Pokemon are released or forme handling needs to change:

```bash
# From project root (requires internet to fetch Showdown aliases)
node scripts/generate-pokemon-data.js
```

This reads from:
1. **`@pkmn/dex`** (installed as frontend devDependency) — complete Showdown Pokedex with types, base species, forme data
2. **`frontend/src/data/pokemonSpriteMap.json`** — local sprite file form indices (app-specific, not available externally)
3. **`scripts/pokemon-aliases.json`** — hand-maintained app-specific overrides (see below)
4. **Showdown `aliases.ts`** — fetched from GitHub at generation time

And outputs: `backend/src/main/resources/pokemon-data.json` (checked into source control)

Mega formes also carry `megaOf` (the species a team lists, e.g. `Floette-Eternal` for `Floette-Mega`) and `megaStone`, from `@pkmn/dex`'s `battleOnly`/`requiredItem`; simulations use them to normalize pastes. The generator stamps today's month as `version`, which the frontend uses to invalidate its cached registry: keep the old value when a regeneration doesn't change anything the frontend reads.

### When to Regenerate
- New Pokemon generation or DLC released
- New VGC regulation adds previously unsupported forms
- Sprite files are added/updated (form indices change)
- A Pokemon name isn't resolving correctly in analytics

### Editing `scripts/pokemon-aliases.json`

This file contains two sections:

- **`aliases`**: Maps name variants to canonical keys. Add entries here for:
  - Battle log format names (e.g., `"Calyrex-Shadow Rider"` → `"calyrex-shadow"`)
  - Gender suffixes (e.g., `"Indeedee-F"` → `"indeedee-f"`)
  - Sprite map name mismatches
  - Any name the app encounters that doesn't resolve correctly

- **`baseSpeciesOverrides`**: Controls analytics grouping. Maps canonical keys to their base species for stats aggregation. Add entries to:
  - Preserve competitively distinct forms (e.g., `"rotom-wash"` → `"rotom-wash"`, NOT stripped to `"rotom"`)
  - Override `@pkmn/dex`'s default baseSpecies when our analytics needs differ

After editing, regenerate and run backend tests:
```bash
node scripts/generate-pokemon-data.js
cd backend && mvn test -Dtest=PokemonServiceTest
```

## Speed Tier Data

The Speed Tiers page (`frontend/src/pages/Team/SpeedTiersPage.tsx`) loads a per-regulation JSON of pre-computed speed values, one file per regulation:

- `frontend/src/data/speedTiers-regM-A.json` — generated, checked in
- `frontend/src/data/speedTiers-regM-B.json` — generated, checked in
- `frontend/src/data/speedTiers-regM-C.json` — generated, checked in

Each regulation's species list is the source of truth, kept in `scripts/regulation-species/`:

- `scripts/regulation-species/regM-A.json` — flat array of canonical `@smogon/calc` Gen 9 species names allowed in Reg M-A (seeded from Serebii's M-A page)
- `scripts/regulation-species/regM-B.json` — same shape for Reg M-B
- `scripts/regulation-species/regM-C.json` — same shape for Reg M-C (superset of M-B)

Regenerate with:

```bash
# From project root
node scripts/generate-speed-tiers.js
# or, from frontend/:
npm run generate:speed-tiers
```

The script (`scripts/generate-speed-tiers.js`) discovers every `regulation-species/regM-*.json` file and emits one `speedTiers-reg{X}.json` per. It reads:
1. `scripts/regulation-species/regM-*.json` — the explicit species list per regulation
2. `@smogon/calc` Gen 9 dex — base stats, `calcStat`, and the full mega forme list (used to auto-expand each base species into its mega variants)

Each species gets four rows (252+, 252 neutral, 0 neutral, 0 -Spe). Mega formes are auto-expanded — listing the base species (e.g. `Charizard`) implicitly covers `Charizard-Mega-X` / `Charizard-Mega-Y`. For species `@smogon/calc` doesn't know, an object entry `{ "species": "Name", "baseSpeed": 123 }` forces inclusion.

### Adding a new regulation

Drop a new `scripts/regulation-species/regM-{X}.json` with the allowed species list, run the generator, then import the new `speedTiers-reg{X}.json` and add it to the `REGULATIONS` map in `SpeedTiersPage.tsx`. If it's a Champions-era regulation, add it to `CHAMPIONS_REGULATIONS` in `generate-speed-tiers.js` so the spread labels read `SPs` instead of `EVs`. The newest regulation goes **last** in the `REGULATIONS` map — `SpeedTiersPage.tsx` derives its default selection from insertion order.

`-Mega-Z` formes (Absol/Garchomp/Lucario) are gated by `Z_MEGA_REGULATIONS` in `generate-speed-tiers.js`: they became legal in Reg M-C, so only regulations listed in that set include them. Regulations before M-C must stay out of it or their checked-in JSON will gain rows.

### Editing an existing regulation

Hand-edit the relevant `scripts/regulation-species/regM-*.json` (add/remove species names), regenerate, spot-check the diff on the corresponding `speedTiers-reg*.json`.

### Note on `setdex-gen10.ts`

`frontend/src/data/setdex-gen10.ts` is mirrored from NCP and powers the **damage calculator's preset-sets dropdown** (`frontend/src/components/calc/PokemonPanel.tsx`). It is no longer an input to the speed tier generator — those concerns are decoupled.

### Automated weekly refresh

`.github/workflows/data-refresh.yml` runs every Monday at 16:00 UTC (and on manual `workflow_dispatch`). It mirrors the upstream NCP gen-10 setdex into `setdex-gen10.ts` (via `scripts/update-setdex-gen10.js`) and pulls recent tournament teams. If anything actually changed, a single create-or-update PR is opened against `develop` on the `chore/weekly-data-refresh` branch. No PR is opened when upstream is unchanged. Speed tier JSONs are not auto-refreshed — regenerate them locally when a regulation species list changes.

Tournament teams (the Matchup Planner's Recent Tour modal) come from one of two sources, chosen with `--source` on `scripts/generate-tournament-teams.js` or the `TOURNAMENT_TEAMS_SOURCE` env var:

- **`direct` (default)**: [Limitless API](https://docs.limitlesstcg.com/developer.html) for grassroots online events plus [Reportworm](https://standings.reportworm.com) (`/api/v1/{season}` index, `/api/v1/{season}/{code}` standings) for official events. The generator clusters the open teamsheets itself into 4/5/6-Pokémon cores (`scripts/tournament-teams/cluster.js`) and ships each listed team's sheet as Showdown paste text in the JSON's `sheets` map. Finished Limitless events are cached in `scripts/.cache/tournament-teams/` (gitignored; persisted in CI with `actions/cache`). Modules live in `scripts/tournament-teams/`. Species resolve through `pokemon-data.json`; an unknown species skips that event with a warning, so add an alias if one shows up.
- **`labmaus`**: LabMaus' pre-clustered `top_teams` (pokepaste links). This is the old pipeline, kept as a fallback.

**Limitless API key:** without a key Limitless allows 50 requests / 5 min, so a cold 60-day run takes ~30 min. Set `LIMITLESS_API_KEY` (env locally, repo secret of the same name in CI) to send it as the `X-Access-Key` header and lift that limit. The key goes through a curl header file, so it never shows in URLs, argv or logs. When the key is set, the client spaces requests lightly and backs off using the `ratelimit` response header.

In CI, manual runs pick the source from the `workflow_dispatch` dropdown. Scheduled runs use the repo variable `TOURNAMENT_TEAMS_SOURCE` (Settings → Secrets and variables → Actions → Variables) and fall back to `direct`.

**Inline sheets:** direct-source teams have no pokepaste. Importing one stores the paste text itself as the opponent team's `pokepaste`. `pokepasteService.isInlinePaste` tells text from URLs, `fetchAndParse` parses text locally, and `TeamImportService.isValidOpponentPaste` accepts it in export/import. The user's own team pokepaste stays URL-only.

**Sources we don't use:** RK9 isn't scraped because its robots.txt disallows `/roster/`, `/pairings/` and `/teamlist/public/`. Reportworm's `/grassroots` is skipped because it's sourced from Limitless and would double-count. Reportworm's code license forbids ML-training use, so keep its data out of the matchup engine's training pool unless the author agrees.

Tournament teams are pulled per regulation. The list lives in `REGULATIONS` in `scripts/generate-tournament-teams.js`, and each entry writes `frontend/src/data/tournamentTeams-reg{X}.json`. To add a regulation:
1. Add the entry with all three source keys: `labmaus: "Regulation Set {X}"`, `limitless: "{X}"` (format id from `GET https://play.limitlesstcg.com/api/games`) and `reportworm: "Regulation {X}"`.
2. Run the script.
3. Import the new JSON in `frontend/src/data/tournamentTeamsByRegulation.ts`.
4. Add the file to `add-paths` in `.github/workflows/data-refresh.yml`.

Only M-C is refreshed; M-A and M-B remain available as archived LabMaus snapshots. The generator validates consumed JSON fields per source. It refuses to write when both direct sources fail, fewer than 100 complete teams were collected, or any composition size is empty. Run `node --test scripts/generate-tournament-teams.test.js 'scripts/tournament-teams/*.test.js'` to check ingestion behavior.

## Matchup Engine ("Simulated" analytics)

A separate matchup engine can play a team against the meta's top teams. Its result fills the Usage Stats, Matchup Stats and Move Usage pages when their **Simulated** toggle is on, and the **Diagnostics** page. Results are numbers in our own `AnalyticsDTO` shapes; no replays are stored.

- **Backend:** `engine/` (settings, the Redis queue over Jedis, the EC2 worker starter, and `SimulationPoller`), `services/SimulationService`, `controllers/SimulationController`, and the entity `SimulationJob`. The analytics endpoints take `?simulated=true`.
- **Frontend:** `context/SimulationContext.tsx` (status, polling, the toggle), `components/team/SimulatedBar.tsx`, `pages/Team/DiagnosticsPage.tsx`, and `hooks/useSimulatedData.ts`. Runs start from the **Simulations** modal (`components/modals/SimulationsModal.tsx`, a team action in the sidebar): the current job, then one section per engine feature. Simulated analytics runs at two depths, `quick` (the job's `options.search_opponents: 0`) and `full` (the engine's defaults); a full result counts as covering a quick one for the "unchanged paste" check. Replay grading is listed as coming later (the engine's ADR 0019 `grade` job). Matchup Planner plans are followed app-wide by `context/PlanSimulationContext.tsx` (the planner page passes its entries key so edits refetch), which feeds the modal's planner status and `components/team/SimulationProgressBar.tsx`: one bar for all of a team's engine work in the current run (its analytics job and plans, weighted by rough run time; `engineProgress` in `utils/simulationUtils.ts`).
- **Simulated plans (Matchup Planner):** the engine's `plan` job, one per planner entry (`GamePlanTeam`): what to bring, what they bring, and a win rate. They're `SimulationJob`s with `kind = PLAN` and a `gamePlanTeam`, so the poller, reconciliation and clean-up are shared; every team-level simulate query filters on `kind`. Submitted and served by `services/PlanSimulationService` and `controllers/PlanSimulationController` (`/api/teams/{id}/simulation/plans`: GET, POST a batch of entry IDs, DELETE `/{entryId}` to cancel). A batch queues one job per entry and starts the worker once; each entry gets its own outcome (queued, running, up to date, daily cap, unreadable paste). An entry's paste is a URL (fetched) or inline sheet text (sent as is). A plan is stale when the team's paste, the entry's paste or the engine's model changed (the model is the latest complete job's `provenance.model`, stored in `SimulationJob.model`); an up-to-date entry re-runs only with `force`. Plans have their own daily cap (`ENGINE_PLAN_DAILY_CAP`, default 20). Frontend: `hooks/usePlanSimulations.ts`, `components/team/PlannerSimulatedBar.tsx`, `components/modals/SimulatePlansModal.tsx` (pick entries; one entry alone gets a cost warning), and `components/team/SimulatedPlan.tsx` (shown in an entry while the Simulated toggle, the same one as the analytics pages', is on). The user's own compositions are never changed; "Add to my plans" copies one of the engine's.
- **Off by default:** `ENGINE_JOBS_ENABLED`. With it off, no Redis, EC2 or poller beans exist, and the UI hides everything. Only allowlisted team owners (`ENGINE_ALLOWED_USERS`, exact usernames, or `*` for every signed-in user) can run jobs, within per-user daily caps and, when set, global ones across everyone (`ENGINE_GLOBAL_DAILY_CAP`, `ENGINE_GLOBAL_PLAN_DAILY_CAP`; `SimulationService.runsLeft` applies both and gives the binding one's reason). With `*` the modals say it's open for a limited time. Prod only; beta never gets these settings.
- **Paste normalization:** on submit, `PasteNormalizer` rewrites a set that names a Mega forme (`Garchomp-Mega @ Garchompite`) as the species it evolves from, as Showdown's validator does, so users needn't edit their paste; a Mega forme without its stone is refused with a 400. The cleaned text is what's hashed and queued, and the job's `pasteNotes` say what changed (shown in the Simulations modal). The forme → species/stone data is the registry's `megaOf`/`megaStone`.
- **Contract:** `SimulationResultContractTest` deserializes the engine's sample result (`backend/src/test/resources/engine/simulate-result.sample.json`) into `AnalyticsDTO`, and `PlanResultContractTest` the sample plan (`plan-result.sample.json`) into `PlanResult` and its compositions into `GamePlanTeam.TeamComposition` (plus `weight`). **If you change `TeamComposition`, tell the engine's side too.** **If you change `UsageStatsResponse`, `MatchupStatsResponse`, `MoveUsageResponse` or their nested classes, tell the engine's side**: it checks the same shapes.
- **Keep out of this public repo:** the engine's code and methods, `REDIS_URL`, ARNs, instance IDs, and anything from a result's `provenance.method` (results are stored without it).

Local development, with no engine needed: `scripts/local.sh up` (with `ENGINE_ALLOWED_USERS=<you>` in `.env`), press **Run simulation** on a Matchup Stats page, and run `scripts/local.sh worker` in a terminal. It claims the job and plays it through running, partial and complete using the sample result for the job's kind (`worker fail` publishes an `invalid_team` failure, or `invalid_opponent` for a plan; `worker partial` holds at the partial until you press Cancel; it honours Cancel at every stage). For a batch of plans, `scripts/local.sh worker complete 0` keeps playing jobs until Ctrl-C. The local stack polls the queue every 10 s; prod polls once a minute, and the page every 30 s while a job is unfinished.

To run the backend on the host instead, start only Redis: `docker compose up -d redis`, then `(cd backend && ENGINE_JOBS_ENABLED=true ENGINE_ALLOWED_USERS='your-username' mvn spring-boot:run)`. `scripts/local.sh worker` works against that too.

## Important Notes

### Backend
- **Database**: H2 is for development only. Production requires PostgreSQL migration (see DATABASE.md migration section)
- **JWT Secret**: Default secret in `application.properties` MUST be changed for production
- **CORS**: Configure allowed origins in `config/` before deploying
- **Battle Log Parsing**: Showdown replay URLs are fetched and parsed - ensure network access during development
- **MapStruct + Lombok**: Both annotation processors must be configured in pom.xml for compatibility

### Frontend
- **Environment Variables**: Configured via `.env.development` and `.env.production` files
- **Router**: Uses BrowserRouter for SPA routing (nginx handles fallback in production)
- **Pokemon Sprites**: Served locally from `public/sprites/` directory
- **Production Build**: nginx serves the static build with gzip, SPA routing, and security headers

## Testing

### Backend Tests
- Test resources in `backend/src/test/resources/`
- Sample replays organized by player username in `replays/` directory
- Sample pokepastes in `pastes/` directory
- Services have comprehensive unit tests
- Use Spring Boot test annotations for integration tests

### Frontend
- No automated tests currently configured
- Manual testing via dev server (`npm run start`)

## API Endpoints

See BACKEND.md for full API specification. Key endpoints:
- `/auth/*` - Registration, login, JWT token management
- `/teams/*` - Team CRUD, associated replays and matches
- `/replays/*` - Replay management and parsing
- `/matches/*` - Bo3 match grouping
- `/teams/:id/stats/*` - Analytics (usage, matchups, move analysis)
- `/game-plans/*` - Tournament game planning
- `/export/*` and `/import/*` - Data portability
- `/api/pokemon/registry` - Full Pokemon data registry (names, types, sprites, aliases)
- `/api/pokemon/{name}/resolve` - Resolve any name variant to canonical entry

## Phase Documentation

The backend/ directory contains phase*.md files documenting the development progression:
- phase1.md - Database entities and repositories
- phase2.md - Service layer implementation
- phase3.md - REST controllers and DTOs
- phase4.md+ - Advanced features (analytics, game planner, import/export)

Refer to these for implementation details and design decisions made during development.

## Plans

Implementation plans created during Claude Code sessions:

- **[CI/CD & AWS Hosting](~/.claude/plans/gleaming-percolating-canyon.md)** - Single EC2 + Docker Compose architecture, GitHub Actions CI/CD, Terraform infrastructure, ~$32/month estimated cost. Includes Dockerfiles, nginx reverse proxy, RDS PostgreSQL setup.
- **[CI/CD Decoupling & Beta Environment](~/.claude/plans/generic-cooking-cascade.md)** - Separate beta API (api.beta.vsrecorder.app) and database, automatic version bumping on develop branch, decoupled build/deploy workflows (feature→beta, develop→versioned beta, main→prod).
- **[TeamMember Calcs](~/.claude/plans/iterative-snacking-bonbon.md)** - Per-Pokemon saved damage calc results. Backend `@ElementCollection` storage, full CRUD through existing PATCH endpoint, collapsible UI in PokemonNoteCard. Includes controller calcs bypass fix for mapper/`@ElementCollection` interaction.
- **[Direct tournament sources](~/.claude/plans/merry-hatching-oasis.md)** - Recent Tour data from Limitless API + Reportworm instead of LabMaus (kept behind `--source=labmaus` / `TOURNAMENT_TEAMS_SOURCE`). Generator-side core clustering, inline open-teamsheet imports stored as paste text, Limitless fetch cache in CI.
- **[Simulated analytics](~/.claude/plans/vs-recorder-matchup-engine-docs-vs-reco-sunny-swan.md)** - VS Recorder side of the matchup engine: `SimulationJob`, Redis queue + poller, EC2 worker start, `?simulated=true` analytics, Diagnostics page. Includes the Codex review fixes (per-user submit lock, commit-then-enqueue, reconcile timed-out jobs).
