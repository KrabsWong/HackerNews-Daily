# local-test-mode Specification

## Purpose

Enable developers to test the full export pipeline locally without publishing to external services, preventing repository/channel pollution and enabling quick feedback during development.

## Requirements
### Requirement: LOCAL_TEST_MODE Configuration
The system SHALL recognize a `LOCAL_TEST_MODE` environment variable that enables local test mode when set to "true".

#### Scenario: Enable local test mode via configuration
**Given** a development environment with `LOCAL_TEST_MODE=true`, `GITHUB_ENABLED=false`, and `TELEGRAM_ENABLED=false` configured  
**When** the worker is started with `wrangler dev`  
**Then** the LOCAL_TEST_MODE configuration is recognized as valid  
**And** the TerminalPublisher is injected into the publisher pipeline

### Requirement: Terminal Publisher Implementation
The system SHALL implement a TerminalPublisher that outputs markdown content to stdout without publishing to external services.

#### Scenario: Output markdown to terminal
**Given** a valid development environment with LOCAL_TEST_MODE enabled  
**When** the export pipeline completes content processing  
**Then** a TerminalPublisher receives the PublishContent  
**And** outputs formatted markdown with clear terminal delimiters to stdout  
**And** includes metadata showing the export date and story count  
**And** does not attempt to publish to GitHub or Telegram

### Requirement: Terminal Output Formatting
The system SHALL format terminal output with clear delimiters and structured metadata for easy identification in log streams.

#### Scenario: Format output for terminal viewing
**Given** 30 processed stories with markdown content ready for publishing  
**When** TerminalPublisher.publish() is called  
**Then** the output includes:  
- A header line: "======================================"  
- A title line: "HackerNews Daily - YYYY-MM-DD"  
- A separator line: "======================================"  
- Blank line  
- Full markdown content  
- Blank line  
- A footer separator line: "======================================"  
- A summary line: "Export completed: 30 stories"  
- A footer line: "======================================"

#### Scenario: Ensure consistent format across invocations
**Given** multiple invocations of the export with LOCAL_TEST_MODE enabled  
**When** each invocation completes  
**Then** the output format is consistent  
**And** the markdown content matches the format that would be published to GitHub

### Requirement: Configuration Validation for Local Test Mode
The system SHALL validate that LOCAL_TEST_MODE is only enabled when at least one publisher is configured (either TerminalPublisher or other publishers).

#### Scenario: Validate LOCAL_TEST_MODE requires explicit publisher configuration
**Given** `LOCAL_TEST_MODE=true` but `GITHUB_ENABLED=false` and `TELEGRAM_ENABLED=false` are not explicitly set  
**When** worker configuration validation runs  
**Then** a validation error or warning is produced  
**And** the error message instructs the user to explicitly disable GitHub/Telegram or set LOCAL_TEST_MODE=false  
**And** configuration validation fails if no valid publisher path exists

#### Scenario: Accept valid local test configuration
**Given** `LOCAL_TEST_MODE=true`, `GITHUB_ENABLED=false`, `TELEGRAM_ENABLED=false` configured  
**When** worker configuration validation runs  
**Then** validation succeeds  
**And** TerminalPublisher is available for use

### Requirement: Integration with Existing Publisher Pipeline
The system SHALL integrate TerminalPublisher seamlessly with the existing Publisher abstraction without modifying existing GitHub or Telegram publisher implementations.

#### Scenario: Route to correct publisher based on LOCAL_TEST_MODE
**Given** `LOCAL_TEST_MODE=true` in configuration  
**When** the export handler routes publishers  
**Then** TerminalPublisher is included in the active publishers list  
**And** GitHub/Telegram publishers are excluded from the list  
**And** no special case code is required in the main worker logic

#### Scenario: Backward compatibility with existing configurations
**Given** an existing configuration without LOCAL_TEST_MODE set  
**When** the worker starts  
**Then** LOCAL_TEST_MODE defaults to false  
**And** behavior is identical to the previous version  
**And** GitHub and Telegram publishers work unchanged

### Requirement: Env Type Extension
The Env type in `src/types/worker.ts` SHALL be extended to include the `LOCAL_TEST_MODE` environment variable as an optional string.

#### Scenario: Env type includes LOCAL_TEST_MODE
**Given** TypeScript code importing the Env type  
**When** accessing environment variables  
**Then** `env.LOCAL_TEST_MODE` is available as an optional string property  
**And** TypeScript type checking works correctly  
**And** existing Env properties are unchanged

