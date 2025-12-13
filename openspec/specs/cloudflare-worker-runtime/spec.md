# cloudflare-worker-runtime Specification

## Purpose
Defines the Cloudflare Workers runtime implementation for executing daily HackerNews export automation, including worker entry point, scheduled triggers, environment configuration, and execution context management.
## Requirements
### Requirement: Worker Entry Point
The system SHALL implement a Cloudflare Worker entry point that handles both scheduled (cron) and HTTP-triggered export requests.

#### Scenario: Scheduled Daily Export
**Given** the Worker is deployed with a cron trigger configured for "0 1 * * *" (01:00 UTC daily)  
**When** the Cloudflare platform invokes the scheduled event handler  
**Then** the Worker SHALL execute the daily export pipeline  
**And** the Worker SHALL use `ctx.waitUntil()` to allow long-running exports beyond the initial response timeout  

#### Scenario: Manual HTTP Trigger
**Given** the Worker is deployed and accessible via HTTPS  
**When** an authenticated HTTP POST request is sent to `/trigger-export` endpoint  
**Then** the Worker SHALL initiate the export pipeline asynchronously  
**And** the Worker SHALL return HTTP 202 Accepted immediately  
**And** the Worker SHALL log the trigger source as "manual"  

#### Scenario: Health Check Endpoint
**Given** the Worker is deployed  
**When** an HTTP GET request is sent to the root path `/`  
**Then** the Worker SHALL return HTTP 200 OK with response body "HackerNews Daily Export Worker"  
**And** the response SHALL include a `X-Worker-Version` header with the deployment version

### Requirement: Environment Configuration

The system SHALL load configuration from Cloudflare environment variables and secrets accessible via the `env` parameter, with strict validation of required variables.

#### Scenario: Load Required Secrets

**Given** the Worker is invoked with environment context  
**When** the export handler initializes  
**Then** the system SHALL validate all required environment variables are present  
**And** the system SHALL load `LLM_PROVIDER` from environment (REQUIRED, no default)  
**And** the system SHALL load `DEEPSEEK_API_KEY` from Cloudflare secrets if `LLM_PROVIDER=deepseek`  
**And** the system SHALL load `OPENROUTER_API_KEY` from Cloudflare secrets if `LLM_PROVIDER=openrouter`  
**And** the system SHALL load `GITHUB_TOKEN` from Cloudflare secrets (REQUIRED)  
**And** the system SHALL load `TARGET_REPO` from environment (REQUIRED, no default)  
**And** the system SHALL throw a clear error listing all missing variables if validation fails

#### Scenario: Load Optional Configuration

**Given** the Worker is invoked with environment context  
**When** the export handler initializes  
**Then** the system SHALL load configuration variables (HN_STORY_LIMIT, SUMMARY_MAX_LENGTH, etc.) from `env.vars`  
**And** the system SHALL apply default values for any missing optional variables  
**And** the system SHALL validate numeric values are within acceptable ranges

#### Scenario: Configuration Override via Query Parameter

**Given** the Worker receives an HTTP trigger request  
**When** the request URL includes query parameters (e.g., `?story_limit=20`)  
**Then** the system SHALL override environment configuration with query parameter values  
**And** the system SHALL validate overridden values before applying  
**And** the system SHALL log the configuration overrides

### Requirement: Export Pipeline Orchestration

The Worker SHALL orchestrate the daily export pipeline using source and publisher abstractions for extensibility.

#### Scenario: Execute Complete Export Pipeline with Abstractions

**Given** the Worker is triggered (scheduled or manual)  
**When** the export handler executes  
**Then** the system SHALL validate configuration using `validateWorkerConfig(env)`  
**And** the system SHALL initialize the HackerNews content source from `src/worker/sources/hackernews.ts`  
**And** the system SHALL initialize the GitHub publisher from `src/worker/publishers/github/`  
**And** the system SHALL call `source.fetchContent()` to retrieve Markdown content  
**And** the system SHALL call `publisher.publish()` to push content to the target repository  
**And** the system SHALL log the export result (success/failure) with structured data

#### Scenario: Graceful Degradation on Partial Failures

**Given** the Worker is processing multiple stories  
**When** one or more stories fail during content extraction or AI processing  
**Then** the system SHALL continue processing remaining stories  
**And** the system SHALL log each failure with story ID and error details  
**And** the system SHALL include successfully processed stories in the final export  
**And** the system SHALL NOT fail the entire export due to individual story failures

#### Scenario: Timeout Handling

**Given** the Worker is processing the export pipeline  
**When** the total execution time exceeds Cloudflare CPU time limits (10ms free tier)  
**Then** the system SHALL abort the export and log a timeout error  
**And** the system SHALL return an error response indicating the timeout cause  
**And** the system SHALL recommend upgrading to paid tier in the error message

