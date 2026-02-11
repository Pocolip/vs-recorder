# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VS Recorder is a Pokemon VGC (Video Game Championships) replay analysis application consisting of two components:
- **Backend**: REST API server (Spring Boot + H2/PostgreSQL)
- **Frontend**: Web application (React 18 + Tailwind CSS + Webpack 5)

The application imports Pokemon Showdown replays, analyzes team performance, tracks matchup statistics, and provides game planning tools for competitive players.

## Build & Run Commands

### Backend (Spring Boot)
```bash
cd backend

# Build the project
mvn clean install

# Run the backend server (port 8080)
mvn spring-boot:run

# Run tests
mvn test

# Run specific test class
mvn test -Dtest=ServiceNameTest

# Run specific test method
mvn test -Dtest=ServiceNameTest#testMethodName
```

**H2 Console Access**: http://localhost:8080/h2-console
- JDBC URL: `jdbc:h2:file:./data/vsrecorder`
- Username: `sa`
- Password: (blank)

**API Documentation**: http://localhost:8080/swagger-ui.html (when server is running)

### Frontend (React)
```bash
cd frontend

# Install dependencies
npm install

# Start development server (port 3000, proxies to backend)
npm run start

# Production build
npm run build

# Clean build directory
npm run clean
```

### Full Stack (Docker Compose)
```bash
# From project root - starts backend, frontend, and PostgreSQL
docker-compose up
```

## Architecture

### Backend Architecture

**Package Structure** (`com.yeskatronics.vs_recorder_backend`):
- `entities/` - JPA entities (User, Team, Replay, Match, GamePlan, GamePlanTeam)
- `repositories/` - Spring Data JPA repositories
- `services/` - Business logic layer
- `controllers/` - REST API endpoints
- `dto/` - Data Transfer Objects for API requests/responses
- `mappers/` - MapStruct interfaces for entity ↔ DTO conversion
- `security/` - JWT authentication and Spring Security configuration
- `config/` - Application configuration (CORS, security, etc.)
- `utils/` - Utility classes (pokepaste parsing, showdown API integration)

**Database Design**:
- Uses H2 (file-based) for development with auto-schema generation
- Designed for PostgreSQL migration in production
- JSON storage: battle logs stored as JSONB/TEXT with `@JdbcTypeCode(SqlTypes.JSON)`
- Array storage: Uses `@ElementCollection` (H2) → migrates to native arrays (PostgreSQL)
- See DATABASE.md for full schema details

**Entity Relationships**:
```
User ─(1:N)─> Team ─(1:N)─> Replay
               │              │
               └──(1:N)─> Match ─(1:N)─┘
                          (optional grouping)

User ─(1:N)─> GamePlan ─(1:N)─> GamePlanTeam
```

**Key Services**:
- `ShowdownService` - Fetches battle logs from Pokemon Showdown replay URLs
- `PokepasteService` - Parses team data from Pokepaste URLs
- `AnalyticsService` - Calculates win rates, usage stats, matchup analysis
- `ReplayService` - Manages replay CRUD and parsing
- `MatchService` - Groups replays into Bo3 (Best of 3) sets
- `GamePlanService` - Tournament preparation and opponent team planning

**Authentication**:
- JWT-based auth with Spring Security
- Secret key configured in `application.properties` (change for production!)
- Tokens expire after 24 hours (configurable via `jwt.expiration`)

### Frontend Architecture

**Directory Structure** (`frontend/src`):
- `pages/` - Page components (HomePage, TeamPage, ExportPage, etc.)
- `components/` - Reusable UI components (cards/, modals/, tabs/)
- `contexts/` - React Context providers (AuthContext)
- `services/api/` - Backend API clients (Axios-based)
- `hooks/` - Custom React hooks
- `utils/` - Utility functions
- `styles/` - CSS and Tailwind configuration

