# Daily Export Capability Specification

## Purpose
Specification for Daily Export Capability functionality.

## Requirements

### Requirement: Export Command Option
The system SHALL provide a `--export-daily` command-line option to export articles from the previous calendar day to a markdown file.

#### Scenario: User runs export command
- **WHEN** user executes `npm run fetch -- --export-daily`
- **THEN** the system queries articles from yesterday (previous calendar day 00:00 to 23:59)
- **AND** generates a markdown file in `TLDR-HackNews24/` directory
- **AND** displays success message with file path

#### Scenario: Export with cache bypass
- **WHEN** user executes `npm run fetch -- --export-daily --no-cache`
- **THEN** the system bypasses cache and fetches fresh data
- **AND** exports yesterday's articles to markdown file

### Requirement: Previous Calendar Day Filtering
The system SHALL filter articles to only include those created during the previous calendar day (00:00:00 to 23:59:59 in local time).

#### Scenario: Query on December 7
- **WHEN** current date is December 7, 2025
- **THEN** the system queries articles from December 6, 2025 00:00:00 to December 6, 2025 23:59:59

#### Scenario: Query spans midnight
- **WHEN** user runs command at December 7, 2025 01:30 AM
- **THEN** the system queries December 6, 2025 (full day)
- **AND** excludes any articles from December 7

### Requirement: Descending Creation Order
The system SHALL sort exported articles by their creation timestamp in descending order (newest first).

#### Scenario: Multiple articles exported
- **WHEN** exporting 10 articles from yesterday
- **THEN** articles are ordered from newest to oldest by creation time
- **AND** the first article in the file is the most recent from yesterday

### Requirement: Markdown File Generation
The system SHALL generate a markdown file with clear hierarchical structure optimized for markdown rendering.

#### Scenario: File creation success
- **WHEN** articles are successfully fetched and filtered
- **THEN** a markdown file is created at `TLDR-HackNews24/hackernews-YYYY-MM-DD.md`
- **AND** the file contains article cards with rank, Chinese title, English title, timestamp, URL, description, and comment summary
- **AND** articles are separated by horizontal rules

#### Scenario: File structure and hierarchy
- **WHEN** markdown file is generated
- **THEN** the file SHALL start with a top-level heading: `# HackerNews Daily - YYYY-MM-DD`
- **AND** each article SHALL be a H2 section: `## N. 【Chinese Title】`
- **AND** the English title SHALL be displayed as plain text on the next line
- **AND** metadata SHALL be organized in a structured list format
- **AND** description and comment summary SHALL be in separate paragraphs
- **AND** articles SHALL be separated by horizontal rules (`---`)

#### Scenario: Article metadata format
- **WHEN** markdown file is generated
- **THEN** each article SHALL include metadata in the following format:
  - **发布时间**: YYYY-MM-DD HH:mm
  - **链接**: [URL](URL) (clickable markdown link)
  - **描述**: AI-generated summary in a separate paragraph
  - **评论要点**: Comment summary in a separate paragraph (if available, otherwise omitted)

#### Scenario: Markdown rendering optimization
- **WHEN** the markdown file is opened in a markdown viewer or GitHub
- **THEN** the date heading SHALL be clearly visible as the main title
- **AND** each article SHALL appear as a distinct section with clear visual hierarchy
- **AND** links SHALL be clickable
- **AND** the structure SHALL be easy to navigate and read

### Requirement: Output Directory Management
The system SHALL create and manage the `TLDR-HackNews24/` directory for storing exported markdown files.

#### Scenario: Directory creation on first export
- **WHEN** export command is run for the first time
- **AND** `TLDR-HackNews24/` directory does not exist
- **THEN** the directory is created automatically
- **AND** export proceeds normally

#### Scenario: Directory already exists
- **WHEN** export command is run
- **AND** `TLDR-HackNews24/` directory already exists
- **THEN** the system uses the existing directory
- **AND** export proceeds normally

### Requirement: Filename Convention
The system SHALL name exported files using the format `hackernews-YYYY-MM-DD.md` where the date represents the previous calendar day.

#### Scenario: Export on December 7
- **WHEN** export is run on December 7, 2025
- **THEN** the filename SHALL be `hackernews-2025-12-06.md`

#### Scenario: File overwrite behavior
- **WHEN** export is run
- **AND** a file with the same date already exists
- **THEN** the system SHALL overwrite the existing file
- **AND** display a warning message indicating overwrite

### Requirement: Export Success Feedback
The system SHALL provide clear feedback about the export operation status.

#### Scenario: Successful export
- **WHEN** export completes successfully
- **THEN** display message `✅ Successfully exported N stories to TLDR-HackNews24/hackernews-YYYY-MM-DD.md`
- **AND** show file path in terminal

#### Scenario: No articles found
- **WHEN** no articles exist for the previous calendar day
- **THEN** display message `⚠️  No stories found for YYYY-MM-DD`
- **AND** do not create an empty markdown file

#### Scenario: Export error
- **WHEN** export fails due to file system error
- **THEN** display error message with details
- **AND** suggest troubleshooting steps (directory permissions, disk space)

### Requirement: Existing Mode Compatibility
The system SHALL maintain full backward compatibility with existing CLI and web modes when export mode is not active.

#### Scenario: Normal CLI mode unchanged
- **WHEN** user runs `npm run fetch` without `--export-daily` flag
- **THEN** the system displays results in CLI terminal as before
- **AND** no markdown file is created

#### Scenario: Web mode unchanged
- **WHEN** user runs `npm run fetch:web`
- **THEN** the system starts web server and opens browser as before
- **AND** no markdown file is created
