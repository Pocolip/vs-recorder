# VS Recorder Backend - Phase 7 Complete

## Summary
Phase 7 implements interactive API documentation using Springdoc OpenAPI (Swagger), providing a web-based interface for exploring and testing the API.

## Files Created/Updated

### Configuration
1. **OpenAPIConfig.java** - OpenAPI/Swagger configuration
2. **SecurityConfig_Updated.java** - Allow Swagger endpoints
3. **AuthController_Updated.java** - Example with OpenAPI annotations
4. **pom.xml** - Added Springdoc dependency

---

## Accessing the Documentation

### Swagger UI (Interactive Documentation)
```
http://localhost:8080/swagger-ui.html
```

**Features:**
- Interactive API explorer
- Try out endpoints directly from browser
- Automatic request/response examples
- JWT authentication support
- Organized by controller tags

### OpenAPI JSON Specification
```
http://localhost:8080/v3/api-docs
```

**Use for:**
- Generating client SDKs
- Importing into Postman/Insomnia
- API contract testing
- Frontend code generation

---

## How to Use Swagger UI

### 1. Access the UI
```
http://localhost:8080/swagger-ui.html
```

### 2. Register/Login
1. Expand "Authentication" section
2. Try "POST /api/auth/register"
3. Click "Try it out"
4. Fill in example request:
```json
{
  "username": "testuser",
  "password": "test123",
  "email": "test@example.com"
}
```
5. Click "Execute"
6. Copy the JWT token from response

### 3. Authenticate
1. Click "Authorize" button (🔓 icon) at top
2. Enter: `Bearer {your-token}`
3. Click "Authorize"
4. Click "Close"
5. All requests now include your token automatically!

### 4. Test Endpoints
1. Expand any endpoint (e.g., "POST /api/teams")
2. Click "Try it out"
3. Modify the request body
4. Click "Execute"
5. View response below

---

## OpenAPI Annotations Reference

### Controller-Level Annotations

```java
@Tag(name = "Authentication", description = "User registration and login endpoints")
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    // ...
}
```

### Endpoint-Level Annotations

```java
@Operation(
    summary = "Register a new user",
    description = "Create a new user account and receive a JWT token"
)
@ApiResponses(value = {
    @ApiResponse(
        responseCode = "201",
        description = "User registered successfully",
        content = @Content(schema = @Schema(implementation = AuthDTO.AuthResponse.class))
    ),
    @ApiResponse(
        responseCode = "400",
        description = "Invalid input",
        content = @Content(schema = @Schema(implementation = ErrorResponse.class))
    )
})
@PostMapping("/register")
public ResponseEntity<AuthDTO.AuthResponse> register(@Valid @RequestBody AuthDTO.RegisterRequest request) {
    // ...
}
```

### Security Annotations

```java
@Operation(
    summary = "Get current user",
    security = @SecurityRequirement(name = "bearerAuth")
)
@GetMapping("/me")
public ResponseEntity<AuthDTO.AuthResponse> getCurrentUser(Authentication authentication) {
    // ...
}
```

---

## Adding Documentation to Your Controllers

### Step 1: Add @Tag Annotation
```java
@Tag(name = "Teams", description = "Team management endpoints")
@RestController
@RequestMapping("/api/teams")
public class TeamController {
    // ...
}
```

### Step 2: Document Endpoints
```java
@Operation(
    summary = "Create a new team",
    description = "Creates a team with Pokepaste URL and regulation",
    security = @SecurityRequirement(name = "bearerAuth")
)
@ApiResponses(value = {
    @ApiResponse(responseCode = "201", description = "Team created"),
    @ApiResponse(responseCode = "400", description = "Invalid input"),
    @ApiResponse(responseCode = "401", description = "Not authenticated")
})
@PostMapping
public ResponseEntity<TeamDTO.Response> createTeam(
    Authentication authentication,
    @Valid @RequestBody TeamDTO.CreateRequest request) {
    // ...
}
```

### Step 3: Document Parameters
```java
@Operation(summary = "Get team by ID")
@GetMapping("/{id}")
public ResponseEntity<TeamDTO.Response> getTeamById(
    @Parameter(description = "Team ID", required = true)
    @PathVariable Long id,
    Authentication authentication) {
    // ...
}
```

---

## Common Annotations

### @Tag
Groups endpoints by category in Swagger UI
```java
@Tag(name = "Teams", description = "Team management")
```

