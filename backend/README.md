# VS Recorder Backend

Spring Boot REST API for the VS Recorder application - a Pokemon VGC replay analysis platform.

## Features

- **User Authentication**: JWT-based registration and login
- **Team Management**: Import teams from Pokepaste/Pokebin URLs
- **Replay Analysis**: Parse and store Pokemon Showdown battle logs
- **Match Grouping**: Organize replays into Bo3 (Best of 3) sets
- **Analytics**: Win rates, usage statistics, matchup analysis
- **Game Planning**: Tournament preparation with opponent team notes
- **Data Export/Import**: Full data portability

## Prerequisites

- Java 17 or higher
- Maven 3.6+
- Docker (for containerized deployment)

## Quick Start (Local Development)

### Using H2 Database (Default)

```bash
# Install dependencies and run
mvn spring-boot:run
```

The server starts on `http://localhost:8080` with an embedded H2 database.

**Access Points:**
- API: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- H2 Console: `http://localhost:8080/h2-console`
  - JDBC URL: `jdbc:h2:file:./data/vsrecorder`
  - Username: `sa`
  - Password: (blank)

### Using PostgreSQL (Production-like)

```bash
# Start PostgreSQL with Docker
docker run -d \
  --name vsrecorder-postgres \
  -e POSTGRES_USER=vsrecorder_user \
  -e POSTGRES_PASSWORD=localdevpassword \
  -e POSTGRES_DB=vsrecorder_dev \
  -p 5432:5432 \
  postgres:15-alpine

# Run with production profile
mvn spring-boot:run -Dspring-boot.run.profiles=prod \
  -Dspring-boot.run.arguments="--DATABASE_URL=jdbc:postgresql://localhost:5432/vsrecorder_dev --DB_USERNAME=vsrecorder_user --DB_PASSWORD=localdevpassword --JWT_SECRET=dev-secret-min-256-bits-long-string-here"
```

## Build Commands

```bash
# Compile and run tests
mvn clean verify

# Build JAR (skip tests)
mvn clean package -DskipTests

# Run specific test class
mvn test -Dtest=ReplayServiceTest

# Run specific test method
mvn test -Dtest=ReplayServiceTest#testParseReplay
```

## Docker

### Build Image

```bash
docker build -t vsrecorder-backend .
```

### Run Container

```bash
docker run -d \
  --name vsrecorder-backend \
  -p 8080:8080 \
  -e SPRING_PROFILES_ACTIVE=prod \
  -e DATABASE_URL=jdbc:postgresql://host.docker.internal:5432/vsrecorder \
  -e DB_USERNAME=vsrecorder_user \
  -e DB_PASSWORD=yourpassword \
  -e JWT_SECRET=your-256-bit-secret \
  vsrecorder-backend
```

### Using Docker Compose (Recommended)

From the project root:
```bash
# Development (includes PostgreSQL)
docker-compose up backend

# Full stack
docker-compose up
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SPRING_PROFILES_ACTIVE` | Active profile (`prod` for PostgreSQL) | (none, uses H2) |
| `DATABASE_URL` | JDBC connection URL | `jdbc:h2:file:./data/vsrecorder` |
| `DB_USERNAME` | Database username | `sa` |
| `DB_PASSWORD` | Database password | (blank) |
| `JWT_SECRET` | JWT signing key (min 256 bits) | dev default (change in prod!) |
| `JWT_EXPIRATION` | Token expiry in milliseconds | `86400000` (24 hours) |
| `PORT` | Server port | `8080` |

### Profiles

- **default**: H2 file-based database, development settings
- **prod**: PostgreSQL, production-ready settings, requires env vars

## Project Structure

```
backend/
├── src/main/java/com/yeskatronics/vs_recorder_backend/
│   ├── config/          # Security, CORS, OpenAPI configuration
│   ├── controllers/     # REST API endpoints
│   ├── dto/             # Data Transfer Objects
│   ├── entities/        # JPA entities (User, Team, Replay, etc.)
│   ├── mappers/         # MapStruct interfaces
│   ├── repositories/    # Spring Data JPA repositories
│   ├── security/        # JWT authentication
│   ├── services/        # Business logic
│   └── utils/           # Utility classes
├── src/main/resources/
│   ├── application.properties      # Default (H2) config
│   └── application-prod.properties # Production (PostgreSQL) config
├── src/test/
│   ├── java/            # Unit and integration tests
│   └── resources/       # Test data (sample replays, pastes)
├── Dockerfile           # Multi-stage Docker build
├── .dockerignore        # Files excluded from Docker build
└── pom.xml              # Maven configuration
```

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login, returns JWT |

### Teams
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/teams` | List user's teams |
| POST | `/teams` | Create team (from Pokepaste URL) |
| GET | `/teams/{id}` | Get team details |
| PUT | `/teams/{id}` | Update team |
| DELETE | `/teams/{id}` | Delete team |

### Replays
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/teams/{teamId}/replays` | List replays for team |
| POST | `/teams/{teamId}/replays` | Add replay (from Showdown URL) |
| DELETE | `/replays/{id}` | Delete replay |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/teams/{id}/stats/usage` | Pokemon usage stats |
| GET | `/teams/{id}/stats/matchups` | Matchup win rates |
| GET | `/teams/{id}/stats/leads` | Lead combination stats |

### Game Plans
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/game-plans` | List game plans |
| POST | `/game-plans` | Create game plan |
| GET | `/game-plans/{id}` | Get plan with opponent teams |
| POST | `/game-plans/{id}/teams` | Add opponent team to plan |

See Swagger UI (`/swagger-ui.html`) for complete API documentation.

## Testing

```bash
# Run all tests
mvn test

# Run with coverage report
mvn test jacoco:report
# Report at: target/site/jacoco/index.html

# Integration tests only
mvn test -Dtest=*IntegrationTest
```

Test resources are in `src/test/resources/`:
- `replays/` - Sample Showdown replay files
- `pastes/` - Sample Pokepaste data

## Database Schema

The application uses Hibernate for ORM. Schema is auto-generated based on JPA entities.

**Key Entities:**
- `User` - Account information
- `Team` - Pokemon team (6 Pokemon with sets)
- `Replay` - Battle log and metadata
- `Match` - Groups replays into Bo3 sets
- `GamePlan` - Tournament preparation
- `GamePlanTeam` - Opponent teams within a plan

**Initial Schema Creation:**
For first deployment, temporarily set `spring.jpa.hibernate.ddl-auto=update` in `application-prod.properties` to create tables, then change back to `validate`.

## Health Check

The actuator health endpoint is available at:
```
GET /actuator/health
```

Response:
```json
{
  "status": "UP"
}
```

## Troubleshooting

**"Table not found" errors in production:**
- First deployment needs `ddl-auto=update` to create schema
- Or run Hibernate schema export and apply manually

**JWT token issues:**
- Ensure `JWT_SECRET` is at least 256 bits (32+ characters)
- Check token expiration (`JWT_EXPIRATION`)

**Database connection refused:**
- Verify PostgreSQL is running and accessible
- Check `DATABASE_URL` format: `jdbc:postgresql://host:5432/dbname`
- Verify credentials

**Docker build fails:**
- Ensure you're in the `backend/` directory
- Check Maven can download dependencies: `mvn dependency:resolve`
