# Constants Configuration Capability Specification Delta

## Overview
Adds OpenRouter API configuration constants and LLM provider selection configuration.

## ADDED Requirements

### Requirement: OpenRouter API Configuration Constants
The system SHALL provide configuration constants for OpenRouter API integration.

#### Scenario: Define OpenRouter API constants group
**Given** the constants configuration file  
**When** adding OpenRouter support  
**Then** the system SHALL add an `OPENROUTER_API` configuration group  
**And** include the following constants:
- `BASE_URL`: `https://openrouter.ai/api/v1`
- `REQUEST_TIMEOUT`: 30000 milliseconds
- `RETRY_DELAY`: 1000 milliseconds
- `DEFAULT_MODEL`: `deepseek/deepseek-chat-v3-0324`

#### Scenario: Read OpenRouter model from environment
**Given** the `OPENROUTER_API` configuration group  
**When** defining the model setting  
**Then** the system SHALL read from `OPENROUTER_MODEL` environment variable  
**And** default to `deepseek/deepseek-chat-v3-0324` if not set

### Requirement: LLM Provider Selection Configuration
The system SHALL provide configuration for selecting the LLM provider.

#### Scenario: Define LLM provider type
**Given** the constants configuration file  
**When** adding provider selection support  
**Then** the system SHALL define a type:  
`type LLMProviderType = 'deepseek' | 'openrouter'`

#### Scenario: Define LLM provider configuration
**Given** the constants configuration file  
**When** adding provider configuration  
**Then** the system SHALL add an `LLM_CONFIG` configuration group  
**And** include `PROVIDER` constant that reads from `LLM_PROVIDER` environment variable  
**And** default to `'deepseek'` if not set

#### Scenario: Validate provider value
**Given** the `LLM_PROVIDER` environment variable is set  
**When** reading the provider configuration  
**Then** the system SHALL validate the value is `'deepseek'` or `'openrouter'`  
**And** log a warning if an invalid value is provided  
**And** fall back to `'deepseek'` for invalid values

### Requirement: OpenRouter Optional Headers Configuration
The system SHALL provide configuration for optional OpenRouter attribution headers.

#### Scenario: Define site URL configuration
**Given** the `OPENROUTER_API` configuration group  
**When** defining optional headers  
**Then** the system SHALL include `SITE_URL` constant  
**And** read from `OPENROUTER_SITE_URL` environment variable  
**And** return `undefined` if not set

#### Scenario: Define site name configuration
**Given** the `OPENROUTER_API` configuration group  
**When** defining optional headers  
**Then** the system SHALL include `SITE_NAME` constant  
**And** read from `OPENROUTER_SITE_NAME` environment variable  
**And** return `undefined` if not set

### Requirement: Document OpenRouter Environment Variables
The system SHALL document OpenRouter environment variables in .env.example.

#### Scenario: Document provider selection
**Given** the `.env.example` file  
**When** adding LLM provider configuration  
**Then** the system SHALL add a "LLM Provider Configuration" section  
**And** document `LLM_PROVIDER` with options: `deepseek`, `openrouter`  
**And** explain that `deepseek` is the default

#### Scenario: Document OpenRouter credentials
**Given** the `.env.example` file  
**When** adding OpenRouter configuration  
**Then** the system SHALL document `OPENROUTER_API_KEY`  
**And** explain it is required only when `LLM_PROVIDER=openrouter`

#### Scenario: Document OpenRouter model selection
**Given** the `.env.example` file  
**When** adding OpenRouter configuration  
**Then** the system SHALL document `OPENROUTER_MODEL`  
**And** explain the default model is `deepseek/deepseek-chat-v3-0324`  
**And** explain the format is `provider/model-name`

#### Scenario: Document OpenRouter optional headers
**Given** the `.env.example` file  
**When** adding OpenRouter configuration  
**Then** the system SHALL document `OPENROUTER_SITE_URL` and `OPENROUTER_SITE_NAME`  
**And** explain these are optional for OpenRouter leaderboard attribution
