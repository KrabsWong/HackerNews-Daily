# Cloudflare Worker Runtime Specification Delta

## Overview

This delta updates the Cloudflare Worker runtime specification to reflect the new architecture with source/publisher abstractions, required configuration validation, and directory restructure.

## MODIFIED Requirements

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

## ADDED Requirements

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
