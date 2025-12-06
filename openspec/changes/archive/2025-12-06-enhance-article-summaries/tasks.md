# Implementation Tasks

## Phase 1: Setup and Dependencies

### Task 1.1: Add required dependencies
- [x] Install `@mozilla/readability` package (`npm install @mozilla/readability`)
- [x] Install `jsdom` package (`npm install jsdom`) - required by Readability
- [x] Install type definitions if needed (`npm install -D @types/jsdom`)
- [x] Verify dependencies are added to package.json

**Validation:** Run `npm list @mozilla/readability jsdom` and verify packages are installed

### Task 1.2: Add configuration for summary length
- [x] Add `SUMMARY_MAX_LENGTH` to `.env.example` with default value 300
- [x] Add comments explaining valid range (100-500)
- [x] Add example: `SUMMARY_MAX_LENGTH=300`

**Validation:** Review `.env.example` for clarity

## Phase 2: Article Content Extraction (article-content-extraction)

### Task 2.1: Extend ArticleMetadata interface
- [x] Update `ArticleMetadata` interface in `src/services/articleFetcher.ts`
- [x] Add `fullContent: string | null` field
- [x] Keep existing `description: string | null` field for meta descriptions
- [x] Add JSDoc comments explaining the difference

**Validation:** TypeScript compiles without errors

### Task 2.2: Implement content extraction function
- [x] Create `extractArticleContent(html: string): string | null` in `articleFetcher.ts`
- [x] Import and configure JSDOM
- [x] Import and configure Readability
- [x] Parse HTML with JSDOM, apply Readability algorithm
- [x] Convert result to plain text
- [x] Return null if extraction fails
- [x] Add error handling and logging

**Validation:** Unit test with sample HTML from various sites

### Task 2.3: Implement content truncation
- [x] Create `truncateContent(content: string, maxLength: number): string` helper
- [x] Truncate at maxLength (4000 chars)
- [x] Ensure no mid-word cuts (find last space before limit)
- [x] Add debug logging when truncation occurs

**Validation:** Unit test with long content (>4000 chars)

### Task 2.4: Update fetchArticleMetadata to extract full content
- [x] Modify `fetchArticleMetadata()` to call `extractArticleContent()`
- [x] Store result in `fullContent` field
- [x] Keep existing meta description extraction in `description` field
- [x] Log success/failure of content extraction
- [x] Maintain graceful error handling

**Validation:** Integration test fetching real HN article URLs

## Phase 3: AI Summarization (ai-summary-generation)

### Task 3.1: Add summary length validation
- [x] Create `validateSummaryLength(length: number): number` in `src/index.ts`
- [x] Validate range 100-500 characters
- [x] Display warnings for invalid values
- [x] Return validated length with defaults

**Validation:** Unit test with various inputs (50, 100, 300, 500, 1000, NaN)

### Task 3.2: Implement AI summarization in TranslationService
- [x] Add `summarizeContent(content: string, maxLength: number): Promise<string>` to `translator.ts`
- [x] Construct summarization prompt with target length
- [x] Request summary in Chinese from DeepSeek API
- [x] Use temperature 0.5 for balanced output
- [x] Handle API errors with retry logic (rate limit)
- [x] Log warnings on failure

**Validation:** Test with sample article content, verify output is Chinese and ~target length

### Task 3.3: Create batch summarization method
- [x] Add `summarizeBatch(contents: string[], maxLength: number): Promise<string[]>` to `translator.ts`
- [x] Process contents sequentially (avoid rate limits)
- [x] Show progress every 5 articles
- [x] Handle individual failures gracefully (fallback to meta)
- [x] Return array of summaries matching input order

**Validation:** Test with array of 10 sample contents

## Phase 4: Integration and Pipeline Updates

### Task 4.1: Update main pipeline in index.ts
- [x] Parse `SUMMARY_MAX_LENGTH` from environment
- [x] Validate summary length after parsing
- [x] After fetching articles, check for `fullContent` in metadata
- [x] If `fullContent` exists, call `summarizeBatch()` instead of `translateDescriptionsBatch()`
- [x] If `fullContent` is null, fallback to existing `translateDescriptionsBatch()` for meta descriptions
- [x] Update variable names for clarity (e.g., `summaries` vs `descriptions`)

