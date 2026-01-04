# cloudflare-worker-runtime Specification Delta

## Overview
修改Cloudflare Worker runtime以支持分布式任务处理架构，包括D1数据库绑定、高频cron调度和状态驱动的handler逻辑。

## MODIFIED Requirements

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

## ADDED Requirements

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
