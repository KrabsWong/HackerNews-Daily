# display-formatter Specification

## Purpose
Specification for display-formatter functionality.

## Requirements

### Requirement: Display Story Information in Card Format
The system SHALL display each story as a multi-line card instead of a table row.

#### Scenario: Display story card with all information
**Given** a processed story with title, translation, time, URL, and description  
**When** rendering the story  
**Then** the system displays a card with the following format:
```
#<rank> 【<chinese_title>】
<english_title>
发布时间：<YYYY-MM-DD HH:mm>
链接：<url>
描述：<chinese_description>
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
**And** each field is on its own line

#### Scenario: Display story without description
**Given** a processed story where article fetch failed  
**When** rendering the story  
**Then** the system displays the card with "描述：暂无描述"  
**And** all other fields are displayed normally

#### Scenario: Handle long titles and descriptions
**Given** a story with very long title or description  
**When** rendering the story  
**Then** the system displays full text without truncation  
**And** wraps text naturally at terminal width  
**And** maintains card structure readability

### Requirement: Visual Separation Between Stories
The system SHALL clearly separate stories for easy scanning.

#### Scenario: Display multiple story cards
**Given** multiple processed stories  
**When** rendering all stories  
**Then** each story card is followed by a separator line  
**And** separator uses box-drawing characters (━) for visual clarity  
**And** last story also includes separator for consistency

### Requirement: Format Timestamp Display
The system SHALL convert and display story timestamps in absolute local time format.

#### Scenario: Convert Unix timestamp to local time
**Given** a story with Unix timestamp (e.g., 1733484600)  
**When** formatting the timestamp  
**Then** the system converts to local timezone  
**And** displays in format "YYYY-MM-DD HH:mm"  
**And** uses 24-hour time format

#### Scenario: Handle timezone differences
**Given** stories published at different times  
**When** displaying timestamps  
**Then** all timestamps are in user's local timezone  
**And** format is consistent across all stories

### Requirement: Score and Rank Display
The system SHALL display story rank and optionally include score information.

#### Scenario: Show rank number
**Given** stories ordered by their position  
**When** rendering cards  
**Then** each card starts with "#<number>" prefix  
**And** rank numbers start from 1  
**And** rank is visually distinct (part of Chinese title line)

#### Scenario: Include score in display (optional enhancement)
**Given** a story with score information  
**When** rendering the card  
**Then** score can be included in title line or as separate field  
**And** format is clear (e.g., "评分：150")

## REMOVED Requirements

### Requirement: Display Results in Console Table
~~The system SHALL format output as a readable console table.~~

**Reason**: Replaced by card-based display format for better space utilization and readability.

#### Scenario: Display stories in table format
~~**Given** stories have been fetched and translated  
**When** rendering output  
**Then** the system displays a table with columns: Rank, Title (Chinese), Title (Original), Score, URL  
**And** the table is properly aligned and formatted~~

**Removed**: Table format no longer used.

#### Scenario: Handle long titles
~~**Given** a title exceeds terminal width  
**When** rendering the table  
**Then** the system wraps or truncates long titles  
**And** maintains table readability~~

**Removed**: Card format handles long content naturally without truncation.
