# comment-fetcher Specification

## Purpose
Specification for comment-fetcher functionality.

## Requirements

### Requirement: Fetch Top Comments for Story
The system SHALL fetch top-level comments for HackerNews stories and return them sorted by relevance.

**Related to:** comment-summarizer (provides comments for AI summarization)

#### Scenario: Fetch comments for story with many comments
**Given** a story has 50+ comments in the `kids` array  
**When** fetching comments with limit 10  
**Then** the system fetches the first 10 comment IDs from the `kids` array  
**And** retrieves full comment details for each ID  
**And** filters out deleted or null comments  
**And** returns up to 10 valid comments

#### Scenario: Fetch comments for story with few comments
**Given** a story has 5 comments in the `kids` array  
**When** fetching comments with limit 10  
**Then** the system fetches all 5 comment IDs  
**And** retrieves full comment details  
**And** returns all valid comments (≤5)

#### Scenario: Fetch comments for story with no comments
**Given** a story has no `kids` field or `kids` is empty  
**When** fetching comments  
**Then** the system returns an empty array  
**And** does not make any additional API calls

#### Scenario: Handle deleted or invalid comments
**Given** a story has 10 comments but 3 are deleted/null  
**When** fetching comments  
**Then** the system filters out the 3 invalid comments  
**And** returns only the 7 valid comments  
**And** logs warnings for failed comment fetches

### Requirement: Extract Plain Text from HTML Comments
The system SHALL convert HTML-formatted comment text to plain text while preserving structure.

#### Scenario: Strip HTML tags from comment
**Given** a comment with text `<p>This is a <a href="...">link</a> and <code>code</code></p>`  
**When** extracting plain text  
**Then** the system returns "This is a link and code"  
**And** removes HTML tags but preserves the text content

#### Scenario: Preserve technical terms in code blocks
**Given** a comment with text `<p>Use <code>React.memo()</code> for optimization</p>`  
**When** extracting plain text  
**Then** the system returns "Use React.memo() for optimization"  
**And** preserves the code content without HTML markup

#### Scenario: Handle empty or malformed HTML
**Given** a comment with empty or malformed HTML  
**When** extracting plain text  
**Then** the system returns an empty string or cleaned text  
**And** does not throw errors

### Requirement: Batch Fetch Comments for Multiple Stories
The system SHALL efficiently fetch comments for multiple stories in parallel.

#### Scenario: Fetch comments for 30 stories in parallel
**Given** 30 stories need comment fetching  
**When** batch fetching comments  
**Then** the system fetches comments for all stories in parallel using Promise.all  
**And** returns an array of comment arrays matching the input story order  
**And** completes in approximately the time of the slowest fetch (~1-2s total)

#### Scenario: Handle mixed results in batch fetch
**Given** 10 stories where 8 have comments and 2 don't  
**When** batch fetching comments  
**Then** the system returns an array of 10 elements  
**And** 8 elements contain comment arrays  
**And** 2 elements contain empty arrays  
**And** maintains correct story-to-comments mapping

#### Scenario: One story fetch fails in batch
**Given** batch fetching 10 stories where 1 fetch fails  
**When** processing the batch  
**Then** the system logs a warning for the failed fetch  
**And** returns an empty array for that story  
**And** successfully returns comments for the other 9 stories  
**And** does not crash or halt processing

### Requirement: Display Comment Fetching Progress
The system SHALL provide clear feedback during comment fetching.

#### Scenario: Show progress during comment fetch
**Given** comment fetching is in progress  
**When** fetching comments for stories  
**Then** the system displays "Fetching top comments for each story..." message  
**And** shows completion status after fetching completes

#### Scenario: Log warnings for failed fetches
**Given** a comment fetch fails for a specific story  
**When** the failure occurs  
**Then** the system logs a warning with the story ID  
**And** continues processing other stories  
**And** does not expose errors to the user in final output
