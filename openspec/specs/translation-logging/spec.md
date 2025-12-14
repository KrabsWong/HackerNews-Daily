# translation-logging Specification

## Purpose
TBD - created by archiving change translation-and-telegram-optimizations. Update Purpose after archive.
## Requirements
### Requirement: Translation Progress Logging
The system SHALL log translation progress at regular intervals to provide visibility into long-running operations.

#### Scenario: Batch translation starts
- **GIVEN** a batch translation operation begins with N items
- **WHEN** the translation starts
- **THEN** the system SHALL log the start message with total item count, provider, and model
- **AND** include operation type (title, summary, or comments)

#### Scenario: Progress during translation
- **GIVEN** translation is processing items sequentially
- **WHEN** every 5 items are completed or every 30 seconds elapsed
- **THEN** the system SHALL log current progress with percentage complete
- **AND** include current item number and total items
- **AND** include provider and model information

#### Scenario: Translation completes
- **GIVEN** all items in a batch have been processed
- **WHEN** translation completes
- **THEN** the system SHALL log completion with success/failure summary
- **AND** include total processing time
- **AND** include per-item success rate

### Requirement: Provider and Model Logging
The system SHALL log the LLM provider and model information for all translation requests.

#### Scenario: API request logging
- **GIVEN** a translation API request is about to be sent
- **WHEN** the request is prepared
- **THEN** the system SHALL log the provider name and model
- **AND** include the operation type
- **AND** include content length being translated

#### Scenario: API response logging
- **GIVEN** a translation API response is received
- **WHEN** the response is processed
- **THEN** the system SHALL log success/failure status
- **AND** include provider and model information
- **AND** include response time in milliseconds

### Requirement: Enhanced Error Logging
The system SHALL provide detailed error logging for translation failures.

#### Scenario: Translation timeout
- **GIVEN** a translation request times out
- **WHEN** the timeout occurs
- **THEN** the system SHALL log the timeout event
- **AND** include provider, model, and timeout duration
- **AND** include content preview (first 100 characters)

#### Scenario: Translation API error
- **GIVEN** the LLM API returns an error
- **WHEN** the error is received
- **THEN** the system SHALL log the complete error details
- **AND** include provider and model information
- **AND** include retry attempt number if applicable

