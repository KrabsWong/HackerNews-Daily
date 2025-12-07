# story-fetch-reliability Specification

## Purpose
Specification for story-fetch-reliability functionality.

## Requirements

### Requirement: Adaptive Story Fetching Strategy
The system SHALL fetch additional stories beyond the user's requested limit to compensate for time-based filtering, ensuring the final result count approximates the user's request.

**Related to:** story-limit-validation (limit enforcement)

#### Scenario: Calculate fetch buffer for time filtering
**Given** the user requests 30 stories with a 24-hour time window  
**When** determining how many stories to fetch from the API  
**Then** the system calculates a fetch multiplier based on the time window  
**And** fetches approximately 2.5x the requested limit for 24-hour windows  
**And** fetches approximately 1.5x the requested limit for 48+ hour windows

#### Scenario: Fetch additional stories to compensate for filtering
**Given** `HN_STORY_LIMIT=30` and `HN_TIME_WINDOW_HOURS=24`  
**When** fetching stories from HackerNews API  
**Then** the system requests up to 75 story IDs (30 × 2.5)  
**And** fetches details for all 75 stories  
**And** applies time filtering  
**And** returns approximately 25-30 stories that match the time window

#### Scenario: Respect maximum safe limit when calculating buffer
**Given** the user requests 30 stories (at maximum limit)  
**When** calculating the buffered fetch count  
**Then** the system still respects the validated maximum of 30  
**And** does not allow the buffer calculation to exceed 100 story fetches  
**And** caps buffered fetches at 100 total for performance

#### Scenario: Handle insufficient stories after filtering
**Given** only 5 stories exist within the time window  
**When** the fetch and filter process completes  
**Then** the system returns those 5 stories  
**And** displays a message: "Found {count} stories from the past {hours} hours"  
**And** suggests adjusting `HN_TIME_WINDOW_HOURS` or `HN_STORY_LIMIT` if count is very low

### Requirement: Report Actual vs Requested Count
The system SHALL inform users when the returned story count differs significantly from their requested limit due to time filtering.

#### Scenario: Returned count matches requested limit
**Given** user requests 30 stories  
**When** 28 stories are returned after filtering  
**Then** the system displays "✅ Successfully fetched and translated 28 stories"  
**And** no additional advisory message is shown

#### Scenario: Returned count is significantly lower than requested
**Given** user requests 30 stories  
**When** only 8 stories are returned after filtering  
**Then** the system displays "✅ Successfully fetched and translated 8 stories"  
**And** displays advisory: "⚠️ Only 8 stories found in the past 24 hours. Try increasing HN_TIME_WINDOW_HOURS for more results."

#### Scenario: No stories found in time window
**Given** user requests stories with very restrictive time window  
**When** zero stories match the time filter  
**Then** the system displays "⚠️ No stories found in the specified time window."  
**And** suggests increasing `HN_TIME_WINDOW_HOURS` or `HN_STORY_LIMIT`  
**And** exits gracefully without error

## MODIFIED Requirements (Updates to Existing)

### Requirement: Limit Result Count
The system SHALL limit the number of stories to process for performance, with adaptive fetching to meet user expectations.

#### Scenario: Fetch with buffer for time filtering (UPDATED)
**Given** user requests 30 stories  
**When** fetching stories with 24-hour time window  
**Then** the system fetches up to 75 story IDs initially (30 × 2.5 buffer)  
**And** applies time filtering to achieve close to 30 final results  
**And** stories are ordered by their position in the best stories list

#### Scenario: Enforce absolute maximum fetch limit (NEW)
**Given** any user configuration  
**When** calculating buffered fetch count  
**Then** the system never fetches more than 100 stories from the API  
**And** logs a warning if buffer calculation would exceed this limit
