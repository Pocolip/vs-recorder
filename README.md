# VS Recorder

Replay analysis and team performance tracker for competitive Pokemon VGC players.

## Overview

VS Recorder helps Pokemon VGC (Video Game Championships) players analyze their Showdown replays, track team performance statistics, and plan strategies for tournament opponents. Import teams from Pokepaste, add battle replays, and gain insights through matchup analysis, usage stats, and win rate tracking.

## Architecture

| Component | Stack | Details |
|-----------|-------|---------|
| **Backend** | Spring Boot, H2/PostgreSQL | REST API with JWT auth, replay parsing, analytics |
| **Frontend** | React 18, Tailwind CSS, Webpack 5 | SPA with team management, analytics views, game planner |

See [backend/README.md](backend/README.md) and [frontend/README.md](frontend/README.md) for component-specific documentation.

## Quick Start

### Prerequisites

- Java 17+, Maven 3.6+
- Node.js 18+, npm

### Run Locally

```bash
# Backend (port 8080)
cd backend && mvn spring-boot:run

# Frontend (port 3000, proxies to backend)
cd frontend && npm install && npm start
```

### Run with Docker

```bash
# Full stack (backend + frontend + PostgreSQL)
docker-compose up
```

## Features

- **Team Management** - Import teams from Pokepaste/Pokebin URLs
- **Replay Analysis** - Parse and store Pokemon Showdown battle logs
- **Performance Analytics** - Win rates, usage statistics, matchup analysis, lead stats
- **Match Grouping** - Organize replays into Bo3 (Best of 3) sets
- **Opponent Planning** - Prepare strategies with lead/back compositions for tournament opponents
- **Data Export/Import** - Full data portability and cloud sync across devices

## Documentation

- [Backend README](backend/README.md) - API setup, configuration, endpoints, testing
- [Frontend README](frontend/README.md) - Development setup, project structure, Docker
- [API Documentation](http://localhost:8080/swagger-ui.html) - Swagger UI (when backend is running)
- [Database Schema](backend/DATABASE.md) - Entity relationships and migration guide
