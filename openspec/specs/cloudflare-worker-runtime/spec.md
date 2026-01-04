# cloudflare-worker-runtime Specification

## Purpose
Defines the Cloudflare Workers runtime implementation for executing daily HackerNews export automation, including worker entry point, scheduled triggers, environment configuration, and execution context management.
## Requirements
### Requirement: Worker Entry Point
The system SHALL implement a Cloudflare Worker entry point that handles both scheduled (cron) and HTTP-triggered export requests, supporting incremental task processing via D1 persistence.

#### Scenario: High-frequency Scheduled Triggers
**Given** the Worker is deployed with a cron trigger configured for "*/10 * * * *" (every 10 minutes)  
**When** the Cloudflare platform invokes the scheduled event handler  
**Then** the Worker SHALL check the current daily task status from D1  
**And** the Worker SHALL execute corresponding actions based on task state (init/processing/aggregating/published)  
**And** the Worker SHALL use `ctx.waitUntil()` to allow long-running operations beyond the initial response timeout  

#### Scenario: Manual HTTP Trigger
**Given** the Worker is deployed and accessible via HTTPS  
**When** an authenticated HTTP POST request is sent to `/trigger-export-sync` endpoint  
**Then** the Worker SHALL check current task progress  
**And** initiate or continue the export pipeline based on task status  
**And** the Worker SHALL return synchronous response with task progress  
**And** the Worker SHALL log the trigger source as "manual"  

#### Scenario: Health Check Endpoint
**Given** the Worker is deployed  
**When** an HTTP GET request is sent to the root path `/`  
**Then** the Worker SHALL return HTTP 200 OK with response body "HackerNews Daily Export Worker"  
**And** the response SHALL include a `X-Worker-Version` header with the deployment version

### Requirement: Environment Configuration
The system SHALL load configuration from Cloudflare environment variables and secrets accessible via the `env` parameter, with strict validation of required variables and D1 binding.

#### Scenario: Load Required Secrets
**Given** the Worker is invoked with environment context  
**When** the export handler initializes  
**Then** the system SHALL validate all required environment variables are present  
**And** the system SHALL load `LLM_PROVIDER` from environment (REQUIRED, no default)  
**And** the system SHALL load `DEEPSEEK_API_KEY` from Cloudflare secrets if `LLM_PROVIDER=deepseek`  
**And** the system SHALL load `OPENROUTER_API_KEY` from Cloudflare secrets if `LLM_PROVIDER=openrouter`  
**And** the system SHALL load `GITHUB_TOKEN` from Cloudflare secrets (REQUIRED when GitHub enabled)  
**And** the system SHALL load `TARGET_REPO` from environment (REQUIRED when GitHub enabled)  
**And** the system SHALL validate D1 binding availability when `D1_ENABLED=true`  
**And** the system SHALL throw a clear error listing all missing variables if validation fails

#### Scenario: Load D1 Configuration
**Given** the Worker is invoked with environment context  
**When** D1-enabled mode is activated (`D1_ENABLED=true`)  
**Then** the system SHALL verify D1 binding `DB` exists in `env`  
**And** the system SHALL load `TASK_BATCH_SIZE` with default value 8  
**And** the system SHALL load `CRON_INTERVAL_MINUTES` with default value 10  
**And** the system SHALL load `MAX_RETRY_COUNT` with default value 3  
**And** the system SHALL fail with clear error if D1 binding is missing

#### Scenario: Load Optional Configuration
**Given** the Worker is invoked with environment context  
**When** the export handler initializes  
**Then** the system SHALL load configuration variables (HN_STORY_LIMIT, SUMMARY_MAX_LENGTH, etc.) from `env.vars`  
**And** the system SHALL apply default values for any missing optional variables  
**And** the system SHALL validate numeric values are within acceptable ranges

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

### Requirement: D1 Database Binding
The system SHALL configure and access Cloudflare D1 database binding for task persistence.

#### Scenario: D1 Binding Configuration
**Given** wrangler.toml is configured with D1 binding  
**When** Worker initializes  
**Then** the system SHALL access D1 via `env.DB` binding  
**And** D1 operations SHALL not count towards subrequest limits  
**And** database operations SHALL use prepared statements for security

#### Scenario: D1 Availability Check
**Given** `D1_ENABLED=true` in configuration  
**When** Worker startup validation runs  
**Then** the system SHALL verify `env.DB` is defined  
**And** SHALL perform a simple query to test connectivity  
**And** SHALL fail fast with clear error if D1 is unavailable

### Requirement: State-driven Handler Logic
The system SHALL implement state machine pattern in scheduled handler to coordinate incremental task processing.

#### Scenario: State-based Execution Routing
**Given** cron triggers every 10 minutes  
**When** scheduled handler executes  
**Then** the system SHALL query current task status from D1  
**And** route to appropriate handler based on status:  
  - `init` → call initializeTask()  
  - `list_fetched` or `processing` → call processNextBatch()  
  - `aggregating` → call aggregateAndPublish()  
  - `published` → skip and log completion  
**And** SHALL handle state transitions atomically using D1 transactions

#### Scenario: Concurrent Execution Prevention
**Given** multiple cron instances may trigger simultaneously  
**When** scheduled handler executes  
**Then** the system SHALL use D1 transaction locks to prevent concurrent processing  
**And** SHALL skip execution if another instance is processing  
**And** SHALL log concurrent execution attempts for monitoring

