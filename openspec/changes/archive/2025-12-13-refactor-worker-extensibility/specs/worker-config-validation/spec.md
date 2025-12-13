# Worker Configuration Validation Specification Delta

## Overview

This delta adds fail-fast configuration validation to the Cloudflare Worker to prevent runtime errors and unsafe defaults. The validation ensures all required environment variables are set before the worker processes any exports.

## ADDED Requirements

### Requirement: Required Environment Variables

The worker SHALL validate that all required environment variables are set on startup.

#### Scenario: Missing LLM_PROVIDER

**Given** the worker is starting  
**When** the `LLM_PROVIDER` environment variable is not set  
**THEN** the worker SHALL throw an error with message "LLM_PROVIDER is required (set to 'deepseek' or 'openrouter')"  
**And** the worker SHALL not proceed with any export operations

#### Scenario: Missing TARGET_REPO

**Given** the worker is starting  
**When** the `TARGET_REPO` environment variable is not set  
**THEN** the worker SHALL throw an error with message "TARGET_REPO is required (format: 'owner/repo')"  
**And** the worker SHALL not proceed with any export operations

#### Scenario: Missing GITHUB_TOKEN

**Given** the worker is starting  
**When** the `GITHUB_TOKEN` secret is not set  
**THEN** the worker SHALL throw an error with message "GITHUB_TOKEN is required"  
**And** the worker SHALL not proceed with any export operations

#### Scenario: All required variables present

**Given** the worker is starting  
**When** all required environment variables are set (`LLM_PROVIDER`, `TARGET_REPO`, `GITHUB_TOKEN`)  
**THEN** the worker SHALL proceed normally without errors

### Requirement: Provider-Specific API Key Validation

The worker SHALL validate that the appropriate API key is provided based on the selected LLM provider.

#### Scenario: DeepSeek provider without API key

**Given** the worker is starting  
**When** `LLM_PROVIDER` is set to `"deepseek"`  
**And** `DEEPSEEK_API_KEY` secret is not set  
**THEN** the worker SHALL throw an error with message "DEEPSEEK_API_KEY is required when LLM_PROVIDER=deepseek"

#### Scenario: OpenRouter provider without API key

**Given** the worker is starting  
**When** `LLM_PROVIDER` is set to `"openrouter"`  
**And** `OPENROUTER_API_KEY` secret is not set  
**THEN** the worker SHALL throw an error with message "OPENROUTER_API_KEY is required when LLM_PROVIDER=openrouter"

#### Scenario: Valid provider with corresponding API key

**Given** the worker is starting  
**When** `LLM_PROVIDER` is set to `"deepseek"`  
**And** `DEEPSEEK_API_KEY` secret is set  
**THEN** the worker SHALL proceed without validation errors

### Requirement: Clear Error Messages

The worker SHALL provide clear, actionable error messages when configuration validation fails.

#### Scenario: Multiple validation errors

**Given** the worker is starting  
**When** multiple required variables are missing (e.g., `LLM_PROVIDER` and `TARGET_REPO`)  
**THEN** the worker SHALL collect all validation errors  
**And** the worker SHALL throw a single error containing all missing variables  
**And** the error message SHALL be formatted with line breaks for readability

#### Scenario: Invalid LLM_PROVIDER value

**Given** the worker is starting  
**When** `LLM_PROVIDER` is set to an invalid value (e.g., `"openai"`)  
**THEN** the worker SHALL throw an error with message "Invalid LLM_PROVIDER value. Must be 'deepseek' or 'openrouter'"

### Requirement: Validation Timing

The worker SHALL perform configuration validation before any export operations begin.

#### Scenario: Validation on scheduled trigger

**Given** a scheduled cron event triggers the worker  
**When** the worker receives the cron event  
**THEN** the worker SHALL run configuration validation first  
**And** only proceed with export if validation passes

#### Scenario: Validation on HTTP trigger

**Given** an HTTP POST request to `/trigger-export` or `/trigger-export-sync`  
**When** the worker receives the request  
**THEN** the worker SHALL run configuration validation first  
**And** only proceed with export if validation passes  
**And** return error response with 500 status code if validation fails
