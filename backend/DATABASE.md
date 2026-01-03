# VS Recorder - Database Design

## Technology: PostgreSQL

Relational approach chosen for:
- Clear user → teams → replays hierarchy
- Efficient querying across relationships
- No document size constraints
- JSONB support for flexible battleLog storage

## Development Strategy

### Short-term (Development)
- **H2 Database** (embedded, in-memory or file-based)
  - Zero setup, runs with Spring Boot
  - JPA/Hibernate auto-creates schema from entities
  - Perfect for rapid iteration
  - Configuration: `spring.jpa.hibernate.ddl-auto=create-drop`
  - Easy for team members to clone and run without DB setup

### Production & Long-term
- **PostgreSQL** with full schema
- Migration path:
  - Once schema stabilizes (after implementing core features)
  - Export H2 schema or use Flyway/Liquibase for migrations
  - Switch `spring.datasource.url` to PostgreSQL connection
  - Load Pokemon data into production database

### Alternative: Docker Compose
- Can use Docker Compose for local PostgreSQL during development
- Provides closer parity to production environment
- Slightly more setup overhead than H2

## Schema

### users
```sql
id              SERIAL PRIMARY KEY
username        VARCHAR(50) UNIQUE NOT NULL
password_hash   VARCHAR(255) NOT NULL
email           VARCHAR(255) UNIQUE NOT NULL
last_login      TIMESTAMP
created_at      TIMESTAMP DEFAULT NOW()
```

### teams
```sql
id                   SERIAL PRIMARY KEY
user_id              INTEGER REFERENCES users(id) ON DELETE CASCADE
name                 VARCHAR(100) NOT NULL
pokepaste            TEXT NOT NULL
regulation           VARCHAR(50) -- e.g., "Reg G", "Reg H"
showdown_usernames   TEXT[] -- Array of showdown usernames to track
created_at           TIMESTAMP DEFAULT NOW()
updated_at           TIMESTAMP DEFAULT NOW()
```

### replays
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

### matches
```sql
id          SERIAL PRIMARY KEY
team_id     INTEGER REFERENCES teams(id) ON DELETE CASCADE
opponent    VARCHAR(100)
notes       TEXT
tags        TEXT[] -- Custom tags for organization
created_at  TIMESTAMP DEFAULT NOW()
updated_at  TIMESTAMP DEFAULT NOW()
```

### game_plans
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE
name        VARCHAR(100) NOT NULL
notes       TEXT
created_at  TIMESTAMP DEFAULT NOW()
updated_at  TIMESTAMP DEFAULT NOW()
```

### game_plan_teams
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

### pokemon
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

### exports
```sql
id              SERIAL PRIMARY KEY
user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE
share_code      VARCHAR(10) UNIQUE NOT NULL -- Format: "vs-XXXXXX" (6 alphanumeric)
export_data     JSONB NOT NULL -- Snapshot of team(s) and replay data
created_at      TIMESTAMP DEFAULT NOW()
```

**Example export_data JSONB:**
```json
{
  "teams": [
    {
      "name": "Regulation G Team",
      "pokepaste": "https://pokepast.es/...",
      "regulation": "Reg G",
      "showdown_usernames": ["player1", "player2"],
      "replays": [
        {
          "url": "https://replay.pokemonshowdown.com/...",
          "notes": "Close game",
          "opponent": "OpponentName",
          "result": "win",
          "date": "2025-01-15T10:30:00Z"
        }
      ]
    }
  ]
}
```

## Indexes
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
CREATE INDEX idx_exports_user_id ON exports(user_id);
CREATE INDEX idx_exports_share_code ON exports(share_code);
CREATE INDEX idx_exports_created_at ON exports(created_at);
```
