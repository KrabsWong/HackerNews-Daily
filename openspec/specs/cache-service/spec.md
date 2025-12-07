# Cache Service Capability Specification

## Purpose
Specification for Cache Service Capability functionality.

## Requirements

### Requirement: Cache Storage
The system MUST store processed story data in a local file for reuse.

#### Scenario: Save processed stories to cache
- **WHEN** stories are successfully fetched and processed
- **THEN** the system saves the processed data to `.cache/stories.json`
- **AND** includes a timestamp of when the cache was created
- **AND** includes the configuration used (storyLimit, timeWindowHours, summaryMaxLength)

#### Scenario: Cache directory creation
- **WHEN** the `.cache/` directory does not exist
- **THEN** the system creates the directory before saving

### Requirement: Cache Retrieval
The system MUST check for valid cached data before making API calls.

#### Scenario: Valid cache exists
- **WHEN** user runs `npm run fetch` or `npm run fetch:web`
- **AND** cache file exists and is within TTL
- **AND** cache configuration matches current settings
- **THEN** the system returns cached data without API calls
- **AND** displays a message indicating cached data is being used

#### Scenario: Cache expired
- **WHEN** cache exists but TTL has expired
- **THEN** the system fetches fresh data from APIs
- **AND** updates the cache with new data

#### Scenario: Cache configuration mismatch
- **WHEN** cache exists but was created with different configuration
- **THEN** the system fetches fresh data from APIs
- **AND** updates the cache with new data

#### Scenario: Cache file missing
- **WHEN** cache file does not exist
- **THEN** the system fetches fresh data from APIs
- **AND** creates new cache file

### Requirement: Cache Bypass
The system MUST support forcing a fresh fetch regardless of cache state.

#### Scenario: No-cache flag provided
- **WHEN** user runs with `--no-cache` or `--refresh` flag
- **THEN** the system bypasses cache and fetches fresh data
- **AND** updates the cache with new data

### Requirement: Cache TTL Configuration
The system MUST support configurable cache TTL via environment variable.

#### Scenario: Custom TTL configured
- **WHEN** `CACHE_TTL_MINUTES` environment variable is set
- **THEN** the system uses the specified value as cache TTL

#### Scenario: Default TTL
- **WHEN** `CACHE_TTL_MINUTES` is not set
- **THEN** the system uses default TTL of 30 minutes

### Requirement: Cache Toggle
The system MUST support disabling cache entirely via environment variable.

#### Scenario: Cache disabled
- **WHEN** `CACHE_ENABLED` environment variable is set to "false"
- **THEN** the system always fetches fresh data
- **AND** does not read from or write to cache

### Requirement: Cache Error Handling
The system MUST handle cache errors gracefully without blocking the main workflow.

#### Scenario: Corrupted cache file
- **WHEN** cache file exists but contains invalid JSON
- **THEN** the system logs a warning
- **AND** deletes the corrupted file
- **AND** fetches fresh data

#### Scenario: Cache write failure
- **WHEN** cache cannot be written (permissions, disk full, etc.)
- **THEN** the system logs a warning
- **AND** continues with normal operation
- **AND** does not crash or fail the main workflow
