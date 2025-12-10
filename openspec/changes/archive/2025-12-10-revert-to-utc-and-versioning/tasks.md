# Implementation Tasks

## 1. Revert Beijing Timezone to UTC

- [x] 1.1 Remove Beijing timezone utility functions from `src/index.ts`:
  - Remove `BEIJING_TIMEZONE_OFFSET` constant
  - Remove `toBeijingTime()` function
  - Remove `getBeijingNow()` function
  - Remove `formatTimestampBeijing()` function

- [x] 1.2 Update `getPreviousDayBoundaries()` in `src/index.ts`:
  - Remove Beijing timezone conversion logic
  - Use standard JavaScript Date operations with UTC
  - Calculate yesterday as UTC natural day (00:00:00 to 23:59:59 UTC)
  - Return Unix timestamps without timezone offset adjustments

- [x] 1.3 Update `formatTimestamp()` in `src/index.ts`:
  - Remove call to `formatTimestampBeijing()`
  - Convert Unix timestamp to UTC date string directly
  - Format as "YYYY-MM-DD HH:mm" in UTC

- [x] 1.4 Remove Beijing timezone conversion from `src/services/markdownExporter.ts`:
  - Remove `BEIJING_TIMEZONE_OFFSET` constant
  - Remove `toBeijingTime()` function from the file

- [x] 1.5 Update `generateFilename()` in `src/services/markdownExporter.ts`:
  - Remove call to `toBeijingTime()`
  - Use date parameter directly (should already be UTC)
  - Generate filename using UTC date components

- [x] 1.6 Update `formatDateForDisplay()` in `src/services/markdownExporter.ts`:
  - Remove call to `toBeijingTime()`
  - Use date parameter directly (should already be UTC)
  - Format as UTC date string

- [x] 1.7 Update `generateJekyllFrontMatter()` in `src/services/markdownExporter.ts`:
  - Remove call to `toBeijingTime()`
  - Pass date through to formatDateForDisplay without conversion
  - Ensure front matter uses UTC dates

## 2. Update GitHub Actions Workflow

- [x] 2.1 Update workflow cron schedule in `.github/workflows/daily-export.yml`:
  - Change schedule to `01:00 UTC` (cron: '0 1 * * *')
  - Update comments to clarify UTC timing
  - Remove Beijing timezone references from comments

- [x] 2.2 Update shell script date calculations in workflow:
  - Ensure `YESTERDAY` calculation uses UTC
  - Verify `date -u` command for UTC date retrieval
  - Remove Beijing timezone comments

- [x] 2.3 Implement file versioning logic in "Copy markdown file" step:
  - Check if target file exists in `tldr-repo/_posts/`
  - If exists, scan for existing versions (-v2, -v3, etc.)
  - Determine next available version number
  - Rename file with version suffix before copying
  - Log the versioned filename

- [x] 2.4 Update commit message to include version when applicable:
  - Detect if version suffix was added
  - Include "(vN)" in commit message for versioned files
  - Keep original message format for non-versioned files

## 3. Documentation Updates

- [x] 3.1 Update README.md Daily Export section:
  - Remove Beijing timezone references
  - Update to clarify UTC timezone usage
  - Update example output to remove "(Beijing time)" labels

- [x] 3.2 Update README.md GitHub Actions section:
  - Change schedule description to "01:00 UTC"
  - Remove Beijing timezone notes
  - Add note about file versioning behavior

- [x] 3.3 Update workflow comments to document versioning logic:
  - Explain version suffix behavior
  - Document how version numbers are determined
  - Clarify that versioning prevents overwrites

## 4. Testing and Validation

- [x] 4.1 Test UTC date calculations:
  - Verify `getPreviousDayBoundaries()` returns correct UTC timestamps
  - Test at various times of day (before and after UTC midnight)
  - Ensure Unix timestamps match expected UTC date range

- [x] 4.2 Test timestamp formatting:
  - Verify `formatTimestamp()` displays UTC time correctly
  - Check markdown file shows UTC timestamps
  - Ensure consistency across all time displays

- [x] 4.3 Test filename generation:
  - Verify markdown filename uses UTC date
  - Test near UTC midnight to ensure correct date rollover
  - Check Jekyll front matter uses UTC date

- [x] 4.4 Test versioning logic (manual simulation):
  - Create test scenario with no existing file
  - Create test scenario with v1 existing
  - Create test scenario with v1 and v2 existing
  - Verify correct version number selection

- [x] 4.5 Verify build and compilation:
  - Run `npm run build` to ensure TypeScript compiles
  - Check for any type errors from removed functions
  - Verify no runtime errors in modified functions

- [x] 4.6 Test full export pipeline:
  - Run `npm run fetch -- --export-daily` locally
  - Verify UTC date is used in filename
  - Check file content uses UTC timestamps
  - Ensure no regressions in CLI or web modes
