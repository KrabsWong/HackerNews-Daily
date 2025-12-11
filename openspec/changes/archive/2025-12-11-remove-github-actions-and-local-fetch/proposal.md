# Change: Remove GitHub Actions and All Web UI Functionality

## Why
The project has successfully transitioned to Cloudflare Workers for deployment, with the Worker runtime now fully operational and tested. The project scope should focus exclusively on:
- **CLI tool** for local data fetching and display
- **Daily export** functionality (markdown generation)
- **Cloudflare Workers** for automated deployment

All Web UI functionality (Vue.js frontend, Express server, web mode) is redundant and adds unnecessary complexity. GitHub Actions workflow is also redundant as Cloudflare Workers provides a superior deployment solution with:
- Faster execution (<50ms cold start vs 10-30s for GitHub Actions)
- More generous free tier (100,000 requests/day vs 2,000 minutes/month)
- Global edge distribution
- Built-in cron triggers

This change simplifies the codebase by removing deprecated automation infrastructure and unused web infrastructure, clarifies the README to focus on CLI + Cloudflare Workers deployment, and eliminates maintenance overhead.

## What Changes
- **BREAKING**: Remove `.github/workflows/daily-export.yml` GitHub Actions workflow file
- **BREAKING**: Remove entire `web/` directory (Vue.js frontend with Vite, package.json, etc.)
- **BREAKING**: Remove `src/server/` directory (Express web server)
- **BREAKING**: Remove all Web UI related npm scripts from `package.json`:
  - `fetch:web` - redundant shortcut
  - `start:web` - web server start script  
  - `build:web` - Vue.js build script
  - `build:all` - includes web build
- **BREAKING**: Remove `--web` command-line flag support from `src/index.ts`
- **BREAKING**: Remove web-related dependencies from root `package.json` (express, cors, open, @types/express, @types/cors)
- Update `README.md` to:
  - Remove "Deployment Options" comparison table (GitHub Actions vs Cloudflare Workers)
  - Remove "GitHub Actions Automation" section (setup, secrets, troubleshooting)
  - Remove "Web UI Mode" section and all `--web` flag documentation
  - Remove web UI from Features list
  - Update project description to clarify CLI + Worker deployment only
  - Simplify deployment documentation to focus exclusively on Cloudflare Workers
- Remove `github-actions-workflow` specification from `openspec/specs/` (no longer applicable)
- Remove `web-ui` specification from `openspec/specs/` (no longer applicable)
- Update `worker-deployment-tooling` specification to clarify Workers as the sole deployment method
- Update `cli-interface` specification to remove web mode requirements

## Impact
- **Affected specs**: 
  - `github-actions-workflow` (REMOVED entirely)
  - `web-ui` (REMOVED entirely)
  - `cli-interface` (MODIFIED - remove web mode and `fetch:web` script)
  - `worker-deployment-tooling` (MODIFIED - update to clarify as primary deployment method)
- **Affected code**: 
  - `.github/workflows/daily-export.yml` (deleted)
  - `web/` directory (deleted entirely - ~50KB)
  - `src/server/` directory (deleted entirely)
  - `src/index.ts` (remove `--web` flag parsing and web server integration)
  - `package.json` (remove web-related scripts and dependencies)
  - `README.md` (major documentation overhaul)
- **Affected users**:
  - Developers currently using GitHub Actions for automated exports must migrate to Cloudflare Workers
  - Users relying on Web UI (`npm run fetch:web` or `--web` flag) must use CLI mode only
  - No migration path for Web UI users - feature is completely removed
- **Migration path**:
  - Existing GitHub Actions workflows will stop running after this change
  - Web UI users should use CLI output: `npm run fetch` or `npm run fetch -- --export-daily`
  - Users should follow the Cloudflare Workers deployment guide at `docs/cloudflare-worker-deployment.md` for automation
  - CLI functionality (fetch, export-daily) remains fully functional
