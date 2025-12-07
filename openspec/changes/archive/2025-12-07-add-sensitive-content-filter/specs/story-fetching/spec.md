# Story Fetching Specification Delta

## Overview

This delta modifies the story fetching capability to integrate AI-based content filtering before translation.

## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: System SHALL process stories through filtering pipeline

The system SHALL execute story processing in the correct sequence: fetch → filter by date → filter by content → translate.

#### Scenario: Execute filtering pipeline in order

**Given** a request to fetch top stories  
**When** the fetch pipeline executes  
**Then** the system SHALL:
1. Fetch stories from HackerNews API  
2. Filter by date range  
3. Sort by score  
4. Apply content filtering (if enabled)  
5. Translate titles for filtered stories  
6. Fetch article content for filtered stories  
7. Generate summaries for filtered stories

#### Scenario: Update story count after filtering

**Given** stories are filtered by content policy  
**And** N stories are removed  
**When** displaying results  
**Then** the system SHALL show the post-filter story count  
**And** log the number of stories filtered

## ADDED Requirements

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

- [content-filtering]: New capability that provides the filtering service
- [translation-service]: Receives filtered stories instead of all stories
- [constants-config]: Provides content filter configuration
