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
