# content-filtering Specification Delta

## Overview
Modifies the content filtering service to use the LLM provider abstraction layer instead of direct DeepSeek API calls, enabling support for multiple LLM providers for content classification.

## MODIFIED Requirements

### Requirement: System SHALL provide AI-based content classification
The system SHALL use an LLM (Large Language Model) to classify story titles as "SAFE" or "SENSITIVE" based on Chinese content policies.

#### Scenario: Classify story titles in batch
**Given** a list of HackerNews story titles in English  
**When** the content filter is invoked  
**Then** the system SHALL send all titles to the configured LLM provider in a single batch request  
**And** receive a classification result for each title

#### Scenario: Parse AI classification response
**Given** an AI response containing classification results  
**When** parsing the response  
**Then** the system SHALL extract a JSON array from the response  
**And** validate that each result contains an index and classification  
**And** classification SHALL be either "SAFE" or "SENSITIVE"

### Requirement: System SHALL integrate with existing translator service
The system SHALL reuse the LLM provider infrastructure for API communication.

#### Scenario: Use provider abstraction for LLM communication
**Given** a content filter instance  
**When** sending classification requests  
**Then** the system SHALL use the configured LLM provider  
**And** leverage existing timeout and error handling

#### Scenario: Reuse existing API credentials
**Given** the LLM provider is initialized with the appropriate API key  
**When** content filter makes classification requests  
**Then** the system SHALL use the same provider instance  
**And** SHALL NOT require separate configuration for content filtering

### Requirement: System SHALL handle AI classification errors gracefully
The system SHALL implement fallback behavior when AI classification fails.

#### Scenario: Fallback on API failure
**Given** the LLM provider API is unavailable  
**When** attempting to classify stories  
**Then** the system SHALL catch the error  
**And** log a warning message  
**And** return all stories unfiltered (fail-open behavior)

#### Scenario: Fallback on invalid response
**Given** the AI returns an invalid or malformed response  
**When** parsing the classification results  
**Then** the system SHALL catch the parsing error  
**And** log a warning message  
**And** return all stories unfiltered

#### Scenario: Fallback on timeout
**Given** the AI classification request exceeds 15 seconds  
**When** the timeout occurs  
**Then** the system SHALL abort the request  
**And** return all stories unfiltered

#### Scenario: Fallback on partial results
**Given** the AI returns classifications for only some stories  
**When** validating the response  
**Then** the system SHALL detect the mismatch  
**And** log a warning  
**And** return all stories unfiltered

## ADDED Requirements

### Requirement: Accept LLM Provider Instance
The system SHALL accept an LLM provider instance for API communication.

#### Scenario: Constructor accepts provider
**Given** an AIContentFilter is being created  
**When** passing constructor parameters  
**Then** the system SHALL accept an optional LLM provider instance  
**And** use it for all classification requests

#### Scenario: Create default provider when not provided
**Given** an AIContentFilter is being created without a provider  
**When** initializing the filter  
**Then** the system SHALL create a default provider based on configuration  
**And** use it for classification requests
