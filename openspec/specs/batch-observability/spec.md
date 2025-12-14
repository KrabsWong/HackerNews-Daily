# batch-observability Specification

## Purpose
TBD - created by archiving change translation-and-telegram-optimizations. Update Purpose after archive.
## Requirements
### Requirement: Real-time Batch Progress Logging
The system SHALL log batch start information before processing each batch, including operation type, batch number, item count, provider name, and model name.

#### Scenario: Content batch processing starts
- **WHEN** a content summarization batch begins processing
- **THEN** the system SHALL log `[Content Summary] Processing batch X/Y: N articles | Provider: xxx/model`

#### Scenario: Comment batch processing starts
- **WHEN** a comment summarization batch begins processing
- **THEN** the system SHALL log `[Comment Summary] Processing batch X/Y: N stories | Provider: xxx/model`

### Requirement: Enhanced API Error Logging
The system SHALL provide comprehensive error context when batch API calls fail, including error message, batch size, provider, model, and fallback strategy.

#### Scenario: Batch API call fails
- **WHEN** a batch API call fails
- **THEN** the system SHALL log a structured error object with error, batchSize, provider, model, and fallbackStrategy fields

### Requirement: Enhanced JSON Parse Error Logging
The system SHALL provide detailed context when JSON parsing fails, including error message, expected items, provider, model, and reference to detailed logs.

#### Scenario: JSON parsing fails
- **WHEN** JSON parsing of batch results fails
- **THEN** the system SHALL log error, expectedItems, provider, model, note, and fallbackStrategy fields

### Requirement: Robust JSON Array Parsing
The `parseJsonArray` function SHALL handle diverse LLM response formats including markdown code blocks, text-surrounded JSON, trailing commas, and extra whitespace.

#### Scenario: JSON wrapped in markdown code block
- **WHEN** LLM response contains JSON wrapped in ```json...```
- **THEN** the system SHALL extract and parse the JSON successfully

#### Scenario: JSON with trailing commas
- **WHEN** LLM response contains JSON array with trailing commas
- **THEN** the system SHALL remove trailing commas and parse successfully

#### Scenario: JSON surrounded by explanatory text
- **WHEN** LLM response contains JSON array surrounded by explanation text
- **THEN** the system SHALL extract the array using regex and parse successfully

### Requirement: Fallback Progress Logging
The system SHALL log item-by-item progress when batch processing falls back to individual item processing.

#### Scenario: Batch fails and falls back to individual processing
- **WHEN** a batch fails and the system falls back to processing items individually
- **THEN** the system SHALL log `[Content/Comment Summary] Fallback: Processing N items individually...`
- **AND** the system SHALL log `[Content/Comment Summary] Fallback item X/N | Provider: xxx/model` for each item

### Requirement: Consistent Log Prefixes
All batch operation logs SHALL use consistent prefixes: `[Content Summary]` for content operations, `[Comment Summary]` for comment operations, and `parseJsonArray:` for JSON parsing utility logs.

#### Scenario: Log prefix consistency
- **WHEN** any batch operation logs a message
- **THEN** the log SHALL use the appropriate consistent prefix

