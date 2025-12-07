# Implementation Tasks

## 1. Date Filtering Logic
- [x] 1.1 Add helper function to calculate previous calendar day boundaries (start: yesterday 00:00:00, end: yesterday 23:59:59)
- [x] 1.2 Add date range filtering function to filter stories by Unix timestamp within date boundaries
- [x] 1.3 Add unit tests to verify date boundary calculation for edge cases (timezone, midnight crossover)

## 2. Command-Line Argument Parsing
- [x] 2.1 Update `parseArgs()` in `src/index.ts` to recognize `--export-daily` flag
- [x] 2.2 Update argument parsing to return `exportDailyMode: boolean` flag
- [x] 2.3 Add validation to ensure `--export-daily` and `--web` are mutually exclusive (if needed)

## 3. Markdown Export Service
- [x] 3.1 Create `src/services/markdownExporter.ts` module
- [x] 3.2 Implement `generateMarkdownContent(stories: ProcessedStory[]): string` function
- [x] 3.3 Reuse existing `displayCards()` format logic for markdown structure
- [x] 3.4 Implement `writeMarkdownFile(content: string, filename: string, directory: string): Promise<void>` function
- [x] 3.5 Add error handling for file system operations (permissions, disk space)

## 4. Directory Management
- [x] 4.1 Add function to ensure `TLDR-HackNews24/` directory exists (create if needed)
- [x] 4.2 Add check for directory write permissions
- [x] 4.3 Handle directory creation errors gracefully with clear error messages

## 5. Filename Generation
- [x] 5.1 Implement function to generate filename from date: `generateFilename(date: Date): string` returns `hackernews-YYYY-MM-DD.md`
- [x] 5.2 Add logic to determine target date (previous calendar day) from current time
- [x] 5.3 Add file existence check and overwrite warning message

## 6. Main Flow Integration
- [x] 6.1 Update `main()` function to handle export-daily mode
- [x] 6.2 Add export mode branch: query yesterday's articles, sort descending, generate markdown
- [x] 6.3 Implement story sorting by timestamp (descending order)
- [x] 6.4 Call markdown export service with filtered and sorted stories
- [x] 6.5 Display success message with file path

## 7. User Feedback
- [x] 7.1 Add success message: `✅ Successfully exported N stories to TLDR-HackNews24/hackernews-YYYY-MM-DD.md`
- [x] 7.2 Add warning for no stories found: `⚠️  No stories found for YYYY-MM-DD`
- [x] 7.3 Add error handling for export failures with troubleshooting hints
- [x] 7.4 Add overwrite warning when file already exists

## 8. Testing and Validation
- [x] 8.1 Test export with various date ranges (ensure only yesterday's articles included)
- [x] 8.2 Test export with `--no-cache` flag combination
- [x] 8.3 Test directory creation on first run
- [x] 8.4 Test file overwrite behavior
- [x] 8.5 Test edge cases: no stories found, midnight boundary, timezone handling
- [x] 8.6 Verify markdown format matches CLI output exactly
- [x] 8.7 Test descending sort order (newest first)

## 9. Documentation
- [x] 9.1 Update README.md with new `--export-daily` option usage
- [x] 9.2 Add example command: `npm run fetch -- --export-daily`
- [x] 9.3 Document file output format and directory structure
- [x] 9.4 Add troubleshooting section for export errors

## 10. Configuration (Optional Enhancement)
- [ ] 10.1 Consider adding `EXPORT_DIR` environment variable for custom output directory (optional)
- [ ] 10.2 Consider adding `EXPORT_FILENAME_PREFIX` for custom filename prefix (optional)
