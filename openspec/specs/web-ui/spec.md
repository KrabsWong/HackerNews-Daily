# Web UI Capability Specification

## Purpose
Specification for Web UI Capability functionality.

## Requirements

### Requirement: Web Mode Flag
The CLI MUST accept a `--web` flag that switches from terminal output to web browser display mode.

#### Scenario: Web mode enabled
- **WHEN** user runs `npm run fetch -- --web`
- **THEN** the application fetches stories and opens them in a web browser instead of displaying in terminal

#### Scenario: Default CLI mode
- **WHEN** user runs `npm run fetch` without the `--web` flag
- **THEN** the application displays stories in the terminal as usual (backwards compatible)

### Requirement: Local Web Server
The system MUST start a local HTTP server when web mode is activated.

#### Scenario: Server startup
- **WHEN** web mode is enabled
- **THEN** a local web server starts on an available port (default: 3000, with fallback to next available port)

#### Scenario: Server shutdown
- **WHEN** user closes the browser or terminates the process
- **THEN** the web server gracefully shuts down and releases the port

### Requirement: Story Data API
The web server MUST provide an API endpoint that serves the fetched story data in JSON format.

#### Scenario: Fetch story data
- **WHEN** the web UI requests story data via GET /api/stories
- **THEN** the server returns all processed stories with Chinese titles, descriptions, and comment summaries in JSON format

#### Scenario: Empty story set
- **WHEN** no stories are available (due to filtering or errors)
- **THEN** the API returns an empty array with HTTP 200 status

### Requirement: Vue.js Web Interface
The system MUST provide a Vue.js single-page application for displaying stories.

#### Scenario: Display story list
- **WHEN** the web page loads
- **THEN** it displays all stories in a vertical card layout with rank, Chinese title, English title, timestamp, URL, description, and comment summary

#### Scenario: Clickable links
- **WHEN** user clicks on a story URL
- **THEN** the original article opens in a new browser tab

#### Scenario: Clean minimal design
- **WHEN** the UI renders
- **THEN** it uses a simple, readable layout without decorative animations or complex interactions

#### Scenario: Header and footer content
- **WHEN** the UI renders
- **THEN** the header displays "HackerNews Daily" as the title with subtitle "The first step in solving any problem is recognizing there is one"
- **AND** the footer displays "Powered by Claude Code with OpenSpec"

### Requirement: Browser Auto-Open
The system MUST automatically open the web UI in the default browser when web mode is activated.

#### Scenario: Browser launch
- **WHEN** web server is ready and listening
- **THEN** the system opens the default browser to http://localhost:{port}

#### Scenario: Browser already open
- **WHEN** browser is already running
- **THEN** the system opens a new tab with the web UI

### Requirement: Error Handling
The system MUST handle errors gracefully in web mode.

#### Scenario: Port already in use
- **WHEN** the default port is occupied
- **THEN** the server tries the next available port and updates the browser URL accordingly

#### Scenario: Fetch failures
- **WHEN** story fetching fails in web mode
- **THEN** the web UI displays an error message explaining the issue

#### Scenario: Server startup failure
- **WHEN** the web server cannot start
- **THEN** the application falls back to CLI mode and displays a warning message
