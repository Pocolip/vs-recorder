# VS Recorder Frontend

React web application for competitive Pokemon VGC players to analyze Showdown replays and track team performance.

## Features

- **Team Management**: Import teams from Pokepaste/Pokebin URLs and organize your VGC roster
- **Replay Analysis**: Import Showdown replays and track game-by-game performance
- **Performance Analytics**: Monitor win rates, usage statistics, and identify best matchups
- **Opponent Planning**: Plan strategies against specific opponent teams with lead/back compositions
- **Data Export/Import**: Backup and restore your analysis data
- **Cloud Sync**: Access your data from any device with your account

## Prerequisites

- Node.js (v18 or higher)
- npm
- Backend server running (see `/backend` directory)

## Development Setup

### Environment Variables

Copy the environment template and configure:

```bash
cp .env.development .env.development.local
```

Available variables:
- `REACT_APP_API_BASE_URL` - Backend API URL (default: `http://localhost:8080`)

### Installation

```bash
# Install dependencies
npm install

# Start development server (with hot reload)
npm run start

# Build for production
npm run build

# Clean build directory
npm run clean
```

The development server runs on `http://localhost:3000` and proxies API requests to the backend.

## Tech Stack

- **React 18** - Frontend framework
- **React Router 6** - Client-side routing
- **Tailwind CSS 3** - Utility-first styling
- **Webpack 5** - Build system and dev server
- **Axios** - HTTP client for API requests

## Project Structure

```
frontend/
├── public/
│   ├── sprites/          # Local Pokemon sprite icons
│   └── index.html        # HTML template
├── src/
│   ├── components/       # Reusable React components
│   │   ├── cards/        # Card components
│   │   ├── modals/       # Modal dialogs
│   │   └── tabs/         # Tab content components
│   ├── contexts/         # React context providers (Auth)
│   ├── hooks/            # Custom React hooks
│   ├── pages/            # Page components
│   ├── services/         # API and data services
│   │   └── api/          # Backend API clients
│   ├── styles/           # CSS and Tailwind config
│   ├── utils/            # Utility functions
│   └── index.jsx         # Application entry point
├── .env.development      # Development environment config
├── .env.production       # Production environment config
├── webpack.config.js     # Webpack configuration
└── tailwind.config.js    # Tailwind CSS configuration
```

## Usage

1. Register an account or log in
2. Create teams by importing Pokepaste/Pokebin URLs
3. Add replay URLs from Pokemon Showdown battles
4. Analyze your performance through various statistical views
5. Use the Opponent Planner to prepare strategies for tournaments
6. Export your data for backup

## API Integration

The frontend communicates with the Spring Boot backend via REST API. Key endpoints:

- `/api/auth/*` - Authentication (login, register)
- `/api/teams/*` - Team management
- `/api/replays/*` - Replay management
- `/api/matches/*` - Match grouping (Bo3)
- `/api/game-plans/*` - Opponent planning

See the backend README for full API documentation.

## Contributing

Feel free to submit issues or pull requests to improve the application.

## License

MIT License
