# Worker Deployment Tooling Specification Delta

## Overview
This specification defines the deployment tooling and workflows for the Cloudflare Worker, including Wrangler CLI integration, build scripts, configuration management, and deployment procedures.

## ADDED Requirements

### Requirement: Wrangler Configuration
The project SHALL include a `wrangler.toml` configuration file defining the Worker's deployment parameters and runtime settings.

#### Scenario: Minimal Wrangler Configuration
**Given** a developer initializes the Worker deployment setup  
**When** the `wrangler.toml` file is created  
**Then** the configuration SHALL define the following mandatory fields:  
  - `name`: "hacknews-daily-export"  
  - `main`: "dist/worker/index.js" (path to bundled Worker script)  
  - `compatibility_date`: "2024-12-11" (Cloudflare Workers API version)  
**And** the configuration SHALL NOT include any secrets or API keys (use Wrangler secrets instead)  

#### Scenario: Cron Trigger Configuration
**Given** the Worker needs to run on a daily schedule  
**When** the `wrangler.toml` triggers section is defined  
**Then** the configuration SHALL include `[triggers]` section with `crons = ["0 1 * * *"]` (01:00 UTC daily)  
**And** the cron expression SHALL use standard cron syntax (5 fields)  
**And** the system SHALL validate the cron expression is valid during deployment  

#### Scenario: Environment Variables Configuration
**Given** the Worker requires configuration variables (non-secret values)  
**When** the `wrangler.toml` vars section is defined  
**Then** the configuration SHALL include `[vars]` section with key-value pairs (e.g., `HN_STORY_LIMIT = "30"`)  
**And** all values SHALL be strings (Wrangler requirement)  
**And** the configuration SHALL include comments explaining each variable's purpose  
**And** the configuration SHALL match the project's `.env.example` defaults  

#### Scenario: Multi-Environment Configuration
**Given** the project needs separate staging and production deployments  
**When** environment-specific configurations are defined  
**Then** the system SHALL use Wrangler environments syntax:  
  - `[env.staging]` for staging-specific overrides  
  - `[env.production]` for production-specific overrides  
**And** each environment SHALL have a unique `name` field (e.g., "hacknews-daily-export-staging")  
**And** environment selection SHALL be controlled via `wrangler deploy --env staging` command  

### Requirement: Build Script Integration
The project SHALL include npm scripts for building the Worker bundle using esbuild.

#### Scenario: Build Worker Bundle
**Given** the project has a `package.json` with scripts section  
**When** the developer runs `npm run build:worker`  
**Then** the system SHALL execute esbuild with the following configuration:  
  - Entry point: `src/worker/index.ts`  
  - Output: `dist/worker/index.js`  
  - Format: ES modules (`esm`)  
  - Target: `es2022`  
  - Minify: `true`  
  - Tree-shaking: `true`  
**And** the system SHALL output bundle size statistics  
**And** the system SHALL fail with error if bundle exceeds 1MB  

#### Scenario: Watch Mode for Development
**Given** a developer is actively developing the Worker code  
**When** the developer runs `npm run build:worker:watch`  
**Then** the system SHALL run esbuild in watch mode  
**And** the system SHALL rebuild the bundle on any source file change  
**And** the system SHALL display rebuild time and bundle size after each build  

#### Scenario: Clean Build Output
**Given** the developer wants to ensure a fresh build  
**When** the developer runs `npm run clean:worker`  
**Then** the system SHALL delete the `dist/worker/` directory  
**And** the system SHALL log "Worker build artifacts cleaned" message  
**And** the subsequent build SHALL create output directory if missing  

### Requirement: Wrangler CLI Workflow
The project SHALL provide npm scripts wrapping Wrangler CLI commands for common deployment tasks.

#### Scenario: Local Development with Wrangler Dev
**Given** the developer wants to test the Worker locally  
**When** the developer runs `npm run dev:worker`  
**Then** the system SHALL execute `wrangler dev --local --persist`  
**And** the system SHALL start a local Workers runtime on `http://localhost:8787`  
**And** the system SHALL hot-reload on code changes  
**And** the system SHALL persist data to `.wrangler/state/` directory  
**And** the system SHALL load secrets from `.dev.vars` file (local development only)  

