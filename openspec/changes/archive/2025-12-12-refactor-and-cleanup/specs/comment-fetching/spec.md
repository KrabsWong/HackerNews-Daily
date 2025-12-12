# comment-fetching Specification Delta

## Overview

This delta removes deprecated Firebase-based comment fetching functions and standardizes on the Algolia-based approach for both CLI and Worker.

## REMOVED Requirements

### Requirement: Firebase Comment Fetching
The system SHALL support fetching comments via Firebase API.

**Reason**: Deprecated in favor of Algolia-based fetching which is 11x more efficient (30 requests vs 330 requests for 30 stories). The Worker already uses Algolia exclusively. CLI will be aligned to use the same approach.

#### Scenario: Remove deprecated Firebase functions
**Given** the codebase contains deprecated `fetchCommentsBatch`, `fetchComments`, and `fetchCommentDetails` functions  
**When** the refactoring is applied  
**Then** these functions SHALL be removed from `hackerNews.ts`  
**And** CLI SHALL use `fetchCommentsBatchFromAlgolia` instead  

## MODIFIED Requirements

### Requirement: Unified Comment Fetching Strategy
The system SHALL use Algolia Search API for fetching comments in both CLI and Worker environments.

#### Scenario: CLI uses Algolia for comments
**Given** the CLI is processing stories  
**When** it needs to fetch comments for summarization  
**Then** it SHALL use `fetchCommentsBatchFromAlgolia` function  
**And** it SHALL NOT use the deprecated Firebase-based functions  

#### Scenario: Worker uses Algolia for comments
**Given** the Worker is processing stories  
**When** it needs to fetch comments for summarization  
**Then** it SHALL use `fetchCommentsBatchFromAlgolia` function  
**And** behavior SHALL be consistent with CLI  
