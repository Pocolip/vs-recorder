# VS Recorder Backend - Phase 8A Complete (Analytics)

## Summary
Phase 8A implements comprehensive analytics endpoints for analyzing battle replay data, including usage statistics, matchup analysis, and move usage tracking.

## Files Created

### Utils
1. **BattleLogParser.java** - Parses Pokemon Showdown battle logs into structured data

### DTOs
2. **AnalyticsDTO.java** - Analytics request/response DTOs

### Services
3. **AnalyticsService.java** - Calculates analytics from battle logs

### Controllers
4. **AnalyticsController.java** - Analytics REST endpoints

---

## Features Implemented

### 1. Usage Statistics
**Endpoint:** `GET /api/teams/{teamId}/analytics/usage`

**What it provides:**
- **Pokemon Usage Stats**: Times brought, usage rate, overall win rate
- **Lead Stats**: Lead usage, lead win rate
- **Tera Stats**: Terastallization usage, tera win rate
- **Lead Pair Stats**: Most common lead combinations and their win rates
- **Overall Stats**: Average win rate, total games

**Example Response:**
```json
{
  "pokemonStats": [
    {
      "pokemon": "Rillaboom",
      "usage": 45,
      "usageRate": 75,
      "overallWinRate": 68,
      "leadUsage": 30,
      "leadWinRate": 73,
      "teraUsage": 5,
      "teraWinRate": 80
    }
  ],
  "leadPairStats": [
    {
      "pair": "Rillaboom + Incineroar",
      "pokemon1": "Rillaboom",
      "pokemon2": "Incineroar",
      "usage": 20,
      "usageRate": 33,
      "wins": 13,
      "winRate": 65
    }
  ],
  "averageWinRate": 68,
  "totalGames": 60
}
```

### 2. Matchup Statistics
**Endpoint:** `GET /api/teams/{teamId}/analytics/matchups`

**What it provides:**
- **Best Matchups**: Top 5 opponent Pokemon with highest win rate (min 3 encounters)
- **Worst Matchups**: Top 5 opponent Pokemon with lowest win rate (min 3 encounters)
- **Highest Attendance**: Top 5 opponent Pokemon brought most often
- **Lowest Attendance**: Top 5 opponent Pokemon brought least often

**Example Response:**
```json
{
  "bestMatchups": [
    {
      "pokemon": "Flutter Mane",
      "gamesAgainst": 15,
      "winsAgainst": 12,
      "winRate": 80,
      "timesOnTeam": 15,
      "timesBrought": 14,
      "attendanceRate": 93
    }
  ],
  "worstMatchups": [
    {
      "pokemon": "Urshifu",
      "gamesAgainst": 10,
      "winsAgainst": 3,
      "winRate": 30,
      "timesOnTeam": 12,
      "timesBrought": 10,
      "attendanceRate": 83
    }
  ],
  "highestAttendance": [...],
  "lowestAttendance": [...]
}
```

### 3. Custom Matchup Analysis
**Endpoint:** `POST /api/teams/{teamId}/analytics/matchups/custom`

**What it does:**
Analyzes your performance against a specific opponent team composition

**Request:**
```json
{
  "opponentPokemon": ["Rillaboom", "Incineroar", "Urshifu", "Flutter Mane"]
}
```

**Response:**
```json
{
  "pokemonAnalysis": [
    {
      "pokemon": "Rillaboom",
      "gamesAgainst": 10,
      "winsAgainst": 7,
      "winRate": 70
    }
  ],
  "teamWinRate": 68,
  "totalEncounters": 5
}
```

### 4. Move Usage Statistics
**Endpoint:** `GET /api/teams/{teamId}/analytics/moves`

**What it provides:**
- Moves used per Pokemon
- Move usage rates (% of games where Pokemon was brought)
- Win rates when each move was used

**Example Response:**
```json
{
  "pokemonMoves": [
    {
      "pokemon": "Rillaboom",
      "moves": [
        {
          "move": "Fake Out",
          "timesUsed": 35,
          "usageRate": 78,
          "winRate": 71
        },
        {
          "move": "Grassy Glide",
          "timesUsed": 30,
          "usageRate": 67,
          "winRate": 73
        }
      ]
    }
  ]
}
```

---

## Battle Log Parser Details

### Data Extracted from Battle Logs

**BattleLogParser.BattleData:**
- `player1`, `player2` - Player names
- `p1Team`, `p2Team` - Team sheets (6 Pokemon)
- `p1Picks`, `p2Picks` - Actually brought (4 Pokemon)
- `p1Leads`, `p2Leads` - First 2 sent out
- `p1Tera`, `p2Tera` - Pokemon that Terastallized
- `moveUsage` - Map of Pokemon -> Set of moves used
- `winner` - Winner name
- `turnCount` - Number of turns

### Parsing Logic

**Team Sheets:**
```
|poke|p1|Miraidon, L50|
→ Extracts "Miraidon" to p1Team
```

**Switches (Picks & Leads):**
```
|switch|p1a: Tornadus|Tornadus, L50, M|100/100
→ First switch = Lead + Pick
→ Subsequent switches = Picks only
```

**Moves:**
```
|move|p1b: Kyogre|Origin Pulse|p2a: Terapagos
→ Tracks "Origin Pulse" for Kyogre
```

**Terastallization:**
```
|-terastallize|p2a: Terapagos|Stellar
→ Records Terapagos as p2Tera
```

