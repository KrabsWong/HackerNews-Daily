# shared-utilities Specification Delta

## Overview

This delta introduces shared utility modules to eliminate code duplication between CLI and Worker, ensuring consistent behavior and easier maintenance.

## ADDED Requirements

### Requirement: Shared Date Utilities
The system SHALL provide shared date utility functions used by both CLI and Worker.

#### Scenario: Get previous day boundaries
**Given** both CLI and Worker need to calculate previous day date boundaries  
**When** they call the shared `getPreviousDayBoundaries` function  
**Then** both SHALL receive identical UTC-based start and end timestamps  
**And** the date boundaries SHALL be calculated consistently  

#### Scenario: Format timestamp consistently
**Given** a Unix timestamp needs to be formatted for display  
**When** the shared `formatTimestamp` function is called  
**Then** the output format SHALL be consistent across CLI and Worker  
**And** the format SHALL include UTC timezone indicator  

### Requirement: Shared Type Definitions
The system SHALL provide shared TypeScript interfaces used by both CLI and Worker.

#### Scenario: ProcessedStory type unification
**Given** both CLI and Worker process stories into a common format  
**When** they use the `ProcessedStory` interface  
**Then** they SHALL import it from the shared types module  
**And** the interface definition SHALL be identical for both environments  

## REMOVED Requirements

### Requirement: Duplicate Date Utilities in CLI
The system SHALL define date utility functions locally in the CLI entry point.

**Reason**: Moved to shared module to eliminate duplication with Worker.

#### Scenario: Remove local getPreviousDayBoundaries from CLI
**Given** CLI has its own `getPreviousDayBoundaries` function  
**When** the refactoring is applied  
**Then** the local function SHALL be removed  
**And** CLI SHALL import from `shared/dateUtils`  

### Requirement: Duplicate Date Utilities in Worker
The system SHALL define date utility functions locally in the Worker export handler.

**Reason**: Moved to shared module to eliminate duplication with CLI.

#### Scenario: Remove local getPreviousDayBoundaries from Worker
**Given** Worker has its own `getPreviousDayBoundaries` function  
**When** the refactoring is applied  
**Then** the local function SHALL be removed  
**And** Worker SHALL import from `shared/dateUtils`  
