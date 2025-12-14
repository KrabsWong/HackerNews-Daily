# telegram-batch-sending Specification

## Purpose
TBD - created by archiving change translation-and-telegram-optimizations. Update Purpose after archive.
## Requirements
### Requirement: Story Merging into Batched Messages
The system SHALL merge multiple stories into a single message based on batch size configuration.

#### Scenario: Multiple stories exceed batch size
- **GIVEN** there are 10 stories to send
- **AND** `TELEGRAM_BATCH_SIZE=2`
- **WHEN** the Telegram publisher formats the content
- **THEN** the system SHALL create 5 merged messages
- **AND** each merged message SHALL contain 2 stories
- **AND** stories within a message SHALL be separated by visual dividers
- **AND** total messages sent SHALL be 7 (header + 5 merged + footer)

#### Scenario: Stories perfectly fit batch size
- **GIVEN** there are 6 stories to send
- **AND** `TELEGRAM_BATCH_SIZE=3`
- **WHEN** the Telegram publisher formats the content
- **THEN** the system SHALL create 2 merged messages
- **AND** each merged message SHALL contain exactly 3 stories
- **AND** total messages sent SHALL be 4 (header + 2 merged + footer)

#### Scenario: Partial last batch
- **GIVEN** there are 5 stories to send
- **AND** `TELEGRAM_BATCH_SIZE=2`
- **WHEN** the Telegram publisher formats the content
- **THEN** the system SHALL create 3 merged messages
- **AND** first two messages SHALL contain 2 stories each
- **AND** last message SHALL contain 1 story
- **AND** total messages sent SHALL be 5 (header + 3 merged + footer)

#### Scenario: Single story
- **GIVEN** there is 1 story to send
- **AND** `TELEGRAM_BATCH_SIZE=2`
- **WHEN** the Telegram publisher formats the content
- **THEN** the system SHALL create 1 message with 1 story
- **AND** total messages sent SHALL be 3 (header + 1 story + footer)

### Requirement: Message Formatting with Visual Separation
The system SHALL format merged messages with clear visual separation between stories.

#### Scenario: Merged message contains multiple stories
- **GIVEN** a merged message contains 2 or more stories
- **WHEN** the message is formatted
- **THEN** each story SHALL include its rank emoji, title, link, and summary
- **AND** stories SHALL be separated by the divider: `━━━━━━━━━━━━━━━━━━━━`
- **AND** each story SHALL maintain its individual formatting

### Requirement: Error Handling for Merged Messages
The system SHALL handle merged message failures gracefully.

#### Scenario: Merged message sending fails
- **GIVEN** a merged message (containing multiple stories) fails to send
- **WHEN** the failure occurs
- **THEN** the system SHALL log the error with message index
- **AND** continue with the next merged message
- **AND** include the failure count in final summary

#### Scenario: All messages fail
- **GIVEN** all merged messages fail to send
- **WHEN** publishing completes
- **THEN** the system SHALL throw an error
- **AND** include total failure count in error message

### Requirement: Configurable Batch Parameters
The system SHALL provide configuration options for story merging behavior.

#### Scenario: Custom batch size
- **GIVEN** TELEGRAM_BATCH_SIZE environment variable is set
- **WHEN** the Telegram publisher formats messages
- **THEN** the system SHALL use the custom batch size for merging stories
- **AND** validate the size is between 1 and 10
- **AND** merge that many stories per message

#### Scenario: Invalid batch size
- **GIVEN** TELEGRAM_BATCH_SIZE is set to an invalid value (< 1 or > 10)
- **WHEN** the Telegram publisher initializes
- **THEN** the system SHALL use the default batch size of 2
- **AND** log a warning about the invalid configuration

#### Scenario: Message delay between merged messages
- **GIVEN** merged messages are being sent
- **WHEN** each message is sent successfully
- **THEN** the system SHALL wait 500ms before sending the next message
- **AND** NOT wait after the last message

