# Testing Quality Improvement Specification Delta

## Overview

Improves test coverage, quality, and realism to ensure code reliability and enable confident refactoring.

## ADDED Requirements

### Requirement: Publisher Module Test Coverage
The system SHALL have comprehensive test coverage for all publisher modules.

#### Scenario: GitHub Publisher Success Path
**Given** a set of processed stories ready for publishing  
**When** GitHubPublisher.publish() is called  
**Then** system SHALL send markdown content to GitHub API  
**And** system SHALL use correct repository and branch  
**And** system SHALL handle file creation and updates correctly  
**And** test SHALL verify API call parameters

#### Scenario: GitHub Publisher Error Handling
**Given** GitHub API returns an error (401, 403, 404, or 500)  
**When** GitHubPublisher.publish() encounters error  
**Then** system SHALL NOT throw unhandled exceptions  
**And** system SHALL log error with context  
**And** system SHALL mark publish operation as failed  
**And** test SHALL verify error handling for each status code

#### Scenario: GitHub Publisher Retry Logic
**Given** a GitHub API request fails with a retryable error  
**When** publisher implements retry logic  
**Then** system SHALL retry up to configured maximum  
**And** system SHALL use exponential backoff between retries  
**And** test SHALL verify retry count and delays

#### Scenario: Telegram Publisher Batch Sending
**Given** a set of 10 stories to publish  
**When** TelegramPublisher.publish() is called with batch_size=2  
**Then** system SHALL send 5 messages (plus header/footer)  
**And** system SHALL format messages correctly  
**And** system SHALL respect rate limits between messages  
**And** test SHALL verify message count and batching logic

#### Scenario: Telegram Publisher Message Formatting
**Given** markdown content with various formatting (bold, links, code blocks)  
**When** TelegramPublisher formats message  
**Then** system SHALL convert markdown to Telegram-compatible HTML  
**And** system SHALL preserve bold and code formatting  
**And** system SHALL escape HTML entities correctly  
**And** test SHALL verify formatted output

#### Scenario: Terminal Publisher Local Test Mode
**Given** LOCAL_TEST_MODE is enabled  
**When** TerminalPublisher.publish() is called  
**Then** system SHALL output markdown to console  
**And** system SHALL NOT call external services  
**And** system SHALL format output for readability  
**And** test SHALL verify console output

### Requirement: Test Infrastructure Quality
The system SHALL provide high-quality test infrastructure for writing realistic tests.

#### Scenario: Test Builders for Complex Objects
**Given** a test needs complex objects like HNStory or ProcessedStory  
**When** using test builders (StoryBuilder, CommentBuilder, TaskBuilder)  
**Then** system SHALL provide fluent builder API  
**And** system SHALL ensure built objects match TypeScript types exactly  
**And** system SHALL include all required fields by default  
**And** test SHALL type-check built objects

#### Scenario: Common Error Scenario Mocks
**Given** a test needs to simulate error conditions  
**When** using scenario mocks (apiTimeout, rateLimited, invalidResponse)  
**Then** system SHALL provide pre-built error objects  
**Then** system SHALL match real API error structure  
**And** system SHALL include relevant context (status codes, headers)  
**And** test SHALL use scenarios consistently

#### Scenario: Realistic API Response Mocks
**Given** a test needs to mock HackerNews API responses  
**When** using mockHNApi.ts  
**Then** system SHALL use actual API response structure  
**And** system SHALL include all important fields  
**And** system SHALL support different response scenarios (success, error)  
**And** test SHALL verify mock data matches types

### Requirement: Strong Test Assertions
The system SHALL use strong, explicit assertions that do not hide failures.

#### Scenario: No Optional Checking
**Given** a test verifies an operation result  
**When** writing assertions  
**Then** system SHALL NOT use optional checks to hide failures (e.g., `if (result) { expect(...) }`)  
**And** system SHALL explicitly check for expected or unexpected results (e.g., `expect(result).toBeDefined()` or `expect(result).toBeNull()`)

#### Scenario: Property-Based Assertions for Filters
**Given** a test verifies filter logic  
**When** asserting filter output  
**Then** system SHALL use property-based assertions (e.g., "all items lack keyword")  
**And** system SHALL provide specific examples that violate the property  
**And** test SHALL verify the property holds for all output

#### Scenario: Error Message Verification
**Given** a test expects an error to be thrown  
**When** error is caught  
**Then** system SHALL verify the error message content using regex  
**And** system SHALL NOT just verify that an error was thrown  
**And** test SHALL check for specific error codes or patterns

### Requirement: Integration Test Coverage
The system SHALL have integration tests covering end-to-end workflows.

#### Scenario: Complete Daily Export Workflow
**Given** system is triggered for a daily export  
**When** entire workflow executes  
**Then** test SHALL verify state machine transitions (init → list_fetched → processing → aggregating → published)  
**And** test SHALL verify article processing completes successfully  
**And** test SHALL verify markdown is generated and published  
**And** test SHALL verify database state is updated correctly

#### Scenario: Batch Processing Logic
**Given** 30 articles need processing with TASK_BATCH_SIZE=6  
**When** batch processing executes  
**Then** test SHALL verify 5 batches are processed  
**And** test SHALL verify each batch processes 6 articles  
**And** test SHALL verify progress is tracked correctly  
**And** test SHALL verify all articles reach completed or failed status

#### Scenario: Error Recovery and Retry
**Given** an article processing fails initially  
**When** retry logic is triggered  
**Then** test SHALL verify article is reset to pending  
**And** test SHALL verify retry respects MAX_RETRY_COUNT  
**Then** test SHALL verify final status is correctly marked

#### Scenario: Multi-Publisher Coordination
**Given** both GitHub and Telegram publishers are enabled  
**When** results are published  
**Then** test SHALL verify both publishers receive the content  
**And** test SHALL verify failure of one publisher does not affect the other  
**And** test SHALL verify proper error handling for failed publishers

## MODIFIED Requirements

### Requirement: Test Coverage Targets
The system SHALL achieve specific test coverage targets to ensure code quality.

#### Scenario: Phased Coverage Improvement
**Given** current test coverage is 55% lines/statements, 62% functions, 84% branches  
**When** implementing Phase 1 improvements  
**Then** system SHALL achieve 70% lines/statements and 75% functions coverage  
**When** implementing Phase 2 improvements  
**Then** system SHALL achieve 80% lines/statements and 80% functions coverage

#### Scenario: Module-Specific Coverage Goals
**Given** different modules have varying importance and complexity  
**When** setting coverage targets per module  
**Then** Utils module SHALL achieve 100% target  
**And** API module SHALL achieve 90%+ target  
**And** Services module SHALL achieve 85%+ target  
**And** Worker module SHALL achieve 85%+ target  
**And** Publishers module SHALL achieve 85%+ target (currently 6-10%)  
**And** Integration tests SHALL achieve 80%+ target
