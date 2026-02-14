# Services Layer

This directory contains the service layer for the VS Recorder frontend application. Services provide higher-level abstractions over the API layer, including caching, data transformation, and convenience methods.

## Service Files

### Core Services

1. **storageService.ts** (150 lines)
   - localStorage wrapper with async interface
   - JSON serialization/deserialization
   - Storage quota tracking
   - Functions: `get`, `getMultiple`, `getAll`, `set`, `setMultiple`, `remove`, `removeMultiple`, `clear`, `exists`, `getUsage`

2. **teamService.ts** (141 lines)
   - Wraps teamApi with convenience methods
   - Team CRUD operations
   - Search and filtering
   - Functions: `getAll`, `getById`, `create`, `update`, `deleteTeam`, `getList`, `search`, `getByFormat`, `exists`, `getStats`

3. **replayService.ts** (235 lines)
   - Wraps replayApi with batch operations
   - Match summary generation
   - Replay validation and deduplication
   - Functions: `getById`, `createFromUrl`, `create`, `update`, `deleteReplay`, `getByTeamId`, `getByResult`, `existsByUrl`, `existsByUrlForTeam`, `getCountByTeamId`, `createManyFromUrls`, `getStandaloneReplays`, `search`, `getMatchSummary`, `getGameByGameResults`

4. **matchService.ts** (218 lines)
   - Wraps matchApi with enhanced queries
   - Match statistics aggregation
   - Tag and opponent tracking
   - Functions: `getById`, `createOrUpdate`, `updateNotes`, `updateTags`, `deleteMatch`, `getByTeamId`, `getEnhancedMatches`, `getMatchStats`, `search`, `getByResult`, `getByOpponent`, `getByTag`, `getRecent`, `getUniqueOpponents`, `getUniqueTags`, `addReplayToMatch`, `removeReplayFromMatch`

5. **pokepasteService.ts** (418 lines)
   - Fetches and parses Pokemon team pastes
   - Supports pokepast.es and pokebin.com
   - 24-hour caching with localStorage
   - Full pokepaste format parser
   - Functions: `detectPasteService`, `fetchAndParse`, `parsePokepasteText`, `isValidPokepasteUrl`, `extractPasteId`, `getPokemonNames`, `validatePokepaste`, `clearCache`, `getCacheStats`

6. **pokemonService.ts** (327 lines)
   - Pokemon data from PokeAPI
   - Local sprite support with fallbacks
   - 7-day caching
   - 30+ common VGC Pokemon static data
   - Functions: `initialize`, `getPokemon`, `getMultiplePokemon`, `getSpriteUrl`, `getLocalSpritePath`, `generateSpriteUrls`, `formatDisplayName`, `createUnknownPokemon`, `hasLocalSprites`, `clearCache`, `getCacheStats`

### Deprecated Services

7. **opponentTeamService.ts** (8 lines)
   - Stub with deprecation notice
   - Use `gamePlanApi` instead

## Usage Pattern

Services are exported as namespaces for clear usage:

```typescript
import * as teamService from "./services/teamService";
import * as pokemonService from "./services/pokemonService";

// Use with namespace prefix
const teams = await teamService.getAll();
const pokemon = await pokemonService.getPokemon("pikachu");
```

Or import from the barrel export:

```typescript
import { teamService, pokemonService } from "./services";

const teams = await teamService.getAll();
const pokemon = await pokemonService.getPokemon("pikachu");
```

## Supporting Files

- **src/types/pokeapi-js-wrapper.d.ts** - TypeScript declarations for pokeapi-js-wrapper
- **src/data/pokemonSpriteMap.json** - Pokemon name to sprite mapping for local sprites
- **tsconfig.app.json** - Updated with `resolveJsonModule: true`

## Architecture Notes

- All services use exported functions (not classes)
- Async/await pattern throughout
- localStorage used for client-side caching
- Error handling with try/catch and null returns
- Type-safe with TypeScript strict mode
- No external dependencies except API layer and utilities

## Total Lines: 1,517

This represents a complete port of the old frontend's static class services to a modern functional TypeScript architecture optimized for React 18+.