### @Operation
Documents a single endpoint
```java
@Operation(
    summary = "Short description",
    description = "Detailed description",
    security = @SecurityRequirement(name = "bearerAuth")
)
```

### @ApiResponse / @ApiResponses
Documents possible responses
```java
@ApiResponses(value = {
    @ApiResponse(responseCode = "200", description = "Success"),
    @ApiResponse(responseCode = "404", description = "Not found")
})
```

### @Parameter
Documents path/query parameters
```java
@Parameter(description = "ID of the resource", required = true)
@PathVariable Long id
```

### @Schema
Documents DTO fields
```java
public class UserDTO {
    @Schema(description = "User's email address", example = "user@example.com")
    private String email;
}
```

---

## Swagger Configuration Options

### Customize in OpenAPIConfig.java

```java
@Bean
public OpenAPI customOpenAPI() {
    return new OpenAPI()
        .info(new Info()
            .title("Your API Title")
            .version("1.0.0")
            .description("Your API description")
            .contact(new Contact()
                .name("Support Team")
                .email("support@example.com")
                .url("https://example.com/support")))
        .servers(List.of(
            new Server()
                .url("https://api.example.com")
                .description("Production"),
            new Server()
                .url("http://localhost:8080")
                .description("Development")))
        .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
        .components(new Components()
            .addSecuritySchemes("bearerAuth", 
                new SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")));
}
```

---

## Security Configuration

### Allow Swagger Endpoints

```java
@Bean
public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
    http
        .authorizeHttpRequests(auth -> auth
            .requestMatchers(
                "/swagger-ui/**",      // Swagger UI assets
                "/v3/api-docs/**",     // OpenAPI JSON
                "/swagger-ui.html"     // Swagger UI page
            ).permitAll()
            .anyRequest().authenticated()
        );
    return http.build();
}
```

---

## Generated Documentation Structure

### In Swagger UI

```
┌─ Authentication
│  ├─ POST /api/auth/register
│  ├─ POST /api/auth/login
│  └─ GET  /api/auth/me
│
┌─ Teams
│  ├─ POST   /api/teams
│  ├─ GET    /api/teams
│  ├─ GET    /api/teams/{id}
│  ├─ PATCH  /api/teams/{id}
│  ├─ DELETE /api/teams/{id}
│  └─ ...
│
┌─ Replays
│  ├─ POST   /api/replays
│  ├─ POST   /api/replays/from-url
│  ├─ GET    /api/replays
│  └─ ...
│
└─ Matches
   ├─ POST   /api/matches
   ├─ GET    /api/matches
   └─ ...
```

---

## Testing with Swagger UI

### Complete Workflow Example

```
1. Open http://localhost:8080/swagger-ui.html

2. Register User:
   - Expand "Authentication" → "POST /api/auth/register"
   - Click "Try it out"
   - Enter:
     {
       "username": "testuser",
       "password": "test123",
       "email": "test@test.com"
     }
   - Click "Execute"
   - Copy the token from response

3. Authenticate:
   - Click "Authorize" button (top right)
   - Paste: Bearer {token}
   - Click "Authorize" → "Close"

4. Create Team:
   - Expand "Teams" → "POST /api/teams"
   - Click "Try it out"
   - Enter:
     {
       "name": "My Team",
       "pokepaste": "https://pokepast.es/example",
       "regulation": "Reg G",
       "showdownUsernames": ["testuser"]
     }
   - Click "Execute"
   - Verify 201 response

5. Import Replay:
   - Expand "Replays" → "POST /api/replays/from-url"
   - Enter teamId in query parameter
   - Enter:
     {
       "url": "https://replay.pokemonshowdown.com/...",
       "notes": "Great game"
     }
   - Click "Execute"
   - Verify replay was created with full data
```

---

## Benefits of Swagger Documentation

### For Developers
- ✅ Interactive API testing
- ✅ No need for Postman/curl commands
- ✅ Automatic request/response examples
- ✅ Authentication built-in
- ✅ Try endpoints without writing code

### For Frontend Team
- ✅ Clear API contract
- ✅ Request/response schemas
- ✅ Generate TypeScript types
- ✅ Test API before integration
- ✅ Always up-to-date docs

### For Documentation
- ✅ Single source of truth
- ✅ Auto-generated from code
- ✅ Never out of sync
- ✅ Professional appearance
- ✅ Exportable specification

