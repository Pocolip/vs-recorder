# VS Recorder - Frontend

React 18 web application for Pokemon VGC replay analysis.

## Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast build tool and dev server
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API calls
- **Recharts** - Data visualization
- **Lucide React** - Icon library

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API running on `http://localhost:8080` (see `../backend/`)

### Installation

```bash
# Install dependencies
npm install
```

### Development

```bash
# Start dev server on http://localhost:3000
npm run dev

# Run linter
npm run lint

# Format code
npm run format
```

### Building

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── assets/          # Static assets
├── components/      # Reusable components
│   ├── common/      # Shared UI components
│   ├── layout/      # Layout components
│   ├── modals/      # Modal dialogs
│   ├── cards/       # Card components
│   ├── tabs/        # Tab content
│   └── forms/       # Form components
├── pages/           # Page components
│   ├── public/      # Unauthenticated pages
│   └── authenticated/ # Protected pages
├── services/        # API services
│   └── api/         # API client and endpoints
├── hooks/           # Custom React hooks
├── contexts/        # React Context providers
├── routes/          # Routing configuration
├── utils/           # Helper functions
├── styles/          # Global styles
└── config/          # Configuration files
```

## Environment Variables

Create `.env.development` and `.env.production` files:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_APP_NAME=VS Recorder
```

## API Integration

The frontend communicates with the Spring Boot backend via REST API:
- Authentication: JWT bearer token
- Base URL: Configured via `VITE_API_BASE_URL`
- Proxy: Vite dev server proxies `/api/*` requests to backend

## Features

- ✅ User authentication (register/login)
- ✅ Team management with Pokepaste integration
- ✅ Replay import from Pokemon Showdown
- ✅ Analytics dashboard (usage, matchups, moves)
- ✅ Game planner for tournament preparation
- ✅ Data import/export

## Development Phases

- ✅ **Phase 1**: Project Setup (Complete)
- 🔄 **Phase 2**: Core Infrastructure (Next)
- ⏳ **Phase 3**: Authentication Flow
- ⏳ **Phase 4**: Dashboard & Teams
- ⏳ **Phase 5**: Team Detail & Analytics
- ⏳ **Phase 6**: Import/Export
- ⏳ **Phase 7**: Game Planner
- ⏳ **Phase 8**: Polish & Production

## Contributing

See project root README for contribution guidelines.

## License

MIT
