# VS Recorder - Frontend Design

## Technology Stack
- **Framework**: React 18
- **Routing**: React Router
- **Styling**: Tailwind CSS
- **State Management**: React Context API / Hooks
- **HTTP Client**: Axios or Fetch API
- **Charts/Visualization**: Recharts (same as extension)

## Layout Components

### Sidebar/Navbar (Authenticated only)
- **Position**: Fixed left sidebar
- **Navigation Links** (top section):
  - Dashboard (home icon)
  - Import (upload icon)
  - Export (download icon)
  - About (info icon)
- **Social Links** (bottom section):
  - Twitter/X icon → external link
  - GitHub icon → repo link
- **Styling**: Dark theme matching extension, icons with labels

## Pages

### Public Pages (Unauthenticated)

#### Landing/Home
- **Layout**: Centered content with dark gradient background (matching extension theme)
- **Header**: VS Recorder logo/title
- **Primary CTAs**: Two large buttons stacked vertically
  - "Login" button (primary color - emerald)
  - "Register" button (secondary color - blue)
- **Features Section**: Below buttons, bullet list of key features:
  - Import and analyze Pokemon Showdown replays
  - Track team performance and win rates
  - Analyze matchups and move usage
  - Plan tournament strategies with game planner
  - Export/import your data

#### Login
- **Layout**: Centered card on dark background
- **Form Fields**:
  - Username (text input, required)
  - Password (password input, required)
- **Actions**:
  - "Login" button (primary)
  - "Forgot password?" link (triggers email input for password reset)
  - "Don't have an account? Register" link → navigates to Register page
- **Validation**: Client-side required field validation
- **Error Handling**: Display API error messages (invalid credentials, etc.)

#### Register
- **Layout**: Centered card on dark background
- **Form Fields**:
  - Username (text input, required)
  - Email (email input, required)
  - Password (password input, required)
  - Confirm Password (password input, required, must match)
- **Actions**:
  - "Register" button (primary)
  - "Already have an account? Login" link → navigates to Login page
- **Validation**: 
  - Client-side: required fields, email format, password match
  - Server-side: unique username/email
- **Error Handling**: Display API error messages (username taken, etc.)
- **Success**: Redirect to login or auto-login after registration

### Authenticated Pages

#### Dashboard/Home
- **Layout**: Main content area with sidebar
- **Header**: 
  - Page title: "My Teams"
  - View toggle: Grid/List icons to switch display mode
  - "Add Team" button (primary, top right)
- **Filter Bar**:
  - Regulation dropdown filter (All, Reg G, Reg H, etc.)
- **Teams Display**:
  - **Grid View** (default):
    - Card layout matching extension design
    - Each card shows:
      - Team name
      - Regulation badge
      - Win rate percentage
      - Number of battles
      - Pokemon team preview sprites (6 sprites in row)
    - Click card → navigate to Team Detail page
  - **List View**:
    - Table/row layout
    - Same information as grid, more compact
- **Empty State**: When no teams exist, show message with "Add Team" CTA
- **Add Team Modal**:
  - Form fields:
    - Team name (text input, required)
    - Pokepaste URL (text input, required)
    - Regulation (dropdown, required)
    - Showdown usernames (text input, comma-separated, optional)
  - Actions: "Create" and "Cancel" buttons
  - Validation: Required fields, valid Pokepaste URL

#### Import Page
- **Layout**: Main content area with sidebar
- **Header**: Page title "Import Data"
- **Import Options**:
  - **Import from JSON File**:
    - File upload input (accepts .json)
    - "Choose File" button
    - Preview section showing teams to be imported
    - "Import" button (primary)
    - Validation: Check JSON structure matches schema
  - **Import from Share Code**:
    - Text input for share code (format: vs-XXXXXX)
    - "Load" button to preview
    - Preview section showing teams from share code
    - "Import" button (primary)
    - Validation: Valid share code format and exists
- **Import Behavior**:
  - User can select which teams to import (checkboxes)
  - Option to merge or replace existing data
  - Show conflicts if team names already exist
- **Success State**: Show confirmation with number of teams/replays imported
- **URL Parameter Support**: Auto-load share code from URL query param `?code=vs-XXXXXX`

#### Export Page
- **Layout**: Main content area with sidebar
- **Header**: Page title "Export Data"
- **Team Selection**:
  - List of user's teams with checkboxes
  - "Select All" / "Deselect All" options
  - Shows team name, regulation, # of replays for each
- **Export Options**:
  - **Download JSON File**:
    - "Export to JSON" button (primary)
    - Downloads file: `vsrecorder-export-YYYY-MM-DD.json`
    - Includes selected teams with all replays and matches
  - **Generate Share Code**:
    - "Generate Share Code" button (secondary)
    - Creates shareable snapshot with code (vs-XXXXXX)
    - Display generated code with copy button
    - Show shareable URL: `vsrecorder.app/import?code=vs-XXXXXX`
    - Note: "Share codes are permanent"
- **Export Data Format**: JSON matching schema structure (teams, replays, matches)

#### Profile
- **Layout**: Main content area with sidebar
- **Sections**:
  - Account information (username, email)
  - Change password form
  - Delete account (with confirmation)
  - Data management (link to Import/Export pages)

#### About Page
- **Layout**: Main content area with sidebar
- **Header**: Page title "About VS Recorder"
- **Content Sections**:
  - **Key Features**:
    - Bullet list highlighting main functionality:
      - Import and analyze Pokemon Showdown replays
      - Track team performance with detailed statistics
      - Analyze matchups and move usage patterns
      - Plan tournament strategies with the game planner
      - Share teams via export codes
  - **Getting Started**:
    - Step-by-step guide:
      1. Create a team using a Pokepaste link
      2. Add replays from Pokemon Showdown
      3. View analytics and insights
      4. Use game planner for tournament prep
  - **Support & Links**:
    - GitHub repository link
    - Twitter/X link
    - Bug reports / Feature requests
    - Contact information
  - **Credits & Version**:
    - Project maintainer information
    - Current version number
    - Built with React, Spring Boot, PostgreSQL
    - Pokemon data from PokeAPI

#### Team Detail
- **Layout**: Main content area with sidebar
- **Header**:
  - Team name with edit icon
  - Regulation badge
  - Pokemon team sprites
  - Overall stats (win rate, battles)
  - "Add Replay" button
  - "Delete Team" button
- **Tab Navigation**:
  - Replays
  - Game by Game
  - Match by Match
  - Usage Stats
  - Matchup Stats
  - Move Usage
- **Tab Content** (to be detailed per tab)

#### Game Planner
- **Layout**: Main content area with sidebar
- **Header**:
  - Page title "Game Planner"
  - "New Game Plan" button
- **Game Plans List**:
  - Card/list view of all game plans
  - Shows name, number of opponent teams, created date
  - Click to open Game Planner Detail

#### Game Planner Detail
- **Layout**: Main content area with sidebar
- **Header**:
  - Game plan name (editable)
  - Notes section
  - "Add Opponent Team" button
- **Opponent Teams List**:
  - Each opponent team shows:
    - Pokemon sprites from pokepaste
    - Notes
    - Team compositions (lead/back configurations)
  - Edit/delete options per team
- **Team Composition Editor**:
  - Add multiple lead/back combinations
  - Notes per composition
  - Visual Pokemon selector