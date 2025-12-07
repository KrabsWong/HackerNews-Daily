# Daily Export Capability Specification Delta

## Overview
This change adds Jekyll front matter support to exported markdown files and updates the filename convention to match Jekyll's standard format. The front matter enables direct integration with Jekyll-based static site generators without manual editing.

## MODIFIED Requirements

### Requirement: Markdown File Generation
The system SHALL generate a markdown file with Jekyll-compatible YAML front matter followed by clear hierarchical content structure optimized for markdown rendering.

#### Scenario: File creation with Jekyll front matter
- **WHEN** articles are successfully fetched and filtered
- **THEN** a markdown file is created at `hacknews-export/YYYY-MM-DD-daily.md`
- **AND** the file starts with YAML front matter delimited by `---`
- **AND** front matter contains three fields: `layout: post`, `title: HackerNews Daily - YYYY-MM-DD`, and `date: YYYY-MM-DD`
- **AND** after the front matter, content contains article cards with rank, Chinese title, English title, timestamp, URL, description, and comment summary
- **AND** articles are separated by horizontal rules

#### Scenario: Jekyll front matter format
- **WHEN** markdown file is generated
- **THEN** the file SHALL start with YAML front matter in the following format:
  ```
  ---
  layout: post
  title: HackerNews Daily - YYYY-MM-DD
  date: YYYY-MM-DD
  ---
  ```
- **AND** the `layout` field SHALL always be `post`
- **AND** the `title` field SHALL start with `HackerNews Daily - ` followed by the date in YYYY-MM-DD format
- **AND** the `date` field SHALL contain the date in YYYY-MM-DD format matching the export date

#### Scenario: File structure and hierarchy
- **WHEN** markdown file is generated
- **THEN** after the front matter, each article SHALL be a H2 section: `## N. 【Chinese Title】`
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
- **WHEN** the markdown file is opened in a markdown viewer, GitHub, or Jekyll
- **THEN** the front matter SHALL be parsed correctly by Jekyll
- **AND** each article SHALL appear as a distinct section with clear visual hierarchy
- **AND** links SHALL be clickable
- **AND** the structure SHALL be easy to navigate and read

### Requirement: Filename Convention
The system SHALL name exported files using the format `YYYY-MM-DD-daily.md` where the date represents the previous calendar day and the `-daily` suffix distinguishes daily export posts.

#### Scenario: Export on December 7
- **WHEN** export is run on December 7, 2025
- **THEN** the filename SHALL be `2025-12-06-daily.md`

#### Scenario: File overwrite behavior
- **WHEN** export is run
- **AND** a file with the same date already exists
- **THEN** the system SHALL overwrite the existing file
- **AND** display a warning message indicating overwrite

### Requirement: Export Success Feedback
The system SHALL provide clear feedback about the export operation status using the new filename format.

#### Scenario: Successful export
- **WHEN** export completes successfully
- **THEN** display message `✅ Successfully exported N stories to hacknews-export/YYYY-MM-DD-daily.md`
- **AND** show file path in terminal

#### Scenario: No articles found
- **WHEN** no articles exist for the previous calendar day
- **THEN** display message `⚠️  No stories found for YYYY-MM-DD`
- **AND** do not create an empty markdown file

#### Scenario: Export error
- **WHEN** export fails due to file system error
- **THEN** display error message with details
- **AND** suggest troubleshooting steps (directory permissions, disk space)
