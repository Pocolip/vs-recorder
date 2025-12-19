# VS Recorder Backend - Phase 6 Complete

## Summary
Phase 6 implements external API integrations with Pokemon Showdown and Pokepaste, enabling automatic replay fetching and team parsing.

## Files Created

### DTOs (com.yeskatronics.vs_recorder_backend.dto)
1. **ShowdownDTO.java** - DTOs for Pokemon Showdown replay data
2. **PokepasteDTO.java** - DTOs for Pokepaste team data

### Services (com.yeskatronics.vs_recorder_backend.services)
3. **ShowdownService.java** - Fetch and parse Pokemon Showdown replays
4. **PokepasteService.java** - Fetch and parse Pokepaste team data
5. **ReplayService_Updated.java** - Integrated with ShowdownService

### Configuration
6. **RestTemplateConfig.java** - HTTP client configuration

### Repositories
7. **ReplayRepository_Updated.java** - Added `findByTeamIdOrderByDateDesc` method

---

## Features Implemented

### Pokemon Showdown Integration

**What it does:**
- Fetches battle logs from Pokemon Showdown replay URLs
- Parses JSON format replay data
- Extracts player names, winner, opponent
- Determines user's result (win/loss) based on showdown usernames
- Extracts battle timestamp

**API Endpoint:**
```
Pokemon Showdown: https://replay.pokemonshowdown.com/{battle-id}.json
```

**Usage Example:**
```java
// User creates replay from URL
POST /api/replays/from-url?teamId=1
{
  "url": "https://replay.pokemonshowdown.com/gen9vgc2025-12345",
  "notes": "Great game!"
}

// Service automatically:
// 1. Validates URL format
// 2. Fetches JSON from Showdown
// 3. Parses battle log
// 4. Identifies user's side using team's showdownUsernames
// 5. Extracts opponent, result, date
// 6. Stores complete battle log
```

**How it Works:**
```java
ShowdownDTO.ReplayData replayData = showdownService.fetchReplayData(
    url, 
    team.getShowdownUsernames() // ["trainer123", "trainer_alt"]
);

// Returns:
// - battleLog: Full JSON battle data
// - opponent: "OpponentName"
// - result: "win" or "loss"
// - date: Extracted from replay metadata
// - format: "gen9vgc2025"
// - player1, player2: Both player names
```

### Pokepaste Integration

**What it does:**
- Fetches team data from Pokepaste URLs
- Parses Showdown export format
- Extracts Pokemon species, items, abilities, tera types, moves
- Handles nicknames and alternative formats

**API Endpoint:**
```
Pokepaste: https://pokepast.es/{paste-id}/raw
```

**Usage Example:**
```java
PokepasteDTO.PasteData pasteData = pokepasteService.fetchPasteData(
    "https://pokepast.es/abc123"
);

// Returns list of Pokemon with:
// - species: "Rillaboom"
// - nickname: "Monkey" (if present)
// - item: "Assault Vest"
// - ability: "Grassy Surge"
// - teraType: "Fire"
// - moves: ["Fake Out", "Grassy Glide", "Wood Hammer", "U-turn"]
```

**Paste Format Supported:**
```
Rillaboom @ Assault Vest
Ability: Grassy Surge
Tera Type: Fire
- Fake Out
- Grassy Glide
- Wood Hammer
- U-turn

Incineroar @ Sitrus Berry
Ability: Intimidate
Tera Type: Ghost
- Fake Out
- Flare Blitz
- Knock Off
- Parting Shot
```

---

## API Changes

### Updated Replay Creation

**Before (Phase 5):**
```bash
curl -X POST "/api/replays/from-url?teamId=1" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://replay.pokemonshowdown.com/...", "notes": "Test"}'

# Result: Created replay with placeholder battleLog "{}"
```

**After (Phase 6):**
```bash
curl -X POST "/api/replays/from-url?teamId=1" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://replay.pokemonshowdown.com/...", "notes": "Test"}'

# Result: Created replay with FULL battle log, opponent, result, date extracted automatically!
```

### Automatic Data Extraction

