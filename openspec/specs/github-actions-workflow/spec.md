# github-actions-workflow Specification

## Purpose
TBD - created by archiving change automate-github-actions-daily-export. Update Purpose after archive.
## Requirements
### Requirement: Scheduled Daily Execution
The workflow SHALL run automatically once per day on a scheduled basis at 01:00 UTC.

#### Scenario: Daily automated export at 01:00 UTC
- **WHEN** the system time reaches 01:00 UTC
- **THEN** the workflow automatically triggers and executes the daily export process
- **AND** all stories from the complete previous calendar day are available for export

#### Scenario: Workflow runs after full calendar day completion
- **WHEN** the workflow runs at 01:00 UTC on December 7, 2025
- **THEN** it exports articles from December 6, 2025 (00:00:00 to 23:59:59)
- **AND** ensures the complete 24-hour period is captured

### Requirement: Manual Trigger Support
The workflow SHALL support manual triggering for testing and debugging purposes via GitHub Actions UI.

#### Scenario: Manual workflow execution from GitHub UI
- **WHEN** a user with repository write access navigates to Actions tab and clicks "Run workflow"
- **THEN** the workflow executes immediately without waiting for scheduled time
- **AND** performs identical steps as the scheduled execution (export yesterday's articles)

#### Scenario: Manual trigger for testing before scheduled run
- **WHEN** user manually triggers workflow after initial setup
- **THEN** workflow runs successfully and pushes file to TLDR-HackNews24
- **AND** provides confidence that scheduled runs will work correctly

### Requirement: Concurrency Control
The workflow SHALL prevent multiple concurrent executions to avoid race conditions and conflicts when writing to the TLDR-HackNews24 repository.

#### Scenario: Sequential execution when multiple triggers occur
- **WHEN** a workflow execution is currently in progress
- **AND** a new workflow trigger occurs (scheduled or manual)
- **THEN** the new execution waits for the current execution to complete
- **OR** the in-progress execution is cancelled in favor of the new one (based on concurrency configuration)

#### Scenario: Prevent simultaneous pushes to TLDR repository
- **WHEN** multiple workflow instances attempt to run simultaneously
- **THEN** only one instance is allowed to execute at a time
- **AND** concurrent instances are queued or cancelled to prevent git conflicts

### Requirement: Environment Setup
The workflow SHALL set up the required Node.js environment and install all project dependencies.

#### Scenario: Node.js 18+ environment configuration
- **WHEN** the workflow starts execution
- **THEN** Node.js version 18 or higher is installed and available
- **AND** npm package manager is ready for use

#### Scenario: Dependency installation from package.json
- **WHEN** npm install command executes in the workflow
- **THEN** all required dependencies from package.json are installed successfully
- **AND** build completes without errors

### Requirement: Secret Management
The workflow SHALL securely access required secrets without exposing them in logs or output.

#### Scenario: DeepSeek API key from GitHub secrets
- **WHEN** the workflow runs the export command
- **THEN** `DEEPSEEK_API_KEY` from GitHub repository secrets is passed to the application
- **AND** the API key is NOT visible in workflow logs or output

#### Scenario: TLDR repository access token usage
- **WHEN** the workflow needs to push to TLDR-HackNews24 repository
- **THEN** `TLDR_REPO_TOKEN` from GitHub repository secrets is used for authentication
- **AND** the token is NOT exposed in logs or output

### Requirement: Export Execution
The workflow SHALL execute the daily export command and generate the markdown file for yesterday's articles.

#### Scenario: Run export-daily command successfully
- **WHEN** environment and dependencies are set up
- **AND** `DEEPSEEK_API_KEY` is available
- **AND** the workflow runs `npm run fetch -- --export-daily`
- **THEN** a markdown file for yesterday's date is generated in `TLDR-HackNews24/hackernews-YYYY-MM-DD.md`
- **AND** the file contains properly formatted articles

#### Scenario: Handle export command failures gracefully
- **WHEN** the export command encounters an error (API failure, no stories, network issue)
- **AND** the command exits with non-zero status
- **THEN** the workflow fails immediately and stops execution
- **AND** does not proceed to commit and push steps
- **AND** logs show clear error message indicating failure reason

### Requirement: Repository Checkout and File Transfer
The workflow SHALL check out the TLDR-HackNews24 repository separately and transfer the generated markdown file.

#### Scenario: Clone TLDR-HackNews24 repository to separate directory
- **WHEN** the export has generated a markdown file successfully
- **AND** the workflow needs to push to TLDR-HackNews24
- **THEN** TLDR-HackNews24 repository is cloned to a separate directory (e.g., `./tldr-repo`)
- **AND** authentication is handled using `TLDR_REPO_TOKEN`

#### Scenario: Copy markdown file to TLDR repository root
- **WHEN** TLDR-HackNews24 repository is checked out
- **AND** a markdown file exists at `TLDR-HackNews24/hackernews-YYYY-MM-DD.md`
- **THEN** the markdown file is copied to the TLDR-HackNews24 repository root directory
- **AND** preserves the filename `hackernews-YYYY-MM-DD.md`

### Requirement: Commit and Push Changes
The workflow SHALL commit the new markdown file to TLDR-HackNews24 repository and push the changes to the remote repository.

#### Scenario: Commit with descriptive message
- **WHEN** a markdown file has been copied to TLDR-HackNews24 repository working directory
- **THEN** changes are staged with `git add`
- **AND** committed with message format "Add HackerNews daily export for YYYY-MM-DD"
- **AND** commit author is set to GitHub Actions bot identity

#### Scenario: Push to remote repository successfully
- **WHEN** changes are committed locally in TLDR-HackNews24 repository
- **THEN** the commit is pushed to remote using `TLDR_REPO_TOKEN` for authentication
- **AND** the push succeeds without conflicts
- **AND** the new file is visible in the remote TLDR-HackNews24 repository

#### Scenario: Handle push conflicts gracefully
- **WHEN** a push conflict occurs (e.g., remote has changes not present locally)
- **THEN** the workflow reports the error clearly
- **AND** the workflow fails (does not use force push)
- **AND** logs indicate the conflict needs manual resolution

### Requirement: Error Handling and Notifications
The workflow SHALL handle errors appropriately and provide clear failure notifications to repository administrators.

#### Scenario: Workflow failure notification via GitHub
- **WHEN** any step in the workflow fails (setup, export, commit, push)
- **THEN** the workflow status shows as "Failed" in GitHub Actions UI
- **AND** repository administrators receive notification via GitHub's notification system
- **AND** the workflow run page shows red X indicator

#### Scenario: Detailed error logs for troubleshooting
- **WHEN** a workflow execution fails at any step
- **AND** a user views the workflow run in GitHub Actions
- **THEN** detailed logs for each step are available
- **AND** logs show the specific error message and stack trace
- **AND** failed step is clearly highlighted in the UI

### Requirement: Git Configuration for Commits
The workflow SHALL configure git user identity for automated commits in the TLDR-HackNews24 repository.

#### Scenario: Set git user identity before committing
- **WHEN** the workflow is about to commit changes to TLDR-HackNews24 repository
- **THEN** git user.name is set to "github-actions[bot]"
- **AND** git user.email is set to "github-actions[bot]@users.noreply.github.com"
- **AND** these settings are used for the commit operation

#### Scenario: Commit author reflects bot identity
- **WHEN** the commit is created and pushed to remote
- **THEN** the commit author in git history shows "github-actions[bot]"
- **AND** the commit is distinguishable from human-made commits
- **AND** the automated nature of the commit is clear

---

