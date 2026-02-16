# VS Recorder

Replay analysis, team performance tracker, and tournament prep tool for competitive Pokemon VGC players.

**Live at [vsrecorder.app](https://vsrecorder.app)**

## Overview

VS Recorder helps Pokemon VGC (Video Game Championships) players improve through data. Import your team from Pokepaste, add Showdown replay URLs, and the app parses battle logs to surface win rates, usage stats, matchup spreads, lead patterns, and move frequency. Use the built-in damage calculator to theory-craft, save calcs to per-Pokemon notes, and build game plans against specific opponents before tournaments.

## Features

- **Team Management** - Import teams from Pokepaste/Pokebin URLs with full set details and sprites
- **Replay Analysis** - Paste a Showdown replay URL and the backend parses the battle log automatically (teams, picks, leads, tera usage, moves, winner)
- **Performance Analytics** - Win rates, Pokemon usage stats, lead pair analysis, matchup breakdown, tera frequency, and move usage charts
- **Match Grouping** - Organize replays into Bo3 (Best of 3) sets for tournament-accurate records
- **Damage Calculator** - Native calc powered by `@smogon/calc` with NCP VGC tournament sets, team sidebar loading, and the ability to save results to Pokemon notes
- **Pokemon Notes** - Per-team-member notes with saved damage calcs for quick reference during play
- **Opponent Planner** - Prepare lead/back compositions and notes for specific opponent teams before a tournament
- **Search & Filter** - Tag-based team search and Pokemon name filtering on the home page
- **Data Portability** - Full export/import and cloud sync across devices
- **Auth** - JWT-based accounts with password reset via email

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, React Router 6, Tailwind CSS 3, Webpack 5, Axios |
| **Backend** | Spring Boot 3, Spring Security, Spring Data JPA, MapStruct, Lombok |
| **Database** | H2 (dev) / PostgreSQL 15 (prod) |
| **Calc Engine** | @smogon/calc with NCP setdex |
| **Infrastructure** | Docker, nginx, AWS (EC2 + RDS), Cloudflare |
| **CI/CD** | GitHub Actions (CI on all branches, auto-deploy to beta and prod) |

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

## Project Structure

```
vs-recorder/
├── backend/                # Spring Boot REST API
│   ├── src/main/java/      # Controllers, services, entities, DTOs, security
│   ├── src/test/           # Unit and integration tests
│   └── Dockerfile
├── frontend/               # React SPA
│   ├── src/
│   │   ├── pages/          # HomePage, TeamPage, LoginPage, ExportPage, etc.
│   │   ├── components/     # calc/, cards/, modals/, tabs/
│   │   ├── contexts/       # AuthContext
│   │   ├── hooks/          # useTeamStats, useTeamMembers, useDamageCalc, etc.
│   │   ├── services/api/   # Axios API clients
│   │   └── data/           # NCP setdex
│   ├── public/sprites/     # Local Pokemon sprite icons
│   └── Dockerfile
├── docker-compose.yml      # Local dev (backend + frontend + PostgreSQL)
├── docker-compose.prod.yml # Production (prod + beta side-by-side with nginx)
└── .github/workflows/      # CI, deploy-prod, deploy-beta
```

## Deployment

The app runs on a single EC2 instance behind Cloudflare, with production and beta environments side-by-side:

| Environment | Frontend | API |
|-------------|----------|-----|
| **Production** | [vsrecorder.app](https://vsrecorder.app) | [api.vsrecorder.app](https://api.vsrecorder.app) |
| **Beta** | [beta.vsrecorder.app](https://beta.vsrecorder.app) | [beta-api.vsrecorder.app](https://beta-api.vsrecorder.app) |

GitHub Actions handles CI and deployment:
- **All branches** - build and test (backend + frontend + Docker)
- **Feature/fix branches** - auto-deploy to beta
- **develop** - versioned beta deploy with automatic version bump
- **main** - deploy to production with GitHub release

## Documentation

- [Backend README](backend/README.md) - API setup, configuration, endpoints, testing
- [Frontend README](frontend/README.md) - Development setup, project structure, damage calculator details
- [API Documentation](http://localhost:8080/swagger-ui.html) - Swagger UI (when backend is running)
- [Database Schema](backend/DATABASE.md) - Entity relationships and migration guide

## License

MIT
