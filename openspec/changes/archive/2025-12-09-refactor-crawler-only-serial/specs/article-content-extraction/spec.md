# article-content-extraction Specification Delta

## MODIFIED Requirements

### Requirement: Fetch Article Content via Crawler API

The system SHALL fetch article content exclusively using the external Crawler API service.

#### Scenario: Successful content extraction

**Given** a valid article URL  
**When** fetching article metadata  
**Then** the system SHALL send POST request to `{CRAWLER_API_URL}/crawl`  
**And** parse the markdown response  
**And** extract first paragraph as description  
**And** return ArticleMetadata with content and description

#### Scenario: Crawler API timeout

**Given** a URL that takes too long to crawl  
**When** the crawler request exceeds timeout (10 seconds)  
**Then** the system SHALL cancel the request  
**And** return ArticleMetadata with null content  
**And** log timeout warning  
**And** continue to next article

#### Scenario: Crawler API not configured

**Given** `CRAWLER_API_URL` environment variable is not set  
**When** attempting to fetch article content  
**Then** the system SHALL log a warning about missing configuration  
**And** return ArticleMetadata with null content

### Requirement: Serial Article Processing

The system SHALL process articles one at a time (serially) to avoid overwhelming the crawler service.

#### Scenario: Process multiple articles

**Given** a list of article URLs to fetch  
**When** processing the list  
**Then** the system SHALL fetch articles one at a time  
**And** wait for each request to complete before starting the next  
**And** log progress for each article (e.g., "1/30", "2/30")

#### Scenario: Single article failure

**Given** one article fails to fetch  
**When** processing continues  
**Then** the system SHALL log the failure  
**And** continue to the next article  
**And** not block remaining articles

### Requirement: Content Length Configuration

The system SHALL support optional content length limiting with no limit by default.

#### Scenario: Default behavior (no limit)

**Given** `MAX_CONTENT_LENGTH` is set to 0  
**When** fetching article content  
**Then** the system SHALL preserve full content without truncation

#### Scenario: Content length limit enabled

**Given** `MAX_CONTENT_LENGTH` is set to a positive value (e.g., 4000)  
**When** fetching article content longer than the limit  
**Then** the system SHALL truncate content to the specified length  
**And** ensure truncation does not cut mid-word  
**And** append "..." to indicate truncation

## REMOVED Requirements

### Requirement: Local Content Extraction with Readability

**Reason**: JSDOM/Readability blocks Node.js event loop and causes hangs on complex pages  
**Migration**: Use Crawler API exclusively for all content extraction

### Requirement: Fallback to Crawler API on Extraction Failure

**Reason**: No longer needed since Crawler API is now the primary (and only) extraction method  
**Migration**: Crawler API is used directly, no fallback logic required

### Requirement: Batch Parallel Processing

**Reason**: Parallel requests overwhelm the crawler service causing timeouts  
**Migration**: Use serial processing (one article at a time)
