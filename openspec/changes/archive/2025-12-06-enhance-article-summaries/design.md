# Design Document: Enhance Article Summaries with Full Content Extraction and AI Summarization

## Overview
This change transforms the article summarization pipeline from simple meta description extraction to intelligent full-content extraction and AI-powered summarization, providing users with richer context about HackerNews articles.

## Architecture Changes

### Current Flow
```
URL → Fetch HTML → Extract meta tags → Translate → Display (max ~200 chars)
```

### New Flow
```
URL → Fetch HTML → Extract main content → Truncate → AI Summarize → Translate → Display (configurable, default 300 chars)
                    ↓ (fallback if extraction fails)
                    Extract meta tags → Translate → Display
```

## Component Design

### 1. Article Content Extraction (`articleFetcher.ts`)

**New Function: `extractArticleContent(html: string): string | null`**

**Approach**: Use `@mozilla/readability` library for smart content extraction
- Parses DOM and identifies main content using heuristics
- Removes navigation, ads, sidebars, footers automatically
- Returns cleaned plain text of article content

**Rationale for Readability**:
- Battle-tested library used by Firefox Reader Mode
- Works well with diverse site structures
- Lightweight and reliable
- Handles most edge cases (tables, code blocks, etc.)

**Alternatives Considered**:
1. ❌ **Regex-based extraction** - Too brittle, fails on varied HTML structures
2. ❌ **Custom heuristics** - Reinventing the wheel, high maintenance
3. ✅ **Mozilla Readability** - Proven, reliable, maintained

**Extraction Strategy**:
```typescript
1. Parse HTML with JSDOM (required by Readability)
2. Apply Readability algorithm to extract main content
3. Convert to plain text, strip excessive whitespace
4. Return null if extraction fails (triggers meta fallback)
```

**Content Truncation**:
- Limit extracted content to 4000 characters before summarization
- Prevents API token limit issues
- Still provides enough context for quality summaries

### 2. AI Summarization (`translator.ts`)

**New Function: `summarizeContent(content: string, maxLength: number): Promise<string>`**

**Prompt Engineering**:
```
Summarize the following article in Chinese. The summary should:
- Be approximately {maxLength} characters long
- Capture the main points and key insights
- Be written in clear, concise Chinese
- Focus on what readers need to know

Article content:
{content}
```

**Temperature**: 0.5 (balance between consistency and natural language)

**Model**: `deepseek-chat` (same as translation, already configured)

**Error Handling**:
- Retry once on rate limit (429)
- Fall back to meta description on failure
- Log warnings for debugging

### 3. Integration Updates (`index.ts`)

**Modified Pipeline**:
```typescript
1. Fetch article HTML (existing)
2. Try extract full content:
   - Success → Truncate → Summarize with AI → Translate summary
   - Failure → Extract meta → Translate meta (existing fallback)
3. Display results
```

**Progress Indicators**:
- "Extracting article content..." (new)
- "Generating AI summaries..." (new)
- "Translated X/Y summaries..." (updated)

### 4. Configuration

**New Environment Variable**:
- `SUMMARY_MAX_LENGTH` - Target length for AI summaries (default: 300)
- Range: 100-500 characters (enforce validation)
- Too short: Misses context
- Too long: Increases cost, reduces readability

## Performance Considerations

### Latency Analysis (per article):
- HTML fetch: ~500ms (existing)
- Content extraction: ~100-200ms (new, CPU-bound)
- AI summarization: ~1-2s (new, API-bound)
- Translation: ~500ms (existing)

**Total added latency**: ~1.5-2.5s per article

For 30 articles (sequential processing):
- Current: ~30-45s total
- New: ~75-105s total

**Mitigation**:
- Sequential processing already in place (avoids rate limits)
- User expectations set by progress indicators
- Quality improvement justifies latency trade-off

### Cost Analysis:
**Per article**:
- Content extraction: Free (local processing)
- AI summarization: ~0.0002 USD (estimate: 1000 tokens @ deepseek-chat pricing)
- Translation: ~0.0001 USD (existing)

**For 30 articles**:
- Existing: ~0.003 USD
- New: ~0.009 USD (~3x increase, still negligible)

## Error Handling Strategy

### Graceful Degradation Hierarchy:
1. **Ideal**: Full content → AI summary → Translation
2. **Fallback Level 1**: Meta description → Translation
3. **Fallback Level 2**: "暂无描述" (no description available)

### Specific Error Cases:

**Content Extraction Fails**:
- Log warning with URL
- Fall back to meta description extraction
- User sees standard meta description (existing behavior)

**AI Summarization Fails**:
- Log warning with error details
- Fall back to meta description extraction
- Retry once on rate limit (429)

**Translation Fails**:
- Use original English summary (existing behavior)
- Log warning

**HTML Fetch Fails**:
- Return null for description (existing behavior)
- Log warning

## Testing Strategy

### Unit Tests
- `extractArticleContent()` with various HTML structures
- `summarizeContent()` with different content lengths
- Truncation logic for long articles
- Configuration validation for SUMMARY_MAX_LENGTH

### Integration Tests
- End-to-end with real article URLs
- Fallback behavior when extraction fails
- Performance benchmarks (latency per article)

### Manual Testing
- Test with diverse HN article types:
  - Blog posts (rich content)
  - GitHub repos (structured content)
  - PDF links (extraction expected to fail → fallback)
  - Sites with paywalls (extraction may fail)
  - Short articles (< 100 chars)

## Dependencies

### New Dependencies:
```json
{
  "@mozilla/readability": "^0.5.0",
  "jsdom": "^23.0.0"
}
```

**Why JSDOM**:
- Required by Readability (needs DOM implementation)
- Standard, well-maintained library
- Headless DOM parsing (no browser needed)

## Configuration Validation

**SUMMARY_MAX_LENGTH validation**:
```typescript
function validateSummaryLength(length: number): number {
  if (isNaN(length) || length < 100) {
    console.warn('Invalid SUMMARY_MAX_LENGTH, using 300');
    return 300;
  }
  if (length > 500) {
    console.warn('SUMMARY_MAX_LENGTH too large, capping at 500');
    return 500;
  }
  return length;
}
```

## Migration Path

**Phase 1: Add content extraction (non-breaking)**
- Add new extraction logic
- Keep existing meta description as fallback
- No breaking changes

**Phase 2: Add AI summarization (opt-in)**
- Add summarization logic
- Could be feature-flagged via env var
- Users get richer summaries automatically

**Phase 3: Optimize based on feedback**
- Tune prompt engineering
- Adjust default summary length if needed
- Add caching if performance becomes issue

## Future Enhancements (Out of Scope)

1. **Caching**: Cache extracted content/summaries to avoid re-processing
2. **Parallel processing**: Batch summarization requests for better throughput
3. **Summary styles**: Support bullet points, longer summaries, etc.
4. **Multilingual**: Support non-English article extraction
5. **Intelligent truncation**: Use sliding window to capture most relevant sections

## Success Metrics

**Quantitative**:
- >80% of articles successfully extract full content
- Summaries average 280-320 characters (close to target)
- <10% increase in total runtime (<2.5s added per article)

**Qualitative**:
- Summaries provide more context than meta descriptions
- Users report better understanding of article content
- Fewer "暂无描述" instances
