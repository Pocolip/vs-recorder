# VS Recorder Frontend

React web application for competitive Pokemon VGC players to analyze Showdown replays and track team performance.

## Features

- **Team Management**: Import teams from Pokepaste/Pokebin URLs and organize your VGC roster
- **Replay Analysis**: Import Showdown replays and track game-by-game performance
- **Performance Analytics**: Monitor win rates, usage statistics, and identify best matchups
- **Opponent Planning**: Plan strategies against specific opponent teams with lead/back compositions
- **Data Export/Import**: Backup and restore your analysis data
- **Cloud Sync**: Access your data from any device with your account

## Prerequisites

- Node.js (v18 or higher)
- npm
- Backend server running (see `/backend` directory)

## Development Setup

### Environment Variables

Copy the environment template and configure:

```bash
cp .env.development .env.development.local
```

Available variables:
- `REACT_APP_API_BASE_URL` - Backend API URL (default: `http://localhost:8080`)

### Installation

```bash
# Install dependencies
npm install

# Start development server (with hot reload)
npm run start

# Build for production
npm run build

# Clean build directory
npm run clean
```

The development server runs on `http://localhost:3000` and proxies API requests to the backend.

## Docker

### Build Image

```bash
docker build -t vsrecorder-frontend .
```

By default, the image is configured for production (`https://api.vsrecorder.app`). To build with a different API URL:

```bash
docker build -t vsrecorder-frontend \
  --build-arg REACT_APP_API_BASE_URL=http://localhost:8080 .
```

### Run Container

```bash
docker run -d -p 3000:80 vsrecorder-frontend
```

The frontend will be available at `http://localhost:3000`.

### Using Docker Compose

From the project root:
```bash
# Development (with backend and PostgreSQL)
docker-compose up frontend

# Full stack
docker-compose up
```

### Docker Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build: Node.js build → nginx serving |
| `.dockerignore` | Excludes node_modules, dist, etc. from build context |
| `nginx.conf` | nginx configuration for SPA routing |

The production image uses nginx to serve the static build files with:
- Gzip compression for JS/CSS
- SPA routing (all routes → index.html)
- Cache headers for static assets
- Security headers (X-Frame-Options, etc.)

## Tech Stack

- **React 18** - Frontend framework
- **React Router 6** - Client-side routing
- **Tailwind CSS 3** - Utility-first styling
- **Webpack 5** - Build system and dev server
- **Axios** - HTTP client for API requests

## Project Structure

```
frontend/
├── public/
│   ├── sprites/          # Local Pokemon sprite icons
│   └── index.html        # HTML template
├── src/
│   ├── components/       # Reusable React components
│   │   ├── calc/         # Damage calculator components
│   │   ├── cards/        # Card components
│   │   ├── modals/       # Modal dialogs
│   │   └── tabs/         # Tab content components
│   ├── contexts/         # React context providers (Auth)
│   ├── data/             # Static data (setdex)
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Page components
│   ├── services/         # API and data services
│   │   └── api/          # Backend API clients
│   ├── styles/           # CSS and Tailwind config
│   ├── utils/            # Utility functions
│   └── index.jsx         # Application entry point
├── .env.development      # Development environment config
├── .env.production       # Production environment config
├── webpack.config.js     # Webpack configuration
└── tailwind.config.js    # Tailwind CSS configuration
```

## Damage Calculator

The Match Calc tab provides a native damage calculator powered by `@smogon/calc`, with VGC tournament sets from the [NCP VGC Damage Calculator](https://github.com/dotMr-P/NCP-VGC-Damage-Calculator).

### Architecture

- **Calculation engine**: `@smogon/calc` handles all damage math, stat lookups, type chart, and generation data
- **Setdex data**: `src/data/setdex-gen9.js` contains NCP's curated VGC sets (named builds with EVs, nature, item, moves, tera type)
- **State management**: All state lives in `DamageCalcTab` and flows down via props. The `useDamageCalc` hook wraps `@smogon/calc` and recalculates on any input change
- **Team integration**: Player's team loads from their pokepaste into sidebar slots for quick switching. Calc results can be saved to Pokemon Notes via the existing `useTeamMembers` hook

### Component overview

| Component | Purpose |
|-----------|---------|
| `DamageCalcTab` | State owner, layout, team loading, save integration |
| `PokemonPanel` | Species/set selector, nature/ability/item, tera, status, stats, moves |
| `FieldPanel` | Format, terrain, weather, ruin abilities, per-side effects |
| `MoveResults` | 4-move damage % list per side, click to show detailed result |
| `MainResult` | Full calc description, damage bar, rolls, save button |
| `StatTable` | Base/IV/EV/boost/total for all 6 stats, EV counter |
| `MoveSlot` | Move selector with BP override and crit toggle |
| `SidebarSlots` | Team quick-switch sprites (attacker side only) |
| `GenerationPicker` | Gen selector (Gen 9 active, others stubbed) |

### Updating the NCP setdex

The setdex file is converted from NCP's `setdex_ncp-g9.js`. To update with newer sets:

1. Get the latest file from the [NCP repo](https://github.com/dotMr-P/NCP-VGC-Damage-Calculator) (branch `main`, path `script_res/setdex_ncp-g9.js`)
2. Replace the contents of `src/data/setdex-gen9.js`, changing the first line from `var SETDEX_GEN9 = {` to `export const SETDEX_GEN9 = {`
3. The NCP stat keys (`at`, `df`, `sa`, `sd`, `sp`) are mapped to `@smogon/calc` keys (`atk`, `def`, `spa`, `spd`, `spe`) at runtime in `calcUtils.js`

### Known quirks and workarounds

**Facade / Hex BP doubling**: `@smogon/calc` does not automatically double the base power of Facade (attacker has status) or Hex (defender has status). The `useDamageCalc` hook detects these moves and applies the doubling via the `overrides: { basePower }` option. Direct `move.bp` assignment is ignored by the library's calculation — only `overrides` works.

**BP override field**: Each move slot has a BP input for manually overriding base power. This is useful for variable-power moves the library may not handle, or for testing "what if" scenarios. A manual override takes priority over auto-doubling.

**curHP is absolute, not percentage**: The UI stores HP as a percentage (0-100), but `@smogon/calc` expects an absolute HP value via `pokemon.originalCurHP`. The hook converts percentage to absolute after constructing the Pokemon object.

**Generation support**: Only Gen 9 (Scarlet/Violet) is currently functional. The generation picker renders all gens but disables everything except Gen 9. Adding a new generation requires importing its setdex data and passing the correct `Generations.get(n)` to the hook.

## Usage

1. Register an account or log in
2. Create teams by importing Pokepaste/Pokebin URLs
3. Add replay URLs from Pokemon Showdown battles
4. Analyze your performance through various statistical views
5. Use the Opponent Planner to prepare strategies for tournaments
6. Export your data for backup

## API Integration

The frontend communicates with the Spring Boot backend via REST API. Key endpoints:

- `/api/auth/*` - Authentication (login, register)
- `/api/teams/*` - Team management
- `/api/replays/*` - Replay management
- `/api/matches/*` - Match grouping (Bo3)
- `/api/game-plans/*` - Opponent planning

See the backend README for full API documentation.

## Contributing

Feel free to submit issues or pull requests to improve the application.

## License

MIT License
