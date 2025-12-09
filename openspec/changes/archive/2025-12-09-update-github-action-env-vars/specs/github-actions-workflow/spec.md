# github-actions-workflow Specification Delta

## ADDED Requirements

### Requirement: Environment Variable Configuration

The workflow SHALL pass all required environment variables to the export script to ensure proper functionality.

#### Scenario: Required secrets configuration

**Given** the workflow is executing the daily export step  
**When** the script runs  
**Then** the `DEEPSEEK_API_KEY` secret SHALL be passed as environment variable  
**And** the `CRAWLER_API_URL` secret SHALL be passed as environment variable  
**And** missing required secrets SHALL cause the workflow to fail with clear error

#### Scenario: Optional configuration with defaults

**Given** the workflow is executing the daily export step  
**When** GitHub Variables are not configured  
**Then** the workflow SHALL use default values:  
- `HN_STORY_LIMIT`: 30  
- `HN_TIME_WINDOW_HOURS`: 24  
- `SUMMARY_MAX_LENGTH`: 300  
- `CACHE_ENABLED`: false  
- `ENABLE_CONTENT_FILTER`: false  
- `CONTENT_FILTER_SENSITIVITY`: medium

#### Scenario: Custom configuration via GitHub Variables

**Given** the repository has GitHub Variables configured  
**When** the workflow executes  
**Then** the configured values SHALL override the defaults  
**And** the script SHALL receive the custom configuration

### Requirement: Sensitive Data Protection

The workflow SHALL protect sensitive configuration values using GitHub Secrets.

#### Scenario: API keys stored as secrets

**Given** the workflow needs API credentials  
**When** accessing `DEEPSEEK_API_KEY` or `CRAWLER_API_URL`  
**Then** values MUST be retrieved from GitHub Secrets (not Variables)  
**And** values SHALL NOT be logged or exposed in workflow output

#### Scenario: Non-sensitive configuration as variables

**Given** the workflow needs configuration like `HN_STORY_LIMIT`  
**When** accessing these values  
**Then** values MAY be stored as GitHub Variables (visible in logs)  
**And** default values SHALL be provided for unconfigured variables
