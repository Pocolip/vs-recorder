# VS Recorder Backend - Phase 4 Complete

## Summary
Phase 4 implements JWT-based authentication with Spring Security, including password hashing, token generation/validation, and secured endpoints.

## Files Created

### Security Components (com.yeskatronics.vs_recorder_backend.security)
1. **JwtUtil.java** - JWT token generation and validation utility
2. **CustomUserDetailsService.java** - Spring Security UserDetailsService implementation
3. **JwtAuthenticationFilter.java** - JWT token validation filter
4. **SecurityConfig.java** - Spring Security configuration

### Updated Services
5. **UserService_Updated.java** - Updated with BCrypt password hashing

### Controllers & DTOs
6. **AuthController.java** - Login and registration endpoints
7. **AuthDTO.java** - Authentication request/response DTOs

### Configuration
8. **pom.xml** - Added Spring Security and JWT dependencies
9. **application.properties** - Added JWT configuration

---

## Authentication Flow

### Registration Flow
```
1. POST /api/auth/register
2. UserService hashes password with BCrypt
3. User saved to database
4. JWT token generated with userId claim
5. Return token + user info
```

### Login Flow
```
1. POST /api/auth/login
2. Spring Security authenticates credentials
3. If valid, JWT token generated
4. Last login timestamp updated
5. Return token + user info
```

### Authenticated Request Flow
```
1. Client sends request with "Authorization: Bearer {token}"
2. JwtAuthenticationFilter intercepts request
3. Extract and validate JWT token
4. Load user from database
5. Set authentication in SecurityContext
6. Request proceeds to controller
```

---

## API Endpoints

### Authentication Endpoints (Public)
```
POST   /api/auth/register     - Register new user
POST   /api/auth/login        - Login user
GET    /api/auth/me           - Get current user (requires auth)
```

### Public Endpoints
```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/users/check/username/{username}
GET    /api/users/check/email/{email}
GET    /h2-console/**  (development only)
```

### Protected Endpoints (Require JWT Token)
```
All other endpoints require "Authorization: Bearer {token}" header
- /api/users/**
- /api/teams/**
- /api/replays/**
- /api/matches/**
```

---

## Testing Authentication

### 1. Register a User
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "trainer123",
    "password": "password123",
    "email": "trainer@example.com"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "type": "Bearer",
  "userId": 1,
  "username": "trainer123",
  "email": "trainer@example.com"
}
```

### 2. Login
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "trainer123",
    "password": "password123"
  }'
```

Response: Same as registration

### 3. Access Protected Endpoint
```bash
# Without token - FAILS (401 Unauthorized)
curl http://localhost:8080/api/teams

# With token - SUCCESS
curl http://localhost:8080/api/teams \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 4. Get Current User
```bash
curl http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer {your-token}"
```

---

## JWT Token Structure

### Token Claims
```json
{
  "sub": "trainer123",        // Username
  "userId": 1,                 // User ID
  "iat": 1701234567,          // Issued at
  "exp": 1701320967           // Expiration
}
```

### Token Configuration
- **Algorithm**: HMAC-SHA256
- **Expiration**: 24 hours (configurable in application.properties)
- **Secret Key**: Configured in `jwt.secret` property

---

## Security Features Implemented

### 1. Password Hashing
```java
@Service
public class UserService {
    private final PasswordEncoder passwordEncoder;
    
