# Implementation Tasks

## 1. Backend Setup
- [x] 1.1 Add command-line argument parsing to `src/index.ts` to detect `--web` flag
- [x] 1.2 Install Express.js and related dependencies for web server
- [x] 1.3 Create `src/server/app.ts` with Express server setup
- [x] 1.4 Implement `/api/stories` endpoint that returns ProcessedStory array as JSON
- [x] 1.5 Add port selection logic with fallback to next available port if default is taken
- [x] 1.6 Implement graceful server shutdown on process termination
- [x] 1.7 Add CORS headers to allow local development

## 2. Frontend Setup
- [x] 2.1 Create `web/` directory for Vue.js application
- [x] 2.2 Initialize Vue 3 project with minimal configuration (no router, no complex state management)
- [x] 2.3 Install and configure Vue dependencies (vue, vite for build)
- [x] 2.4 Create basic HTML template in `web/index.html`
- [x] 2.5 Set up Vite build configuration to output to `dist/web/`

## 3. Vue Component Implementation
- [x] 3.1 Create main `App.vue` component with story list layout
- [x] 3.2 Create `StoryCard.vue` component for individual story display
- [x] 3.3 Implement data fetching from `/api/stories` endpoint using fetch API
- [x] 3.4 Add loading state indicator while fetching stories
- [x] 3.5 Implement error display for fetch failures
- [x] 3.6 Style components with clean, minimal CSS (no UI frameworks needed)

## 4. Integration
- [x] 4.1 Modify `src/index.ts` to conditionally execute web mode or CLI mode
- [x] 4.2 Implement browser auto-open functionality using `open` package
- [x] 4.3 Pass processed story data from main function to web server
- [x] 4.4 Configure web server to serve static Vue build files
- [x] 4.5 Add build script to package.json for Vue frontend

## 5. Testing and Validation
- [x] 5.1 Test `npm run fetch` (CLI mode) still works as before
- [x] 5.2 Test `npm run fetch -- --web` opens browser with story list
- [x] 5.3 Test port fallback when default port is occupied
- [x] 5.4 Test error handling (no stories found, network errors)
- [x] 5.5 Test browser auto-open on different operating systems (macOS, Linux, Windows)
- [x] 5.6 Verify all story fields display correctly (rank, titles, timestamp, URL, description, comments)

## 6. Documentation
- [x] 6.1 Update README.md with web UI usage instructions
- [x] 6.2 Add screenshots or example of web UI output
- [x] 6.3 Document new dependencies in package.json
- [x] 6.4 Update troubleshooting section for web mode issues