When creating a replay from URL, the system now automatically:
1. ✅ Fetches full battle log JSON
2. ✅ Identifies opponent name
3. ✅ Determines win/loss based on team's showdown usernames
4. ✅ Extracts battle date/timestamp
5. ✅ Validates URL format
6. ✅ Stores complete replay data

---

## Testing the Integration

### Test Pokemon Showdown Integration

```bash
# 1. Create a team with showdown username
curl -X POST http://localhost:8080/api/teams \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My VGC Team",
    "pokepaste": "https://pokepast.es/example",
    "regulation": "Reg G",
    "showdownUsernames": ["YourShowdownName"]
  }'

# 2. Create replay from actual Showdown URL
curl -X POST "http://localhost:8080/api/replays/from-url?teamId=1" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://replay.pokemonshowdown.com/gen9vgc2025regi-2348427947",
    "notes": "Tournament match"
  }'

# 3. Verify replay has full data
curl http://localhost:8080/api/replays/1 \
  -H "Authorization: Bearer {token}"

# Response should include:
# - Full battleLog JSON
# - Opponent name
# - Result (win/loss)
# - Battle date
```

### Test Pokepaste Integration

```bash
# Test in Java code or create endpoint:
PokepasteDTO.PasteData paste = pokepasteService.fetchPasteData(
    "https://pokepast.es/{valid-paste-id}"
);

// Verify:
System.out.println("Pokemon count: " + paste.getPokemon().size());
for (PokepasteDTO.PokemonData pokemon : paste.getPokemon()) {
    System.out.println(pokemon.getSpecies() + " @ " + pokemon.getItem());
}
```

---

## URL Validation

### Pokemon Showdown URLs
```java
// Valid formats:
"https://replay.pokemonshowdown.com/gen9vgc2025-12345"
"https://replay.pokemonshowdown.com/gen9vgc2025regi-2348427947-3phjt0i9miwbtlnwom948cv8w7dt5f8pw"

// Invalid formats:
"https://showdown.com/replay"  // Wrong domain
"replay.pokemonshowdown.com"   // Missing https://
"https://replay.pokemonshowdown.com"  // Missing battle ID
```

### Pokepaste URLs
```java
// Valid formats:
"https://pokepast.es/abc123"
"https://pokepast.es/abc123/raw"

// Invalid formats:
"https://pokepaste.es/abc123"  // Wrong domain (.es vs .es)
"pokepast.es/abc123"           // Missing https://
```

---

## Error Handling

### Invalid URL Errors
```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "Invalid Pokemon Showdown replay URL format"
}
```

### Fetch Failures
```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "Failed to fetch replay data: Connection timeout"
}
```

### Duplicate URL
```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "Replay URL already exists: https://replay.pokemonshowdown.com/..."
}
```

### Missing Showdown Username
```
// If team has no showdownUsernames, service defaults to player1
// Logs warning: "Could not identify user in replay, defaulting to player1"
```

---

## How It Works Internally

### Replay Creation Flow

```
User Request (POST /api/replays/from-url)
    ↓
ReplayController
    ↓
ReplayService.createReplayFromUrl()
    ↓
ShowdownService.fetchReplayData()
    ↓ (HTTP GET)
Pokemon Showdown API (.json endpoint)
    ↓ (JSON response)
ShowdownService.parseReplayData()
    ↓
ReplayService creates Replay entity
    ↓
Save to database with full data
```

### Data Extraction Process

```java
// 1. Fetch JSON
String jsonUrl = "https://replay.pokemonshowdown.com/{id}.json";
String json = restTemplate.getForObject(jsonUrl, String.class);

// 2. Parse JSON
JsonNode root = objectMapper.readTree(json);
String player1 = root.path("p1").asText();
String player2 = root.path("p2").asText();
String logText = root.path("log").asText();

// 3. Find winner
Pattern winPattern = Pattern.compile("\\|win\\|([^\\n]+)");
Matcher matcher = winPattern.matcher(logText);
String winner = matcher.group(1);

// 4. Identify user's side
for (String username : team.getShowdownUsernames()) {
    if (player1.equalsIgnoreCase(username)) {
        userPlayer = player1;
        opponent = player2;
        break;
    }
}

// 5. Determine result
String result = userPlayer.equals(winner) ? "win" : "loss";
```

