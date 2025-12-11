# cli-interface Specification Delta

## Overview
Remove all web mode functionality from the CLI interface. The CLI should only support:
- Standard fetch mode for viewing stories
- Export daily mode for generating markdown files  
- No web server or browser integration

## REMOVED Requirements

### Requirement: Web UI Invocation via Shortcut Script
The `npm run fetch:web` shortcut script is removed.

**Reason**: Web UI functionality completely removed from project  
**Migration**: Use `npm run fetch` for CLI output only

#### Scenario: Run CLI with web UI (REMOVED)
**Given** the project is properly installed  
**When** the user attempts to start web mode  
**Then** the feature is no longer available  
**And** user should use CLI mode instead: `npm run fetch`

### Requirement: Web Mode Flag Parsing
The `--web` and `-w` command-line flags are removed.

**Reason**: Web server functionality removed from CLI tool  
**Migration**: Use `npm run fetch` for standard CLI output

#### Scenario: Parse --web flag (REMOVED)
**Given** user runs `npm run fetch -- --web`  
**When** command-line arguments are parsed  
**Then** the flag is no longer recognized  
**And** only `--no-cache`, `--refresh`, and `--export-daily` flags remain supported

### Requirement: Web Server Integration  
The CLI no longer integrates with Express web server.

**Reason**: src/server/ directory and web server code removed  
**Migration**: N/A - feature removed

#### Scenario: Start web server on web mode (REMOVED)
**Given** web mode was previously requested  
**When** CLI executes  
**Then** no web server starts  
**And** only CLI output is displayed

## Notes
- The CLI now supports only two modes: standard fetch and export-daily
- `--no-cache` / `--refresh` flags remain functional
- `--export-daily` flag remains functional  
- All web-related code paths removed from src/index.ts
