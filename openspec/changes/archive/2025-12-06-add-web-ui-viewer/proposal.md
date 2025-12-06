# Change: Add Web UI Viewer for HackerNews Stories

## Why

Currently, users can only view fetched HackerNews stories in the terminal through the CLI command `npm run fetch`. While this works well for quick checks, users may want a more visually organized way to browse stories with better readability and navigation. A web-based interface provides a cleaner reading experience with proper formatting, clickable links, and easier story scanning.

## What Changes

- Add a new command-line flag `--web` to enable web UI mode when running `npm run fetch --web`
- Create a minimal Vue.js web application that displays fetched stories in a clean card-based layout
- Implement a local web server that serves the Vue app and provides story data via API endpoint
- Default behavior remains CLI-only (backwards compatible) - web UI only opens when explicitly requested
- Use a simple, no-frills UI design focusing on content readability rather than decorative elements

## Impact

**Affected specs:**
- New capability: `web-ui` (web interface for viewing stories)
- New capability: `cli-interface` (command-line interface with web mode flag)

**Affected code:**
- `src/index.ts` - Add command-line argument parsing for `--web` flag
- New files: `src/server/` - Web server implementation
- New files: `web/` - Vue.js frontend application
- `package.json` - Add web server and Vue dependencies

**Breaking changes:** None - web UI is opt-in and CLI remains the default behavior
