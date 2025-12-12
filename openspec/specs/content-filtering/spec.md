# content-filtering Specification

## Purpose
This specification defines the AI-powered content filtering capability that classifies HackerNews story titles to filter out sensitive content before translation and processing.
## Requirements
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

### Requirement: System SHALL filter stories based on AI classification

The system SHALL remove stories classified as "SENSITIVE" from the processing pipeline.

#### Scenario: Filter sensitive stories

**Given** stories with classifications from the AI  
**And** some stories classified as "SENSITIVE"  
**When** applying the filter  
**Then** the system SHALL keep only stories classified as "SAFE"  
**And** discard all stories classified as "SENSITIVE"

#### Scenario: Preserve story order

**Given** filtered stories  
**When** returning results  
**Then** the system SHALL preserve the original order of SAFE stories  
**And** maintain story metadata unchanged

### Requirement: System SHALL support configurable sensitivity levels

The system SHALL provide three sensitivity levels: low, medium, and high.

#### Scenario: Apply low sensitivity filtering

**Given** sensitivity level set to "low"  
**When** the AI classifies titles  
**Then** the system SHALL only mark content as SENSITIVE if it explicitly violates Chinese law or contains explicit adult/violent content

#### Scenario: Apply medium sensitivity filtering

**Given** sensitivity level set to "medium" (default)  
**When** the AI classifies titles  
**Then** the system SHALL mark content as SENSITIVE if it relates to Chinese political controversies, explicit content, or illegal activities

#### Scenario: Apply high sensitivity filtering

**Given** sensitivity level set to "high"  
**When** the AI classifies titles  
**Then** the system SHALL mark content as SENSITIVE if it relates to any Chinese political topics, censorship, or potentially controversial content

### Requirement: System SHALL allow enabling/disabling content filter

The system SHALL support a configuration option to enable or disable content filtering.

#### Scenario: Filter disabled by default

**Given** no explicit configuration  
**When** the system starts  
**Then** content filtering SHALL be disabled  
**And** all stories SHALL pass through without filtering

#### Scenario: Enable filter via environment variable

**Given** environment variable `ENABLE_CONTENT_FILTER=true`  
**When** the system initializes  
**Then** content filtering SHALL be enabled  
**And** stories SHALL be classified and filtered

#### Scenario: Bypass filter when disabled

**Given** content filter is disabled  
**When** `filterStories()` is called  
**Then** the system SHALL return all stories immediately  
**And** SHALL NOT make any API calls to the LLM

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

### Requirement: System SHALL provide filter statistics

The system SHALL log information about filtering operations.

#### Scenario: Log filtered story count

**Given** content filtering is enabled  
**And** some stories are classified as SENSITIVE  
**When** filtering completes  
**Then** the system SHALL log the number of filtered stories  
**And** display it in the console output

#### Scenario: Warn on excessive filtering

**Given** more than 50% of stories are filtered  
**When** filtering completes  
**Then** the system SHALL log a warning  
**And** suggest reviewing sensitivity settings

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

### Requirement: System SHALL build context-aware AI prompts

The system SHALL construct AI prompts that include role definition, sensitivity guidelines, and response format specifications.

#### Scenario: Build classification prompt

**Given** a list of story titles and a sensitivity level  
**When** building the AI prompt  
**Then** the system SHALL include a role description for content moderation  
**And** include sensitivity level guidelines  
**And** specify the expected JSON response format  
**And** include all titles numbered sequentially

#### Scenario: Include sensitivity guidelines in prompt

**Given** a sensitivity level (low, medium, or high)  
**When** building the prompt  
**Then** the system SHALL include appropriate guidelines for that level  
**And** explain what constitutes SENSITIVE content at that level

### Requirement: System SHALL configure timeout for classification

The system SHALL enforce a timeout for AI classification requests.

#### Scenario: Set classification timeout

**Given** the content filter configuration  
**When** making an AI classification request  
**Then** the system SHALL set a timeout of 15000 milliseconds  
**And** abort the request if it exceeds the timeout

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

