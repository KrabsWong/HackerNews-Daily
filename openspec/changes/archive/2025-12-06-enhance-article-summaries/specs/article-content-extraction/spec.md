# article-content-extraction Specification Delta

## ADDED Requirements

### Requirement: Extract Main Article Content
The system SHALL extract the main textual content from article HTML using readability algorithms to isolate the article body from navigation, ads, and other non-content elements.

**Related to:** ai-summary-generation (provides content for summarization)

#### Scenario: Extract content from standard blog post
**Given** HTML containing an article with clear content structure  
**When** extracting article content  
**Then** the system uses Readability algorithm to identify main content  
**And** returns plain text of the article body  
**And** excludes navigation menus, sidebars, footers, and advertisements

#### Scenario: Extract content from technical article with code blocks
**Given** HTML containing an article with code snippets and technical content  
**When** extracting article content  
**Then** the system preserves code blocks as part of the content  
**And** maintains paragraph structure  
**And** returns cleaned plain text suitable for summarization

#### Scenario: Content extraction fails on JavaScript-heavy site
**Given** HTML that is minimal (JavaScript-rendered content)  
**When** attempting content extraction  
**Then** the system returns null to indicate extraction failure  
**And** triggers fallback to meta description extraction

#### Scenario: Short article content
**Given** extracted content is less than 100 characters  
**When** processing the content  
**Then** the system uses the short content as-is for summarization  
**And** does not trigger fallback to meta description

### Requirement: Truncate Long Content
The system SHALL truncate very long article content before summarization to prevent API token limit issues.

#### Scenario: Truncate extremely long article
**Given** extracted content exceeds 4000 characters  
**When** preparing content for summarization  
**Then** the system truncates to 4000 characters  
**And** ensures truncation doesn't cut mid-word  
**And** logs a debug message about truncation

#### Scenario: Standard length article
**Given** extracted content is 2000 characters  
**When** preparing content for summarization  
**Then** the system uses the full content without truncation

### Requirement: Fallback to Meta Description
The system SHALL fall back to existing meta description extraction when full content extraction fails.

#### Scenario: Extraction fails, meta description available
**Given** content extraction returns null  
**And** HTML contains meta description tags  
**When** processing article metadata  
**Then** the system extracts meta description as before  
**And** translates the meta description  
**And** logs a warning about extraction failure

#### Scenario: Both extraction and meta description fail
**Given** content extraction returns null  
**And** HTML contains no meta description tags  
**When** processing article metadata  
**Then** the system returns "暂无描述" as the description  
**And** logs a warning about missing content

### Requirement: Fetch Article Metadata with Content Extraction
The system SHALL fetch article metadata including full content extraction with fallback to meta descriptions.

#### Scenario: Fetch with content extraction priority
**Given** a valid article URL  
**When** fetching article metadata  
**Then** the system first attempts full content extraction via Readability  
**And** if extraction succeeds, uses content for AI summarization  
**And** if extraction fails, falls back to meta description extraction  
**And** returns ArticleMetadata with either full content or description

#### Scenario: Enhanced ArticleMetadata structure
**Given** article fetching is in progress  
**When** processing article data  
**Then** the ArticleMetadata interface includes:  
- `url: string`  
- `description: string | null` (from meta tags only)  
- `fullContent: string | null` (extracted article text)