---

## Dependencies Added

**pom.xml - Already included:**
```xml
<!-- Jackson for JSON parsing -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>
```

**RestTemplate** - Added via configuration:
```java
@Bean
public RestTemplate restTemplate() {
    return new RestTemplate();
}
```

---

## Design Decisions

### Why Separate DTO Classes?
✅ **Advantages:**
- Reusable across services
- Easy to test independently
- Clean separation of concerns
- Better for MapStruct integration
- More discoverable

❌ **Avoided Inner Classes:**
- Hidden inside service classes
- Harder to reuse
- Tight coupling

### Why Store Full Battle Log?
- Enables future analysis features
- Preserves complete battle data
- No need to re-fetch from Showdown
- Supports offline analysis

### Why Use Team's Showdown Usernames?
- Automatically identifies user's side
- Supports multiple alt accounts
- No manual result entry needed
- Accurate win/loss tracking

---

## Future Enhancements

### Showdown Integration
- ⬜ Parse battle log for move usage statistics
- ⬜ Extract lead Pokemon from battle log
- ⬜ Identify opponent's team composition
- ⬜ Calculate damage rolls and RNG events
- ⬜ Support for Best-of-3 match detection

### Pokepaste Integration
- ⬜ Store parsed Pokemon data in database
- ⬜ Enable team composition search
- ⬜ Track Pokemon usage across teams
- ⬜ Validate team legality
- ⬜ Auto-update teams when paste changes

### Error Handling
- ⬜ Retry logic for failed fetches
- ⬜ Caching of replay data
- ⬜ Batch replay import
- ⬜ Webhook for new replays

---

## Complete Architecture Status

```
✅ Phase 1: Database Foundation (Entities + Repositories)
✅ Phase 2: Service Layer (Business Logic + Validation)
✅ Phase 3: REST API (Controllers + DTOs + Mappers)
✅ Phase 4: Security (JWT Authentication + BCrypt)
✅ Phase 5: Controller Updates (Authentication-based)
✅ Phase 6: External Integrations (Showdown + Pokepaste)
⬜ Phase 7: Documentation (Swagger/OpenAPI)
⬜ Phase 8: Advanced Features (Analytics, Game Plans)
```

---

## Files to Copy

Replace these files in your project:
1. **ReplayService.java** → **ReplayService_Updated.java**
2. **ReplayRepository.java** → **ReplayRepository_Updated.java**

Add these new files:
3. **ShowdownDTO.java** (dto package)
4. **PokepasteDTO.java** (dto package)
5. **ShowdownService.java** (services package)
6. **PokepasteService.java** (services package)
7. **RestTemplateConfig.java** (config package)

---

## Quick Start

### 1. Update Files
- Replace ReplayService and ReplayRepository
- Add new DTOs, services, and config

### 2. Build
```bash
mvn clean install
```

### 3. Test Integration
```bash
# Start app
mvn spring-boot:run

# Register & login
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123","email":"test@test.com"}'

# Create team with showdown username
curl -X POST http://localhost:8080/api/teams \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Team","pokepaste":"https://pokepast.es/x","regulation":"Reg G","showdownUsernames":["YourName"]}'

# Import replay (will auto-fetch from Showdown!)
curl -X POST "http://localhost:8080/api/replays/from-url?teamId=1" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://replay.pokemonshowdown.com/gen9vgc2025-12345"}'
```

---

## Summary

🎉 **Phase 6 Complete!**

Your backend now:
- ✅ Automatically fetches battle logs from Pokemon Showdown
- ✅ Parses complete replay data (opponent, result, date)
- ✅ Identifies user's side using showdown usernames
- ✅ Fetches and parses Pokepaste team data
- ✅ Validates all external URLs
- ✅ Handles errors gracefully
- ✅ Production-ready external API integration

**Next Steps:**
- API documentation (Swagger/OpenAPI)
- Advanced analytics features
- Frontend integration