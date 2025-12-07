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

The system SHALL filter stories to only include those within the specified time window.

#### Scenario: Filter stories from last 24 hours

**Given** stories fetched from the best list  
**And** a time window of 24 hours  
**When** applying date filter  
**Then** the system SHALL keep only stories where `created_at_i > (now - 24h)`  
**And** discard stories outside the time window

#### Scenario: Filter specific date range for daily export

**Given** a request to export stories from a specific date  
**When** filtering by date boundaries (start: 00:00:00, end: 23:59:59)  
**Then** the system SHALL keep only stories where `created_at_i` is within that range

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

## Dependencies

- [comment-fetching]: Comment fetching remains via Firebase API
- No changes required to article content scraping logic
