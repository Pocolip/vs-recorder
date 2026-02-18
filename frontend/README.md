# VS Recorder Frontend

React web application for competitive Pokemon VGC players to analyze Showdown replays, track team performance, and prepare for tournaments.

Built on [TailAdmin](https://tailadmin.com) — a production-ready, mobile-first dashboard template for React.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19 | UI framework |
| TypeScript | 5.7 | Type safety |
| Vite | 6 | Build tool and dev server |
| Tailwind CSS | 4 | Utility-first styling |
| React Router | 7 | Client-side routing with nested layouts |
| Axios | 1.7 | HTTP client with JWT interceptors |
| @smogon/calc | 0.10 | Damage calculation engine |
| Recharts | 3.7 | Analytics charts |
| react-select | 5.9 | Searchable dropdowns |
| Lucide React | 0.468 | Icons |

### Changes from the original frontend

| | Original (`frontend/`) | Rewrite (`frontend-rewrite/`) |
|---|---|---|
| Language | JavaScript | TypeScript |
| Build tool | Webpack 5 | Vite 6 |
| React | 18 | 19 |
| Tailwind | 3 | 4 |
| Router | React Router 6 | React Router 7 |
| Layout | Top tab bar | TailAdmin sidebar + nested routes |
| Theme | Dark only | Dark/light mode toggle |

## Development

### Prerequisites

- Node.js 18+
- Backend server running on port 8080 (see `/backend`)

### Run

```bash
npm install
npm run dev
```

Dev server starts on `http://localhost:3000` and proxies `/api` requests to the backend.

### Build

```bash
npm run build     # TypeScript check + Vite production build → dist/
npm run preview   # Preview the production build locally
npm run lint      # ESLint
```

### Docker

```bash
# Build image (defaults to production API URL)
docker build -t vsrecorder-frontend .

# Override API URL
docker build -t vsrecorder-frontend \
  --build-arg VITE_API_BASE_URL=http://localhost:8080 .

# Run
docker run -d -p 3000:80 vsrecorder-frontend
```

Production image uses nginx with gzip, SPA fallback routing, cache headers, and security headers.

## Project Structure

```
frontend-rewrite/
├── public/
│   └── sprites/                # Local Pokemon sprite icons
├── src/
│   ├── components/
│   │   ├── auth/               # ProtectedRoute, PublicRoute, SignInForm, SignUpForm
│   │   ├── calc/               # Damage calculator UI (9 components)
│   │   ├── common/             # PageBreadCrumb, ThemeToggleButton, ChartTab, etc.
│   │   ├── header/             # Header, UserDropdown, NotificationDropdown
│   │   ├── modals/             # NewTeam, AddReplay, EditTeam, ExportTeam, ImportTeam, etc.
│   │   ├── pokemon/            # PokemonSprite, PokemonTeam
│   │   ├── team/               # CompactReplayCard, GameCard, BestOf3Card, TeamHeader, etc.
│   │   ├── ui/                 # TailAdmin primitives (button, badge, modal, table, etc.)
│   │   └── Footer.tsx
│   ├── context/
│   │   ├── AuthContext.tsx      # JWT auth state, login/logout/register
│   │   ├── ActiveTeamContext.tsx # Current team data shared across team pages
│   │   ├── CalcStateContext.tsx  # Persists calculator state across tab switches
│   │   ├── SidebarContext.tsx    # Sidebar open/collapsed state
│   │   └── ThemeContext.tsx      # Dark/light mode toggle
│   ├── data/
│   │   ├── setdex-gen9.ts       # NCP VGC tournament sets for damage calc
│   │   └── pokemonSpriteMap.json
│   ├── hooks/
│   │   ├── useDamageCalc.ts     # @smogon/calc wrapper, recalculates on input change
│   │   ├── useTeamStats.ts      # Analytics data fetching
│   │   ├── useTeamMembers.ts    # Pokemon notes and saved calcs
│   │   ├── useTeamPokemon.ts    # Team member data from PokeAPI
│   │   ├── useOpponentTeams.ts  # Game plan opponent teams
│   │   ├── useTeams.ts          # Team list CRUD
│   │   └── useModal.ts          # Modal open/close state
│   ├── layout/
│   │   ├── AppLayout.tsx        # Sidebar + header + content shell
│   │   ├── AppSidebar.tsx       # Navigation sidebar with team-scoped links
│   │   ├── AppHeader.tsx        # Top bar with user dropdown and theme toggle
│   │   └── TeamLayout.tsx       # Nested layout for /team/:teamId/* routes
│   ├── pages/
│   │   ├── Dashboard/
│   │   │   └── HomePage.tsx     # Team list with stats bar, filters, team cards
│   │   ├── Team/
│   │   │   ├── ReplaysPage.tsx
│   │   │   ├── GameByGamePage.tsx
│   │   │   ├── MatchByMatchPage.tsx
│   │   │   ├── UsageStatsPage.tsx
│   │   │   ├── MatchupStatsPage.tsx
│   │   │   ├── MoveUsagePage.tsx
│   │   │   ├── MatchupPlannerPage.tsx
│   │   │   ├── PokemonNotesPage.tsx
│   │   │   └── CalculatorPage.tsx
│   │   ├── AuthPages/           # SignIn, SignUp, ForgotPassword, ResetPassword
│   │   ├── AboutPage.tsx
│   │   └── OtherPage/          # 404
│   ├── services/
│   │   ├── api/                # Axios clients (auth, team, replay, match, analytics, etc.)
│   │   ├── teamService.ts      # Team business logic
│   │   ├── replayService.ts    # Replay business logic
│   │   ├── matchService.ts     # Bo3 match grouping
│   │   ├── pokemonService.ts   # PokeAPI integration and sprite resolution
│   │   ├── pokepasteService.ts # Pokepaste/Pokebin URL parsing
│   │   └── opponentTeamService.ts
│   ├── types/                  # TypeScript interfaces (team, replay, match, analytics, etc.)
│   ├── utils/
│   │   ├── calcUtils.ts        # NCP stat key mapping, calc helpers
│   │   ├── pokemonNameUtils.ts # Name normalization for sprites and API
│   │   ├── resultUtils.ts      # Win/loss result formatting
│   │   └── timeUtils.ts        # Date formatting
│   ├── App.tsx                 # Route definitions
│   └── main.tsx                # Entry point with context providers
├── index.html
├── vite.config.ts              # Vite config with /api proxy to backend
├── tsconfig.json
├── Dockerfile                  # Multi-stage: Node build → nginx
└── nginx.conf                  # SPA routing, gzip, cache, security headers
```

## Routing

All team pages are nested under `/team/:teamId/` using `TeamLayout`, which provides the `ActiveTeamContext` so every sub-page shares the same team data without refetching.

| Route | Page |
|-------|------|
| `/` | Home — team list dashboard |
| `/signin` | Sign in |
| `/signup` | Sign up |
| `/forgot-password` | Forgot password |
| `/reset-password` | Reset password (with token) |
| `/about` | About page |
| `/team/:teamId/replays` | Replay list (default team tab) |
| `/team/:teamId/game-by-game` | Individual game cards |
| `/team/:teamId/match-by-match` | Bo3 match cards |
| `/team/:teamId/usage-stats` | Pokemon usage, lead pairs, tera frequency |
| `/team/:teamId/matchup-stats` | Matchup win rates and attendance |
| `/team/:teamId/move-usage` | Move frequency per Pokemon |
| `/team/:teamId/matchup-planner` | Opponent team planning |
| `/team/:teamId/pokemon-notes` | Per-Pokemon notes with saved calcs |
| `/team/:teamId/calculator` | Damage calculator |

## Damage Calculator

Native damage calculator powered by `@smogon/calc`, with VGC tournament sets from the [NCP VGC Damage Calculator](https://github.com/dotMr-P/NCP-VGC-Damage-Calculator).

| Component | Purpose |
|-----------|---------|
| `PokemonPanel` | Species/set selector, nature/ability/item, tera, status, stats, moves |
| `FieldPanel` | Format, terrain, weather, ruin abilities, per-side effects |
| `MoveResults` | 4-move damage % list per side, click to expand |
| `MainResult` | Full calc description, damage bar, rolls, save button |
| `StatTable` | Base/IV/EV/boost/total for all 6 stats with EV counter |
| `MoveSlot` | Move selector with BP override and crit toggle |
| `SidebarSlots` | Team quick-switch sprites (attacker side) |
| `GenerationPicker` | Gen selector (Gen 9 active, others stubbed) |

State is managed by `CalcStateContext` so calculator inputs persist when navigating to other team pages and back.

### Updating the NCP setdex

1. Get the latest `setdex_ncp-g9.js` from the [NCP repo](https://github.com/dotMr-P/NCP-VGC-Damage-Calculator) (`script_res/setdex_ncp-g9.js`)
2. Replace the contents of `src/data/setdex-gen9.ts`, changing the first line from `var SETDEX_GEN9 = {` to `export const SETDEX_GEN9: Record<string, Record<string, any>> = {`
3. NCP stat keys (`at`, `df`, `sa`, `sd`, `sp`) are mapped to `@smogon/calc` keys (`atk`, `def`, `spa`, `spd`, `spe`) at runtime in `calcUtils.ts`

### Known quirks

- **Status uses short-form IDs** — `@smogon/calc` checks status with `brn`, `par`, `psn`, `tox`, `slp`, `frz`. Full names like `'Burned'` silently fail for Facade/Hex/Guts checks.
- **BP override field** — Uses `overrides: { basePower }`, not direct `move.bp` assignment (ignored by the library).
- **curHP is absolute** — UI stores HP as percentage (0-100), but `@smogon/calc` expects absolute HP via `pokemon.originalCurHP`. The hook converts.
- **Gen 9 only** — Generation picker renders all gens but only Gen 9 is functional. New gens need their own setdex import and `Generations.get(n)` call.
