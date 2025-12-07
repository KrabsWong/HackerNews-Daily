# story-limit-validation Specification

## Purpose
Specification for story-limit-validation functionality.

## Requirements

### Requirement: Validate Story Limit Configuration
The system SHALL validate the `HN_STORY_LIMIT` environment variable at startup and enforce safe operational limits.

#### Scenario: User requests limit within safe range
**Given** `HN_STORY_LIMIT` is set to 25  
**When** the CLI starts  
**Then** the system accepts the limit without modification  
**And** no warning message is displayed

#### Scenario: User requests limit exceeding maximum
**Given** `HN_STORY_LIMIT` is set to 60  
**When** the CLI starts  
**Then** the system displays a warning: "⚠️ Requested story limit (60) exceeds maximum supported limit. Using 30 stories instead."  
**And** the system caps the limit at 30  
**And** continues execution with the capped limit

#### Scenario: User requests limit at maximum boundary
**Given** `HN_STORY_LIMIT` is set to 50  
**When** the CLI starts  
**Then** the system displays a warning: "⚠️ Requested story limit (50) exceeds maximum supported limit. Using 30 stories instead."  
**And** the system caps the limit at 30

#### Scenario: User sets invalid non-numeric limit
**Given** `HN_STORY_LIMIT` is set to "abc"  
**When** the CLI starts  
**Then** the system falls back to the default limit of 30  
**And** displays a warning about invalid configuration

### Requirement: Define Maximum Safe Limit
The system SHALL define and enforce a maximum safe story limit to prevent performance degradation.

#### Scenario: Maximum limit constant is defined
**Given** the system configuration  
**When** checking operational limits  
**Then** the maximum safe limit is set to 30 stories  
**And** this limit cannot be exceeded by user configuration

#### Scenario: Warn threshold is defined
**Given** the system configuration  
**When** validating user input  
**Then** any limit request above 50 triggers a warning  
**And** is automatically capped to the maximum safe limit of 30

### Requirement: Display Limit Adjustment Messages
The system SHALL clearly communicate limit adjustments to users during startup.

#### Scenario: Display current operating limit
**Given** a validated story limit  
**When** beginning story fetch  
**Then** the system displays "Fetching up to {limit} stories from the past {hours} hours"  
**And** the displayed limit reflects any caps or adjustments applied

#### Scenario: Explain automatic adjustments
**Given** the user's requested limit was capped  
**When** displaying the warning message  
**Then** the message includes both the requested and adjusted values  
**And** provides context about why the limit was adjusted