**Tech Stack**:
- React 18, React Router 6 (BrowserRouter), Tailwind CSS 3, Webpack 5, Axios

**State Management & Auth**:
- React Context API (AuthContext) for authentication state
- JWT-based auth with automatic token refresh via Axios interceptors
- API communication through centralized Axios instance with auth headers

## Development Workflow

### Backend Development
1. Entities are defined with JPA annotations - schema auto-generated on startup
2. Use `spring.jpa.hibernate.ddl-auto=create-drop` during early development
3. Change to `update` once schema stabilizes to persist data between restarts
4. All DTOs use MapStruct for automatic mapping - processors run during compilation
5. Lombok generates getters/setters/constructors - use annotations instead of boilerplate

### Frontend Development
1. Run `npm run start` for dev server with hot reload on port 3000
2. Dev server proxies API requests to backend on port 8080
3. Use React DevTools to inspect component state
4. Environment config in `.env.development` / `.env.production` (`REACT_APP_API_BASE_URL`)

## Important Notes

### Backend
- **Database**: H2 is for development only. Production requires PostgreSQL migration (see DATABASE.md migration section)
- **JWT Secret**: Default secret in `application.properties` MUST be changed for production
- **CORS**: Configure allowed origins in `config/` before deploying
- **Battle Log Parsing**: Showdown replay URLs are fetched and parsed - ensure network access during development
- **MapStruct + Lombok**: Both annotation processors must be configured in pom.xml for compatibility

### Frontend
- **Environment Variables**: Configured via `.env.development` and `.env.production` files
- **Router**: Uses BrowserRouter for SPA routing (nginx handles fallback in production)
- **Pokemon Sprites**: Served locally from `public/sprites/` directory
- **Production Build**: nginx serves the static build with gzip, SPA routing, and security headers

## Testing

### Backend Tests
- Test resources in `backend/src/test/resources/`
- Sample replays organized by player username in `replays/` directory
- Sample pokepastes in `pastes/` directory
- Services have comprehensive unit tests
- Use Spring Boot test annotations for integration tests

### Frontend
- No automated tests currently configured
- Manual testing via dev server (`npm run start`)

## API Endpoints

See BACKEND.md for full API specification. Key endpoints:
- `/auth/*` - Registration, login, JWT token management
- `/teams/*` - Team CRUD, associated replays and matches
- `/replays/*` - Replay management and parsing
- `/matches/*` - Bo3 match grouping
- `/teams/:id/stats/*` - Analytics (usage, matchups, move analysis)
- `/game-plans/*` - Tournament game planning
- `/export/*` and `/import/*` - Data portability

## Phase Documentation

The backend/ directory contains phase*.md files documenting the development progression:
- phase1.md - Database entities and repositories
- phase2.md - Service layer implementation
- phase3.md - REST controllers and DTOs
- phase4.md+ - Advanced features (analytics, game planner, import/export)

Refer to these for implementation details and design decisions made during development.

## Plans

Implementation plans created during Claude Code sessions:

- **[CI/CD & AWS Hosting](~/.claude/plans/gleaming-percolating-canyon.md)** - Single EC2 + Docker Compose architecture, GitHub Actions CI/CD, Terraform infrastructure, ~$32/month estimated cost. Includes Dockerfiles, nginx reverse proxy, RDS PostgreSQL setup.
- **[CI/CD Decoupling & Beta Environment](~/.claude/plans/generic-cooking-cascade.md)** - Separate beta API (api.beta.vsrecorder.app) and database, automatic version bumping on develop branch, decoupled build/deploy workflows (feature→beta, develop→versioned beta, main→prod).
- **[TeamMember Calcs](~/.claude/plans/iterative-snacking-bonbon.md)** - Per-Pokemon saved damage calc results. Backend `@ElementCollection` storage, full CRUD through existing PATCH endpoint, collapsible UI in PokemonNoteCard. Includes controller calcs bypass fix for mapper/`@ElementCollection` interaction.
