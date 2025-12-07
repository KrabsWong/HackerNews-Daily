# GitHub Actions Workflow Specification Delta

## Overview
This change updates the GitHub Actions workflow to push exported markdown files to a Jekyll blog repository, specifically targeting the `_posts` directory with Jekyll-standard filename format.

## ADDED Requirements

### Requirement: Jekyll Blog Repository Integration
The workflow SHALL push exported markdown files to a Jekyll blog repository at `KrabsWong/tldr-hacknews-24` in the `_posts/` directory.

#### Scenario: Target repository configuration
- **WHEN** the workflow checks out the target repository
- **THEN** it SHALL use repository `KrabsWong/tldr-hacknews-24`
- **AND** authenticate using the `TLDR_REPO_TOKEN` secret
- **AND** clone to a local path for file operations

#### Scenario: Jekyll posts directory structure
- **WHEN** copying the exported markdown file
- **THEN** the file SHALL be placed in the `_posts/` directory of the target repository
- **AND** the filename SHALL follow the format `YYYY-MM-DD-daily.md`
- **AND** the file SHALL contain Jekyll front matter for proper rendering

#### Scenario: File copy and commit process
- **WHEN** the daily export completes successfully
- **THEN** the generated file `hacknews-export/YYYY-MM-DD-daily.md` SHALL be copied to `tldr-repo/_posts/YYYY-MM-DD-daily.md`
- **AND** the file SHALL be added to git staging
- **AND** committed with message "Add HackerNews daily export for YYYY-MM-DD"
- **AND** pushed to the target repository's default branch

#### Scenario: Repository access validation
- **WHEN** the workflow attempts to push to the target repository
- **THEN** it MUST have write access via the configured token
- **AND** handle authentication errors gracefully with clear error messages
