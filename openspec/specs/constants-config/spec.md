# Constants Configuration Capability Specification

## Purpose
Specification for Constants Configuration Capability functionality.
## Requirements
### Requirement: Centralized Constants File
The system MUST have a single source of truth for all configuration constants.

#### Scenario: Constants file location
- **WHEN** the project is initialized
- **THEN** all constants are defined in `src/config/constants.ts`

#### Scenario: Constants grouping
- **WHEN** constants are defined
- **THEN** they are organized into logical groups:
  - `API_CONFIG`: API base URLs and timeouts
  - `STORY_LIMITS`: Story count limits and thresholds
  - `SUMMARY_CONFIG`: Summary length constraints
  - `CONTENT_CONFIG`: Article content extraction settings
  - `CACHE_CONFIG`: Cache-related settings
  - `SERVER_CONFIG`: Web server settings

### Requirement: Constants Documentation
Each constant MUST have clear documentation explaining its purpose.

#### Scenario: Constant definition
- **WHEN** a constant is defined
- **THEN** it includes a descriptive comment explaining:
  - What the constant controls
  - Valid value ranges (if applicable)
  - Default behavior

### Requirement: Constants Migration
All existing scattered constants MUST be migrated to the centralized file.

#### Scenario: HackerNews API constants
- **WHEN** constants are migrated
- **THEN** `HN_API_BASE`, `REQUEST_TIMEOUT`, `MAX_FETCH_LIMIT` from `src/api/hackerNews.ts` are moved to constants file

#### Scenario: Translator constants
- **WHEN** constants are migrated
- **THEN** `DEEPSEEK_API_BASE`, `REQUEST_TIMEOUT`, `RETRY_DELAY` from `src/services/translator.ts` are moved to constants file

#### Scenario: Article fetcher constants
- **WHEN** constants are migrated
- **THEN** `FETCH_TIMEOUT`, `USER_AGENT`, `MAX_CONTENT_LENGTH` from `src/services/articleFetcher.ts` are moved to constants file

#### Scenario: Index constants
- **WHEN** constants are migrated
- **THEN** `MAX_STORY_LIMIT`, `WARN_THRESHOLD`, `DEFAULT_SUMMARY_LENGTH`, `MIN_SUMMARY_LENGTH`, `MAX_SUMMARY_LENGTH` from `src/index.ts` are moved to constants file

#### Scenario: Server constants
- **WHEN** constants are migrated
- **THEN** default port `3000` from `src/server/app.ts` is moved to constants file

### Requirement: Import Updates
All files using constants MUST import from the centralized constants file.

#### Scenario: Updated imports
- **WHEN** constants are migrated
- **THEN** all source files import constants from `src/config/constants.ts`
- **AND** no duplicate constant definitions exist in the codebase

### Requirement: Content Filter Configuration Constants

The system SHALL provide configuration constants for the content filtering feature.

#### Scenario: Define content filter constants group

**Given** the constants configuration file  
**When** adding content filter support  
**Then** the system SHALL add a `CONTENT_FILTER` configuration group  
**And** include all content filtering related constants

#### Scenario: Define filter enabled flag

**Given** the `CONTENT_FILTER` configuration group  
**When** defining the enabled flag  
**Then** the system SHALL define `ENABLED` constant  
**And** read value from `ENABLE_CONTENT_FILTER` environment variable  
**And** default to `false` if not set

#### Scenario: Define sensitivity level setting

**Given** the `CONTENT_FILTER` configuration group  
**When** defining the sensitivity level  
**Then** the system SHALL define `SENSITIVITY` constant  
**And** read value from `CONTENT_FILTER_SENSITIVITY` environment variable  
**And** default to `'medium'` if not set  
**And** validate value is one of: `'low'`, `'medium'`, or `'high'`

#### Scenario: Define timeout setting

**Given** the `CONTENT_FILTER` configuration group  
**When** defining the timeout  
**Then** the system SHALL define `TIMEOUT` constant  
**And** set value to 15000 milliseconds (15 seconds)

#### Scenario: Define fallback behavior setting

**Given** the `CONTENT_FILTER` configuration group  
**When** defining error handling behavior  
**Then** the system SHALL define `FALLBACK_ON_ERROR` constant  
**And** set value to `true` (fail-open behavior)

### Requirement: Environment Variable Documentation

The system SHALL document content filter environment variables.

#### Scenario: Document in .env.example

**Given** the `.env.example` file  
**When** adding content filter configuration  
**Then** the system SHALL add a "Content Filter Configuration" section  
**And** document `ENABLE_CONTENT_FILTER` with default value `false`  
**And** document `CONTENT_FILTER_SENSITIVITY` with options: `low`, `medium`, `high`  
**And** include comments explaining each setting

#### Scenario: Explain sensitivity levels

**Given** the `.env.example` file  
**When** documenting sensitivity settings  
**Then** the system SHALL explain each level:
- `low`: Only filter explicitly illegal or explicit content  
- `medium`: Filter political controversies and explicit content (default)  
- `high`: Broadly filter potentially sensitive topics

### Requirement: TypeScript Type Definitions

The system SHALL provide proper TypeScript types for content filter configuration.

#### Scenario: Define sensitivity level type

**Given** the constants configuration file  
**When** exporting content filter types  
**Then** the system SHALL define a type:  
`type SensitivityLevel = 'low' | 'medium' | 'high'`  
**And** use this type for the `SENSITIVITY` constant

#### Scenario: Define readonly configuration object

**Given** the `CONTENT_FILTER` configuration object  
**When** exporting the configuration  
**Then** the system SHALL mark it as `const` with `as const` assertion  
**And** ensure all properties are readonly

### Requirement: Configuration Constants Structure

The system SHALL organize content filter constants following the existing pattern.

#### Scenario: Follow naming conventions

**Given** existing constant groups in the file  
**When** adding content filter constants  
**Then** the system SHALL follow the same naming convention  
**And** use SCREAMING_SNAKE_CASE for the group name  
**And** use SCREAMING_SNAKE_CASE for constant keys

#### Scenario: Add inline documentation

**Given** the `CONTENT_FILTER` configuration group  
**When** defining each constant  
**Then** the system SHALL add JSDoc comments explaining:
- Purpose of the constant  
- Where the value comes from (environment variable)  
- Default value and behavior

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

