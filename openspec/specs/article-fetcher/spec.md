# article-fetcher Specification

## Purpose
Specification for article-fetcher functionality.
## Requirements
### Requirement: Fetch Article HTML Content
The system SHALL retrieve HTML content from article URLs with appropriate timeout and error handling.

#### Scenario: Successfully fetch article HTML
**Given** a valid article URL  
**When** fetching article content  
**Then** the system retrieves the HTML content within 5 seconds  
**And** returns the parsed HTML document

#### Scenario: Handle connection timeout
**Given** a URL that takes longer than 5 seconds to respond  
**When** attempting to fetch the article  
**Then** the system times out gracefully  
**And** returns null without throwing an error  
**And** logs a warning about the timeout

#### Scenario: Handle HTTP errors (404, 403, 500)
**Given** a URL that returns HTTP error status  
**When** attempting to fetch the article  
**Then** the system handles the error gracefully  
**And** returns null without throwing an error  
**And** logs a warning about the HTTP error

### Requirement: Extract Meta Description
The system SHALL extract article descriptions from HTML meta tags.

#### Scenario: Extract standard meta description
**Given** HTML containing `<meta name="description" content="Article summary">`  
**When** parsing the HTML  
**Then** the system extracts and returns "Article summary"

#### Scenario: Extract OpenGraph description
**Given** HTML containing `<meta property="og:description" content="OG summary">`  
**When** parsing the HTML and no standard meta description exists  
**Then** the system extracts and returns "OG summary"

#### Scenario: Prioritize standard meta over OpenGraph
**Given** HTML containing both standard and OpenGraph meta descriptions  
**When** parsing the HTML  
**Then** the system returns the standard meta description  
**And** ignores the OpenGraph description

#### Scenario: No description tags present
**Given** HTML without any meta description tags  
**When** parsing the HTML  
**Then** the system returns null  
**And** does not throw an error

### Requirement: Batch Article Fetching
The system SHALL fetch metadata for multiple articles in parallel while handling individual failures.

#### Scenario: Fetch multiple articles successfully
**Given** an array of 10 valid article URLs  
**When** batch fetching articles  
**Then** the system fetches all articles in parallel  
**And** returns an array of metadata objects in the same order  
**And** completes within reasonable time (not 10x single fetch time)

#### Scenario: Handle mixed success and failure
**Given** an array containing both valid URLs and failing URLs  
**When** batch fetching articles  
**Then** the system processes all URLs  
**And** returns null for failed fetches  
**And** returns valid metadata for successful fetches  
**And** maintains the original order  
**And** does not stop processing on individual failures

#### Scenario: Map results to stories
**Given** batch fetch results and corresponding HNStory objects  
**When** mapping results  
**Then** each story is paired with its description or null  
**And** order consistency is maintained

### Requirement: Handle Anti-Crawling Mechanisms
The system SHALL handle anti-crawling responses gracefully without blocking execution.

#### Scenario: Blocked by anti-crawling (403 Forbidden with challenge)
**Given** a URL that returns anti-crawling challenge page  
**When** attempting to fetch the article  
**Then** the system detects the failure  
**And** returns null for description  
**And** logs a warning about potential anti-crawling block

#### Scenario: CAPTCHA or JavaScript challenge
**Given** a URL requiring CAPTCHA or browser JavaScript execution  
**When** attempting to fetch the article  
**Then** the system times out or receives incomplete HTML  
**And** returns null gracefully  
**And** does not retry indefinitely

### Requirement: Resource Limits and Performance
The system SHALL impose reasonable limits to prevent resource exhaustion.

#### Scenario: Limit concurrent requests
**Given** a large batch of articles to fetch  
**When** fetching articles  
**Then** the system limits concurrent requests to prevent overwhelming the system  
**And** processes remaining articles after earlier ones complete

#### Scenario: Respect timeout for all requests
**Given** any article fetch request  
**When** the timeout period (5 seconds) is exceeded  
**Then** the system cancels the request  
**And** frees up resources  
**And** continues with remaining articles

### Requirement: Service SHALL use directory-based module structure
The article-fetcher service SHALL be organized as a directory with multiple focused files instead of a single file.

#### Scenario: Organize service into separate modules
**Given** the article-fetcher service needs to be refactored  
**When** creating the new directory structure  
**Then** system SHALL create directory `src/services/articleFetcher/`  
**And** create `index.ts` for main exports  
**And** create `crawler.ts` for crawler API integration  
**And** create `truncation.ts` for content truncation logic  
**And** create `metadata.ts` for article metadata processing

#### Scenario: Export only necessary public API
**Given** refactored service structure  
**When** defining public exports in `index.ts`  
**Then** system SHALL export only `fetchArticlesBatch` function  
**And** export `ArticleMetadata` type  
**And** internal functions remain unexported for encapsulation

### Requirement: Service SHALL separate crawler API logic
The crawler API integration logic SHALL be isolated in a dedicated file.

#### Scenario: Isolate crawler API functions
**Given** crawler API functions need to be separated  
**When** creating `crawler.ts`  
**Then** file SHALL contain `fetchWithCrawlerAPI` function  
**And** handle crawler API communication  
**And** manage timeout and error handling for crawler requests  
**And** import truncation logic from `truncation.ts`

### Requirement: Service SHALL separate truncation logic
Content truncation logic SHALL be isolated in a dedicated file.

#### Scenario: Isolate truncation functions
**Given** content truncation needs to be separated  
**When** creating `truncation.ts`  
**Then** file SHALL contain `truncateContent` function  
**And** handle word boundary detection  
**And** manage ellipsis insertion

### Requirement: Service SHALL separate metadata processing
Article metadata processing functions SHALL be isolated in a dedicated file.

#### Scenario: Isolate metadata functions
**Given** metadata processing needs to be separated  
**When** creating `metadata.ts`  
**Then** file SHALL contain `fetchArticleMetadata` function  
**And** contain `fetchArticlesBatch` function  
**And** coordinate between crawler and truncation modules

