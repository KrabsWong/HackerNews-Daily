# LLM Provider Abstraction Specification Delta

## Overview

This delta updates the LLM provider abstraction to export the `LLMProviderType` as a public type for consistent usage across the codebase.

## ADDED Requirements

### Requirement: Exported LLM Provider Type

The system SHALL export `LLMProviderType` as a public type from `src/config/constants.ts`.

#### Scenario: Type import

**Given** a module needs to reference LLM provider types  
**When** importing from `src/config/constants.ts`  
**Then** the module SHALL be able to import `LLMProviderType`  
**And** the type SHALL be a union of valid provider strings: `'deepseek' | 'openrouter'`

#### Scenario: Type usage in function signatures

**Given** a function accepts an LLM provider parameter  
**When** defining the function signature  
**Then** the parameter SHALL use the imported `LLMProviderType` instead of inline string literals  
**And** TypeScript SHALL enforce type safety on the parameter

#### Scenario: Type consistency across codebase

**Given** multiple files reference LLM provider types  
**When** searching for inline type definitions (e.g., `'deepseek' | 'openrouter'`)  
**Then** all occurrences SHALL be replaced with the imported `LLMProviderType`  
**And** there SHALL be a single source of truth for valid provider values

## MODIFIED Requirements

### Requirement: Provider Selection via Environment Variable

The system SHALL allow users to select the LLM provider via the `LLM_PROVIDER` environment variable, with strict type safety.

#### Scenario: DeepSeek provider selected

**Given** the environment variable `LLM_PROVIDER` is set to `"deepseek"`  
**When** the LLM provider is initialized  
**Then** the system SHALL validate the value matches `LLMProviderType`  
**And** the system SHALL use DeepSeek API for all LLM operations  
**And** the system SHALL require `DEEPSEEK_API_KEY` to be set

#### Scenario: OpenRouter provider selected

**Given** the environment variable `LLM_PROVIDER` is set to `"openrouter"`  
**When** the LLM provider is initialized  
**Then** the system SHALL validate the value matches `LLMProviderType`  
**And** the system SHALL use OpenRouter API for all LLM operations  
**And** the system SHALL require `OPENROUTER_API_KEY` to be set

#### Scenario: Invalid provider specified

**Given** the environment variable `LLM_PROVIDER` is set to an unsupported value  
**When** the LLM provider is initialized  
**Then** the system SHALL display an error indicating valid provider options from `LLMProviderType`  
**And** the system SHALL exit with non-zero status code

#### Scenario: Missing provider in worker environment

**Given** the Cloudflare Worker is initializing  
**When** the `LLM_PROVIDER` environment variable is not set  
**Then** the system SHALL throw an error "LLM_PROVIDER is required (set to 'deepseek' or 'openrouter')"  
**And** the system SHALL NOT use a default value  
**And** the worker SHALL NOT proceed with export operations
