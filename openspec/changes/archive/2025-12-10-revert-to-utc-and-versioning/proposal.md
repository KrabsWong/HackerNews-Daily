# Change: Revert to UTC Timezone and Add File Versioning

## Why
The Beijing timezone implementation is not ideal for the project's needs. We need to simplify and improve the workflow:

1. **Timezone Complexity**: Beijing timezone conversion adds unnecessary complexity. Using UTC throughout is simpler and aligns with HackerNews API timestamps.

2. **Data Accuracy**: Need to ensure we fetch articles from exactly yesterday (UTC natural day) when the daily export runs.

3. **File Overwrite Risk**: Currently, if the GitHub Action runs multiple times for the same date, it overwrites the existing markdown file in the target repository, potentially losing manually edited content or causing conflicts.

## What Changes
- **Revert to UTC**: Remove all Beijing timezone conversion logic and use UTC consistently throughout the system
  - Remove `toBeijingTime()`, `getBeijingNow()`, `formatTimestampBeijing()` functions
  - Update `getPreviousDayBoundaries()` to use UTC
  - Update `formatTimestamp()` to use UTC
  - Update markdown exporter functions to use UTC
  
- **UTC Natural Day**: Ensure daily export fetches articles from yesterday's UTC natural day (00:00:00 to 23:59:59 UTC)
  
- **GitHub Action Timing**: Update workflow to run at a sensible UTC time (e.g., 01:00 UTC after yesterday has fully passed)
  
- **File Versioning**: Add version suffix logic when copying to target repository
  - Check if file already exists in `_posts` directory
  - If exists, append `-v2`, `-v3`, etc. suffix to filename
  - Prevents accidental overwrites and preserves existing content

## Impact
- Affected specs: `daily-export`, `github-actions-workflow`
- Affected code:
  - `src/index.ts` (remove Beijing timezone functions, revert to UTC)
  - `src/services/markdownExporter.ts` (remove Beijing timezone conversion)
  - `.github/workflows/daily-export.yml` (update cron time, add versioning logic)
