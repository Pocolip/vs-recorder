# VS Recorder Web Application - Design Document

## Frontend

## Backend

### Technology Stack
- **Runtime**: Java
- **Framework**: Spring Boot
- **Database**: PostgreSQL with Spring Data JPA
- **Authentication**: JWT-based auth with Spring Security
- **API Documentation**: OpenAPI/Swagger spec (Springdoc OpenAPI)

### API Endpoints

#### Authentication
- `POST /auth/register` - Create new user account
- `POST /auth/login` - Authenticate user, return JWT
- `GET /auth/me` - Get current user profile (authenticated)

#### Users
- `GET /users/me` - Get current user profile
- `PATCH /users/me` - Update profile (email, password)
- `DELETE /users/me` - Delete account

#### Teams
- `POST /teams` - Create team
- `GET /teams` - List all teams for current user
- `GET /teams/:id` - Get single team
- `PATCH /teams/:id` - Update team (name, pokepaste, showdown_usernames)
- `DELETE /teams/:id` - Delete team (cascades to replays)

#### Replays
- `POST /replays` - Create replay (fetches battleLog from Showdown URL)
- `GET /replays` - List replays (filterable by team_id, match_id, opponent, result, date range)
- `GET /replays/:id` - Get single replay with full battleLog
- `PATCH /replays/:id` - Update replay notes or match_id (battleLog immutable)
- `DELETE /replays/:id` - Delete replay

#### Matches (Bo3 Sets)
- `POST /matches` - Create match (Bo3 set)
- `GET /matches` - List matches (filterable by team_id, opponent)
- `GET /matches/:id` - Get single match with all associated replays
- `GET /matches/:id/opponent-team` - Parse and return opponent's team from battle logs
- `PATCH /matches/:id` - Update match (notes, tags, opponent)
- `DELETE /matches/:id` - Delete match (sets replays.match_id to NULL)

#### Analytics - Usage Stats
- `GET /teams/:id/stats/usage` - Overall W/L, win rate, most common leads (by usage %), best performing leads (by win rate)

#### Analytics - Matchup Stats
- `GET /teams/:id/stats/matchups` - Best/worst matchups (opponent pokemon with W/L records), highest/lowest attendance rates per team member
- `POST /teams/:id/stats/matchups/custom` - Calculate win rate against custom team (body: `{ opponentPokepaste: string }`)

#### Analytics - Move Usage
- `GET /teams/:id/stats/moves` - Move usage rates per pokemon, most/least used moves, correlation with wins

#### Game Planner
- `POST /game-plans` - Create game plan
- `GET /game-plans` - List all game plans for user
- `GET /game-plans/:id` - Get game plan with all teams
- `PATCH /game-plans/:id` - Update game plan name/notes
- `DELETE /game-plans/:id` - Delete game plan

- `POST /game-plans/:id/teams` - Add opponent team to game plan
- `GET /game-plan-teams/:id` - Get single team with compositions
- `PATCH /game-plan-teams/:id` - Update team (pokepaste, notes, compositions array)
- `DELETE /game-plan-teams/:id` - Remove team from game plan

#### Pokemon
- `GET /pokemon` - List all Pokemon (with optional search query)
- `GET /pokemon/:id` - Get single Pokemon by ID
- `GET /pokemon/search?name=urshifu` - Fuzzy search by name or alternative names
- `GET /pokemon/dex/:number` - Get Pokemon by dex number

### Utility Endpoints
- `POST /replays/parse` - Validate/preview Showdown URL before saving (returns parsed data without storing)

## Database

### Technology: PostgreSQL

Relational approach chosen for:
- Clear user → teams → replays hierarchy
- Efficient querying across relationships
- No document size constraints
- JSONB support for flexible battleLog storage

### Schema

#### users
```sql
id              SERIAL PRIMARY KEY
username        VARCHAR(50) UNIQUE NOT NULL
password_hash   VARCHAR(255) NOT NULL
email           VARCHAR(255) UNIQUE NOT NULL
last_login      TIMESTAMP
created_at      TIMESTAMP DEFAULT NOW()
```

#### teams
```sql
id                   SERIAL PRIMARY KEY
user_id              INTEGER REFERENCES users(id) ON DELETE CASCADE
name                 VARCHAR(100) NOT NULL
pokepaste            TEXT NOT NULL
showdown_usernames   TEXT[] -- Array of showdown usernames to track
created_at           TIMESTAMP DEFAULT NOW()
updated_at           TIMESTAMP DEFAULT NOW()
```

