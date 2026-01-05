# article-fetcher Specification Delta

## Overview
Refactoring the article-fetcher service from a single file (`src/services/articleFetcher.ts`) into a directory structure (`src/services/articleFetcher/`) with multiple focused files. This is a pure structural refactoring with no behavioral changes.

## ADDED Requirements

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
