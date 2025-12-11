# Implementation Tasks

## 1. Remove GitHub Actions Workflow
- [x] 1.1 Delete `.github/workflows/daily-export.yml` file
- [x] 1.2 Verify no other workflows reference this file

## 2. Remove Web UI Frontend
- [x] 2.1 Delete entire `web/` directory (Vue.js frontend, Vite config, package.json)
- [x] 2.2 Delete `src/server/` directory (Express web server)

## 3. Update src/index.ts to Remove Web Mode
- [x] 3.1 Remove `webMode` from `parseArgs()` function return type and logic
- [x] 3.2 Remove `--web` and `-w` flag parsing
- [x] 3.3 Remove `import { startWebServer, ProcessedStory as WebProcessedStory } from './server/app';`
- [x] 3.4 Remove web server startup logic in main execution
- [x] 3.5 Ensure CLI display logic remains functional

## 4. Update package.json Scripts and Dependencies
- [x] 4.1 Remove `fetch:web` script
- [x] 4.2 Remove `start:web` script
- [x] 4.3 Remove `build:web` script
- [x] 4.4 Update `build:all` script to only build TypeScript (or rename to just use `build`)
- [x] 4.5 Remove web-related dependencies: `express`, `cors`, `open`, `@types/express`, `@types/cors`
- [x] 4.6 Run `npm install` to update package-lock.json

## 5. Update README.md Documentation
- [x] 5.1 Remove "Deployment Options" section (lines 23-52 comparing GitHub Actions vs Cloudflare Workers)
- [x] 5.2 Update "Features" section to remove Web UI feature and clarify CLI + Worker deployment
- [x] 5.3 Remove "GitHub Actions Automation" section (lines 560-686 covering setup, secrets, troubleshooting)
- [x] 5.4 Remove "Web UI Mode" section (lines 100-162)
- [x] 5.5 Remove all references to `npm run fetch:web`, `npm start:web`, `--web` flag
- [x] 5.6 Update "Usage" section to focus on CLI and export-daily modes only
- [x] 5.7 Remove web mode troubleshooting sections
- [x] 5.8 Update project description at top to clarify CLI + Worker only
- [x] 5.9 Verify all remaining documentation accurately reflects CLI + Worker-only deployment

## 6. Update OpenSpec Specifications
- [x] 6.1 Delete `openspec/specs/github-actions-workflow/spec.md` file
- [x] 6.2 Delete `openspec/specs/github-actions-workflow/` directory
- [x] 6.3 Delete `openspec/specs/web-ui/spec.md` file
- [x] 6.4 Delete `openspec/specs/web-ui/` directory
- [x] 6.5 Update `cli-interface` spec delta to remove web mode requirements
- [x] 6.6 Verify no other specs reference `github-actions-workflow` or `web-ui` capabilities

## 7. Validation
- [x] 7.1 Run `openspec validate remove-github-actions-and-local-fetch --strict` and resolve any issues
- [x] 7.2 Test `npm run fetch` command works correctly (CLI mode)
- [x] 7.3 Test `npm run fetch -- --export-daily` command works correctly
- [x] 7.4 Test `npm run fetch -- --no-cache` command works correctly
- [x] 7.5 Run `npm run build` to ensure TypeScript compilation works
- [x] 7.6 Verify Worker deployment remains functional (no affected code)
- [x] 7.7 Review README.md for broken links or outdated references
- [x] 7.8 Verify package.json has no unused dependencies remaining
