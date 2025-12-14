# llm-batch-size-fix Specification

## Purpose
TBD - created by archiving change translation-and-telegram-optimizations. Update Purpose after archive.
## Requirements
### Requirement: Respect User-Configured LLM Batch Size
The system SHALL respect the user-configured `LLM_BATCH_SIZE` environment variable when `MAX_BATCH_SIZE=0` (no limit).

#### Scenario: User sets batch size with no max limit
- **GIVEN** `LLM_BATCH_SIZE` is set to 15
- **AND** `LLM_BATCH_CONFIG.MAX_BATCH_SIZE` is 0 (no limit)
- **WHEN** `parseLLMBatchSize` is called
- **THEN** it SHALL return 15

#### Scenario: User explicitly disables batching
- **GIVEN** `LLM_BATCH_SIZE` is explicitly set to 0
- **WHEN** `parseLLMBatchSize` is called
- **THEN** it SHALL return 0 (process all items at once)

### Requirement: Zero Configuration Means No Constraint
When `MIN_BATCH_SIZE` or `MAX_BATCH_SIZE` is set to 0, that constraint SHALL be ignored (0 means "no constraint").

#### Scenario: Max batch size is zero
- **GIVEN** `MAX_BATCH_SIZE` is 0
- **AND** user sets `LLM_BATCH_SIZE` to 15
- **WHEN** batch size is calculated
- **THEN** no upper limit SHALL be applied and 15 SHALL be used

#### Scenario: Min batch size is zero
- **GIVEN** `MIN_BATCH_SIZE` is 0
- **AND** user sets `LLM_BATCH_SIZE` to 5
- **WHEN** batch size is calculated
- **THEN** no lower limit SHALL be applied and 5 SHALL be used

### Requirement: Apply Constraints When Set
When `MIN_BATCH_SIZE` or `MAX_BATCH_SIZE` is greater than 0, the constraint SHALL be applied to the user-specified batch size.

#### Scenario: User batch size below minimum
- **GIVEN** `MIN_BATCH_SIZE` is 5
- **AND** user sets `LLM_BATCH_SIZE` to 3
- **WHEN** batch size is calculated
- **THEN** 5 SHALL be returned (enforcing minimum)

#### Scenario: User batch size above maximum
- **GIVEN** `MAX_BATCH_SIZE` is 20
- **AND** user sets `LLM_BATCH_SIZE` to 30
- **WHEN** batch size is calculated
- **THEN** 20 SHALL be returned (enforcing maximum)

