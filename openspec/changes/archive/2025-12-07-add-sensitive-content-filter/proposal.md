# Proposal: Add AI-Based Sensitive Content Filter

## Overview

Add an AI-powered content filtering mechanism using DeepSeek LLM to filter out HackerNews stories containing sensitive content before translation and processing. This ensures exported content complies with content moderation requirements for the Chinese market.

## Background

Currently, the system fetches HackerNews stories, translates them to Chinese, and exports them without any content filtering. This may result in displaying content that contains sensitive topics inappropriate for certain audiences or regions.

## User Requirements

Based on user input:
- **Filtering Method**: Pure AI-based (no keyword lists)
- **Filter Target**: Story titles only (English titles)
- **Filter Timing**: After fetching stories, before translation
- **Logging**: No audit logs needed

## Proposed Solution

### AI-Based Content Classification

Use the existing DeepSeek LLM infrastructure to classify whether story titles contain sensitive content according to Chinese content policies.

**How it works**:
1. After fetching stories from HackerNews API
2. Before translation, send all story titles to DeepSeek API in batch
3. Ask LLM to classify each title as "sensitive" or "safe"
4. Filter out stories classified as "sensitive"
5. Proceed with translation only for "safe" stories

### Why Pure AI Approach

**Advantages**:
- ✅ **Context-aware**: Understands nuance (e.g., historical vs political context)
- ✅ **Zero maintenance**: No keyword lists to maintain or update
- ✅ **Adaptive**: Automatically evolves with LLM improvements
- ✅ **Accurate**: Reduces false positives compared to keyword matching
- ✅ **Simple implementation**: Leverages existing translator infrastructure

**Trade-offs**:
- Adds 2-5 seconds to fetch time (batch classification)
- Requires API calls (minimal cost, ~30 titles per batch)
- Less deterministic than keyword-based approaches

## Implementation Details

### Architecture

```
HackerNews API → Fetch Stories → AI Content Filter → Translation → Export
                                        ↓
                                  DeepSeek LLM
                                  (Batch Classification)
```

### Filter Location

Integrate into `src/index.ts` → `fetchFreshData()` function:

```typescript
// Fetch stories from HackerNews
const stories = await fetchTopStories(storyLimit, timeWindowHours);

// NEW: Apply AI content filter (if enabled)
const filteredStories = await contentFilter.filterStories(stories);

// Translate titles (only for filtered stories)
const titles = filteredStories.map(s => s.title);
const translatedTitles = await translator.translateBatch(titles);
```

### New Service: Content Filter

**File**: `src/services/contentFilter.ts`

```typescript
export interface ContentFilter {
  /**
   * Filter stories using AI classification
   * @param stories - Stories to filter
   * @returns Filtered stories (only "safe" stories)
   */
  filterStories(stories: HNStory[]): Promise<HNStory[]>;
  
  /**
   * Check if content filter is enabled
   */
  isEnabled(): boolean;
}
```

### AI Prompt Design

The AI prompt will ask DeepSeek to classify titles based on Chinese content policies:

```
You are a content moderator for a Chinese news aggregator.
Classify the following news titles as "SAFE" or "SENSITIVE".

A title is SENSITIVE if it contains content related to:
- Chinese political controversies or sensitive political topics
- Content prohibited in mainland China
- Explicit adult or violent content

Respond with a JSON array: [{"index": 0, "classification": "SAFE"}, ...]

Titles:
1. "New JavaScript framework released"
2. "Debate on internet censorship policies"
...
```

### Configuration

**Environment Variables**:
```bash
# Enable/disable content filter
ENABLE_CONTENT_FILTER=false  # default: false

# Content filter sensitivity level
CONTENT_FILTER_SENSITIVITY=medium  # options: low, medium, high
```

**Sensitivity Levels**:
- `low`: Only filter explicitly prohibited content
- `medium`: Filter political controversies and explicit content (default)
- `high`: Filter broadly including borderline topics

## Performance Impact

### Timing Analysis
- **AI Classification**: ~2-5 seconds for batch of 30 titles
- **Network latency**: Included in above estimate
- **Total added time**: 2-5 seconds per fetch

### Cost Analysis
- **API calls**: 1 classification request per fetch cycle
- **Token usage**: ~500-1000 tokens per batch (30 titles)
- **Estimated cost**: $0.001-0.002 per fetch (negligible)

### Cost Savings
- **Translation savings**: Filtered stories don't need translation
- If 5 stories filtered → saves 5 translation API calls
- Net cost impact: Likely negative (saves more than it costs)

## User-Facing Changes

