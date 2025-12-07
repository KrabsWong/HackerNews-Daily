# Tasks: Automate Daily Export with GitHub Actions

## Ordered Work Items

### 1. Create `.github/workflows/` directory structure
- [x] Create `.github/workflows/` directory if it doesn't exist
- [x] Verify directory is properly tracked by git

**Validation**: Directory exists and is git-tracked

---

### 2. Implement GitHub Actions workflow file
- [x] Create `.github/workflows/daily-export.yml`
- [x] Configure scheduled trigger (cron: daily at 01:00 UTC)
- [x] Add manual trigger support (`workflow_dispatch`)
- [x] Set up concurrency control to prevent parallel runs
- [x] Define job steps:
  - [x] Checkout main repository
  - [x] Set up Node.js environment (v18+)
  - [x] Install dependencies
  - [x] Configure DeepSeek API key from secrets
  - [x] Run export command
  - [x] Checkout TLDR-HackNews24 repository
  - [x] Copy generated markdown file to TLDR-HackNews24
  - [x] Commit and push changes to TLDR-HackNews24

**Dependencies**: None

**Validation**: Workflow file is syntactically valid YAML and passes GitHub Actions linting

---

### 3. Update `.gitignore` to exclude local export directory
- [x] Add `TLDR-HackNews24/` to `.gitignore`
- [x] Ensure directory is not accidentally committed to main repository

**Dependencies**: None

**Validation**: `git status` does not show `TLDR-HackNews24/` directory after running local export

**Note**: `TLDR-HackNews24/` was already present in `.gitignore`, no changes needed.

---

### 4. Update README.md with GitHub Actions setup instructions
- [x] Add new section: "GitHub Actions Automation"
- [x] Document required GitHub secrets:
  - [x] `DEEPSEEK_API_KEY` - DeepSeek API key
  - [x] `TLDR_REPO_TOKEN` - GitHub PAT for pushing to TLDR-HackNews24
- [x] Provide step-by-step setup instructions:
  - [x] Creating GitHub secrets
  - [x] Enabling GitHub Actions
  - [x] Manual workflow triggering
- [x] Document workflow schedule and behavior

**Dependencies**: Task 2 (workflow implementation)

**Validation**: Documentation is clear and complete

---

### 5. Test workflow locally (optional but recommended)
- [ ] Use `act` or GitHub's workflow testing tools
- [ ] Verify checkout, build, and export steps work correctly
- [ ] Test with mock secrets to ensure proper secret handling

**Dependencies**: Task 2 (workflow implementation)

**Validation**: Workflow runs successfully in test environment

**Status**: This is an optional testing task for the user to perform locally if desired.

---

### 6. Configure GitHub repository secrets
- [ ] Navigate to repository Settings > Secrets and variables > Actions
- [ ] Add `DEEPSEEK_API_KEY` secret
- [ ] Add `TLDR_REPO_TOKEN` secret (GitHub PAT with repo scope)
- [ ] Verify TLDR-HackNews24 repository is accessible with provided token

**Dependencies**: Task 2 (workflow implementation)

**Validation**: Secrets are properly configured and accessible in workflow

**Status**: User action required - must be configured in GitHub repository settings.

---

### 7. Enable and test workflow in GitHub
- [ ] Commit and push workflow file to main branch
- [ ] Manually trigger workflow via Actions tab
- [ ] Monitor workflow execution and verify:
  - [ ] Export generation succeeds
  - [ ] File is copied to TLDR-HackNews24 repository
  - [ ] Commit and push to TLDR-HackNews24 succeed
  - [ ] No errors in workflow logs

**Dependencies**: Tasks 2, 3, 4, 6

**Validation**: 
- Workflow completes successfully without errors
- New markdown file appears in TLDR-HackNews24 repository
- Git history in TLDR-HackNews24 shows automated commit

**Status**: User action required - workflow must be tested after secrets are configured.

---

### 8. Monitor first scheduled run
- [ ] Wait for first scheduled run at 01:00 UTC (or adjust schedule for testing)
- [ ] Verify automatic execution
- [ ] Check TLDR-HackNews24 repository for new daily file
- [ ] Review workflow logs for any issues

**Dependencies**: Task 7 (successful manual test)

**Validation**: 
- Scheduled workflow runs automatically
- Daily export file is created and pushed successfully
- No errors in logs

**Status**: User action required - monitor after deployment.

---

## Implementation Summary

**Completed Tasks (1-4)**: All code implementation tasks are complete.
- ✅ `.github/workflows/daily-export.yml` created with proper configuration
- ✅ `.gitignore` already includes `TLDR-HackNews24/` directory
- ✅ `README.md` updated with comprehensive GitHub Actions documentation

**Remaining Tasks (5-8)**: User configuration and testing tasks.
- Tasks 5-8 require user action to configure secrets and test the workflow
- Detailed instructions are provided in README.md
- These tasks should be completed after committing the code changes

## Parallelizable Work
- Tasks 2 and 3 can be done in parallel
- Task 4 depends on Task 2 but can be drafted in parallel

## Testing Strategy
1. **Local testing**: Run `npm run fetch -- --export-daily` to verify export works
2. **Workflow syntax validation**: Use GitHub Actions validator or `act`
3. **Manual trigger test**: Test workflow via `workflow_dispatch` before relying on schedule
4. **Monitor logs**: Check GitHub Actions logs for errors or warnings
5. **Verify repository**: Confirm files appear in TLDR-HackNews24 with correct content

## Rollback Plan
If workflow fails or causes issues:
1. Disable workflow in GitHub Actions settings
2. Fix issues in workflow file
3. Re-enable and test manually before restoring schedule
4. Can always fall back to manual `npm run fetch -- --export-daily` execution
