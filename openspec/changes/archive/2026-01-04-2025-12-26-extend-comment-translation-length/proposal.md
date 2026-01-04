# Proposal: Extend Comment Translation Length

## Problem Statement

Currently, comment summaries are hardcoded to approximately 100 characters (in src/services/translator/summary.ts:131 and line 554). This length is too short to capture meaningful information from HackerNews discussions. Users are missing valuable context, technical insights, and discussion points that could enrich their understanding of each story.

**Current behavior:**
- Comments are fetched: 10 per story
- Comment text is combined (up to 5000 characters via `CONTENT_CONFIG.MAX_COMMENTS_LENGTH`)
- Summary is generated with **hardcoded target**: ~100 characters
- Article summaries use `SUMMARY_CONFIG.DEFAULT_LENGTH` (300 characters)

**Inconsistency:**
- Article summaries: 300 characters (using configuration constant)
- Comment summaries: 100 characters (hardcoded value)

**Example of insufficient information:**
With 100 characters, the summary might only capture: "用户讨论了性能优化方案，提到了React和TypeScript的使用。" (42 characters)

This misses:
- Specific optimization techniques mentioned
- Pros/cons of different approaches
- Alternative tools or libraries discussed
- Performance benchmarks or results
- Consensus or controversial viewpoints

## Proposed Solution

Add a dedicated `COMMENT_SUMMARY_LENGTH` configuration constant (300 characters) to `CONTENT_CONFIG` for comment summaries. This provides flexibility to adjust comment and article summary lengths independently in the future.

**Benefits:**
1. **Flexibility**: Independent control over comment summary length
2. **Clarity**: Explicit configuration for comment-specific behavior
3. **Future-proof**: Easy to adjust without affecting article summaries
4. **Richer context**: Capture more technical details, specific tools/libraries mentioned
5. **Better insights**: Include pros/cons, alternative approaches, community consensus
6. **Improved value**: Users gain more actionable information from comment discussions

**Changes:**
- Add `COMMENT_SUMMARY_LENGTH: 300` to `CONTENT_CONFIG` in constants.ts
- Update `summarizeComments()` to use `CONTENT_CONFIG.COMMENT_SUMMARY_LENGTH`
- Update `summarizeCommentsBatch()` to use `CONTENT_CONFIG.COMMENT_SUMMARY_LENGTH`
- Add import for `CONTENT_CONFIG` in summary.ts (already imported)
- Update prompt guidance to encourage richer summaries

**Configuration Design:**
```typescript
export const CONTENT_CONFIG = {
  // ... existing fields ...
  /** Target length for comment summaries in characters */
  COMMENT_SUMMARY_LENGTH: 300,
} as const;
```

**Rationale for separate config:**
- Article summaries (`SUMMARY_CONFIG.DEFAULT_LENGTH`): Focus on article content depth
- Comment summaries (`CONTENT_CONFIG.COMMENT_SUMMARY_LENGTH`): Focus on discussion highlights
- Future flexibility: Adjust independently based on user feedback

**Trade-offs:**
- Slightly longer Markdown output files (acceptable for added value)
- No increase in API costs (same comment fetching, same number of requests)
- Marginal processing time increase (negligible)

## Scope

This proposal focuses on:
- ✅ Adding dedicated `COMMENT_SUMMARY_LENGTH` configuration constant
- ✅ Using `CONTENT_CONFIG.COMMENT_SUMMARY_LENGTH` for comment summaries
- ✅ Removing hardcoded 100 character values
- ✅ Updating LLM prompts for richer comment summarization
- ✅ Improving prompt guidance for detailed summaries

Out of scope:
- ❌ Changing the number of comments fetched per story (10 remains)
- ❌ Changing article summary length (300 remains)
- ❌ Modifying comment fetching logic
- ❌ Changing `SUMMARY_CONFIG` or article summary behavior

## Success Criteria

1. `CONTENT_CONFIG.COMMENT_SUMMARY_LENGTH` constant is added (300 chars)
2. Comment summaries use `CONTENT_CONFIG.COMMENT_SUMMARY_LENGTH`
3. No hardcoded 100 character values remain in comment summarization
4. Prompts correctly instruct LLM to generate longer, more detailed summaries
5. Configuration is properly documented in constants.ts
6. All tests pass
7. Documentation is updated

## Related Specifications

- `comment-summarizer/spec.md` - Comment summarization specification
- `batch-translation-service/spec.md` - Batch translation operations

## Implementation Estimate

- **Complexity**: Low
- **Estimated effort**: 25 minutes
- **Risk level**: Low (simple configuration and prompt changes)
