# VS Recorder Frontend Rewrite

Complete frontend rewrite using TailAdmin as the base dashboard template.

## Why

The current frontend was built manually with React + Tailwind and lacks proper mobile responsiveness. TailAdmin provides a production-ready, mobile-first dashboard foundation that fits our data analysis use case.

## TailAdmin

- **Site**: https://tailadmin.com
- **GitHub (free)**: https://github.com/TailAdmin/tailadmin-free-tailwind-dashboard-template
- **Stack**: React / Next.js, TypeScript, Tailwind CSS
- **Includes**: 500+ UI components, dark/light mode, ApexCharts, 7 dashboard variants (Analytics, CRM, etc.)
- **License**: Free tier available, Pro for additional pages/components

### Relevant Dashboard Variants
- **Analytics** — stats cards, charts, data tables (closest to our replay/matchup analysis)
- **CRM** — tabular data, filtering, detail views (similar to team/game plan management)

## General Requirements

### Must Have
- Mobile-friendly responsive layout (primary motivation for the rewrite)
- Dark mode support (already used in current app)
- All existing pages: Home, Team, Replays, Analytics, Game Plans, Calculator, Export/Import
- JWT auth flow (login, register, token refresh)
- Damage calculator iframe embed (keep existing bridge architecture)

### Nice to Have
- Improved data tables with sorting/filtering for replays and matchups
- Better chart components for win rate and usage stats (ApexCharts from TailAdmin)
- Sidebar navigation with collapsible mobile drawer
- Loading skeletons / better loading states

### Carry Over From Current App
- Axios API layer (`services/api/`)
- AuthContext pattern
- Backend API contract (no backend changes needed)
- Calculator embed files (`public/calc/`, bridge, theme CSS)
- Pokemon sprite assets (`public/sprites/`)

## Migration Plan

### Phase 1: Project Setup & Foundation

**Goal**: Get the TailAdmin template running as our app shell with routing and auth.

- [ ] Clean out TailAdmin demo pages and placeholder content
- [ ] Set up project structure: `/services`, `/hooks`, `/contexts`, `/utils`, `/data`
- [ ] Install dependencies: Axios, Lucide React (icons)
- [ ] Port the Axios client with JWT interceptors (`services/api/client.js`)
- [ ] Port all API service files (`authApi`, `teamApi`, `replayApi`, `matchApi`, `analyticsApi`, `gamePlanApi`, `exportApi`, `teamMemberApi`)
- [ ] Port higher-level services (`TeamService`, `ReplayService`, `MatchService`, `PokepasteService`, `PokemonService`, `OpponentTeamService`, `StorageService`)
- [ ] Port `AuthContext` → convert to TypeScript
- [ ] Port all custom hooks (`useTeamStats`, `useMultipleTeamStats`, `useTeamComparison`, `useTeamPokemon`, `useOpponentTeams`, `useTeamMembers`, `useDamageCalc`)
- [ ] Port utility files (`pokemonNameUtils`, `resultUtils`, `timeUtils`, `calcUtils`)
- [ ] Set up React Router with route definitions (keep same URL structure)
- [ ] Configure Vite proxy to backend (port 8080)
- [ ] Wire up TailAdmin's auth pages (SignIn/SignUp) to our AuthContext
- [ ] Add `ProtectedRoute` / `PublicRoute` wrappers
- [ ] Verify: can log in, token persists, protected routes redirect

### Phase 2: Layout & Navigation

**Goal**: Replace the current top tab bar with a left sidebar navigation.

Current app uses a horizontal tab bar on TeamPage with 9 tabs. The rewrite moves to TailAdmin's sidebar pattern:

- [ ] Customize TailAdmin's `AppSidebar` with VS Recorder nav items:
  - Home (team list)
  - Team section (dynamic, shows when viewing a team):
    - Replays
    - Game by Game
    - Match by Match
    - Usage Stats
    - Matchup Stats
    - Move Usage
    - Matchup Planner
    - Pokemon Notes
    - Damage Calculator
  - About
- [ ] Customize `AppHeader` — user dropdown, dark mode toggle
- [ ] Set up sidebar collapse behavior for mobile (TailAdmin has this built in)
- [ ] Add team switcher or breadcrumb to header when inside a team context
- [ ] Port `Footer` component

### Phase 3: Home Page

**Goal**: Rebuild the team list dashboard.

- [ ] Overall stats bar (teams count, total games, wins, win rate)
- [ ] Team card grid — each card shows:
  - Team name, regulation tag
  - 6 Pokemon sprites (port `PokemonSprite` / `PokemonTeam` components)
  - Win rate, games played
- [ ] Team filtering: regulation dropdown + Pokemon tag search
  - Port `RegulationFilter` and `TagInput` components
- [ ] "New Team" and "Import Team" action buttons
- [ ] Port modals: `NewTeamModal`, `ImportTeamModal`
- [ ] Mobile: cards stack single-column, filters collapse into sheet/dropdown

### Phase 4: Team Page — Core Info & Replays

**Goal**: Rebuild team detail header and the Replays view (most-used tab).

