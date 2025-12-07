# Change: Automate Daily Export with GitHub Actions

## Why

Currently, users must manually run `npm run fetch -- --export-daily` to generate daily markdown exports. This requires manual intervention every day, which is error-prone and inconvenient. The project needs automated daily exports that:

1. Run automatically without manual intervention
2. Push generated markdown files to a dedicated archive repository (https://github.com/KrabsWong/TLDR-HackNews24.git)
3. Maintain a consistent daily archive of HackerNews articles

This enables:
- Automated content generation for the TLDR-HackNews24 archive
- Consistent daily updates without manual oversight
- Historical tracking of HackerNews trends via git history

## What Changes

### Primary Changes

1. **GitHub Actions Workflow**
   - Add `.github/workflows/daily-export.yml` to automate daily exports
   - Schedule workflow to run daily at a specified time (e.g., 01:00 UTC)
   - Support manual triggering via `workflow_dispatch` for testing/debugging

2. **Export and Push Automation**
   - Check out both repositories (source and TLDR-HackNews24 archive)
   - Run `npm run fetch -- --export-daily` to generate markdown file
   - Copy generated markdown to TLDR-HackNews24 repository directory
   - Commit and push changes to TLDR-HackNews24 repository

3. **Secrets and Configuration**
   - Use GitHub secrets for DeepSeek API key (`DEEPSEEK_API_KEY`)
   - Use GitHub token or deploy key for pushing to TLDR-HackNews24 repository
   - Configure environment variables for story limit, time window, etc.

### Design Decisions

**Q: Should we clone TLDR-HackNews24 as a submodule or separately in the workflow?**
A: Clone separately in workflow for flexibility and to avoid coupling the two repositories.

**Q: How to handle authentication to push to TLDR-HackNews24?**
A: Two options:
- Option 1: Use GitHub Personal Access Token (PAT) with repo scope
- Option 2: Use SSH deploy key specific to TLDR-HackNews24 repository

Recommendation: Use PAT stored in GitHub secrets for easier setup.

**Q: What time should the workflow run?**
A: Schedule for 01:00 UTC (after yesterday's full day has passed) to ensure all stories from previous day are captured.

**Q: Should we keep generated files in this repo's TLDR-HackNews24/ directory?**
A: No, since files will be pushed to external repo. Update `.gitignore` to ignore `TLDR-HackNews24/` directory to prevent accidental commits.

## Impact

### New Capabilities
- **Automation**: GitHub Actions workflow for scheduled daily exports
- **Cross-repository integration**: Automated pushing to TLDR-HackNews24 archive repository

### Affected Components
- **New files**:
  - `.github/workflows/daily-export.yml` - GitHub Actions workflow
  - Documentation updates in README.md for GitHub Actions setup
- **Modified files**:
  - `.gitignore` - Add `TLDR-HackNews24/` to prevent accidental commits
  - README.md - Add section on GitHub Actions automation

### Backward Compatibility
- ✅ Existing CLI functionality unchanged
- ✅ Manual `--export-daily` still works locally
- ✅ Web mode and cache features unaffected
- ✅ No changes to core export logic

### Dependencies
- GitHub repository secrets must be configured:
  - `DEEPSEEK_API_KEY` - API key for DeepSeek translation service
  - `TLDR_REPO_TOKEN` - GitHub PAT with repo scope for pushing to TLDR-HackNews24
- TLDR-HackNews24 repository must exist and be accessible

### Risks and Mitigations
- **Risk**: Workflow failure due to API rate limits or network issues
  - *Mitigation*: Add retry logic and failure notifications
- **Risk**: Commit conflicts if multiple workflows run simultaneously
  - *Mitigation*: Use `concurrency` key in workflow to prevent parallel runs
- **Risk**: Accidental exposure of API keys
  - *Mitigation*: Use GitHub secrets, never hardcode credentials
