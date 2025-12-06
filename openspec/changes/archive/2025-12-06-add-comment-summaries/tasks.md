# Implementation Tasks

## Phase 1: Comment Data Structures and Fetching (comment-fetcher)

### Task 1.1: Add HNComment interface
- [x] Define `HNComment` interface in `src/api/hackerNews.ts`
- [x] Include fields: `id`, `by`, `text`, `time`, `parent`, `kids?`
- [x] Add JSDoc comments explaining the structure

**Validation:** TypeScript compiles without errors

### Task 1.2: Implement stripHTML helper function
- [x] Create `stripHTML(html: string): string` function in `hackerNews.ts`
- [x] Use cheerio (already installed) to parse HTML
- [x] Extract text content while preserving code blocks
- [x] Handle empty or malformed HTML gracefully
- [x] Add error handling

**Validation:** Unit test with sample HTML comment formats

### Task 1.3: Implement fetchComments function
- [x] Create `fetchComments(storyId: number, limit: number): Promise<HNComment[]>`
- [x] Fetch story details to get `kids` array
- [x] If no `kids`, return empty array
- [x] Fetch comment details for first N comment IDs in parallel
- [x] Filter out null/deleted/invalid comments
- [x] Return array of valid comments
- [x] Add error handling and logging

**Validation:** Test with real HN story IDs (stories with many/few/no comments)

### Task 1.4: Implement fetchCommentsBatch function
- [x] Create `fetchCommentsBatch(stories: HNStory[], limit: number): Promise<HNComment[][]>`
- [x] Map over stories and call fetchComments for each
- [x] Use Promise.all for parallel fetching
- [x] Maintain order (story-to-comments mapping)
- [x] Handle individual fetch failures gracefully
- [x] Return array of comment arrays

**Validation:** Test with multiple stories, verify order is maintained

## Phase 2: Comment Summarization (comment-summarizer)

### Task 2.1: Add comment summarization to TranslationService
- [x] Add `summarizeComments(comments: HNComment[]): Promise<string | null>` to `translator.ts`
- [x] Check if comments.length < 3, return null
- [x] Extract text from each comment using stripHTML
- [x] Concatenate comment texts with separators
- [x] Truncate if total exceeds 5000 characters
- [x] Construct summarization prompt (preserve technical terms, ~100 chars)
- [x] Send to DeepSeek API with temperature 0.5
- [x] Return Chinese summary or null on failure
- [x] Add error handling and logging

**Validation:** Test with sample comment arrays from real HN discussions

### Task 2.2: Create batch comment summarization method
- [x] Add `summarizeCommentsBatch(commentArrays: HNComment[][]): Promise<(string | null)[]>`
- [x] Iterate through comment arrays
- [x] Skip arrays with <3 comments (return null)
- [x] Call summarizeComments for each valid array
- [x] Process sequentially to respect rate limits
- [x] Show progress every 5 summaries
- [x] Handle individual failures gracefully
- [x] Return array of summaries (or null) matching input order

**Validation:** Test with 10 comment arrays, verify order and null handling

## Phase 3: Pipeline Integration

### Task 3.1: Update ProcessedStory interface
- [x] Add `commentSummary: string | null` field to ProcessedStory in `index.ts`
- [x] Update JSDoc comments

**Validation:** TypeScript compiles without errors

### Task 3.2: Integrate comment fetching into main pipeline
- [x] After fetching stories, add "Fetching top comments for each story..." log
- [x] Call `fetchCommentsBatch(stories, 10)` to get comments
- [x] Store result in `commentArrays` variable
- [x] Handle fetch failures gracefully
- [x] Add appropriate error logging

**Validation:** Run CLI and verify comments are fetched (check logs)

### Task 3.3: Integrate comment summarization into pipeline
- [x] After fetching comments, add "Summarizing comments..." log
- [x] Call `summarizeCommentsBatch(commentArrays)` to get summaries
- [x] Store result in `commentSummaries` variable
- [x] Map summaries to processed stories
- [x] Handle summarization failures gracefully

