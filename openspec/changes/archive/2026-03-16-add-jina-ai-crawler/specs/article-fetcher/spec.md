# article-fetcher Specification Delta

## Overview
Add support for jina.ai as an alternative crawler provider alongside the existing Crawler API.

## ADDED Requirements

### Requirement: Support Multiple Crawler Providers
The system SHALL support pluggable crawler providers selected via configuration.

#### Scenario: Select jina.ai provider
**Given** `CRAWLER_PROVIDER` environment variable is set to `jina`
**When** fetching article content
**Then** the system SHALL use jina.ai Reader API (`https://r.jina.ai/`)
**And** the system SHALL NOT require `CRAWLER_API_URL` to be set

#### Scenario: Select crawler provider (default)
**Given** `CRAWLER_PROVIDER` is not set or set to `crawler`
**When** fetching article content
**Then** the system SHALL use the existing Crawler API
**And** the system SHALL require `CRAWLER_API_URL` to be configured

#### Scenario: Invalid provider selection
**Given** `CRAWLER_PROVIDER` is set to an invalid value
**When** initializing the system
**Then** the system SHALL log a warning
**And** fall back to default `crawler` provider

### Requirement: Fetch Content via jina.ai
The system SHALL fetch article content via jina.ai Reader API when selected.

#### Scenario: Successfully fetch via jina.ai
**Given** a valid article URL
**And** `CRAWLER_PROVIDER=jina`
**When** fetching article content
**Then** the system SHALL send GET request to `https://r.jina.ai/{encoded_url}`
**And** return markdown content
**And** extract first paragraph as description

#### Scenario: Handle jina.ai rate limiting
**Given** jina.ai returns HTTP 429 (Too Many Requests)
**When** fetching article content
**Then** the system SHALL log a rate limit warning
**And** return null for content
**And** continue processing other articles

#### Scenario: Handle jina.ai errors
**Given** jina.ai returns HTTP error (4xx or 5xx)
**When** fetching article content
**Then** the system SHALL log the error
**And** return null for content
**And** continue processing (graceful degradation)

### Requirement: Unified Provider Interface
All crawler providers SHALL implement the same interface for interchangeability.

#### Scenario: Consistent return format
**Given** either `crawler` or `jina` provider is selected
**When** fetching article metadata
**Then** both providers SHALL return `ArticleMetadata` structure
**And** `url` field SHALL contain the original URL
**And** `fullContent` field SHALL contain markdown or null
**And** `description` field SHALL contain summary or null

#### Scenario: Consistent error handling
**Given** either provider fails to fetch content
**When** error occurs
**Then** both providers SHALL return null content
**And** both providers SHALL log appropriate error messages
**And** neither provider SHALL throw uncaught exceptions

## MODIFIED Requirements

### Requirement: Batch Article Fetching with Provider Selection
The batch fetching function SHALL accept and use the configured crawler provider.

#### Scenario: Batch fetch with jina.ai
**Given** an array of URLs
**And** `CRAWLER_PROVIDER=jina`
**When** calling `fetchArticlesBatch`
**Then** the system SHALL use jina.ai for all URLs
**And** log which provider is being used

#### Scenario: Batch fetch with crawler API
**Given** an array of URLs
**And** `CRAWLER_PROVIDER=crawler`
**And** `CRAWLER_API_URL` is configured
**When** calling `fetchArticlesBatch`
**Then** the system SHALL use Crawler API for all URLs
**And** log which provider is being used

## REMOVED Requirements

None.
