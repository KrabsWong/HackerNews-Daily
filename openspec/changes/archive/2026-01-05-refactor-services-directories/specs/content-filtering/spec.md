# content-filtering Specification Delta

## Overview
Refactoring the content-filtering service from a single file (`src/services/contentFilter.ts`) into a directory structure (`src/services/contentFilter/`) with multiple focused files. This is a pure structural refactoring with no behavioral changes.

## ADDED Requirements

### Requirement: Service SHALL use directory-based module structure
The content-filtering service SHALL be organized as a directory with multiple focused files instead of a single file.

#### Scenario: Organize service into separate modules
**Given** the content-filtering service needs to be refactored  
**When** creating the new directory structure  
**Then** system SHALL create directory `src/services/contentFilter/`  
**And** create `index.ts` for main exports and AIContentFilter class  
**And** create `classifier.ts` for AI classification logic  
**And** create `prompt.ts` for LLM prompt building  
**And** create `parser.ts` for response parsing and validation

#### Scenario: Export only public API
**Given** refactored service structure  
**When** defining public exports in `index.ts`  
**Then** system SHALL export only `AIContentFilter` class  
**And** internal types remain unexported for encapsulation  
**And** internal functions are not re-exported

### Requirement: Service SHALL separate classification logic
AI classification logic SHALL be isolated in a dedicated file.

#### Scenario: Isolate classification functions
**Given** classification logic needs to be separated  
**When** creating `classifier.ts`  
**Then** file SHALL contain `classifyTitles` function  
**And** contain `sendClassificationRequest` function as exported utility  
**And** coordinate with LLM provider for API communication  
**And** import parser module for response processing

### Requirement: Service SHALL separate prompt building
Prompt building logic SHALL be isolated in a dedicated file.

#### Scenario: Isolate prompt building functions
**Given** prompt building needs to be separated  
**When** creating `prompt.ts`  
**Then** file SHALL contain `buildClassificationPrompt` function  
**And** contain sensitivity guidelines configuration  
**And** generate context-aware prompts with role definition  
**And** format prompts for JSON response structure

### Requirement: Service SHALL separate response parsing
Response parsing and validation logic SHALL be isolated in a dedicated file.

#### Scenario: Isolate parsing functions
**Given** response parsing needs to be separated  
**When** creating `parser.ts`  
**Then** file SHALL contain `parseClassificationResponse` function  
**And** extract JSON from AI response with precise error handling  
**And** validate classification array structure  
**And** validate each classification item (index, classification value)