**Validation:** Run full pipeline end-to-end, verify summaries are generated

### Task 4.2: Update progress indicators
- [x] Add "Extracting article content..." message before extraction
- [x] Show "Extracted X/Y articles..." progress
- [x] Add "Generating AI summaries..." message before summarization
- [x] Show "Summarized X/Y articles..." progress
- [x] Update existing "Translating descriptions..." if using meta fallback
- [x] Ensure console output is clear and informative

**Validation:** Run CLI and verify progress messages appear correctly

### Task 4.3: Handle fallback scenarios
- [x] When `fullContent` is null, use meta `description` field
- [x] Log debug message indicating fallback usage with URL
- [x] Ensure fallback path maintains existing behavior
- [x] Test various fallback scenarios (no content, no meta, both fail)

**Validation:** Test with URLs that fail extraction (PDFs, paywalled sites)

## Phase 5: Documentation and Testing

### Task 5.1: Update README.md
- [x] Add section explaining AI summarization feature
- [x] Document `SUMMARY_MAX_LENGTH` configuration option
- [x] Explain fallback behavior (full content → meta → none)
- [x] Add performance notes (expected latency)
- [x] Update cost estimation section if exists

**Validation:** Review README for completeness and clarity

### Task 5.2: Update .env.example documentation
- [x] Ensure `SUMMARY_MAX_LENGTH` has clear comments
- [x] Explain valid range and default value
- [x] Add example showing typical usage

**Validation:** Review `.env.example` for user-friendliness

### Task 5.3: Manual end-to-end testing
- [x] Test with HN_STORY_LIMIT=5 for quick feedback
- [x] Test with diverse article types:
  - Standard blog posts (expect full summary)
  - GitHub repos (expect full summary)
  - PDF links (expect fallback to meta)
  - Sites without meta descriptions (expect "暂无描述")
- [x] Test with different SUMMARY_MAX_LENGTH values (200, 300, 400)
- [x] Verify summaries are in Chinese and approximately target length
- [x] Check console output for clarity and progress indication
- [x] Measure total runtime and per-article latency

**Validation:** All test scenarios produce expected behavior

### Task 5.4: Error handling verification
- [x] Test with invalid SUMMARY_MAX_LENGTH values
- [x] Simulate API failures (disconnect network temporarily)
- [x] Verify graceful degradation to meta descriptions
- [x] Check log output for appropriate warnings
- [x] Ensure no crashes or unhandled exceptions

**Validation:** System handles all error scenarios gracefully

## Phase 6: Optimization (Optional, if performance is an issue)

### Task 6.1: Profile performance
- [ ] Measure content extraction time per article
- [ ] Measure AI summarization time per article
- [ ] Identify bottlenecks if total time exceeds 2 minutes for 30 articles

**Validation:** Performance metrics are within acceptable range

### Task 6.2: Optimize if needed
- [ ] Consider parallel extraction (content extraction is CPU-bound)
- [ ] Consider batching API requests if DeepSeek supports it
- [ ] Cache extraction results if repeated URLs detected

**Note:** Only implement if Phase 5 testing reveals unacceptable performance

## Dependencies & Parallelization

**Can be done in parallel:**
- Task 1.1 and 1.2 (setup)
- Task 2.1, 2.2, 2.3 (content extraction functions)
- Task 3.1, 3.2 (summarization functions)

**Must be sequential:**
- Phase 1 → Phase 2 → Phase 3 → Phase 4 (dependencies between phases)
- Task 2.4 depends on 2.1, 2.2, 2.3 being complete
- Task 3.3 depends on 3.2 being complete
- Task 4.1 depends on all of Phase 2 and Phase 3 being complete

**Critical path:**
Phase 1 → Phase 2 (extraction) → Phase 3 (summarization) → Phase 4 (integration) → Phase 5 (docs/testing)

## Rollback Plan

If issues arise post-implementation:

1. **Phase 1 rollback**: Remove dependencies, revert package.json
2. **Phase 2 rollback**: Remove content extraction, keep meta descriptions only
3. **Phase 3 rollback**: Remove AI summarization, use translations of meta descriptions
4. **Full rollback**: Revert all changes, fall back to meta description translation only

Each phase can be independently rolled back without breaking existing functionality.