- [ ] Team info header: name, format, description, Pokemon sprites, quick stats
- [ ] Action buttons: Add Replay, Edit Team, Export, Delete
- [ ] Port modals: `AddReplayModal`, `EditTeamModal`, `ExportTeamModal`, `ConfirmationModal`
- [ ] Replays list with `CompactReplayCard`:
  - Date, result badge (W/L), opponent Pokemon sprites, notes
  - Filter by opponent Pokemon
  - Delete / edit notes actions
- [ ] Mobile: replay cards full-width, action buttons in dropdown menu

### Phase 5: Team Page — Analysis Tabs

**Goal**: Rebuild the data analysis views using TailAdmin's charts and tables.

- [ ] **Game by Game** — `GameCard` with Pokemon used, result, opponent team
- [ ] **Match by Match** — `BestOf3Card` showing grouped replays with set result
- [ ] **Usage Stats** — Pokemon usage frequency table/chart (good fit for ApexCharts bar chart)
- [ ] **Matchup Stats** — Win rate grid vs opponent Pokemon (table or heatmap)
- [ ] **Move Usage** — Move frequency per Pokemon with accuracy stats
- [ ] Mobile: tables scroll horizontally or switch to card layout on small screens

### Phase 6: Team Page — Planning Tools

**Goal**: Rebuild opponent planner and Pokemon notes.

- [ ] **Matchup Planner** tab:
  - Port `OpponentTeamCard` — shows opponent paste with lead/backup indicators
  - Port `AddPlanModal`, `EditPlanModal`, `AddOpponentTeamModal`
  - Game plan notes per opponent team
- [ ] **Pokemon Notes** tab:
  - Port `PokemonNoteCard` — per-Pokemon notes with collapsible damage calcs
  - Inline editing for notes and calc results

### Phase 7: Damage Calculator

**Goal**: Integrate the calculator iframe embed into the new layout.

- [ ] Copy over calculator static files (`public/calc/`, `calc-embed.html`)
- [ ] Port bridge architecture (`vs_recorder_bridge.js`, `vs_recorder_theme.css`)
- [ ] Port `DamageCalcTab` with its sub-components:
  - `PokemonPanel`, `MoveSlot`, `MoveResults`, `MainResult`
  - `FieldPanel`, `StatTable`, `GenerationPicker`, `SidebarSlots`
- [ ] Port `setdex-gen9.js` data file
- [ ] Ensure postMessage communication works (VS_RECORDER_LOAD_PASTE, VS_RECORDER_SAVE_CALC)
- [ ] Test iframe embed in new layout/routing context

### Phase 8: Remaining Pages & Polish

**Goal**: Wrap up all remaining pages and cross-cutting concerns.

- [ ] Port `AboutPage`
- [ ] Port auth pages: `ForgotPasswordPage`, `ResetPasswordPage`
- [ ] Port export/import flow (uses `exportApi`)
- [ ] 404 page (TailAdmin has one built in)
- [ ] Loading states — use TailAdmin skeleton components or add loading spinners
- [ ] Error handling — toast notifications or inline error displays
- [ ] Dark mode — verify all custom components respect TailAdmin's theme toggle
- [ ] Final mobile QA pass across all pages
- [ ] Copy Pokemon sprites into `public/sprites/`

### Component Migration Checklist

Quick reference for all components that need to be rebuilt or ported:

| Component | Priority | Notes |
|---|---|---|
| `PokemonSprite` | Phase 3 | Used everywhere, port early |
| `PokemonTeam` | Phase 3 | Team sprite row display |
| `RegulationFilter` | Phase 3 | Dropdown, straightforward |
| `TagInput` | Phase 3 | Multi-tag Pokemon search |
| `CompactReplayCard` | Phase 4 | Replay list item |
| `ConfirmationModal` | Phase 4 | Reusable, port early |
| `AddReplayModal` | Phase 4 | URL input + notes |
| `NewTeamModal` | Phase 3 | Create team form |
| `ImportTeamModal` | Phase 3 | Pokepaste URL import |
| `EditTeamModal` | Phase 4 | Edit team details |
| `ExportTeamModal` | Phase 4 | Export format selection |
| `GameCard` | Phase 5 | Single game display |
| `BestOf3Card` | Phase 5 | Match set display |
| `PokemonDropdown` | Phase 5 | Pokemon selector |
| `OpponentTeamCard` | Phase 6 | Opponent paste display |
| `PokemonNoteCard` | Phase 6 | Notes + calcs per Pokemon |
| `AddPlanModal` | Phase 6 | Game plan creation |
| `EditPlanModal` | Phase 6 | Game plan editing |
| `AddOpponentTeamModal` | Phase 6 | Add opponent team |
| `PokemonPanel` | Phase 7 | Calc Pokemon config |
| `MoveSlot` | Phase 7 | Calc move selector |
| `MoveResults` | Phase 7 | Calc damage grid |
| `MainResult` | Phase 7 | Calc primary output |
| `FieldPanel` | Phase 7 | Calc field conditions |
| `StatTable` | Phase 7 | Calc base stats |
| `SidebarSlots` | Phase 7 | Calc team quick-select |
| `ProtectedRoute` | Phase 1 | Auth route wrapper |
| `PublicRoute` | Phase 1 | Public route wrapper |
| `Footer` | Phase 2 | Global footer |