**Validation:** Run CLI and verify summaries are generated (check logs)

### Task 3.4: Update story processing to include comment summaries
- [x] In story mapping, add `commentSummary: commentSummaries[index]`
- [x] Ensure proper index alignment between stories and summaries

**Validation:** Inspect processedStories data structure

## Phase 4: Display and User Experience

### Task 4.1: Update displayCards to show comment summaries
- [x] In `displayCards()` function, after displaying description
- [x] Check if `story.commentSummary` is not null
- [x] If present, display: `console.log(\`评论要点：\${story.commentSummary}\`)`
- [x] Maintain proper spacing and formatting
- [x] Ensure separator appears after comment line

**Validation:** Run CLI and verify comment summaries appear in output

### Task 4.2: Add progress indicators
- [x] Update comment fetching to show progress message
- [x] Update comment summarization to show progress (X/Y completed)
- [x] Ensure progress updates are clear and informative

**Validation:** Run CLI and verify progress messages appear

### Task 4.3: Handle edge cases in display
- [x] Test with stories that have no comments (verify no comment line shown)
- [x] Test with stories where summarization failed (verify graceful skip)
- [x] Test with mixed results (some with, some without comments)

**Validation:** Manual testing with diverse HN stories

## Phase 5: Documentation and Testing

### Task 5.1: Update README.md
- [x] Add section explaining comment summary feature
- [x] Document that top 10 comments are fetched and summarized
- [x] Explain that stories with <3 comments skip comment line
- [x] Add example output showing comment summary
- [x] Update performance notes (expect ~1.5-3s added per story)

**Validation:** Review README for completeness and clarity

### Task 5.2: Performance testing
- [x] Test with HN_STORY_LIMIT=5 for quick feedback
- [x] Measure time per story for comment fetching + summarization
- [x] Test with HN_STORY_LIMIT=30 for full scale
- [x] Verify total time is acceptable (~3.5-4 minutes)
- [x] Document performance characteristics

**Validation:** Performance metrics are within acceptable range

### Task 5.3: Manual end-to-end testing
- [x] Test with popular HN story (many comments)
- [x] Test with new HN story (few comments)
- [x] Test with Show HN story (may have no comments)
- [x] Test with technical discussion (verify technical terms preserved)
- [x] Test with controversial topic (verify balanced summary)
- [x] Verify all comment summaries are concise (~100 chars)
- [x] Verify technical terms are preserved
- [x] Check console output for clarity

**Validation:** All test scenarios produce expected behavior

### Task 5.4: Error handling verification
- [x] Test with invalid story ID (verify graceful handling)
- [x] Simulate API failure for comment fetch (verify skip)
- [x] Simulate API failure for summarization (verify skip)
- [x] Verify no crashes or unhandled exceptions
- [x] Check log output for appropriate warnings

**Validation:** System handles all error scenarios gracefully

## Dependencies & Parallelization

**Can be done in parallel:**
- Task 1.1, 1.2 (data structures and helpers)
- Task 2.1 (comment summarization can be developed alongside fetching)

**Must be sequential:**
- Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 (dependencies between phases)
- Task 1.3 depends on 1.1, 1.2
- Task 1.4 depends on 1.3
- Task 2.2 depends on 2.1
- Task 3.2 depends on Phase 1 complete
- Task 3.3 depends on Phase 2 complete
- Task 4.1 depends on Task 3.4

**Critical path:**
Phase 1 (comment fetching) → Phase 2 (summarization) → Phase 3 (integration) → Phase 4 (display) → Phase 5 (docs/testing)

## Rollback Plan

If issues arise post-implementation:

1. **Phase 1-2 rollback**: Remove comment fetching and summarization functions, no breaking changes
2. **Phase 3 rollback**: Remove comment pipeline integration, keep existing functionality
3. **Phase 4 rollback**: Hide comment display but keep data fetching (easy toggle)
4. **Full rollback**: Revert all changes, return to article-only summaries

Each phase can be independently rolled back without breaking existing functionality.