#### Scenario: Deploy to Cloudflare
**Given** the Worker bundle is built and ready for deployment  
**When** the developer runs `npm run deploy:worker`  
**Then** the system SHALL execute `wrangler deploy --minify`  
**And** the system SHALL authenticate using `CLOUDFLARE_API_TOKEN` environment variable or `wrangler login`  
**And** the system SHALL upload the bundle to Cloudflare  
**And** the system SHALL output the deployed Worker URL  
**And** the system SHALL fail with clear error if authentication fails  

#### Scenario: Deploy to Specific Environment
**Given** the project has staging and production environments configured  
**When** the developer runs `npm run deploy:worker:staging`  
**Then** the system SHALL execute `wrangler deploy --env staging`  
**And** the system SHALL deploy to the staging environment configuration  
**And** the system SHALL display the staging Worker URL in the output  

#### Scenario: Tail Worker Logs
**Given** the Worker is deployed and running  
**When** the developer runs `npm run logs:worker`  
**Then** the system SHALL execute `wrangler tail`  
**And** the system SHALL stream real-time logs from the deployed Worker  
**And** the system SHALL display structured JSON logs with syntax highlighting  
**And** the system SHALL continue streaming until interrupted (Ctrl+C)  

### Requirement: Secrets Management
The project SHALL provide commands for securely managing Cloudflare Worker secrets.

#### Scenario: Set Secret via Wrangler
**Given** a developer needs to configure the `DEEPSEEK_API_KEY` secret  
**When** the developer runs `wrangler secret put DEEPSEEK_API_KEY`  
**Then** the system SHALL prompt for the secret value via stdin  
**And** the system SHALL upload the secret to Cloudflare (encrypted)  
**And** the system SHALL display "✨ Success! Secret DEEPSEEK_API_KEY uploaded"  
**And** the secret SHALL NOT be visible in dashboard or logs  

#### Scenario: List Configured Secrets
**Given** the Worker has secrets configured  
**When** the developer runs `wrangler secret list`  
**Then** the system SHALL display a list of secret names (not values)  
**And** the output SHALL include creation/update timestamps  
**And** the output SHALL indicate which environment each secret belongs to  

#### Scenario: Delete Secret
**Given** a secret needs to be removed (e.g., during key rotation)  
**When** the developer runs `wrangler secret delete GITHUB_TOKEN`  
**Then** the system SHALL prompt for confirmation  
**And** the system SHALL remove the secret from Cloudflare  
**And** the next Worker invocation SHALL fail if the secret is required  

#### Scenario: Local Secrets for Development
**Given** a developer wants to test secrets locally without uploading to Cloudflare  
**When** the developer creates a `.dev.vars` file with `DEEPSEEK_API_KEY=test_key`  
**Then** the system SHALL load secrets from `.dev.vars` during `wrangler dev`  
**And** the `.dev.vars` file SHALL be git-ignored (not committed to repository)  
**And** the system SHALL warn if `.dev.vars` contains production secrets  

### Requirement: Deployment Validation
The system SHALL validate the Worker deployment before and after publishing to prevent misconfigurations.

#### Scenario: Pre-Deployment Validation
**Given** the developer runs `npm run deploy:worker`  
**When** the deployment process starts  
**Then** the system SHALL validate the following before uploading:  
  - Bundle file exists at `dist/worker/index.js`  
  - Bundle size is ≤1MB  
  - `wrangler.toml` is valid TOML syntax  
  - `compatibility_date` is not in the future  
**And** the deployment SHALL abort with error if any validation fails  

#### Scenario: Post-Deployment Health Check
**Given** the Worker has been successfully deployed  
**When** the deployment completes  
**Then** the system SHALL send an HTTP GET request to the Worker's root path  
**And** the system SHALL verify the response status is 200 OK  
**And** the system SHALL verify the response body contains "HackerNews Daily Export Worker"  
**And** the system SHALL display "✅ Deployment verified" if health check passes  
**And** the system SHALL warn if health check fails (but not roll back deployment)  

