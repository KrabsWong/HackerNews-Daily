# Constants Configuration Specification Delta

## Overview

This delta adds content filter configuration constants to the centralized constants file.

## ADDED Requirements

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

## Dependencies

- **content-filtering**: Uses these constants for configuration
- **story-fetching**: Accesses these constants to check if filter is enabled
