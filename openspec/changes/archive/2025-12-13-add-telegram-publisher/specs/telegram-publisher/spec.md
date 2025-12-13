# Telegram Publisher Specification Delta

## Overview
新增 Telegram 频道发布能力，将 HackerNews 日报内容推送到指定的 Telegram 频道。

## ADDED Requirements

### Requirement: Telegram Message Sending
The system SHALL send formatted messages to a specified Telegram channel using the Telegram Bot API.

#### Scenario: Successful message delivery
- **WHEN** the daily export completes successfully
- **AND** TELEGRAM_ENABLED is set to "true"
- **AND** valid TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID are configured
- **THEN** the system sends the daily digest content to the specified Telegram channel
- **AND** logs a success message with the channel ID

#### Scenario: Telegram disabled
- **WHEN** TELEGRAM_ENABLED is not set or set to "false"
- **THEN** the system skips Telegram publishing
- **AND** does not attempt to send any messages

#### Scenario: Invalid bot token
- **WHEN** the system attempts to send a message
- **AND** the TELEGRAM_BOT_TOKEN is invalid or expired
- **THEN** the system logs an error with the Telegram API response
- **AND** does not affect the GitHub publishing result

### Requirement: Message Formatting
The system SHALL format the daily digest content using HTML parse mode for Telegram messages.

#### Scenario: Format story content
- **WHEN** preparing content for Telegram
- **THEN** the system converts each story into a formatted message block containing:
  - Story number and title in bold
  - Original article link
  - Chinese summary
  - Comment summary (if available)

#### Scenario: Include header
- **WHEN** sending the first message
- **THEN** the system includes a header with the digest title and date

### Requirement: Message Splitting
The system SHALL split long content into multiple messages respecting Telegram's 4096 character limit.

#### Scenario: Content exceeds limit
- **WHEN** the formatted content exceeds 4096 characters
- **THEN** the system splits the content at story boundaries
- **AND** sends multiple messages in sequence
- **AND** waits 500ms between messages to avoid rate limiting

#### Scenario: Content within limit
- **WHEN** the formatted content is 4096 characters or less
- **THEN** the system sends a single message

### Requirement: Configuration Validation
The system SHALL validate Telegram configuration at Worker startup when Telegram is enabled.

#### Scenario: Missing bot token
- **WHEN** TELEGRAM_ENABLED is "true"
- **AND** TELEGRAM_BOT_TOKEN is not configured
- **THEN** the system logs a warning about missing configuration
- **AND** skips Telegram publishing without failing the export

#### Scenario: Missing channel ID
- **WHEN** TELEGRAM_ENABLED is "true"
- **AND** TELEGRAM_CHANNEL_ID is not configured
- **THEN** the system logs a warning about missing configuration
- **AND** skips Telegram publishing without failing the export

#### Scenario: Valid configuration
- **WHEN** TELEGRAM_ENABLED is "true"
- **AND** both TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID are configured
- **THEN** the system proceeds with Telegram publishing

### Requirement: Graceful Degradation
The system SHALL not fail the entire export process if Telegram publishing fails.

#### Scenario: API error during send
- **WHEN** the Telegram API returns an error
- **THEN** the system logs the error details
- **AND** continues with the export process
- **AND** returns success if GitHub publishing succeeded

#### Scenario: Network timeout
- **WHEN** the Telegram API request times out
- **THEN** the system logs a timeout warning
- **AND** does not retry the request
- **AND** continues with the export process
