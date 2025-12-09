# Design: Fallback Crawler API Integration

## Context

The current article content extraction pipeline uses Axios + Cheerio + Readability to fetch and parse article content. However, this approach fails frequently on modern websites with:

- Anti-crawling mechanisms (Cloudflare, bot detection)
- JavaScript-rendered content (SPA frameworks)
- CAPTCHA challenges
- Rate limiting and IP blocking

A Railway-deployed crawler service based on crawl4ai (available at `extra_asset/test_railway_deployment.py`) provides robust crawling capabilities that can bypass many of these obstacles by using a headless browser approach.

**Stakeholders:** End users viewing HackerNews daily reports, who currently see "暂无描述" for many articles.

**Constraints:**
- Must maintain backward compatibility (no breaking changes)
- Must not block the pipeline if crawler is unavailable
- Should be optional (graceful degradation if not configured)
- Must respect existing timeout patterns (don't slow down the pipeline)

## Goals / Non-Goals

**Goals:**
- Improve article content extraction success rate by 20-40%
- Provide seamless fallback without user-visible errors
- Maintain existing performance characteristics (don't significantly slow down batch processing)
- Keep configuration simple (single environment variable)

**Non-Goals:**
- Replace the existing Readability-based extraction (it's fast and works for many sites)
- Implement crawler service deployment or management (use existing Railway deployment)
- Add retry logic or complex error handling beyond basic timeout
- Support multiple crawler backends or services

## Decisions

### Decision 1: Three-Tier Fallback Strategy

**What:** Implement a cascade of three methods for content extraction:
1. **Primary:** Axios + Readability (fast, works for ~60% of sites)
2. **Secondary:** Meta description extraction (existing fallback, minimal data)
3. **Tertiary:** Crawler API (slow but comprehensive, for difficult sites)

**Why:** 
- Preserves existing fast path for sites that work with Readability
- Only uses expensive crawler when absolutely necessary
- Maintains graceful degradation at each level

**Alternatives considered:**
- **Always use crawler:** Rejected due to significant performance impact (10s timeout per article, even for easy sites)
- **Parallel execution of both methods:** Rejected due to wasted resources and complexity
- **Crawler as primary:** Rejected because Readability is faster and sufficient for most sites

### Decision 2: Use Environment Variable for Optional Configuration

**What:** Add `CRAWLER_API_URL` environment variable with runtime getter evaluation.

**Why:**
- Follows existing pattern for API configuration (DEEPSEEK_API, etc.)
- Allows users to opt-in by setting the variable
- Gracefully degrades if not set (no crawler, existing behavior)
- Easy to configure in different environments (local, production, CI)

**Alternatives considered:**
- **Hardcode URL:** Rejected due to inflexibility and coupling
- **Add multiple config options (retries, fallback strategy):** Rejected for simplicity (YAGNI)
- **Use feature flag library:** Rejected as overkill for single boolean flag

### Decision 3: Unified 10-Second Timeout for Both Methods

**What:** Set both `ARTICLE_FETCHER.REQUEST_TIMEOUT` and `CRAWLER_API.REQUEST_TIMEOUT` to 10000ms (10 seconds).

**Why:**
- If a request (either default fetch or crawler) can't complete within 10 seconds, it's not worth waiting longer
- Provides a reasonable balance between:
  - Giving slow servers/crawlers enough time to respond
  - Not making users wait too long for failed/slow requests
- Consistent timeout reduces complexity and user confusion
- Previous values (5s for default, 15s for crawler) were arbitrary; 10s is a sensible middle ground

**Impact:**
- Default fetch timeout increased from 5s to 10s (more forgiving for slow servers)
- Crawler timeout decreased from 15s to 10s (faster failure detection)
- Total worst-case time per article: ~10s (down from 15s with crawler, up from 5s without)

**Risks:**
- Some very slow sites may timeout that previously succeeded
- **Mitigation:** These are edge cases; the crawler is a fallback, not guaranteed success

**Alternatives considered:**
- **Keep 5s for default, 15s for crawler:** Rejected as unnecessarily complex
- **Use 15s for both:** Rejected as too long to wait for failed requests
- **Use 5s for both:** Rejected as too short for crawler operations

### Decision 4: Parse Markdown Response Directly

**What:** Accept markdown string from crawler API and use it as `fullContent` directly.

**Why:**
- Crawler API returns clean markdown format (via crawl4ai)
- Markdown is already optimized for LLM consumption (the target for AI summarization)
- No additional parsing or conversion needed
- Consistent with the "plain text for summarization" goal

**Alternatives considered:**
- **Request HTML from crawler and re-parse:** Rejected as unnecessary round-trip and processing
- **Convert markdown to plain text:** Rejected because markdown structure is useful for summarization
- **Request JSON-structured content:** Rejected because markdown is simpler and sufficient

### Decision 5: Trigger Crawler Only When Both Content and Description Fail

**What:** Call crawler API only if:
- `fullContent` is null (Readability failed)
- AND `description` is null (meta tags unavailable)

**Why:**
- Meta description alone is often sufficient for summarization
- Avoid wasting expensive crawler calls when we have some content
- Respect the existing fallback hierarchy (Readability → Meta → Crawler)

**Alternatives considered:**
- **Always call crawler if Readability fails:** Rejected because meta description is often good enough
- **Call crawler in parallel with Readability:** Rejected due to resource waste
- **Use content quality heuristic (e.g., length threshold):** Rejected for complexity; binary check is simpler

### Decision 6: Enhanced Logging with Emoji Icons and Method Labels

**What:** Add detailed logging at each extraction step showing:
- Batch progress (`📦 Processing batch X/Y`)
- Current URL being processed (📄)
- **Explicit extraction method** (`🌐 Default Fetch` vs `🕷️ Crawler Fallback`)
- Extraction method success/failure (✅/⚠️)
- Character counts for extracted content
- Completion status with successful method labeled

**Why:**
- Users reported confusion when process "hangs" during article fetching
- **Critical requirement**: Users need to know whether default fetch or crawler is being used
- No visibility into which article is being processed or which method is being used
- Difficult to debug when crawler API is triggered vs. standard extraction
- Character counts help validate extraction quality
- Batch progress shows overall pipeline advancement

**Implementation:**
- Use emoji icons for quick visual scanning (📦 📄 🌐 ✅ ⚠️ 🕷️ 📝 ❌)
- Log `🌐 Method: Default Fetch (Axios + Readability)` at start of each fetch
- Log `🕷️  Switching to: Crawler Fallback` when crawler is triggered
- Log completion with method: `✅ Completed: {url} (Default Fetch)` or `(Crawler Fallback)`
- Log at start of each URL fetch to show progress
- Log after each extraction attempt (success or failure)
- Include character counts to indicate content quality
- Use consistent 2-space indentation for extraction details

**Alternatives considered:**
- **Verbose logging with full content:** Rejected due to excessive output
- **Silent operation:** Rejected as users need progress feedback
- **Progress bar:** Rejected as requires additional complexity and doesn't show URLs
- **Method label only on failure:** Rejected as users want to see it always

### Decision 7: Batch Processing for Rate Limiting

**What:** Implement controlled batch processing where articles are fetched in groups of 3-5 concurrently (configurable via `ARTICLE_FETCHER.BATCH_SIZE = 5`), with batches processed sequentially.

**Why:**
- **Prevents server overload**: Sudden parallel requests to 30 URLs can trigger rate limiting or IP blocking
- **Reduces traffic spikes**: Distributes requests over time instead of all at once
- **Improves reliability**: Less likely to be flagged as bot/crawler by target servers
- **Better resource management**: Limits concurrent JSDOM parsing (memory-intensive)
- **More polite crawling**: Respects target server resources and bandwidth

**Implementation:**
- Split URL list into batches of size `BATCH_SIZE` (default: 5)
- Process each batch in parallel using `Promise.allSettled`
- Wait for current batch to complete before starting next batch
- Log batch progress: `📦 Processing batch 1/3 (5 articles)...`
- Preserve error handling (individual failures don't block batch)

**Performance Impact:**
- **Previous:** All 30 articles start simultaneously → potential rate limiting
- **Now:** 6 batches of 5 articles each → controlled load
- **Total time:** Similar or slightly longer, but more reliable
- **Example:** 30 articles = 6 batches × ~10-20s per batch = ~1-2 minutes total

**Alternatives considered:**
- **Fully sequential (1 at a time):** Rejected as too slow (would take 5-10 minutes for 30 articles)
- **Unlimited parallel:** Rejected due to rate limiting risks and memory concerns
- **Adaptive batch sizing:** Rejected for simplicity; fixed size is predictable
- **Batch size of 10+:** Rejected as still risks rate limiting on some servers

**Configuration Trade-offs:**
- `BATCH_SIZE = 3`: Most polite, slowest (good for aggressive rate limiters)
- `BATCH_SIZE = 5`: Balanced (recommended default)
- `BATCH_SIZE = 10`: Faster but higher rate limit risk

## Risks / Trade-offs

### Risk 1: Crawler Service Availability

**Risk:** External crawler service (Railway deployment) may be down or unreachable.

**Impact:** Medium - Articles will fall back to null content (same as current behavior).

**Mitigation:**
- Graceful degradation: return null if crawler fails
- Clear logging: warn when crawler is unavailable
- Optional configuration: system works without crawler

**Trade-off:** Accept dependency on external service for improved functionality vs. full self-contained solution.

### Risk 2: Increased Latency for Failed Articles

**Risk:** Articles requiring crawler fallback will take 15+ seconds to process.

**Impact:** Low - Crawler is only called after both primary methods fail, limiting frequency.

**Mitigation:**
- Use 10s timeout to balance speed and reliability
- Process articles in parallel within each batch
- Clear logging shows when crawler is being used
- Monitor and log crawler usage to track impact

**Trade-off:** Accept occasional slowness for specific difficult articles vs. missing content entirely.

### Risk 3: API Cost and Rate Limiting

**Risk:** Crawler API may have usage limits or costs (Railway hosting).

**Impact:** Low - Usage should be limited to <10% of articles (only difficult sites).

**Mitigation:**
- Only call when necessary (two-level fallback first)
- Environment variable allows disabling if costs become an issue
- Monitor crawler usage in logs

**Trade-off:** Accept potential costs for improved content extraction vs. free but less capable solution.

## Migration Plan

**Phase 1: Add Configuration (Day 1)**
1. Add `CRAWLER_API` constants to `src/config/constants.ts`
2. Update `.env.example` with documentation
3. No behavior changes yet (backward compatible)

**Phase 2: Implement Crawler Client (Day 1-2)**
1. Add `fetchWithCrawlerAPI()` helper function
2. Add unit-level manual testing
3. No integration yet (can be tested in isolation)

**Phase 3: Integrate Fallback Logic (Day 2)**
1. Modify `fetchArticleMetadata()` to call crawler on failure
2. Add logging for visibility
3. Test end-to-end with real articles

**Phase 4: Validation (Day 3)**
1. Test with crawler enabled (set `CRAWLER_API_URL`)
2. Test with crawler disabled (unset variable)
3. Test various failure scenarios
4. Verify no regressions

**Rollback:** 
- If issues arise, unset `CRAWLER_API_URL` to disable crawler fallback
- System reverts to existing behavior (Readability + Meta description)
- No code rollback needed due to feature flag design

## Open Questions

1. **Q:** Should we add retry logic for crawler API failures?
   **A:** No (for now). Single attempt is sufficient. Can add later if needed (YAGNI).

2. **Q:** Should we cache crawler API results to avoid repeated calls for same URL?
   **A:** No immediate need. The existing cache system caches the final processed stories. If crawler proves expensive, we can add URL-level caching later.

3. **Q:** Should we implement request queuing/throttling for crawler calls?
   **A:** No. Current batch processing with Promise.allSettled handles concurrency. Axios handles HTTP connection pooling. No custom queue needed.

4. **Q:** Should we add metrics/telemetry to track crawler usage?
   **A:** Not in initial implementation. Console logging is sufficient. Can add structured logging or metrics later if needed for monitoring.

5. **Q:** What if crawler API returns very large markdown (>10MB)?
   **A:** Current `MAX_CONTENT_LENGTH` (4000 chars) truncation applies to crawler results too. Truncation happens in AI summarization phase, protecting against oversized content.
