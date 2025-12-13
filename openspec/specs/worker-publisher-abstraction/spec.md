# worker-publisher-abstraction Specification

## Purpose
TBD - created by archiving change refactor-worker-extensibility. Update Purpose after archive.
## Requirements
### Requirement: Publisher Interface

The worker SHALL define a `Publisher` interface that all publishing implementations MUST implement.

#### Scenario: Interface definition

**Given** a publisher implementation  
**When** the publisher is registered with the worker  
**THEN** the publisher MUST implement the `Publisher` interface  
**And** the interface SHALL include a `name: string` property  
**And** the interface SHALL include a `publish(content: PublishContent, config: PublisherConfig): Promise<void>` method

#### Scenario: Publish content format

**Given** a publisher receives content  
**When** the `publish()` method is called  
**THEN** the content parameter SHALL be a `PublishContent` object  
**And** the object SHALL include a `markdown: string` property  
**And** the object SHALL include a `dateStr: string` property in YYYY-MM-DD format  
**And** the object SHALL include a `metadata: Record<string, any>` property for additional data

### Requirement: GitHub Publisher Implementation

The worker SHALL provide a GitHub publisher implementation located at `src/worker/publishers/github/`.

#### Scenario: GitHub publisher module location

**Given** the worker codebase  
**When** importing the GitHub publisher  
**THEN** it SHALL be located at `src/worker/publishers/github/index.ts`  
**And** it SHALL export a class implementing `Publisher` interface  
**And** the directory SHALL contain `client.ts` for GitHub API interactions  
**And** the directory SHALL contain `versioning.ts` for file versioning logic

#### Scenario: GitHub publisher behavior

**Given** a GitHub publisher  
**When** `publish()` is called with Markdown content  
**THEN** it SHALL authenticate with GitHub using the provided token  
**And** it SHALL check for existing files with the same name  
**And** it SHALL create versioned filenames if conflicts exist (e.g., YYYY-MM-DD-daily-v2.md)  
**And** it SHALL push the file to the specified repository and branch

### Requirement: Publisher Directory Organization

The worker SHALL organize all publisher implementations in a dedicated `src/worker/publishers/` directory.

#### Scenario: Publishers directory structure

**Given** the worker codebase  
**When** examining the directory structure  
**THEN** publishers SHALL be located in `src/worker/publishers/`  
**And** the directory SHALL contain an `index.ts` file exporting the `Publisher` interface  
**And** each publisher SHALL be in its own subdirectory (e.g., `github/`)  
**And** complex publishers MAY contain multiple files (client, utilities, etc.)

### Requirement: Publisher Configuration Schema

Each publisher SHALL define its own configuration schema via TypeScript interfaces.

#### Scenario: Publisher-specific configuration

**Given** a publisher implementation  
**When** the publisher is initialized  
**THEN** it SHALL accept a configuration object conforming to its schema  
**And** the configuration SHALL be passed to the `publish()` method  
**And** the configuration SHALL include publisher-specific options

#### Scenario: GitHub publisher configuration

**Given** the GitHub publisher  
**When** initializing the publisher  
**THEN** the configuration SHALL include `GITHUB_TOKEN: string` (required)  
**And** the configuration SHALL include `TARGET_REPO: string` (required, format: "owner/repo")  
**And** the configuration SHALL include `TARGET_BRANCH: string` (required)  
**And** the configuration SHALL NOT include default values for `TARGET_REPO`

### Requirement: Publisher Error Handling

Publishers SHALL provide clear error messages when publish operations fail.

#### Scenario: GitHub authentication failure

**Given** a GitHub publisher  
**When** `publish()` is called with an invalid GitHub token  
**THEN** the publisher SHALL throw an error  
**And** the error message SHALL indicate authentication failure  
**And** the error message SHALL suggest checking token expiration and scopes

#### Scenario: GitHub repository not found

**Given** a GitHub publisher  
**When** `publish()` is called with a non-existent repository  
**THEN** the publisher SHALL throw an error  
**And** the error message SHALL indicate the repository was not found  
**And** the error message SHALL include the attempted repository path

#### Scenario: GitHub rate limit exceeded

**Given** a GitHub publisher  
**When** `publish()` is called and GitHub rate limit is exceeded  
**THEN** the publisher SHALL retry with exponential backoff  
**And** if retries are exhausted, the publisher SHALL throw an error  
**And** the error message SHALL include rate limit reset time

### Requirement: Publisher Module Reusability

Publisher modules SHALL be reusable outside the worker context (e.g., CLI tools, other workers).

#### Scenario: Standalone usage

**Given** a publisher implementation  
**When** the publisher is imported in a non-worker context  
**THEN** it SHALL function correctly  
**And** it SHALL NOT depend on Cloudflare Worker-specific globals  
**And** it SHALL accept configuration via constructor or method parameters

