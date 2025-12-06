# cli-interface Specification

## Purpose
TBD - created by archiving change add-hn-daily-cli. Update Purpose after archive.
## Requirements
### Requirement: CLI Invocation via NPM Script
The system SHALL be invocable via npm script command.

#### Scenario: Run CLI with npm command
**Given** the project is properly installed  
**When** the user runs `npm run fetch`  
**Then** the system executes the CLI tool  
**And** displays HackerNews stories with translations

#### Scenario: First-time setup
**Given** the project is freshly cloned  
**When** the user runs `npm install`  
**Then** all dependencies are installed  
**And** TypeScript types are resolved

### Requirement: Display Results in Console Table
The system SHALL format output as a readable console table.

#### Scenario: Display stories in table format
**Given** stories have been fetched and translated  
**When** rendering output  
**Then** the system displays a table with columns: Rank, Title (Chinese), Title (Original), Score, URL  
**And** the table is properly aligned and formatted

#### Scenario: Handle long titles
**Given** a title exceeds terminal width  
**When** rendering the table  
**Then** the system wraps or truncates long titles  
**And** maintains table readability

### Requirement: Progress Indication
The system SHALL show progress during execution.

#### Scenario: Display loading indicators
**Given** fetching and translation are in progress  
**When** executing the CLI  
**Then** the system displays progress messages like "Fetching stories...", "Translating titles..."  
**And** shows completion status

### Requirement: Error Display
The system SHALL display user-friendly error messages.

#### Scenario: API error occurs
**Given** an API call fails  
**When** the error is caught  
**Then** the system displays a clear error message  
**And** provides troubleshooting hints if applicable  
**And** exits with appropriate status code

#### Scenario: Network connectivity issues
**Given** the user has no internet connection  
**When** attempting to fetch data  
**Then** the system displays "Network error: Please check your internet connection"  
**And** exits gracefully

### Requirement: Configuration Validation
The system SHALL validate configuration on startup.

#### Scenario: Missing required environment variables
**Given** `DEEPSEEK_API_KEY` is not configured  
**When** the CLI starts  
**Then** the system displays setup instructions  
**And** exits before making API calls

#### Scenario: Load environment variables from .env
**Given** a `.env` file exists in the project root  
**When** the CLI starts  
**Then** the system loads environment variables from `.env`  
**And** uses those values for API configuration

