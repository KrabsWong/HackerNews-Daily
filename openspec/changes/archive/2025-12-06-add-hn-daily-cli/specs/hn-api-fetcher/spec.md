# Spec: hn-api-fetcher

## Overview
Fetch top stories from HackerNews API for the past 24 hours using the "best" endpoint.

## ADDED Requirements

### Requirement: Fetch Best Stories List
The system SHALL retrieve the list of best story IDs from the HackerNews API.

#### Scenario: Successful fetch of story IDs
**Given** the HackerNews API is accessible  
**When** the CLI is invoked  
**Then** the system fetches story IDs from `https://hacker-news.firebaseio.com/v0/beststories.json`  
**And** returns an array of story IDs

#### Scenario: API endpoint is unreachable
**Given** the HackerNews API endpoint is down or unreachable  
**When** the CLI attempts to fetch story IDs  
**Then** the system displays an error message "Failed to fetch HackerNews stories"  
**And** exits gracefully with non-zero status code

### Requirement: Fetch Story Details
The system SHALL retrieve detailed information for each story ID.

#### Scenario: Fetch individual story data
**Given** a valid story ID  
**When** fetching story details  
**Then** the system retrieves data from `https://hacker-news.firebaseio.com/v0/item/{id}.json`  
**And** extracts title, URL, score, and timestamp fields

#### Scenario: Story data is incomplete
**Given** a story ID that returns incomplete data (missing title)  
**When** processing the story  
**Then** the system skips that story  
**And** continues processing remaining stories

### Requirement: Filter by Time Range
The system SHALL only include stories from the past 24 hours.

#### Scenario: Story is within 24 hours
**Given** a story with timestamp within the last 24 hours  
**When** filtering stories  
**Then** the story is included in the results

#### Scenario: Story is older than 24 hours
**Given** a story with timestamp older than 24 hours  
**When** filtering stories  
**Then** the story is excluded from the results

### Requirement: Limit Result Count
The system SHALL limit the number of stories to process for performance.

#### Scenario: Limit to top 30 stories by default
**Given** more than 30 stories are available  
**When** fetching stories  
**Then** only the top 30 stories are processed  
**And** stories are ordered by their position in the best stories list
