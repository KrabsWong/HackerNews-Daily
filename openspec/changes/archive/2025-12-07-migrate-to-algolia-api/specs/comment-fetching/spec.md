# Spec: Comment Fetching Strategy

## Overview

Maintain comment fetching functionality while migrating story fetching to Algolia API. This spec defines the strategy for fetching comment details.

## Context

Algolia's search endpoints provide `num_comments` but not comment content. We keep using Firebase API for comments.

## ADDED Requirements

### Requirement: System SHALL fetch comment details for stories

The system SHALL fetch top comments for each story using Firebase API.

#### Scenario: Fetch comments using Firebase API

**Given** a story ID from Algolia response  
**When** fetching comments  
**Then** the system SHALL use Firebase API: `GET https://hacker-news.firebaseio.com/v0/item/{storyId}.json`  
**And** extract `kids` array for comment IDs  
**And** fetch each comment via `GET /v0/item/{commentId}.json`  
**And** return array of `HNComment` objects

#### Scenario: Handle stories without kids field

**Given** a story fetched from Algolia without `kids` field  
**When** fetching comments  
**Then** the system SHALL make a Firebase API call to get story details  
**And** extract `kids` array from Firebase response  
**And** proceed with comment fetching as usual

### Requirement: System SHALL optimize comment fetching with dual API approach

The system SHALL support fetching story metadata from Algolia while efficiently retrieving comment IDs from Firebase.

#### Scenario: Minimize Firebase API calls

**Given** stories fetched from Algolia  
**When** fetching comments  
**Then** for each story, make 1 Firebase request to get `kids` array  
**And** make N Firebase requests for N comment IDs  
**And** maintain existing concurrency and error handling

## Dependencies

- [story-fetching]: Stories are fetched via hybrid Firebase + Algolia approach
- Existing `HNComment` interface remains unchanged
- Existing comment parsing and HTML stripping logic unchanged

## Out of Scope

- Migrating comment fetching to Algolia items API
- Changes to comment ranking or filtering logic
- Changes to comment summarization logic