#### replays
```sql
id          SERIAL PRIMARY KEY
team_id     INTEGER REFERENCES teams(id) ON DELETE CASCADE
match_id    INTEGER REFERENCES matches(id) ON DELETE SET NULL -- Optional Bo3 grouping
url         TEXT UNIQUE NOT NULL
notes       TEXT
battle_log  JSONB NOT NULL -- Full battle log from Showdown
opponent    VARCHAR(100) -- Parsed from battle_log
result      VARCHAR(10) -- 'win' or 'loss', parsed from battle_log
date        TIMESTAMP -- Battle date, parsed from battle_log
created_at  TIMESTAMP DEFAULT NOW()
```

#### matches
```sql
id          SERIAL PRIMARY KEY
team_id     INTEGER REFERENCES teams(id) ON DELETE CASCADE
opponent    VARCHAR(100)
notes       TEXT
tags        TEXT[] -- Custom tags for organization
created_at  TIMESTAMP DEFAULT NOW()
updated_at  TIMESTAMP DEFAULT NOW()
```

#### game_plans
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE
name        VARCHAR(100) NOT NULL
notes       TEXT
created_at  TIMESTAMP DEFAULT NOW()
updated_at  TIMESTAMP DEFAULT NOW()
```

#### game_plan_teams
```sql
id              SERIAL PRIMARY KEY
game_plan_id    INTEGER REFERENCES game_plans(id) ON DELETE CASCADE
pokepaste       TEXT NOT NULL
notes           TEXT
compositions    JSONB -- Array of {lead1, lead2, back1, back2, notes}
created_at      TIMESTAMP DEFAULT NOW()
updated_at      TIMESTAMP DEFAULT NOW()
```

**Example compositions JSONB:**
```json
[
  {
    "lead1": "Raging Bolt",
    "lead2": "Tornadus",
    "back1": "Annihilape",
    "back2": "Amoonguss",
    "notes": "Safe lead against their Incineroar"
  },
  {
    "lead1": "Tornadus",
    "lead2": "Annihilape",
    "back1": "Raging Bolt",
    "back2": "Amoonguss",
    "notes": "Aggressive lead if they bring Rillaboom"
  }
]
```

#### pokemon
```sql
id                  SERIAL PRIMARY KEY
dex_number          INTEGER NOT NULL
name                VARCHAR(50) NOT NULL -- Base species name (e.g., "Urshifu")
alternative_names   TEXT[] -- Array of forme variations for parsing
type1               VARCHAR(20) NOT NULL
type2               VARCHAR(20) -- Nullable for single-type Pokemon
sprite_path         VARCHAR(255) NOT NULL -- Path to hosted sprite image
created_at          TIMESTAMP DEFAULT NOW()
```

**Example pokemon data:**
```json
{
  "dex_number": 892,
  "name": "Urshifu",
  "alternative_names": [
    "Urshifu-*",
    "Urshifu-Rapid-Strike",
    "Urshifu-Single-Strike",
    "Urshifu-Rapid-Strike-Gmax",
    "Urshifu-Single-Strike-Gmax"
  ],
  "type1": "Fighting",
  "type2": "Water",
  "sprite_path": "/sprites/urshifu-rapid-strike.png"
}
```

### Indexes
```sql
CREATE INDEX idx_teams_user_id ON teams(user_id);
CREATE INDEX idx_replays_team_id ON replays(team_id);
CREATE INDEX idx_replays_match_id ON replays(match_id);
CREATE INDEX idx_replays_opponent ON replays(opponent);
CREATE INDEX idx_replays_result ON replays(result);
CREATE INDEX idx_replays_date ON replays(date);
CREATE INDEX idx_matches_team_id ON matches(team_id);
CREATE INDEX idx_matches_opponent ON matches(opponent);
CREATE INDEX idx_game_plans_user_id ON game_plans(user_id);
CREATE INDEX idx_game_plan_teams_game_plan_id ON game_plan_teams(game_plan_id);
CREATE INDEX idx_pokemon_name ON pokemon(name);
CREATE INDEX idx_pokemon_dex_number ON pokemon(dex_number);
CREATE INDEX idx_pokemon_alternative_names ON pokemon USING GIN(alternative_names);
```