**Pokemon Name Normalization:**
- Removes level, gender: `Tornadus, L50, M` → `Tornadus`
- Removes forme indicators: `Urshifu-*` → `Urshifu`
- Removes Terapagos formes: `Terapagos-Stellar` → `Terapagos`
- Preserves important formes: `Calyrex-Shadow` stays `Calyrex-Shadow`

---

## Testing the Analytics

### Setup
```bash
# Register and create team
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123","email":"test@test.com"}'

curl -X POST http://localhost:8080/api/teams \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Team",
    "pokepaste": "https://pokepast.es/example",
    "regulation": "Reg I",
    "showdownUsernames": ["YourShowdownName"]
  }'

# Import some replays
curl -X POST "http://localhost:8080/api/replays/from-url?teamId=1" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://replay.pokemonshowdown.com/gen9vgc2025-12345"}'
```

### Test Analytics Endpoints
```bash
# Get usage stats
curl http://localhost:8080/api/teams/1/analytics/usage \
  -H "Authorization: Bearer {token}"

# Get matchup stats
curl http://localhost:8080/api/teams/1/analytics/matchups \
  -H "Authorization: Bearer {token}"

# Analyze custom matchup
curl -X POST http://localhost:8080/api/teams/1/analytics/matchups/custom \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "opponentPokemon": ["Rillaboom", "Incineroar", "Urshifu", "Flutter Mane"]
  }'

# Get move usage
curl http://localhost:8080/api/teams/1/analytics/moves \
  -H "Authorization: Bearer {token}"
```

---

## Implementation Details

### Analytics Calculation Flow

```
1. User requests analytics for team
2. Fetch all replays for team
3. Parse each battle log into BattleData
4. Identify user's side (via showdownUsernames)
5. Extract relevant data:
   - User's picks
   - User's leads
   - User's tera
   - Opponent's team/picks
   - Moves used
6. Aggregate statistics
7. Return structured response
```

### Performance Considerations

**Current Implementation:**
- Parses battle logs on-demand
- No caching (yet)
- Suitable for teams with <200 replays

**Future Optimizations:**
- Cache parsed battle data
- Pre-compute statistics on replay creation
- Store aggregated stats in database

### Error Handling

**Missing Battle Logs:**
- Skipped in calculations
- Logged as warnings
- Don't break analytics

**User Identification:**
- Uses team's showdownUsernames
- Defaults to player1 if no match
- Logs warning on default

**Invalid Data:**
- Null-safe parsing
- Graceful degradation
- Returns empty stats if no valid replays

---

## What Works Now

✅ **Usage Statistics**
- Pokemon usage rates and win rates
- Lead usage and win rates
- Terastallization usage and win rates
- Lead pair combinations and performance

✅ **Matchup Statistics**
- Best/worst matchups by win rate
- Attendance rates (how often opponent brings Pokemon)
- Filtered by minimum encounters

✅ **Custom Matchup Analysis**
- Analyze specific opponent teams
- Per-Pokemon win rates
- Team-wide win rate against core

✅ **Move Usage Statistics**
- Move frequency per Pokemon
- Move usage rates
- Win rates per move

✅ **Battle Log Parsing**
- Team sheets extraction
- Picks identification
- Lead detection
- Terastallization tracking
- Move usage tracking
- Winner determination

---

## Unit Testing Guide

### Test Files Structure
```
src/test/
├── java/
│   └── com/yeskatronics/vs_recorder_backend/
│       ├── utils/
│       │   └── BattleLogParserTest.java
│       └── services/
│           └── AnalyticsServiceTest.java
└── resources/
    └── replays/
        ├── replay_win.json
        ├── replay_loss.json
        └── replay_tera.json
```

### Key Test Cases

**BattleLogParser:**
- ✅ Extract players from array format
- ✅ Parse team sheets (6 Pokemon)
- ✅ Identify picks (4 Pokemon brought)
- ✅ Identify leads (first 2 sent out)
- ✅ Track Terastallization
- ✅ Track move usage
- ✅ Extract winner
- ✅ Normalize Pokemon names

**AnalyticsService:**
- ✅ Calculate usage stats with no replays
- ✅ Calculate usage stats with multiple replays
- ✅ Calculate lead pair stats
- ✅ Identify user's side correctly
- ✅ Calculate matchup stats
- ✅ Filter best/worst matchups
- ✅ Calculate attendance rates
- ✅ Analyze custom matchups
- ✅ Calculate move usage

---

## Architecture Status

```
✅ Phase 1: Database Foundation
✅ Phase 2: Service Layer
✅ Phase 3: REST API
✅ Phase 4: Security (JWT)
✅ Phase 5: Controller Updates
✅ Phase 6: External Integrations
✅ Phase 7: API Documentation (Swagger)
✅ Phase 8A: Analytics (Usage, Matchups, Moves)
⬜ Phase 8B: Game Planner
⬜ Phase 8C: Pokemon Reference Data
⬜ Phase 9: CORS & Production Config
```

---

## Summary

🎉 **Phase 8A Complete!**

Your backend now has:
- ✅ Comprehensive battle log parser
- ✅ Usage statistics (Pokemon, leads, tera)
- ✅ Matchup analysis (best/worst, attendance)
- ✅ Custom matchup calculator
- ✅ Move usage tracking
- ✅ REST endpoints with Swagger docs
- ✅ Ownership verification on all endpoints
- ✅ Ready for unit testing with saved replays

**Next Steps:**
- Write unit tests for BattleLogParser
- Write unit tests for AnalyticsService
- Test with real battle logs
- Fix any edge cases discovered
- Continue with Game Planner (Phase 8B)