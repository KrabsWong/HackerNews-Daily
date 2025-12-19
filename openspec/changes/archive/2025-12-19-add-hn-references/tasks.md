# Implementation Tasks: Add Story ID and Remove Title Brackets

## 1. Data Model Updates

- [x] 1.1 Update `src/types/shared.ts` - Add `storyId: number` field to ProcessedStory interface
- [x] 1.2 Verify ProcessedStory interface includes all required fields (rank, titleChinese, titleEnglish, score, url, time, timestamp, description, commentSummary, **storyId**)
- [x] 1.3 Ensure storyId is documented in JSDoc comments

## 2. Story Processing Pipeline

- [x] 2.1 Find all locations where ProcessedStory objects are created
- [x] 2.2 Update HackerNews source processor to extract and preserve story ID from API responses
- [x] 2.3 Update any CLI/Worker story processing to pass storyId through the pipeline
- [x] 2.4 Verify story ID is available from both Firebase and Algolia APIs
- [x] 2.5 Test that storyId is correctly set for sample stories

## 3. Markdown Exporter Updates

- [x] 3.1 Update `src/services/markdownExporter.ts` - Modify title formatting to remove 【】 brackets
  - Change: `## ${story.rank}. 【${story.titleChinese}】` → `## ${story.rank}. ${story.titleChinese}`
- [x] 3.2 Add HackerNews link as italic secondary label at the end of each article section
  - Add before the separator `---`: `*[HackerNews](https://news.ycombinator.com/item?id=${story.storyId})*`
  - Place after description and commentSummary sections
- [x] 3.3 Verify markdown output format matches specification
- [x] 3.4 Test with sample stories to ensure proper URL generation

## 4. Testing & Verification

- [x] 4.1 Generate sample markdown export with updated format
- [x] 4.2 Verify story IDs are correct and links are clickable
- [x] 4.3 Verify title format is clean without brackets
- [x] 4.4 Verify metadata section layout is correct
- [x] 4.5 Test with multiple stories to ensure consistency
- [x] 4.6 Run existing tests if any exist (npm test or similar)
- [x] 4.7 Manual verification: Deploy to local environment and test full pipeline

## 5. Documentation Update (REQUIRED)

- [x] 5.1 Check `README.md` for example output format - update if present
- [x] 5.2 Check `openspec/project.md` for affected sections (Data Flow, Type Organization)
- [x] 5.3 Check `docs/` directory for output format documentation
- [x] 5.4 Update or add documentation showing:
  - New ProcessedStory interface with storyId field
  - Example markdown output with HackerNews link
  - Removed title bracket formatting
- [x] 5.5 Update any architecture diagrams or type definitions in docs
- [x] 5.6 Verify no broken links or outdated code examples

## Success Acceptance Criteria

- ✓ ProcessedStory includes storyId field
- ✓ All story processing preserves and passes storyId
- ✓ Markdown output includes HackerNews link with correct story ID
- ✓ Titles display without Chinese brackets
- ✓ Generated URLs are valid and clickable
- ✓ All documentation is updated
- ✓ Local testing confirms end-to-end functionality
