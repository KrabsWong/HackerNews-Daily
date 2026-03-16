# Design: jina.ai Crawler Integration

## Context

The current article content extraction uses a single Crawler API service. Users have requested support for jina.ai's Reader API (`r.jina.ai`) as an alternative that requires no self-hosted infrastructure.

**Stakeholders:** Users who want simpler setup without deploying a crawler service.

**Constraints:**
- Must maintain backward compatibility
- Must not break existing crawler functionality
- Should follow existing provider selection patterns (like LLM providers)
- jina.ai has rate limits (free tier: ~200 requests/minute)

## Goals / Non-Goals

**Goals:**
- Provide jina.ai as a zero-configuration alternative to self-hosted crawler
- Allow runtime selection via environment variable
- Maintain identical output format (ArticleMetadata) regardless of provider
- Handle jina.ai rate limits gracefully

**Non-Goals:**
- Support multiple crawlers simultaneously (only one active at a time)
- Implement automatic fallback between crawlers
- Add retry logic beyond basic error handling
- Support jina.ai search API (s.jina.ai) - only URL reading (r.jina.ai)

## Decisions

### Decision 1: Single Provider Selection

**What:** Use `CRAWLER_PROVIDER` environment variable with values `crawler` (default) or `jina`.

**Why:**
- Simple mental model: one active provider at a time
- Follows existing LLM provider pattern (`LLM_PROVIDER`)
- Avoids complexity of merging results from multiple sources
- Users can switch by changing one variable

**Alternatives considered:**
- **Multiple providers with fallback:** Rejected - adds complexity, unclear which result to use
- **Provider list/priority:** Rejected - overkill for current use case
- **Auto-selection:** Rejected - magic behavior, harder to debug

### Decision 2: Shared Output Format

**What:** Both providers return identical `ArticleMetadata` structure.

**Why:**
- Callers don't need to know which provider is being used
- Easy to switch providers without changing downstream code
- Consistent behavior from user perspective

**ArticleMetadata structure:**
```typescript
{
  url: string;
  description: string | null;  // First paragraph or meta description
  fullContent: string | null;  // Full markdown content
}
```

### Decision 3: jina.ai Content Processing

**What:** jina.ai returns markdown that has already been processed by Readability. We'll use it directly with minimal processing.

**Why:**
- jina.ai already extracts main content (removes ads, nav, etc.)
- No need for additional HTML parsing
- First paragraph extraction for description is sufficient

**Implementation:**
- Extract first paragraph (split on `\n\n`) for description
- Apply same truncation logic as crawler
- No additional filtering needed

### Decision 4: Error Handling Strategy

**What:** 
- HTTP errors: Return null content (same as current crawler)
- Rate limiting: Log warning, return null (user can retry)
- Network errors: Return null, log error

**Why:**
- Consistent with existing error handling patterns
- Graceful degradation allows processing to continue
- Logs help diagnose issues

### Decision 5: Configuration Pattern

**What:** Add provider selection to existing CrawlerConfig:

```typescript
interface CrawlerConfig {
  provider: 'crawler' | 'jina';  // NEW
  apiUrl?: string;               // Used when provider='crawler'
  apiToken?: string;             // Used when provider='crawler'
  enabled: boolean;
}
```

**Environment variables:**
- `CRAWLER_PROVIDER`: 'crawler' (default) or 'jina'
- Existing `CRAWLER_API_URL` and `CRAWLER_API_TOKEN` still used for crawler provider

**Why:**
- Extends existing config without breaking changes
- Provider field makes selection explicit
- Other fields become conditionally required based on provider

## Risks / Trade-offs

### Risk 1: jina.ai Rate Limits

**Risk:** Free tier has ~200 requests/minute limit. Processing 30 articles could hit limit.

**Impact:** Medium - articles may fail with 429 errors.

**Mitigation:**
- Serial processing (current behavior) helps spread requests
- Clear logging of rate limit errors
- Users can upgrade to paid tier or use self-hosted crawler

### Risk 2: Content Quality Differences

**Risk:** jina.ai and Crawler API may extract different content quality.

**Impact:** Low - both use similar readability algorithms.

**Mitigation:**
- Document differences in README
- Users can switch providers if unsatisfied

### Risk 3: Dependency on External Service

**Risk:** jina.ai service availability affects content extraction.

**Impact:** Medium - service downtime breaks extraction.

**Mitigation:**
- Easy provider switching via env var
- Self-hosted crawler remains as fallback option

## Migration Plan

**Phase 1: Implementation**
1. Add `CRAWLER_PROVIDER` to constants and types
2. Create `jina.ts` with fetch function
3. Refactor `metadata.ts` for provider selection
4. Update configuration builder

**Phase 2: Testing**
1. Test jina.ai provider with real URLs
2. Test crawler provider still works (backward compatibility)
3. Test error handling (rate limits, network errors)

**Phase 3: Documentation**
1. Update README with jina.ai option
2. Update configuration guide
3. Add example `.env` configurations

**Rollback:**
- Set `CRAWLER_PROVIDER=crawler` to revert to previous behavior
- No database or API changes - fully reversible

## Open Questions

1. **Q:** Should we add automatic retry for 429 rate limit errors?
   **A:** No for initial implementation. Can add later if needed.

2. **Q:** Should we cache jina.ai responses?
   **A:** No - current system doesn't cache crawler responses either.

3. **Q:** Should we support jina.ai authentication (for higher limits)?
   **A:** Not in initial implementation. jina.ai free tier doesn't require auth.
