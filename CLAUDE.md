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

### Full Stack (Docker Compose)
```bash
# From project root - starts backend, frontend, and PostgreSQL
docker-compose up
```

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
4. Environment config in `.env.development` / `.env.production` (`REACT_APP_API_BASE_URL`)

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
