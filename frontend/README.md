# VS Recorder - Pokémon VGC Analytics

A Chrome extension for competitive Pokémon VGC players to analyze their Pokémon Showdown replays and track team performance. Built with React and powered by Chrome Storage API.

## Features

- **Team Management**: Import teams from Pokepaste URLs and organize your VGC roster
- **Replay Analysis**: Import Showdown replays and track game-by-game performance
- **Performance Analytics**: Monitor win rates, usage statistics, and identify best matchups
- **Data Export/Import**: Backup and restore your analysis data
- **Professional UI**: Dark theme with responsive design optimized for extension use

## Installation

### Chrome Web Store
*Coming soon - link will be added here*

### Manual Installation (Development)
1. Download or clone this repository
2. Install dependencies: `npm install`
3. Build the extension: `npm run build`
4. Open Chrome and navigate to `chrome://extensions/`
5. Enable "Developer mode" in the top right
6. Click "Load unpacked" and select the `dist/` folder

## Development

### Prerequisites
- Node.js (v16 or higher)
- npm

### Build Commands
```bash
# Install dependencies
npm install

# Development build with watch mode
npm run start

# Production build
npm run build

# Clean build directory
npm run clean
```

### Tech Stack
- **React 18.2.0** - Frontend framework
- **Tailwind CSS 3.4.1** - Styling
- **Webpack 5.90.0** - Build system
- **Chrome Extensions API** - Storage and browser integration
- **React Router** - SPA navigation

## Usage

1. Click the VS Recorder extension icon to open the application
2. Create teams by importing Pokepaste URLs
3. Add replay data from Pokémon Showdown battles
4. Analyze your performance through various statistical views
5. Export your data for backup or sharing

## Project Structure

```
src/
├── components/          # Reusable React components
├── pages/              # Main application pages
├── services/           # Data management and API services
├── styles/             # CSS and styling
└── index.jsx          # Application entry point
```

## Contributing

This project was vibe coded for the competitive VGC community. Feel free to submit issues or pull requests to improve the extension.

## License

MIT License - see LICENSE file for details
