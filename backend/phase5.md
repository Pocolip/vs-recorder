# VS Recorder Backend - Phase 5 Complete

## Summary
Phase 5 updates all remaining controllers to use JWT authentication instead of userId query parameters, completing the security implementation.

## Files Updated

### Updated Controllers
1. **TeamController_Updated.java** - Removed userId params, uses Authentication
2. **ReplayController_Updated.java** - Removed userId params, uses Authentication
3. **MatchController_Updated.java** - Removed userId params, uses Authentication

---

## Key Changes

### Before (Phase 3/4)
```java
@PostMapping
public ResponseEntity<TeamDTO.Response> createTeam(
    @RequestParam Long userId,  // ❌ Security risk - user can pass any ID
    @RequestBody TeamDTO.CreateRequest request) {
    // ...
}
```

### After (Phase 5)
```java
@PostMapping
public ResponseEntity<TeamDTO.Response> createTeam(
    Authentication authentication,  // ✅ Secure - from JWT token
    @RequestBody TeamDTO.CreateRequest request) {
    
    Long userId = getCurrentUserId(authentication);
    // ...
}
```

---

## Pattern Applied to All Controllers

### 1. Added Dependencies
```java
private final CustomUserDetailsService userDetailsService;
private final TeamService teamService; // For ownership verification
```

### 2. Helper Methods
```java
/**
 * Extract user ID from JWT token
 */
private Long getCurrentUserId(Authentication authentication) {
    String username = authentication.getName();
    return userDetailsService.getUserIdByUsername(username);
}

/**
 * Verify team ownership
 */
private void verifyTeamOwnership(Long teamId, Long userId) {
    teamService.getTeamByIdAndUserId(teamId, userId)
            .orElseThrow(() -> new IllegalArgumentException("Team not found or access denied"));
}
```

### 3. Updated All Endpoints
- Replaced `@RequestParam Long userId` with `Authentication authentication`
- Added ownership verification for all operations
- Automatic user identification from JWT token

---

## Security Improvements

### 1. No User ID Spoofing
**Before:**
```bash
# User could impersonate another user
curl http://localhost:8080/api/teams?userId=999
```

**After:**
```bash
# User ID extracted from JWT - cannot be spoofed
curl http://localhost:8080/api/teams \
  -H "Authorization: Bearer {token}"
```

### 2. Ownership Verification
Every operation now verifies:
- User owns the team before accessing/modifying
- User owns the replay's team before accessing/modifying
- User owns the match's team before accessing/modifying

### 3. Automatic User Context
- No need to pass userId in requests
- User automatically identified from JWT
- Cleaner API design

---

## Updated API Endpoints

### Team Endpoints
```
POST   /api/teams                          - Create team (auth required)
GET    /api/teams                          - Get user's teams (auth required)
GET    /api/teams/{id}                     - Get team (ownership verified)
GET    /api/teams/regulation/{regulation}  - Filter teams (auth required)
PATCH  /api/teams/{id}                     - Update team (ownership verified)
DELETE /api/teams/{id}                     - Delete team (ownership verified)
GET    /api/teams/{id}/stats               - Get stats (ownership verified)
POST   /api/teams/{id}/showdown-usernames  - Add username (ownership verified)
DELETE /api/teams/{id}/showdown-usernames/{username} - Remove username (ownership verified)
```

### Replay Endpoints
```
POST   /api/replays/from-url?teamId={teamId}  - Create from URL (ownership verified)
POST   /api/replays?teamId={teamId}           - Create replay (ownership verified)
GET    /api/replays/{id}                      - Get replay (ownership verified)
GET    /api/replays?teamId={teamId}           - List replays (ownership verified)
GET    /api/replays/standalone?teamId={teamId} - Standalone replays (ownership verified)
GET    /api/replays/match/{matchId}           - Match replays (ownership verified)
POST   /api/replays/filter?teamId={teamId}    - Filter replays (ownership verified)
GET    /api/replays/result/{result}?teamId={teamId} - By result (ownership verified)
GET    /api/replays/opponent/{opponent}?teamId={teamId} - By opponent (ownership verified)
PATCH  /api/replays/{id}                      - Update replay (ownership verified)
PUT    /api/replays/{id}/match                - Associate match (ownership verified)
DELETE /api/replays/{id}/match                - Dissociate match (ownership verified)
DELETE /api/replays/{id}                      - Delete replay (ownership verified)
GET    /api/replays/check/url?url={url}       - Check URL (public)
GET    /api/replays/stats/win-rate?teamId={teamId} - Win rate (ownership verified)
```

### Match Endpoints
```
POST   /api/matches?teamId={teamId}           - Create match (ownership verified)
GET    /api/matches/{id}                      - Get match (ownership verified)
GET    /api/matches?teamId={teamId}           - List matches (ownership verified)
GET    /api/matches/with-replays?teamId={teamId} - With replays (ownership verified)
GET    /api/matches/opponent/{opponent}?teamId={teamId} - By opponent (ownership verified)
GET    /api/matches/tag/{tag}?teamId={teamId} - By tag (ownership verified)
PATCH  /api/matches/{id}                      - Update match (ownership verified)
POST   /api/matches/{id}/tags                 - Add tag (ownership verified)
DELETE /api/matches/{id}/tags/{tag}           - Remove tag (ownership verified)
DELETE /api/matches/{id}                      - Delete match (ownership verified)
GET    /api/matches/{id}/stats                - Get stats (ownership verified)
GET    /api/matches/stats/team?teamId={teamId} - Team stats (ownership verified)
```

