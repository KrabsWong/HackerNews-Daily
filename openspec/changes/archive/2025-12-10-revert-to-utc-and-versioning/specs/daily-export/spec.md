# Daily Export Specification Delta

## Overview
Revert timezone handling from Beijing time back to UTC for simplicity and consistency with HackerNews API timestamps.

## MODIFIED Requirements

### Requirement: Previous Calendar Day Filtering
The system SHALL filter articles to only include those created during the previous calendar day (00:00:00 to 23:59:59 in UTC timezone).

#### Scenario: Query on December 7 UTC
**Given** current UTC time is December 7, 2025 01:00 (after GitHub Action runs)  
**When** export daily command executes  
**Then** the system queries articles from December 6, 2025 00:00:00 to December 6, 2025 23:59:59 UTC  
**And** uses Unix timestamps directly for API filtering without timezone conversion

#### Scenario: Query spans midnight in UTC
**Given** user runs command at December 7, 2025 01:30 AM UTC  
**When** filtering articles  
**Then** the system queries December 6, 2025 (full day in UTC timezone)  
**And** excludes any articles from December 7 UTC  
**And** uses system UTC time for calculations

#### Scenario: Timestamp display in UTC
**Given** an article with Unix timestamp  
**When** formatting for display or export  
**Then** the system converts timestamp to UTC  
**And** displays time in format "YYYY-MM-DD HH:mm" in UTC  
**And** no timezone conversion is performed

### Requirement: Markdown File Generation
The system SHALL generate a markdown file with Jekyll-compatible YAML front matter using UTC dates followed by clear hierarchical content structure optimized for markdown rendering.

#### Scenario: Jekyll front matter with UTC date
**Given** articles are successfully fetched and filtered  
**When** generating Jekyll front matter  
**Then** the `title` field SHALL use UTC date: `HackerNews Daily - YYYY-MM-DD`  
**And** the `date` field SHALL use UTC date: `YYYY-MM-DD`  
**And** both dates SHALL match the previous day in UTC timezone

#### Scenario: Article timestamps in UTC
**Given** markdown file is generated  
**When** formatting article metadata  
**Then** each article's **发布时间** SHALL display UTC time in format `YYYY-MM-DD HH:mm`  
**And** no timezone offset is applied  
**And** all times use UTC directly from Unix timestamps

### Requirement: Filename Convention
The system SHALL name exported files using the format `YYYY-MM-DD-daily.md` where the date represents the previous calendar day in UTC timezone and the `-daily` suffix distinguishes daily export posts.

#### Scenario: Export on December 7 UTC
**Given** export runs at 01:00 UTC on December 7, 2025  
**When** generating the markdown filename  
**Then** the filename SHALL be `2025-12-06-daily.md`  
**And** the date corresponds to the previous day in UTC timezone

#### Scenario: Filename uses UTC date
**Given** the GitHub Action runs at 01:00 UTC  
**When** generating the markdown filename  
**Then** the system SHALL use UTC timezone date calculation  
**And** ensure consistency between filename and article content dates using UTC

#### Scenario: File overwrite behavior
**Given** export is run  
**When** a file with the same UTC date already exists  
**Then** the system SHALL overwrite the existing file in the local export directory  
**And** display a warning message indicating overwrite

### Requirement: Export Success Feedback
The system SHALL provide clear feedback about the export operation status using UTC timezone dates in the filename format.

#### Scenario: Successful export with UTC date
**Given** export completes successfully at 01:00 UTC December 7  
**When** displaying success message  
**Then** display message `✅ Successfully exported N stories to hacknews-export/2025-12-06-daily.md`  
**And** show file path using UTC date in terminal

#### Scenario: No articles found for UTC date
**Given** no articles exist for the previous calendar day in UTC timezone  
**When** displaying message  
**Then** display message `⚠️  No stories found for 2025-12-06` using UTC date  
**And** do not create an empty markdown file
