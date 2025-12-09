# article-content-extraction Specification Delta

## Overview

This delta adds fallback crawler API support to improve content extraction success rates when standard HTTP requests fail due to anti-crawling mechanisms, JavaScript requirements, or other obstacles.

## ADDED Requirements

### Requirement: Fallback to Crawler API on Extraction Failure

The system SHALL attempt to fetch article content using an external crawler API when standard HTTP fetch fails or returns insufficient content.

**Related to:** constants-config (requires CRAWLER_API configuration)

#### Scenario: Initial axios fetch fails completely

**Given** `fetchArticleMetadata()` receives a URL that returns HTTP error (403, 404, 500, timeout)  
**When** the axios request fails and returns null for both description and fullContent  
**Then** the system SHALL attempt to fetch content via crawler API as fallback  
**And** call the crawler API endpoint with the article URL  
**And** parse the markdown response if successful  
**And** extract content for AI summarization

#### Scenario: Initial fetch returns empty content

**Given** axios successfully fetches HTML but Readability extraction returns null  
**And** meta description is also unavailable  
**When** both extraction methods fail  
**Then** the system SHALL trigger crawler API fallback  
**And** attempt to retrieve markdown content from the crawler service

#### Scenario: Crawler API returns valid markdown content

**Given** crawler API is called with a URL  
**When** the API responds with success status and markdown content  
**Then** the system SHALL parse the markdown text  
**And** set it as the `fullContent` for AI summarization  
**And** return ArticleMetadata with crawler-fetched content

#### Scenario: Crawler API also fails

**Given** both axios and crawler API requests fail  
**When** no content can be extracted by either method  
**Then** the system SHALL return ArticleMetadata with null for both description and fullContent  
**And** log warnings about both failures  
**And** continue processing without throwing errors (graceful degradation)

#### Scenario: Crawler API timeout

**Given** crawler API takes longer than configured timeout (30 seconds)  
**When** waiting for crawler response  
**Then** the system SHALL cancel the request after timeout  
**And** return null content gracefully  
**And** log a timeout warning

### Requirement: Crawler API Request Format

The system SHALL send POST requests to the crawler API with proper JSON payload and headers.

#### Scenario: Send crawl request with URL

**Given** a URL that needs to be crawled  
**When** calling the crawler API  
**Then** the system SHALL send POST request to `{CRAWLER_API_URL}/crawl`  
**And** include JSON payload: `{"url": "<target_url>"}`  
**And** set Content-Type header to "application/json"  
**And** set timeout to crawler-specific timeout value (30 seconds)

#### Scenario: Parse successful crawler response

**Given** crawler API returns HTTP 200  
**And** response contains JSON: `{"success": true, "url": "...", "markdown": "...", "timestamp": "..."}`  
**When** parsing the response  
**Then** the system SHALL extract the "markdown" field  
**And** use it as article content  
**And** verify it's non-empty before using

#### Scenario: Handle crawler API error response

**Given** crawler API returns HTTP 200 but `{"success": false, "error": "..."}`.  
**When** processing the response  
**Then** the system SHALL detect the failure  
**And** log the error message  
**And** return null content

### Requirement: Fallback Decision Logic

The system SHALL implement clear fallback logic to determine when to use the crawler API.

#### Scenario: Skip crawler when axios succeeds with content

**Given** axios successfully fetches HTML  
**And** Readability extraction returns valid fullContent  
**When** processing article metadata  
**Then** the system SHALL NOT call the crawler API  
**And** use the axios-extracted content directly

#### Scenario: Skip crawler when meta description available

**Given** axios successfully fetches HTML  
**And** Readability returns null but meta description exists  
**When** processing article metadata  
**Then** the system SHALL NOT call the crawler API  
**And** use the meta description as fallback (existing behavior)

#### Scenario: Use crawler only when all else fails

**Given** axios fetch fails OR returns no content  
**And** meta description is also unavailable  
**When** determining next steps  
**Then** the system SHALL invoke the crawler API as last resort  
**And** only after confirming no content from primary methods

## MODIFIED Requirements

### Requirement: Fetch Article Metadata with Content Extraction

The system SHALL fetch article metadata including full content extraction with fallback to meta descriptions **and crawler API**.

#### Scenario: Fetch with multi-tier fallback strategy

**Given** a valid article URL  
**When** fetching article metadata  
**Then** the system first attempts full content extraction via Readability (axios + JSDOM)  
**And** if extraction succeeds, uses content for AI summarization  
**And** if extraction fails, checks for meta description  
**And** if meta description unavailable, attempts crawler API fallback  
**And** if crawler succeeds, uses markdown content  
**And** if all methods fail, returns ArticleMetadata with null values

#### Scenario: Enhanced ArticleMetadata structure

**Given** article fetching is in progress  
**When** processing article data  
**Then** the ArticleMetadata interface includes:  
- `url: string`  
- `description: string | null` (from meta tags only)  
- `fullContent: string | null` (extracted article text from Readability or crawler)  
- Content source is transparent to caller (whether from Readability or crawler)
