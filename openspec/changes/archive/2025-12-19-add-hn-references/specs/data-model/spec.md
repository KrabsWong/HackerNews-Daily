# ProcessedStory Data Model Specification Delta

## Overview

Extends `ProcessedStory` interface to include HackerNews story ID for traceability and user navigation to original discussions.

## ADDED Requirements

### Requirement: ProcessedStory SHALL include storyId field

The system SHALL extend the `ProcessedStory` interface to include a numeric `storyId` field that uniquely identifies the story on HackerNews.

#### Scenario: Story ID preserved during processing

**Given** a story fetched from HackerNews with ID 46313991  
**When** the story is processed into ProcessedStory format  
**Then** the `storyId` field SHALL be set to 46313991  
**And** this field SHALL be available for downstream export operations

#### Scenario: Story ID available for external reference

**Given** a ProcessedStory object with populated storyId  
**When** exporting to markdown or other formats  
**Then** the storyId SHALL be used to construct HackerNews URL: `https://news.ycombinator.com/item?id={storyId}`  
**And** users SHALL be able to click to navigate to the original discussion

### Requirement: Backward compatibility with existing ProcessedStory fields

The system SHALL extend the `ProcessedStory` interface with the new `storyId` field while preserving all existing fields and their behavior for backward compatibility.

#### Scenario: Backward compatibility maintained

**Given** existing code that creates ProcessedStory objects  
**When** the interface is extended with storyId  
**Then** all existing fields (rank, titleChinese, titleEnglish, score, url, time, timestamp, description, commentSummary) SHALL remain unchanged  
**And** storyId SHALL be a required field in all new ProcessedStory creations
