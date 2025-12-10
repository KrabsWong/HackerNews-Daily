# Daily Export Specification Delta

## Overview
Migrate all date/time operations from UTC timezone to Beijing timezone (UTC+8) to ensure consistency with Chinese user expectations and GitHub Actions execution context.

## MODIFIED Requirements

### Requirement: Previous Calendar Day Filtering
The system SHALL filter articles to only include those created during the previous calendar day (00:00:00 to 23:59:59 in Beijing timezone UTC+8).

#### Scenario: Query on December 7 Beijing time
**Given** current Beijing time is December 7, 2025 00:20 (after GitHub Action runs)  
**When** export daily command executes  
**Then** the system queries articles from December 6, 2025 00:00:00 to December 6, 2025 23:59:59 Beijing time  
**And** converts Beijing time boundaries to Unix timestamps for API filtering

#### Scenario: Query spans midnight in Beijing time
**Given** user runs command at December 7, 2025 01:30 AM Beijing time  
**When** filtering articles  
**Then** the system queries December 6, 2025 (full day in Beijing timezone)  
**And** excludes any articles from December 7 Beijing time  
**And** correctly handles UTC offset conversion (Beijing = UTC + 8)

#### Scenario: Timestamp display in Beijing time
**Given** an article with Unix timestamp  
**When** formatting for display or export  
**Then** the system converts timestamp to Beijing timezone  
**And** displays time in format "YYYY-MM-DD HH:mm" in Beijing time  
**And** ensures consistency with expected user timezone

### Requirement: Filename Convention
The system SHALL name exported files using the format `YYYY-MM-DD-daily.md` where the date represents the previous calendar day in Beijing timezone (UTC+8) and the `-daily` suffix distinguishes daily export posts.

#### Scenario: Export on December 7 Beijing time
**Given** export runs at 00:20 Beijing time on December 7, 2025  
**When** generating the markdown filename  
**Then** the filename SHALL be `2025-12-06-daily.md`  
**And** the date corresponds to the previous day in Beijing timezone

#### Scenario: Filename uses Beijing date not UTC date
**Given** the GitHub Action runs at 16:20 UTC (00:20 Beijing time next day)  
**When** generating the markdown filename  
**Then** the system SHALL use Beijing timezone date calculation  
**And** NOT use UTC date which would be one day behind  
**And** ensure consistency between filename and article content dates

#### Scenario: File overwrite behavior
**Given** export is run  
**When** a file with the same Beijing date already exists  
**Then** the system SHALL overwrite the existing file  
**And** display a warning message indicating overwrite

### Requirement: Markdown File Generation
The system SHALL generate a markdown file with Jekyll-compatible YAML front matter using Beijing timezone dates followed by clear hierarchical content structure optimized for markdown rendering.

#### Scenario: Jekyll front matter with Beijing date
**Given** articles are successfully fetched and filtered  
**When** generating Jekyll front matter  
**Then** the `title` field SHALL use Beijing date: `HackerNews Daily - YYYY-MM-DD`  
**And** the `date` field SHALL use Beijing date: `YYYY-MM-DD`  
**And** both dates SHALL match the previous day in Beijing timezone

#### Scenario: Article timestamps in Beijing time
**Given** markdown file is generated  
**When** formatting article metadata  
**Then** each article's **发布时间** SHALL display Beijing time in format `YYYY-MM-DD HH:mm`  
**And** NOT display UTC time  
**And** ensure all times are converted from Unix timestamp to Beijing timezone

### Requirement: Export Success Feedback
The system SHALL provide clear feedback about the export operation status using Beijing timezone dates in the new filename format.

#### Scenario: Successful export with Beijing date
**Given** export completes successfully at 00:20 Beijing time December 7  
**When** displaying success message  
**Then** display message `✅ Successfully exported N stories to hacknews-export/2025-12-06-daily.md`  
**And** show file path using Beijing date in terminal

#### Scenario: No articles found for Beijing date
**Given** no articles exist for the previous calendar day in Beijing timezone  
**When** displaying message  
**Then** display message `⚠️  No stories found for 2025-12-06` using Beijing date  
**And** do not create an empty markdown file
