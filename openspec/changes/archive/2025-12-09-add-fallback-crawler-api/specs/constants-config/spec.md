# constants-config Specification Delta

## Overview

This delta adds new CRAWLER_API configuration constants to support the fallback crawler API feature for improved content extraction.

## ADDED Requirements

### Requirement: Crawler API Configuration Constants

The system SHALL provide configuration constants for the external crawler API service.

**Related to:** article-content-extraction (consumes these constants for crawler fallback)

#### Scenario: Define crawler API constants group

**Given** the constants configuration file (`src/config/constants.ts`)  
**When** adding crawler API support  
**Then** the system SHALL add a `CRAWLER_API` configuration group  
**And** include all crawler API related constants

#### Scenario: Define crawler API base URL

**Given** the `CRAWLER_API` configuration group  
**When** defining the base URL  
**Then** the system SHALL define `BASE_URL` constant  
**And** read value from `CRAWLER_API_URL` environment variable  
**And** use a getter function to evaluate at runtime  
**And** return undefined if environment variable is not set

#### Scenario: Define crawler API timeout

**Given** the `CRAWLER_API` configuration group  
**When** defining the timeout  
**Then** the system SHALL define `REQUEST_TIMEOUT` constant  
**And** set value to 30000 milliseconds (30 seconds)  
**And** use longer timeout than standard HTTP requests due to crawling complexity

#### Scenario: Define crawler API enabled flag

**Given** the `CRAWLER_API` configuration group  
**When** determining if crawler should be used  
**Then** the system SHALL define `ENABLED` getter function  
**And** return true only if `CRAWLER_API_URL` environment variable is set and non-empty  
**And** allow runtime evaluation after environment variables are loaded

### Requirement: Crawler API Environment Variable Documentation

The system SHALL document crawler API environment variables for users.

#### Scenario: Document in .env.example

**Given** the `.env.example` file  
**When** adding crawler API configuration  
**Then** the system SHALL add a "Crawler API Configuration" section  
**And** document `CRAWLER_API_URL` with example value  
**And** include comments explaining the crawler service purpose  
**And** note that it's optional (graceful degradation if not set)

#### Scenario: Explain crawler API purpose in comments

**Given** the `.env.example` documentation  
**When** documenting `CRAWLER_API_URL`  
**Then** the system SHALL explain:  
- Purpose: Fallback crawler for sites with anti-crawling mechanisms  
- Example: `https://tiny-crawl-production.up.railway.app`  
- Optional: If not set, only standard HTTP fetch will be attempted  
- Benefit: Improves content extraction success rate

### Requirement: Crawler API TypeScript Type Safety

The system SHALL provide proper TypeScript types for crawler API configuration.

#### Scenario: Define crawler API config object type

**Given** the constants configuration file  
**When** exporting crawler API configuration  
**Then** the system SHALL use an object structure with typed properties  
**And** use getters for dynamic values (BASE_URL, ENABLED)  
**And** use `as const` for static values (REQUEST_TIMEOUT)

#### Scenario: Handle optional crawler API URL

**Given** the `CRAWLER_API.BASE_URL` getter  
**When** environment variable is not set  
**Then** the system SHALL return `undefined` (not empty string or null)  
**And** allow calling code to check truthiness before using  
**And** provide type signature: `get BASE_URL(): string | undefined`

### Requirement: Configuration Constants Organization

The system SHALL organize crawler API constants following existing patterns.

#### Scenario: Follow naming conventions

**Given** existing constant groups (HN_API, DEEPSEEK_API, etc.)  
**When** adding crawler API constants  
**Then** the system SHALL use SCREAMING_SNAKE_CASE for the group name `CRAWLER_API`  
**And** follow the same structure as other API configurations  
**And** place it in the "API Configuration" section

#### Scenario: Add inline documentation

**Given** the `CRAWLER_API` configuration group  
**When** defining each constant  
**Then** the system SHALL add JSDoc comments explaining:  
- Purpose of the constant  
- Where the value comes from (environment variable for BASE_URL)  
- Default behavior  
- Why timeout is longer (30s vs 5s for standard fetch)

#### Scenario: Use consistent export pattern

**Given** existing API constant exports (HN_API, ALGOLIA_HN_API)  
**When** exporting `CRAWLER_API`  
**Then** the system SHALL use `export const CRAWLER_API = { ... } as const` pattern  
**And** maintain consistency with other API configurations