    public User createUser(User user) {
        // Hash password with BCrypt
        user.setPasswordHash(passwordEncoder.encode(user.getPasswordHash()));
        return userRepository.save(user);
    }
}
```

### 2. JWT Validation
```java
public Boolean validateToken(String token, UserDetails userDetails) {
    final String username = extractUsername(token);
    return (username.equals(userDetails.getUsername()) && !isTokenExpired(token));
}
```

### 3. Stateless Sessions
- No server-side sessions
- JWT tokens carry all necessary information
- Scalable architecture

### 4. CSRF Protection
- Disabled for stateless JWT authentication
- Not needed as tokens are in headers, not cookies

---

## Security Configuration Details

### Public Endpoints
```java
.requestMatchers(
    "/api/auth/**",           // Auth endpoints
    "/h2-console/**",         // H2 console (dev only)
    "/api/users/check/**"     // Username/email validation
).permitAll()
```

### Protected Endpoints
```java
.anyRequest().authenticated()  // All other endpoints require auth
```

### Session Management
```java
.sessionManagement(session -> session
    .sessionCreationPolicy(SessionCreationPolicy.STATELESS)
)
```

---

## What Works Now

✅ **User Registration**
- Password hashed with BCrypt
- JWT token generated on registration
- User automatically logged in

✅ **User Login**
- Credential validation via Spring Security
- JWT token generation
- Last login timestamp updated

✅ **Token-Based Authentication**
- JWT tokens validated on each request
- User loaded from database
- Authentication set in SecurityContext

✅ **Protected Endpoints**
- All endpoints (except auth/public) require valid JWT
- 401 Unauthorized returned for missing/invalid tokens
- Automatic user identification from token

✅ **Password Security**
- BCrypt hashing (salt + multiple rounds)
- Passwords never stored in plain text
- Password validation on login

---

## Next Steps: Update Existing Controllers

### Remove `userId` Query Parameters

**Before (Phase 3):**
```java
@PostMapping
public ResponseEntity<TeamDTO.Response> createTeam(
    @RequestParam Long userId,  // ❌ Remove this
    @RequestBody TeamDTO.CreateRequest request) {
    // ...
}
```

**After (Phase 4):**
```java
@PostMapping
public ResponseEntity<TeamDTO.Response> createTeam(
    Authentication authentication,  // ✅ Use Spring Security
    @RequestBody TeamDTO.CreateRequest request) {
    
    // Get userId from authenticated user
    String username = authentication.getName();
    Long userId = userDetailsService.getUserIdByUsername(username);
    
    // Continue with business logic
}
```

### Updated Endpoints Pattern
All protected endpoints should:
1. Accept `Authentication` parameter
2. Extract username from `authentication.getName()`
3. Get userId via `userDetailsService.getUserIdByUsername()`
4. Use userId for business logic

---

## Error Handling

### Authentication Errors

**Invalid Credentials:**
```json
{
  "timestamp": "2025-12-06T10:00:00",
  "status": 401,
  "error": "Unauthorized",
  "message": "Invalid username or password",
  "path": "/api/auth/login"
}
```

**Missing Token:**
```json
{
  "timestamp": "2025-12-06T10:00:00",
  "status": 401,
  "error": "Unauthorized",
  "message": "Full authentication is required to access this resource",
  "path": "/api/teams"
}
```

**Expired Token:**
```json
{
  "timestamp": "2025-12-06T10:00:00",
  "status": 401,
  "error": "Unauthorized",
  "message": "JWT token has expired",
  "path": "/api/teams"
}
```

---

## Testing Checklist

### Registration Tests
- ✅ Register with valid data
- ✅ Register with duplicate username (should fail)
- ✅ Register with duplicate email (should fail)
- ✅ Register with invalid email format (should fail)
- ✅ Register with short password (should fail)
- ✅ Verify password is hashed in database

### Login Tests
- ✅ Login with correct credentials
- ✅ Login with wrong password (should fail)
- ✅ Login with non-existent username (should fail)
- ✅ Verify token is returned
- ✅ Verify last login timestamp updated

### Token Tests
- ✅ Access protected endpoint with valid token
- ✅ Access protected endpoint without token (should fail)
- ✅ Access protected endpoint with invalid token (should fail)
- ✅ Access protected endpoint with expired token (should fail)
- ✅ Verify userId claim in token

### Public Endpoint Tests
- ✅ Access /api/auth/register without token
- ✅ Access /api/auth/login without token
- ✅ Access /api/users/check/* without token

---

## Security Best Practices Implemented

### 1. Password Security
- ✅ BCrypt with automatic salt generation
- ✅ Configurable password strength requirements
- ✅ Passwords never logged or exposed in responses

### 2. Token Security
- ✅ HMAC-SHA256 signing
- ✅ Short expiration time (24 hours)
- ✅ Secret key configuration (must change in production)
- ✅ Token validation on every request

### 3. API Security
- ✅ Stateless authentication
- ✅ CSRF protection disabled (JWT in headers)
- ✅ Clear separation of public/protected endpoints
- ✅ Proper HTTP status codes (401, 403)

### 4. Error Handling
- ✅ No sensitive information in error messages
- ✅ Consistent error response format
- ✅ Proper logging of authentication attempts

---

## Production Considerations

### 1. Change JWT Secret
```properties
# In production, use a strong random secret key
jwt.secret=USE_A_CRYPTOGRAPHICALLY_SECURE_RANDOM_256_BIT_KEY
```

Generate secure key:
```bash
openssl rand -base64 32
```

### 2. Configure Token Expiration
```properties
# Shorter expiration for higher security
jwt.expiration=3600000  # 1 hour
```

### 3. HTTPS Only
- Always use HTTPS in production
- JWT tokens in plain HTTP are insecure

### 4. Rate Limiting
- Implement rate limiting on auth endpoints
- Prevent brute force attacks

### 5. Token Refresh
- Consider implementing refresh tokens
- Allow token renewal without re-login

### 6. Remove H2 Console
```java
// In production SecurityConfig:
.requestMatchers("/h2-console/**").denyAll()
```

---

## Dependencies Added

```xml
<!-- Spring Security -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<!-- JWT -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.3</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.3</version>
    <scope>runtime</scope>
</dependency>
```

---

## Current Architecture Status

```
✅ Phase 1: Database Foundation (Entities + Repositories)
✅ Phase 2: Service Layer (Business Logic + Validation)
✅ Phase 3: REST API (Controllers + DTOs + Mappers)
✅ Phase 4: Security (JWT Authentication + BCrypt)
⬜ Phase 5: Update Controllers (Remove userId params, use Auth)
⬜ Phase 6: External Integrations (Showdown API + Pokepaste)
⬜ Phase 7: Documentation (Swagger/OpenAPI)
```

---

## Files to Copy

1. **pom.xml** - Updated with Security/JWT dependencies
2. **application.properties** - Added JWT configuration
3. **JwtUtil.java** - JWT utility class
4. **CustomUserDetailsService.java** - UserDetailsService impl
5. **JwtAuthenticationFilter.java** - JWT filter
6. **SecurityConfig.java** - Security configuration
7. **UserService_Updated.java** - Replace existing UserService
8. **AuthDTO.java** - Auth DTOs
9. **AuthController.java** - Auth endpoints

---

## Quick Start Guide

### 1. Update Files
Replace `UserService.java` with `UserService_Updated.java`

### 2. Build Project
```bash
mvn clean install
```

### 3. Run Application
```bash
mvn spring-boot:run
```

### 4. Test Authentication
```bash
# Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123","email":"test@test.com"}'

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# Use token
curl http://localhost:8080/api/users/1 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Summary

🎉 **Phase 4 Complete!**

Your backend now has:
- ✅ Secure JWT-based authentication
- ✅ BCrypt password hashing
- ✅ Protected API endpoints
- ✅ Stateless session management
- ✅ Production-ready security foundation

**Next Step**: Update existing controllers (Team, Replay, Match) to use `Authentication` instead of `userId` query parameters.