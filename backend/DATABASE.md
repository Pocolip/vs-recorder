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

**Relationships:**
- One-to-many with `replays`, `matches`, `team_members` (cascade all, orphan removal)
- Many-to-many with `folders` via `team_folders` join table

### replays
```sql
id           SERIAL PRIMARY KEY
team_id      INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE
match_id     INTEGER REFERENCES matches(id) ON DELETE SET NULL -- Optional Bo3 grouping
url          TEXT NOT NULL
notes        TEXT
battle_log   JSONB NOT NULL -- Full battle log from Showdown
opponent     VARCHAR(100) -- Parsed from battle_log
result       VARCHAR(10) -- 'win' or 'loss', parsed from battle_log
game_number  INTEGER -- 1/2/3 for Bo3 games, null for Bo1
date         TIMESTAMP -- Battle date, parsed from battle_log
created_at   TIMESTAMP DEFAULT NOW()

UNIQUE(url, team_id) -- Same URL allowed across different teams
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

### team_members
```sql
id            SERIAL PRIMARY KEY
team_id       INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE
pokemon_name  VARCHAR(100) NOT NULL
slot          INTEGER NOT NULL
notes         TEXT
created_at    TIMESTAMP DEFAULT NOW()
updated_at    TIMESTAMP DEFAULT NOW()

UNIQUE(team_id, slot)
```

**Related table - team_member_calcs:**
```sql
team_member_id  INTEGER NOT NULL REFERENCES team_members(id) ON DELETE CASCADE
calc            VARCHAR(255) -- Saved damage calc result strings
```

### folders
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
name        VARCHAR(100) NOT NULL
position    INTEGER NOT NULL DEFAULT 0
created_at  TIMESTAMP DEFAULT NOW()
```

### team_folders (join table)
```sql
team_id     INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE
folder_id   INTEGER NOT NULL REFERENCES folders(id) ON DELETE CASCADE
PRIMARY KEY (team_id, folder_id)
```

### game_plans
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE
team_id     INTEGER -- Optional reference to associate plan with a specific team
name        VARCHAR(100) NOT NULL
notes       TEXT
created_at  TIMESTAMP DEFAULT NOW()
updated_at  TIMESTAMP DEFAULT NOW()

UNIQUE(team_id, user_id)
```

### game_plan_teams
```sql
id              SERIAL PRIMARY KEY
game_plan_id    INTEGER REFERENCES game_plans(id) ON DELETE CASCADE
pokepaste       TEXT NOT NULL
notes           TEXT
color           VARCHAR(20) -- UI color for opponent team card
compositions    JSONB -- Array of {lead1, lead2, back1, back2, notes}
created_at      TIMESTAMP DEFAULT NOW()
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

### team_exports
```sql
id              SERIAL PRIMARY KEY
code            VARCHAR(6) UNIQUE NOT NULL -- 6-char alphanumeric (A-HJ-NP-Z2-9, excludes I/O/0/1)
user_id         INTEGER NOT NULL -- User who created the export
team_id         INTEGER NOT NULL -- Source team
team_name       VARCHAR(100) -- Stored for display without parsing JSON
export_data     JSONB NOT NULL -- Full export: team, replays, matches, opponent plans
data_checksum   VARCHAR(64) -- SHA-256 checksum for duplicate detection
export_options  JSONB -- Options used when creating the export
created_at      TIMESTAMP DEFAULT NOW()
expires_at      TIMESTAMP -- Optional expiration for cleanup (null = never expires)
```

### password_reset_tokens
```sql
id          SERIAL PRIMARY KEY
user_id     INTEGER NOT NULL REFERENCES users(id)
token_hash  VARCHAR(64) UNIQUE NOT NULL -- SHA-256 hash (plain token sent via email only)
expires_at  TIMESTAMP NOT NULL
used        BOOLEAN NOT NULL DEFAULT FALSE
used_at     TIMESTAMP
created_at  TIMESTAMP DEFAULT NOW()
request_ip  VARCHAR(45) -- IP address for security auditing
```

## Entity Relationships

```
User ─(1:N)─> Team ─(1:N)─> Replay
               │              │
               ├──(1:N)─> Match ─(1:N)─┘
               │          (optional Bo3 grouping)
               │
               ├──(1:N)─> TeamMember ─(1:N)─> team_member_calcs
               │
               └──(M:N)─> Folder (via team_folders)

User ─(1:N)─> GamePlan ─(1:N)─> GamePlanTeam
User ─(1:N)─> Folder
User ─(1:N)─> PasswordResetToken
```

## Indexes
```sql
-- teams
CREATE INDEX idx_teams_user_id ON teams(user_id);

-- replays
CREATE INDEX idx_replays_team_id ON replays(team_id);
CREATE INDEX idx_replays_match_id ON replays(match_id);
CREATE INDEX idx_replays_opponent ON replays(opponent);
CREATE INDEX idx_replays_result ON replays(result);
CREATE INDEX idx_replays_date ON replays(date);

-- matches
CREATE INDEX idx_matches_team_id ON matches(team_id);
CREATE INDEX idx_matches_opponent ON matches(opponent);

-- game_plans
CREATE INDEX idx_game_plans_user_id ON game_plans(user_id);
CREATE INDEX idx_game_plan_teams_game_plan_id ON game_plan_teams(game_plan_id);

-- team_exports
CREATE INDEX idx_team_exports_code ON team_exports(code);
CREATE INDEX idx_team_exports_user_id ON team_exports(user_id);
CREATE INDEX idx_team_exports_team_id ON team_exports(team_id);

-- password_reset_tokens
CREATE INDEX idx_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX idx_prt_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_prt_expires_at ON password_reset_tokens(expires_at);
```