### Requirement: Logging and Observability
The Worker SHALL provide structured logging for monitoring and debugging via Cloudflare's logging infrastructure.

#### Scenario: Structured Log Output
**Given** the Worker is executing any operation  
**When** a loggable event occurs (start, progress, error, completion)  
**Then** the system SHALL emit a structured JSON log entry to `console.log`  
**And** each log entry SHALL include: `timestamp`, `level` (info/warn/error), `message`, `context` (story IDs, API latency, etc.)  
**And** the logs SHALL be captured by Cloudflare's logging system  

#### Scenario: Export Metrics Logging
**Given** the Worker completes an export (success or failure)  
**When** the export handler finishes  
**Then** the system SHALL log a summary metric including:  
  - Total stories fetched  
  - Stories successfully processed  
  - Stories failed (with failure reasons)  
  - Total execution duration (ms)  
  - API call counts and latencies (HN, DeepSeek, GitHub)  

#### Scenario: Error Logging with Stack Traces
**Given** an error occurs during export execution  
**When** the error handler is invoked  
**Then** the system SHALL log the error with full stack trace  
**And** the system SHALL include relevant context (story ID, API endpoint, request payload size)  
**And** the system SHALL categorize errors (network, API rate limit, validation, timeout, unknown)

### Requirement: Bundle Optimization
The Worker deployment bundle SHALL be optimized to minimize size and cold start latency.

#### Scenario: Bundle Size Limit Compliance
**Given** the Worker source code is built using esbuild  
**When** the bundling process completes  
**Then** the output bundle size SHALL be ≤1MB (Cloudflare compressed limit)  
**And** the system SHALL tree-shake unused dependencies  
**And** the system SHALL minify the output code  
**And** the build SHALL fail with a clear error if bundle exceeds size limit  

#### Scenario: Dependency Replacement for Workers Compatibility
**Given** the existing codebase uses Node.js-specific modules (axios, jsdom, fs)  
**When** the Worker bundle is created  
**Then** the system SHALL replace `axios` with native `fetch` API  
**And** the system SHALL replace `jsdom` with lightweight `linkedom` or inline Readability logic  
**And** the system SHALL remove `fs` module dependencies (cache service disabled)  
**And** the system SHALL polyfill or remove Node.js-specific globals (process, Buffer)  

#### Scenario: Build Reproducibility
**Given** a developer builds the Worker bundle locally  
**When** the build command (`npm run build:worker`) is executed  
**Then** the system SHALL produce identical bundle output across different environments  
**And** the system SHALL pin all dependency versions in `package-lock.json`  
**And** the system SHALL include bundle hash in the output filename for cache busting

### Requirement: Worker Directory Structure

The Worker SHALL organize code into logical modules for sources, publishers, and configuration.

#### Scenario: Worker directory layout

**Given** the worker codebase  
**When** examining the file structure  
**THEN** the system SHALL have the following structure:  
- `src/worker/index.ts` - Main entry point  
- `src/worker/config/` - Configuration validation and types  
- `src/worker/sources/` - Content source implementations  
- `src/worker/publishers/` - Publishing channel implementations  
- `src/worker/logger.ts` - Logging utilities  
- `src/worker/stubs/` - Cloudflare Workers polyfills

#### Scenario: Source module imports

**Given** the worker entry point  
**When** importing source modules  
**THEN** the system SHALL import from `src/worker/sources/hackernews`  
**And** the import path SHALL NOT reference the old `exportHandler.ts` location

#### Scenario: Publisher module imports

**Given** the worker entry point  
**When** importing publisher modules  
**THEN** the system SHALL import from `src/worker/publishers/github`  
**And** the import path SHALL NOT reference the old `githubPush.ts` or `githubClient.ts` locations

### Requirement: Configuration Validation on Startup

The Worker SHALL validate all required configuration before executing any export operations.

#### Scenario: Validation on scheduled trigger

**Given** a scheduled cron event triggers the worker  
**When** the worker receives the cron event  
**Then** the worker SHALL call `validateWorkerConfig(env)` before proceeding  
**And** if validation fails, the worker SHALL log the error and exit  
**And** if validation passes, the worker SHALL proceed with export

#### Scenario: Validation on HTTP trigger

**Given** an HTTP POST request to `/trigger-export-sync` endpoint  
**When** the worker receives the request  
**Then** the worker SHALL call `validateWorkerConfig(env)` before proceeding  
**And** if validation fails, the worker SHALL return HTTP 500 with error details  
**And** if validation passes, the worker SHALL proceed with export

