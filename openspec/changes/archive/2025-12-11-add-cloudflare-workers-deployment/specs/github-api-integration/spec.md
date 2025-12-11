# GitHub API Integration Specification Delta

## Overview
This specification defines the GitHub API integration for pushing generated Markdown files to the tldr-hacknews-24 repository. It covers authentication, file creation/update operations, versioning logic, and error handling.

## ADDED Requirements

### Requirement: GitHub API Authentication
The system SHALL authenticate with GitHub REST API using a Personal Access Token stored in Cloudflare secrets.

#### Scenario: Load GitHub Token from Secrets
**Given** the Worker is executing the GitHub push operation  
**When** the GitHub client is initialized  
**Then** the system SHALL load `GITHUB_TOKEN` from Cloudflare environment secrets  
**And** the system SHALL validate the token is not empty or undefined  
**And** the system SHALL throw an error with message "Missing GITHUB_TOKEN secret" if token is invalid  

#### Scenario: Authenticate API Requests
**Given** the GitHub client sends a request to GitHub API  
**When** the HTTP request is constructed  
**Then** the system SHALL include header `Authorization: Bearer {GITHUB_TOKEN}`  
**And** the system SHALL include header `Accept: application/vnd.github+json`  
**And** the system SHALL include header `X-GitHub-Api-Version: 2022-11-28`  
**And** the system SHALL include header `User-Agent: HackerNewsDaily-Worker/1.0`  

#### Scenario: Handle Authentication Failure
**Given** the GitHub API returns HTTP 401 Unauthorized or 403 Forbidden  
**When** the error handler processes the response  
**Then** the system SHALL log an error with message "GitHub authentication failed: {status} {message}"  
**And** the system SHALL NOT retry the request (permanent failure)  
**And** the system SHALL include troubleshooting hint: "Check GITHUB_TOKEN expiration and scopes (requires 'repo')"  

### Requirement: File Existence Check
The system SHALL check if a daily export file already exists in the target repository before creating or updating.

#### Scenario: Check for Existing File
**Given** the system has generated a Markdown file for date "2025-12-10"  
**When** the GitHub push handler prepares to upload the file  
**Then** the system SHALL send GET request to `/repos/KrabsWong/tldr-hacknews-24/contents/_posts/2025-12-10-daily.md`  
**And** the system SHALL handle HTTP 200 response (file exists) by parsing the `sha` field  
**And** the system SHALL handle HTTP 404 response (file not found) by proceeding with new file creation  

#### Scenario: Determine Versioned Filename
**Given** the system receives HTTP 200 (file exists) for "2025-12-10-daily.md"  
**When** the versioning logic executes  
**Then** the system SHALL check for "2025-12-10-daily-v2.md", "2025-12-10-daily-v3.md", etc. until finding a non-existent filename  
**And** the system SHALL use the next available version number (e.g., "2025-12-10-daily-v4.md" if v1-v3 exist)  
**And** the system SHALL log the versioned filename decision  

#### Scenario: Handle API Rate Limit on Existence Check
**Given** the GET request to check file existence receives HTTP 403 with `X-RateLimit-Remaining: 0`  
**When** the rate limit handler processes the response  
**Then** the system SHALL parse `X-RateLimit-Reset` header to determine wait time  
**And** the system SHALL log a warning "GitHub API rate limit reached, reset at {timestamp}"  
**And** the system SHALL retry the request after the rate limit reset time (max 1 retry)  

### Requirement: File Creation and Update
The system SHALL create or update Markdown files in the tldr-hacknews-24 repository using GitHub Contents API.

#### Scenario: Create New File
**Given** the system has determined the target filename does not exist  
**When** the GitHub push handler executes the upload  
**Then** the system SHALL send PUT request to `/repos/KrabsWong/tldr-hacknews-24/contents/_posts/{filename}`  
**And** the request body SHALL include:  
  - `message`: "Add HackerNews daily export for {date}"  
  - `content`: Base64-encoded Markdown content  
  - `branch`: "main"  
**And** the system SHALL handle HTTP 201 Created response as success  

#### Scenario: Update Existing File with SHA
**Given** the system needs to update an existing file with known SHA  
**When** the GitHub push handler executes the upload  
**Then** the system SHALL include `sha` field in the request body (from existence check)  
**And** the system SHALL use commit message "Update HackerNews daily export for {date} ({version})"  
**And** the system SHALL handle HTTP 200 OK response as success  

