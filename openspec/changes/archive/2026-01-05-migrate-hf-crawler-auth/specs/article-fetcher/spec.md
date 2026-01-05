# article-fetcher Specification Delta

## Overview

This delta adds Bearer token authentication support to the crawler API client, enabling integration with private Hugging Face Spaces crawler services that require authentication.

## ADDED Requirements

### Requirement: Crawler API client SHALL support Bearer token authentication

The crawler API client MUST support optional Bearer token authentication for private crawler services.

#### Scenario: Include Authorization header when token provided

**Given** a crawler API URL is configured  
**And** a crawler API token is provided  
**When** making a request to the crawler service  
**Then** the system SHALL include an `Authorization` header with value `Bearer {token}`  
**And** the request SHALL proceed with authentication

#### Scenario: Omit Authorization header when token not provided

**Given** a crawler API URL is configured  
**And** no crawler API token is provided  
**When** making a request to the crawler service  
**Then** the system SHALL NOT include an `Authorization` header  
**And** the request SHALL proceed without authentication

#### Scenario: Never log authentication token

**Given** a crawler API token is configured  
**When** logging request details or errors  
**Then** the system SHALL NOT log the token value  
**And** MAY log only the presence or absence of authentication

### Requirement: Crawler functions SHALL accept token parameter

All crawler-related functions MUST accept an optional token parameter and thread it through the call chain.

#### Scenario: Thread token through function calls

**Given** `fetchWithCrawlerAPI()` accepts a token parameter  
**When** `fetchArticleMetadata()` calls the crawler  
**Then** it MUST accept and pass the token parameter  
**And** `fetchAndProcessArticles()` MUST accept and pass the token parameter  
**And** all integration points MUST pass `env.CRAWLER_API_TOKEN`

## MODIFIED Requirements

### Requirement: Crawler API client MUST make authenticated HTTP requests

The system SHALL send POST requests to the crawler API with proper JSON payload, headers, and optional authentication.

#### Scenario: Send POST request with authentication

**Given** calling the crawler API with authentication  
**When** the request is sent  
**Then** the system SHALL send POST request to `{CRAWLER_API_URL}/crawl`  
**And** include `Content-Type: application/json` header  
**And** include `Authorization: Bearer {token}` header if token is provided  
**And** include `{ "url": "<article-url>" }` as JSON body  
**And** set timeout to crawler-specific timeout value (10 seconds)

#### Scenario: Handle authentication failures

**Given** crawler API requires authentication  
**And** token is invalid or missing  
**When** the API returns 401 or 403 status  
**Then** the system SHALL log authentication failure  
**And** return null content (graceful degradation)  
**And** NOT expose token in error messages

## Related Changes

This delta requires updating:
- `src/types/worker.ts` - Add `CRAWLER_API_TOKEN` environment variable
- `src/services/articleFetcher/crawler.ts` - Add token parameter and header logic
- `src/services/articleFetcher/metadata.ts` - Thread token through function calls
- `.dev.vars.example` - Document token configuration
- Test files - Verify auth header behavior
