# Spec: Story Fetching via Hybrid Firebase + Algolia API Specification

## Purpose
Specification for Spec: Story Fetching via Hybrid Firebase + Algolia API functionality.
## Requirements
### Requirement: System SHALL fetch stories from HN's "best" list

The system SHALL fetch stories only from HackerNews's curated "best" list (https://news.ycombinator.com/best).

#### Scenario: Fetch best story IDs from Firebase

**Given** a request for top stories  
**When** the system initiates story fetching  
**Then** it SHALL first call Firebase API `GET /beststories.json`  
**And** receive an array of curated story IDs (typically 200 IDs)

#### Scenario: Fetch story details from Algolia in batches

**Given** a list of best story IDs from Firebase  
**When** fetching story details  
**Then** the system SHALL query Algolia API with batched story tags  
**And** use format: `tags=story,(story_id1,story_id2,...)`  
**And** process in batches of 100 for efficiency

### Requirement: System SHALL filter stories by date range

The system SHALL filter stories to only include those within the specified time window, and then apply content filtering before translation.

#### Scenario: Filter stories from last 24 hours with content filter

**Given** stories fetched from the best list  
**And** a time window of 24 hours  
**And** content filtering is enabled  
**When** applying date and content filters  
**Then** the system SHALL first keep only stories where `created_at_i > (now - 24h)`  
**And** then apply AI content filtering to remove sensitive stories  
**And** proceed with only SAFE stories for translation

#### Scenario: Filter specific date range for daily export with content filter

**Given** a request to export stories from a specific date  
**And** content filtering is enabled  
**When** filtering by date boundaries (start: 00:00:00, end: 23:59:59)  
**Then** the system SHALL keep only stories where `created_at_i` is within that range  
**And** then apply AI content filtering  
**And** export only SAFE stories

#### Scenario: Bypass content filter when disabled

**Given** stories filtered by date range  
**And** content filtering is disabled  
**When** processing stories  
**Then** the system SHALL skip content filtering entirely  
**And** proceed directly to translation with all date-filtered stories

### Requirement: System SHALL sort stories by score

The system SHALL sort filtered stories by score (points) in descending order.

#### Scenario: Sort by score descending

**Given** stories filtered by date range  
**When** sorting the results  
**Then** the system SHALL sort by `points` field descending  
**And** return stories with highest scores first

#### Scenario: Return top N stories

**Given** sorted stories  
**And** a limit of 30 (configurable via `HN_STORY_LIMIT`)  
**When** limiting results  
**Then** the system SHALL return only the top N highest-scored stories  
**And** return fewer if not enough stories match the criteria

### Requirement: System SHALL map Algolia response to internal data model

The system SHALL transform Algolia API responses to match the existing `HNStory` interface.

#### Scenario: Transform Algolia story to HNStory type

**Given** an Algolia response with fields: `story_id`, `author`, `title`, `url`, `points`, `created_at_i`  
**When** mapping to `HNStory` interface  
**Then** it SHALL map:
- `story_id` → `id`
- `author` → `by`
- `points` → `score`
- `created_at_i` → `time`
- `title` → `title`
- `url` → `url` (optional)

### Requirement: System SHALL configure Algolia API endpoint

The system SHALL define Algolia API configuration constants.

#### Scenario: Define Algolia API constants

**Given** the constants configuration file  
**When** adding Algolia support  
**Then** it SHALL define:
- `BASE_URL`: `https://hn.algolia.com/api/v1`
- `REQUEST_TIMEOUT`: 10000ms
- `DEFAULT_HITS_PER_PAGE`: 30
- `MAX_HITS_PER_PAGE`: 100

### Requirement: System SHALL display story scores

The system SHALL display the score (points) for each story in the output.

#### Scenario: Display score in CLI output

**Given** a processed story with score  
**When** displaying the story card  
**Then** the system SHALL show timestamp and score together

### Requirement: System SHALL handle API-specific errors

The system SHALL provide appropriate error messages for API failures.

#### Scenario: Handle Algolia rate limiting

**Given** Algolia API returns 429 Too Many Requests  
**When** processing the error  
**Then** the system SHALL throw rate limit exceeded error

#### Scenario: Handle Firebase best stories fetch failure

**Given** Firebase API is unreachable  
**When** fetching best story IDs  
**Then** the system SHALL throw appropriate error with message

### Requirement: System SHALL integrate content filtering service

The system SHALL create and use a content filter instance during story processing.

#### Scenario: Initialize content filter

**Given** the main application starts  
**When** preparing to fetch stories  
**Then** the system SHALL create a content filter instance  
**And** pass the translator instance to it  
**And** use it during the fetch pipeline

#### Scenario: Apply content filter after date filtering

**Given** stories filtered by date and sorted by score  
**And** content filtering is enabled  
**When** processing stories  
**Then** the system SHALL call `contentFilter.filterStories()`  
**And** receive only SAFE stories  
**And** pass only these stories to translation service

### Requirement: System SHALL report filtering statistics

The system SHALL provide visibility into content filtering operations.

#### Scenario: Display filtering statistics

**Given** content filtering is enabled  
**And** some stories were filtered  
**When** displaying console output  
**Then** the system SHALL show a message like "Filtered X stories based on content policy"  
**And** show the final count of stories to be processed

#### Scenario: No message when filter disabled

**Given** content filtering is disabled  
**When** processing stories  
**Then** the system SHALL NOT display content filtering messages  
**And** proceed with normal logging

## Dependencies

- [comment-fetching]: Comment fetching remains via Firebase API
- No changes required to article content scraping logic