#### Scenario: Handle Concurrent Update Conflict
**Given** the system sends PUT request with a `sha` that has become stale (another process updated the file)  
**When** the GitHub API returns HTTP 409 Conflict  
**Then** the system SHALL re-check file existence to get the latest SHA  
**And** the system SHALL increment the version number and retry with versioned filename  
**And** the system SHALL limit retries to 3 attempts  
**And** the system SHALL fail with error "Unable to push after 3 retry attempts due to conflicts" if all retries fail  

#### Scenario: Base64 Encoding of Content
**Given** the system has a Markdown string to upload  
**When** the request payload is constructed  
**Then** the system SHALL encode the Markdown content to Base64 using standard encoding  
**And** the system SHALL validate the Base64 string is not empty  
**And** the system SHALL ensure line breaks in Markdown are preserved after encoding/decoding  

### Requirement: Commit Message Generation
The system SHALL generate descriptive commit messages following the project's Git conventions.

#### Scenario: Generate Commit Message for New File
**Given** the system is creating a new daily export file for "2025-12-10"  
**When** the commit message is generated  
**Then** the message SHALL be "Add HackerNews daily export for 2025-12-10"  
**And** the message SHALL use English language  
**And** the message SHALL NOT include emojis or special characters  

#### Scenario: Generate Commit Message for Versioned File
**Given** the system is creating a versioned file "2025-12-10-daily-v3.md"  
**When** the commit message is generated  
**Then** the message SHALL be "Add HackerNews daily export for 2025-12-10 (v3)"  
**And** the version suffix SHALL be included in parentheses  

#### Scenario: Generate Commit Message for Update
**Given** the system is updating an existing file  
**When** the commit message is generated  
**Then** the message SHALL use "Update" instead of "Add" prefix  
**And** the message SHALL include the reason if available (e.g., "Update HackerNews daily export for 2025-12-10 (re-run after filter adjustment)")  

### Requirement: Error Handling and Retry Logic
The system SHALL implement robust error handling with exponential backoff for transient GitHub API failures.

#### Scenario: Retry on Transient Network Errors
**Given** a GitHub API request fails with a network timeout or 5xx server error  
**When** the error handler processes the failure  
**Then** the system SHALL retry the request using exponential backoff (1s, 2s, 4s)  
**And** the system SHALL limit retries to 3 attempts  
**And** the system SHALL log each retry attempt with delay duration  
**And** the system SHALL fail permanently after 3 failed attempts  

#### Scenario: No Retry on Client Errors
**Given** a GitHub API request fails with HTTP 400 Bad Request, 422 Unprocessable Entity, or similar client errors  
**When** the error handler processes the failure  
**Then** the system SHALL NOT retry the request (permanent failure)  
**And** the system SHALL log the full error response body for debugging  
**And** the system SHALL throw a descriptive error indicating the issue (e.g., "Invalid Markdown content format")  

#### Scenario: Structured Error Logging
**Given** a GitHub API operation fails  
**When** the error is logged  
**Then** the log entry SHALL include:  
  - HTTP status code  
  - GitHub API error message and documentation URL  
  - Request method and path  
  - Filename being uploaded  
  - Retry attempt number (if applicable)  
  - Full error response body (for non-authentication errors)  

### Requirement: GitHub API Response Validation
The system SHALL validate GitHub API responses to ensure data integrity and detect unexpected behavior.

#### Scenario: Validate Successful Creation Response
**Given** the system receives HTTP 201 Created response after file creation  
**When** the response is processed  
**Then** the system SHALL parse the JSON response body  
**And** the system SHALL validate the response contains `content.sha` field  
**And** the system SHALL validate the response contains `commit.sha` field  
**And** the system SHALL log the commit SHA for audit trail  
**And** the system SHALL throw an error if required fields are missing  

#### Scenario: Validate Rate Limit Headers
**Given** the system receives any GitHub API response  
**When** the response headers are processed  
**Then** the system SHALL check for `X-RateLimit-Remaining` header  
**And** the system SHALL log a warning if remaining requests are below 10  
**And** the system SHALL include rate limit info in export summary metrics  

#### Scenario: Handle Unexpected Response Format
**Given** the system receives a successful response (2xx) with malformed JSON  
**When** the JSON parsing fails  
**Then** the system SHALL log the raw response body for debugging  
**And** the system SHALL throw an error "GitHub API returned unexpected response format"  
**And** the system SHALL NOT retry (treat as permanent failure)  