### Behavior Changes
1. Stories classified as sensitive will be silently filtered
2. Final story count may be less than `HN_STORY_LIMIT`
3. Console output: `Filtered X stories based on content policy (AI)`

### No UI Changes
- CLI, Web UI, and Export formats remain unchanged
- Filtered stories simply don't appear in results
- No visible indication that filtering occurred (by design)

### Backward Compatibility
- **100% backward compatible**
- Filter is **disabled by default** (`ENABLE_CONTENT_FILTER=false`)
- Existing workflows unchanged when filter is disabled
- No breaking changes to APIs or data structures

## Affected Capabilities

### Modified Capabilities

1. **story-fetching**
   - Add AI filtering stage after fetch, before translation
   - Update data flow diagram

2. **constants-config**
   - Add `ENABLE_CONTENT_FILTER` configuration
   - Add `CONTENT_FILTER_SENSITIVITY` configuration

3. **translation-service** (indirect)
   - No code changes, but receives fewer stories to translate

### Unchanged Capabilities
- `article-fetcher` - Operates on pre-filtered stories
- `comment-fetcher` - Operates on pre-filtered stories
- `cache-service` - Caches post-filter results
- `daily-export` - Exports pre-filtered stories
- `web-ui` - Displays pre-filtered stories

## Testing Strategy

### Unit Tests
```typescript
// Test AI filter service
describe('ContentFilter', () => {
  test('filters sensitive political titles', async () => {
    const stories = [
      { title: 'New Python library released', ... },
      { title: 'Controversial political topic', ... }
    ];
    const filtered = await contentFilter.filterStories(stories);
    expect(filtered.length).toBe(1);
    expect(filtered[0].title).toBe('New Python library released');
  });
  
  test('handles empty story list', async () => {
    expect(await contentFilter.filterStories([])).toEqual([]);
  });
  
  test('disabled filter returns all stories', async () => {
    // when ENABLE_CONTENT_FILTER=false
    const stories = [/* ... */];
    expect(await contentFilter.filterStories(stories)).toEqual(stories);
  });
});
```

### Integration Tests
- Test with real HackerNews stories
- Verify DeepSeek API integration
- Test error handling (API failures)
- Verify cache behavior with filtered results

### Manual Testing
- Test with known sensitive topics
- Verify false positive rate is acceptable
- Test with different sensitivity levels
- Performance testing with various story counts

## Error Handling

### API Failure Scenarios

1. **DeepSeek API unavailable**
   - Fallback: Disable filter and log warning
   - Allow stories through unfiltered
   - Rationale: Better to show content than block everything

2. **Malformed API response**
   - Fallback: Treat all stories as "safe"
   - Log error for debugging

3. **Timeout**
   - Timeout after 15 seconds
   - Fallback to unfiltered results

## Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI inconsistency | Stories filtered differently on different days | Accept as trade-off; provide sensitivity control |
| Over-filtering | Legitimate stories blocked | Use `medium` sensitivity by default; user can lower |
| Under-filtering | Sensitive content gets through | Users can increase sensitivity level |
| API costs | Increased operational costs | Minimal cost; offset by translation savings |
| API rate limits | Filter may fail during high usage | Implement fallback to disabled state |

## Future Enhancements

Not included in this proposal, but possible future additions:
1. Filter article content and comments (in addition to titles)
2. Cache AI classification results to reduce API calls
3. Add manual override/whitelist capability
4. Provide admin UI to review filtered stories
5. Support multiple LLM providers (OpenAI, Claude, etc.)

## Dependencies

### External Dependencies
- DeepSeek API (already in use for translation)
- No new external dependencies required

### Internal Dependencies
- Leverages existing `translator` service infrastructure
- Uses existing `HNStory` data structures
- Compatible with existing cache mechanism

## Rollout Plan

1. **Phase 1**: Implement core filtering service
2. **Phase 2**: Integrate into fetch pipeline
3. **Phase 3**: Add configuration and tests
4. **Phase 4**: Update documentation
5. **Phase 5**: Validate with `openspec validate --strict`

## Approval Required

This proposal requires approval for:
1. Adding AI-based content filtering capability
2. Integration with DeepSeek API for content classification
3. Configuration changes to support filtering
4. Modification to story fetching pipeline

## Next Steps

After approval:
1. Create detailed spec deltas for `content-filtering` and `story-fetching`
2. Create `design.md` for implementation architecture
3. Create `tasks.md` with implementation steps
4. Implement `contentFilter` service
5. Integrate into `fetchFreshData()` pipeline
6. Add tests and documentation
7. Validate with `openspec validate --strict`
