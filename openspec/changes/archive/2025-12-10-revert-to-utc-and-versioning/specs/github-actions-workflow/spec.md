# GitHub Actions Workflow Specification Delta

## Overview
Add file versioning logic to prevent overwriting existing markdown files in the target repository, and clarify UTC timing.

## ADDED Requirements

### Requirement: File Versioning on Copy
The system SHALL check for existing files in the target repository and add version suffixes to prevent overwrites when copying exported markdown files.

#### Scenario: No existing file
**Given** export generates file `2025-12-06-daily.md`  
**When** copying to target repository `_posts/` directory  
**And** no file named `2025-12-06-daily.md` exists  
**Then** copy file as `_posts/2025-12-06-daily.md` without modification

#### Scenario: File already exists - add v2 suffix
**Given** export generates file `2025-12-06-daily.md`  
**When** copying to target repository `_posts/` directory  
**And** file `_posts/2025-12-06-daily.md` already exists  
**Then** rename to `2025-12-06-daily-v2.md` before copying  
**And** copy as `_posts/2025-12-06-daily-v2.md`  
**And** display message indicating versioned filename

#### Scenario: Multiple versions exist - increment suffix
**Given** export generates file `2025-12-06-daily.md`  
**When** copying to target repository `_posts/` directory  
**And** files `_posts/2025-12-06-daily.md` and `_posts/2025-12-06-daily-v2.md` already exist  
**Then** rename to `2025-12-06-daily-v3.md` before copying  
**And** copy as `_posts/2025-12-06-daily-v3.md`  
**And** continue incrementing version number until unique filename is found

#### Scenario: Version detection logic
**Given** workflow checks for existing files  
**When** determining the next version number  
**Then** scan `_posts/` directory for files matching pattern `YYYY-MM-DD-daily*.md`  
**And** parse existing version suffixes (`-v2`, `-v3`, etc.)  
**And** select next available version number in sequence  
**And** handle missing intermediate versions gracefully (e.g., if v2 and v4 exist, use v5)

### Requirement: UTC Workflow Timing
The workflow SHALL run at a specific UTC time to ensure consistency with UTC date calculations for the previous natural day.

#### Scenario: Scheduled execution time
**Given** the workflow is configured with a cron schedule  
**When** the schedule triggers  
**Then** it SHALL run at 01:00 UTC daily  
**And** this timing ensures the previous UTC day (00:00:00 to 23:59:59) has fully passed  
**And** all calculations use UTC timezone throughout

#### Scenario: Manual workflow trigger
**Given** workflow can be manually triggered via workflow_dispatch  
**When** manually triggered at any time  
**Then** it SHALL fetch articles from the previous UTC natural day  
**And** apply the same versioning logic regardless of trigger time

## MODIFIED Requirements

### Requirement: Jekyll Blog Repository Integration
The workflow SHALL push exported markdown files to a Jekyll blog repository at `KrabsWong/tldr-hacknews-24` in the `_posts/` directory with automatic versioning to prevent overwrites.

#### Scenario: File copy and commit process with versioning
**Given** the daily export completes successfully  
**When** copying the file to the target repository  
**Then** check if file already exists in `_posts/` directory  
**And** if exists, add version suffix (`-v2`, `-v3`, etc.)  
**And** copy the versioned file to `tldr-repo/_posts/`  
**And** commit with message "Add HackerNews daily export for YYYY-MM-DD (vN)" where N is version number  
**And** push to the target repository's default branch

#### Scenario: Commit message includes version
**Given** a versioned file is created (e.g., `2025-12-06-daily-v2.md`)  
**When** committing the changes  
**Then** the commit message SHALL be "Add HackerNews daily export for 2025-12-06 (v2)"  
**And** clearly indicate the version number for traceability

#### Scenario: No version in message for first export
**Given** no existing file exists and no version suffix is added  
**When** committing the changes  
**Then** the commit message SHALL be "Add HackerNews daily export for 2025-12-06"  
**And** omit version number from message when copying original filename
