# Implementation Tasks

## Phase 1: Article Fetching Infrastructure
- [x] 1. **Add HTML parsing dependency**
   - Install cheerio library for HTML parsing
   - Update package.json and dependencies
   - Validation: `npm install` succeeds without errors

- [x] 2. **Create article fetcher service** (`src/services/articleFetcher.ts`)
   - Implement `fetchArticleMetadata(url: string)` function
   - Extract meta description from HTML (`<meta name="description">`, `<meta property="og:description">`)
   - Add timeout (5 seconds) and error handling
   - Return interface: `{ url: string, description: string | null }`
   - Validation: Unit test with sample URL, verify graceful failure on timeout

- [x] 3. **Implement batch article fetching**
   - Create `fetchArticlesBatch(stories: HNStory[])` function
   - Use `Promise.allSettled()` for parallel fetching with individual error handling
   - Map results back to stories maintaining order
   - Validation: Test with mix of valid/invalid URLs, verify no failures propagate

## Phase 2: Display Format Transformation
- [x] 4. **Update data structure in main CLI** (`src/index.ts`)
   - Extend `ProcessedStory` interface to include: `time: string`, `description: string`
   - Update story processing to include formatted timestamp and description
   - Validation: TypeScript compilation passes

- [x] 5. **Implement card-based display renderer**
   - Create `displayCards(stories: ProcessedStory[])` function to replace `displayTable()`
   - Format each story as multi-line card:
     ```
     #1 【中文标题】
     Original English Title
     发布时间：2025-12-06 14:30
     链接：https://example.com
     描述：这是文章的中文描述...
     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
     ```
   - Add visual separators between stories
   - Validation: Run CLI and verify output format matches specification

- [x] 6. **Format timestamp display**
   - Convert Unix timestamp to local datetime string (YYYY-MM-DD HH:mm)
   - Validation: Verify timestamps display correctly in local timezone

## Phase 3: Translation Extension
- [x] 7. **Extend translation service for descriptions**
   - Update `translateBatch()` to accept optional descriptions array
   - Add `translateDescription(text: string)` method
   - Handle empty/null descriptions gracefully (skip translation)
   - Validation: Test translation with sample descriptions, verify fallback works

- [x] 8. **Integrate description translation in main flow**
   - Fetch descriptions after getting stories
   - Translate descriptions alongside titles
   - Update progress messages to reflect description translation
   - Validation: Run full CLI flow, verify both titles and descriptions are translated

## Phase 4: Error Handling and Polish
- [x] 9. **Add comprehensive error handling**
   - Handle fetch failures gracefully (show "暂无描述")
   - Add warning logs for failed article fetches without breaking execution
   - Ensure progress indicators update correctly
   - Validation: Test with URLs that return 404, timeout, or block requests

- [x] 10. **Update progress messages**
    - Add "Fetching article details..." message
    - Update translation progress to show "Translating titles and descriptions..."
    - Validation: Run CLI and verify all progress messages display correctly

- [x] 11. **Remove deprecated code**
    - Remove `displayTable()` function and cli-table3 usage
    - Clean up unused imports
    - Validation: Run `npm run build`, ensure no unused dependencies warning

## Phase 5: Testing and Documentation
- [x] 12. **Integration testing**
    - Test full flow with various story counts (1, 10, 30)
    - Test with mix of accessible and inaccessible URLs
    - Test with stories that have/don't have meta descriptions
    - Validation: All scenarios complete successfully without crashes

- [x] 13. **Update README (if exists)**
    - Document new display format
    - Update example screenshots or output samples
    - Validation: README accurately reflects new behavior

## Dependencies and Parallelization
- Tasks 1-3 are sequential (article fetching foundation)
- Tasks 4-6 can be done in parallel with tasks 1-3 after interfaces are defined
- Tasks 7-8 depend on translation service structure (existing)
- Tasks 9-11 integrate all previous work (sequential)
- Task 12-13 are final validation (sequential)

## Rollback Plan
If issues arise, the change can be rolled back by:
1. Reverting display format to table-based
2. Removing article fetcher service calls
3. No database or data migration required