---

## Testing Updated Endpoints

### 1. Register/Login
```bash
# Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"trainer","password":"pass123","email":"t@t.com"}'

# Response includes token
{
  "token": "eyJhbGc...",
  "userId": 1,
  "username": "trainer",
  "email": "t@t.com"
}
```

### 2. Create Team (No userId param needed)
```bash
curl -X POST http://localhost:8080/api/teams \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Team",
    "pokepaste": "https://pokepast.es/example",
    "regulation": "Reg G"
  }'
```

### 3. List Teams (Automatically filtered to user)
```bash
curl http://localhost:8080/api/teams \
  -H "Authorization: Bearer eyJhbGc..."
```

### 4. Create Replay (With ownership check)
```bash
curl -X POST "http://localhost:8080/api/replays/from-url?teamId=1" \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://replay.pokemonshowdown.com/gen9vgc2025-12345",
    "notes": "Great game!"
  }'
```

### 5. Try to Access Another User's Team (Should fail)
```bash
# User A creates team (teamId=1)
# User B tries to access it with their token (Should get 404 or error)
curl http://localhost:8080/api/teams/1 \
  -H "Authorization: Bearer {user-b-token}"
```

---

## Security Verification Checklist

### Authentication Tests
- ✅ Cannot access endpoints without token
- ✅ Cannot access endpoints with invalid token
- ✅ Cannot access endpoints with expired token
- ✅ User ID automatically extracted from token

### Authorization Tests
- ✅ Cannot view another user's teams
- ✅ Cannot modify another user's teams
- ✅ Cannot view replays from another user's teams
- ✅ Cannot modify replays from another user's teams
- ✅ Cannot view matches from another user's teams
- ✅ Cannot modify matches from another user's teams

### Ownership Verification
- ✅ Team operations verify team ownership
- ✅ Replay operations verify team ownership (via replay's team)
- ✅ Match operations verify team ownership (via match's team)
- ✅ Proper 404/403 errors for unauthorized access

---

## Common Error Responses

### Missing Token
```bash
curl http://localhost:8080/api/teams
```
Response (401):
```json
{
  "timestamp": "2025-12-18T20:00:00",
  "status": 401,
  "error": "Unauthorized",
  "message": "Full authentication is required"
}
```

### Invalid Token
```bash
curl http://localhost:8080/api/teams \
  -H "Authorization: Bearer invalid-token"
```
Response (401):
```json
{
  "timestamp": "2025-12-18T20:00:00",
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### Accessing Another User's Resource
```bash
curl http://localhost:8080/api/teams/999 \
  -H "Authorization: Bearer {valid-token}"
```
Response (404):
```json
{
  "timestamp": "2025-12-18T20:00:00",
  "status": 404,
  "error": "Not Found"
}
```

---

## Migration Guide

### 1. Replace Controller Files
Replace these files in your project:
- `TeamController.java` → `TeamController_Updated.java`
- `ReplayController.java` → `ReplayController_Updated.java`
- `MatchController.java` → `MatchController_Updated.java`

### 2. Update Frontend/Client Code

**Before:**
```javascript
// Old way - passing userId
fetch('/api/teams?userId=1', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

**After:**
```javascript
// New way - no userId needed
fetch('/api/teams', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### 3. Remove userId from Requests
Remove all `userId` query parameters from:
- Team creation/updates
- Replay creation/updates
- Match creation/updates

---

## What Changed by Endpoint Type

### Endpoints with No Parameters
**Before:** `GET /api/teams?userId=1`  
**After:** `GET /api/teams` (userId from token)

### Endpoints with teamId Parameter
**Before:** `POST /api/replays?teamId=1&userId=1`  
**After:** `POST /api/replays?teamId=1` (userId from token, ownership verified)

### Endpoints with Path Variables
**Before:** `PATCH /api/teams/1?userId=1`  
**After:** `PATCH /api/teams/1` (userId from token, ownership verified)

---

## Benefits of This Approach

### 1. Security
- ✅ No user ID spoofing
- ✅ Automatic ownership verification
- ✅ Token-based authentication
- ✅ Stateless sessions

### 2. Cleaner API
- ✅ No userId in every request
- ✅ RESTful design
- ✅ Less prone to errors
- ✅ Better developer experience

### 3. Maintainability
- ✅ Centralized authentication logic
- ✅ Consistent security patterns
- ✅ Easy to audit
- ✅ Standard Spring Security practices

---

## Complete Architecture Status

```
✅ Phase 1: Database Foundation (Entities + Repositories)
✅ Phase 2: Service Layer (Business Logic + Validation)
✅ Phase 3: REST API (Controllers + DTOs + Mappers)
✅ Phase 4: Security (JWT Authentication + BCrypt)
✅ Phase 5: Controller Updates (Authentication-based)
⬜ Phase 6: External Integrations (Showdown API + Pokepaste)
⬜ Phase 7: Documentation (Swagger/OpenAPI)
```

---

## Summary

🎉 **Phase 5 Complete!**

Your backend now has:
- ✅ Fully secured REST API
- ✅ JWT-based authentication on all endpoints
- ✅ Ownership verification on all operations
- ✅ No user ID spoofing possible
- ✅ Clean, RESTful API design
- ✅ Production-ready security

**Next Steps:**
- External integrations (Pokemon Showdown API)
- API documentation (Swagger)
- Frontend integration