---

## Exporting API Specification

### Get OpenAPI JSON
```bash
curl http://localhost:8080/v3/api-docs > openapi.json
```

### Import to Postman
1. Open Postman
2. File → Import
3. Upload openapi.json
4. All endpoints imported as collection

### Generate Client SDK
```bash
# Install OpenAPI Generator
npm install -g @openapitools/openapi-generator-cli

# Generate TypeScript client
openapi-generator-cli generate \
  -i http://localhost:8080/v3/api-docs \
  -g typescript-axios \
  -o ./frontend/src/api
```

---

## Customizing Swagger UI

### application.properties
```properties
# Swagger UI customization
springdoc.swagger-ui.path=/api-docs
springdoc.swagger-ui.operationsSorter=method
springdoc.swagger-ui.tagsSorter=alpha
springdoc.swagger-ui.defaultModelsExpandDepth=1
springdoc.swagger-ui.defaultModelExpandDepth=1

# API docs path
springdoc.api-docs.path=/v3/api-docs

# Packages to scan
springdoc.packages-to-scan=com.yeskatronics.vs_recorder_backend.controllers
```

---

## Best Practices

### 1. Use Descriptive Summaries
```java
// ❌ Bad
@Operation(summary = "Create team")

// ✅ Good
@Operation(summary = "Create a new VGC team with Pokepaste URL")
```

### 2. Document All Response Codes
```java
@ApiResponses(value = {
    @ApiResponse(responseCode = "201", description = "Created"),
    @ApiResponse(responseCode = "400", description = "Invalid input"),
    @ApiResponse(responseCode = "401", description = "Not authenticated"),
    @ApiResponse(responseCode = "404", description = "Team not found")
})
```

### 3. Provide Examples
```java
@Schema(description = "Pokemon Showdown replay URL", 
        example = "https://replay.pokemonshowdown.com/gen9vgc2025-12345")
private String url;
```

### 4. Group Related Endpoints
```java
@Tag(name = "Teams", description = "Team CRUD and statistics")
@Tag(name = "Replays", description = "Replay import and analysis")
```

### 5. Mark Security Requirements
```java
@Operation(
    summary = "Protected endpoint",
    security = @SecurityRequirement(name = "bearerAuth")
)
```

---

## Troubleshooting

### Swagger UI Not Loading
```
Check:
1. Dependency added to pom.xml
2. Security config allows /swagger-ui/**
3. Application started successfully
4. Visit: http://localhost:8080/swagger-ui.html (not /swagger-ui/)
```

### Authentication Not Working
```
Check:
1. "Authorize" button used
2. Token format: "Bearer {token}" (with space)
3. Token not expired
4. SecurityRequirement annotation on protected endpoints
```

### Endpoints Not Showing
```
Check:
1. Controller has @RestController
2. Methods have HTTP method annotations (@GetMapping, etc.)
3. Package scanned in springdoc configuration
4. No compilation errors
```

---

## Complete Architecture Status

```
✅ Phase 1: Database Foundation (Entities + Repositories)
✅ Phase 2: Service Layer (Business Logic + Validation)
✅ Phase 3: REST API (Controllers + DTOs + Mappers)
✅ Phase 4: Security (JWT Authentication + BCrypt)
✅ Phase 5: Controller Updates (Authentication-based)
✅ Phase 6: External Integrations (Showdown + Pokepaste)
✅ Phase 7: API Documentation (Swagger/OpenAPI)
⬜ Phase 8: Advanced Features (Analytics, CORS, etc.)
```

---

## Next Steps

### Optional Enhancements
1. **Add more annotations** to remaining controllers
2. **Custom DTO examples** with @Schema
3. **Group operations** with @Tag
4. **Document error responses** comprehensively
5. **Add CORS configuration** for frontend
6. **Implement pagination** for large lists
7. **Add rate limiting** for API protection

---

## Summary

🎉 **Phase 7 Complete!**

Your API now has:
- ✅ Interactive documentation at /swagger-ui.html
- ✅ OpenAPI 3.0 specification at /v3/api-docs
- ✅ JWT authentication in Swagger UI
- ✅ Try-out functionality for all endpoints
- ✅ Professional API documentation
- ✅ Export capability for client generation

**Access:** http://localhost:8080/swagger-ui.html

Try it out - register, login, get your token, click "Authorize", and test all your endpoints interactively!