#### Scenario: Dry-Run Deployment
**Given** a developer wants to preview deployment changes without publishing  
**When** the developer runs `npm run deploy:worker -- --dry-run`  
**Then** the system SHALL execute `wrangler deploy --dry-run`  
**And** the system SHALL display what would be uploaded (bundle size, configuration changes)  
**And** the system SHALL NOT actually publish the Worker  
**And** the system SHALL exit with code 0 if dry-run validation passes  

### Requirement: Documentation and Developer Experience
The project SHALL provide comprehensive documentation for the Worker deployment workflow.

#### Scenario: README Deployment Section
**Given** the project README.md exists  
**When** the Worker deployment documentation is added  
**Then** the README SHALL include a "Cloudflare Worker Deployment" section with:  
  - Prerequisites (Cloudflare account, Wrangler CLI installation)  
  - Step-by-step deployment guide  
  - Secrets configuration instructions  
  - Troubleshooting common issues (authentication, bundle size, rate limits)  
**And** the documentation SHALL include example commands with expected output  

#### Scenario: Quick Start Guide
**Given** a new developer clones the repository  
**When** the developer wants to deploy the Worker for the first time  
**Then** the documentation SHALL provide a quick start checklist:  
  1. Install Wrangler: `npm install -g wrangler`  
  2. Authenticate: `wrangler login`  
  3. Configure secrets: `wrangler secret put DEEPSEEK_API_KEY` and `wrangler secret put GITHUB_TOKEN`  
  4. Build bundle: `npm run build:worker`  
  5. Deploy: `npm run deploy:worker`  
**And** the checklist SHALL include links to external documentation for each step  

#### Scenario: Troubleshooting Guide
**Given** a deployment fails or the Worker encounters runtime errors  
**When** the developer consults the troubleshooting guide  
**Then** the documentation SHALL cover:  
  - "Error: No API token found" → Solution: Run `wrangler login` or set `CLOUDFLARE_API_TOKEN`  
  - "Error: Bundle exceeds 1MB" → Solution: Check dependency sizes, optimize imports  
  - "Error: CPU time limit exceeded" → Solution: Upgrade to paid plan ($5/month)  
  - "Error: GitHub authentication failed" → Solution: Verify `GITHUB_TOKEN` scope and expiration  
**And** each error SHALL link to relevant Cloudflare/GitHub documentation  

### Requirement: Continuous Integration for Worker Deployment
The project SHALL optionally support automated Worker deployment via GitHub Actions (CI/CD for the deployment itself).

#### Scenario: Optional GitHub Actions Workflow for Worker Deployment
**Given** the project includes `.github/workflows/deploy-worker.yml`  
**When** code changes are pushed to the `main` branch affecting `src/worker/**` or `wrangler.toml`  
**Then** the GitHub Actions workflow SHALL:  
  1. Checkout repository  
  2. Setup Node.js environment  
  3. Install dependencies (`npm ci`)  
  4. Build Worker bundle (`npm run build:worker`)  
  5. Deploy to Cloudflare using `cloudflare/wrangler-action@v3`  
**And** the workflow SHALL use `CLOUDFLARE_API_TOKEN` secret for authentication  
**And** the workflow SHALL fail if bundle validation or deployment fails  

#### Scenario: Manual Workflow Trigger
**Given** the GitHub Actions workflow is configured  
**When** a developer triggers the workflow manually via `workflow_dispatch`  
**Then** the workflow SHALL allow selecting target environment (staging/production)  
**And** the workflow SHALL deploy to the selected environment  
**And** the workflow SHALL post deployment status as a comment (if triggered from PR)  

#### Scenario: Deployment Rollback on Failure
**Given** the Worker deployment is automated via CI/CD  
**When** the post-deployment health check fails  
**Then** the workflow SHALL trigger a rollback to the previous Worker version  
**And** the workflow SHALL use `wrangler rollback` command  
**And** the workflow SHALL notify the team via configured channels (Slack, email, etc.)  
**And** the workflow SHALL fail with exit code 1 to prevent marking the deployment as successful  
