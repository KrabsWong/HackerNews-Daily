# Cloudflare Worker Runtime Specification Delta

## Overview
This specification defines the Cloudflare Workers runtime implementation for executing the daily HackerNews export automation. It covers the Worker entry point, scheduled triggers, environment configuration, and execution context management.

## ADDED Requirements

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
The system SHALL load configuration from Cloudflare environment variables and secrets accessible via the `env` parameter.

#### Scenario: Load Required Secrets
**Given** the Worker is invoked with environment context  
**When** the export handler initializes  
**Then** the system SHALL load `DEEPSEEK_API_KEY` from Cloudflare secrets  
**And** the system SHALL load `GITHUB_TOKEN` from Cloudflare secrets  
**And** the system SHALL throw a clear error if any required secret is missing  

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
The Worker SHALL orchestrate the daily export pipeline by reusing existing service modules and adding Worker-specific glue logic.

#### Scenario: Execute Complete Export Pipeline
**Given** the Worker is triggered (scheduled or manual)  
**When** the export handler executes  
**Then** the system SHALL calculate the previous day's date range in UTC timezone  
**And** the system SHALL fetch HackerNews stories using existing `hackerNews.ts` API module  
**And** the system SHALL apply content filtering if `ENABLE_CONTENT_FILTER=true`  
**And** the system SHALL extract article content using existing `articleFetcher.ts` service  
**And** the system SHALL generate AI summaries using existing `translator.ts` service  
**And** the system SHALL format output using existing `markdownExporter.ts` service  
**And** the system SHALL push the generated Markdown to GitHub repository  
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
