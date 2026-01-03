# VS Recorder - Backend API Design

## Technology Stack
- **Runtime**: Java
- **Framework**: Spring Boot
- **Database**: PostgreSQL with Spring Data JPA
- **Authentication**: JWT-based auth with Spring Security
- **API Documentation**: OpenAPI/Swagger spec (Springdoc OpenAPI)

## API Endpoints

### Authentication
- `POST /auth/register` - Create new user account
- `POST /auth/login` - Authenticate user, return JWT
- `GET /auth/me` - Get current user profile (authenticated)

### Users
- `GET /users/me` - Get current user profile
- `PATCH /users/me` - Update profile (email, password)
- `DELETE /users/me` - Delete account

### Teams
- `POST /teams` - Create team
- `GET /teams` - List all teams for current user
- `GET /teams/:id` - Get single team
- `PATCH /teams/:id` - Update team (name, pokepaste, regulation, showdown_usernames)
- `DELETE /teams/:id` - Delete team (cascades to replays)

### Replays
- `POST /replays` - Create replay (fetches battleLog from Showdown URL)
- `GET /replays` - List replays (filterable by team_id, match_id, opponent, result, date range)
- `GET /replays/:id` - Get single replay with full battleLog
- `PATCH /replays/:id` - Update replay notes or match_id (battleLog immutable)
- `DELETE /replays/:id` - Delete replay

### Matches (Bo3 Sets)
- `POST /matches` - Create match (Bo3 set)
- `GET /matches` - List matches (filterable by team_id, opponent)
- `GET /matches/:id` - Get single match with all associated replays
- `GET /matches/:id/opponent-team` - Parse and return opponent's team from battle logs
- `PATCH /matches/:id` - Update match (notes, tags, opponent)
- `DELETE /matches/:id` - Delete match (sets replays.match_id to NULL)

### Analytics - Usage Stats
- `GET /teams/:id/stats/usage` - Overall W/L, win rate, most common leads (by usage %), best performing leads (by win rate)

### Analytics - Matchup Stats
- `GET /teams/:id/stats/matchups` - Best/worst matchups (opponent pokemon with W/L records), highest/lowest attendance rates per team member
- `POST /teams/:id/stats/matchups/custom` - Calculate win rate against custom team (body: `{ opponentPokepaste: string }`)

### Analytics - Move Usage
- `GET /teams/:id/stats/moves` - Move usage rates per pokemon, most/least used moves, correlation with wins

### Game Planner
- `POST /game-plans` - Create game plan
- `GET /game-plans` - List all game plans for user
- `GET /game-plans/:id` - Get game plan with all teams
- `PATCH /game-plans/:id` - Update game plan name/notes
- `DELETE /game-plans/:id` - Delete game plan

- `POST /game-plans/:id/teams` - Add opponent team to game plan
- `GET /game-plan-teams/:id` - Get single team with compositions
- `PATCH /game-plan-teams/:id` - Update team (pokepaste, notes, compositions array)
- `DELETE /game-plan-teams/:id` - Remove team from game plan

### Pokemon
- `GET /pokemon` - List all Pokemon (with optional search query)
- `GET /pokemon/:id` - Get single Pokemon by ID
- `GET /pokemon/search?name=urshifu` - Fuzzy search by name or alternative names
- `GET /pokemon/dex/:number` - Get Pokemon by dex number

### Import/Export
- `POST /export/json` - Generate JSON export of user's teams and replays (download)
- `POST /export/share` - Generate shareable export with code (body: `{ teamIds: [1, 2, 3] }`)
  - Returns: `{ shareCode: "vs-ABC123", url: "vsrecorder.app/import?code=vs-ABC123" }`
- `GET /export/:shareCode` - Retrieve export data by share code (public endpoint)
- `POST /import/json` - Import teams and replays from JSON file upload
- `POST /import/share` - Import teams from share code (body: `{ shareCode: "vs-ABC123" }`)

### Utility Endpoints
- `POST /replays/parse` - Validate/preview Showdown URL before saving (returns parsed data without storing)

## Export Data Format

```json
{
  "exportVersion": "1.0",
  "exportDate": "2025-01-15T10:30:00Z",
  "teams": [
    {
      "name": "Regulation G Team",
      "pokepaste": "https://pokepast.es/...",
      "regulation": "Reg G",
      "showdown_usernames": ["player1", "player2"],
      "matches": [
        {
          "opponent": "OpponentName",
          "notes": "Tournament Round 1",
          "tags": ["regional", "top-cut"],
          "replays": [
            {
              "url": "https://replay.pokemonshowdown.com/...",
              "notes": "Game 1 - Close match",
              "result": "win",
              "date": "2025-01-15T10:30:00Z"
            }
          ]
        }
      ],
      "replays": [
        {
          "url": "https://replay.pokemonshowdown.com/...",
          "notes": "Practice game",
          "opponent": "TestPlayer",
          "result": "loss",
          "date": "2025-01-14T15:20:00Z"
        }
      ]
    }
  ]
}
```