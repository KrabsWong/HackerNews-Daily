# Change: Add Fallback Crawler API for Content Extraction

## Why

The current article content extraction relies solely on direct HTTP requests with Axios. This approach frequently fails on sites with anti-crawling mechanisms, JavaScript-heavy content, or CAPTCHA challenges, resulting in missing article content and degraded AI summaries. Users see "暂无描述" (no description) for many articles when content extraction fails.

Adding a fallback to a dedicated crawler API (based on crawl4ai framework deployed on Railway) will significantly improve content extraction success rates and provide better summaries for users.

## What Changes

- Add new `CRAWLER_API` configuration constant with base URL and timeout settings (10s)
- Add `BATCH_SIZE` to `ARTICLE_FETCHER` configuration for controlled concurrency (default: 5)
- Implement fallback logic in `fetchArticleMetadata()` to try crawler API when initial axios fetch fails or returns insufficient content
- Add new helper function `fetchWithCrawlerAPI()` to call the external crawler service
- Parse markdown response from crawler API and extract content for AI summarization
- Ensure graceful degradation: if both methods fail, continue to return null without blocking the pipeline
- Add detailed logging to show current processing URL and extraction method used

## Impact

- **Affected specs:** 
  - `article-content-extraction` - adds new crawler API fallback requirement
  - `constants-config` - adds new CRAWLER_API configuration constant
  
- **Affected code:**
  - `src/services/articleFetcher.ts` - main logic changes and enhanced logging
  - `src/config/constants.ts` - new configuration constant
  
- **User benefits:**
  - Higher success rate for article content extraction
  - Better AI-generated summaries with more complete article content
  - Reduced "暂无描述" cases in daily reports
  - Clear visibility into which extraction method is being used (Readability vs Crawler API)
  - Real-time progress tracking showing current URL being processed

- **Dependencies:**
  - Requires `CRAWLER_API_URL` environment variable to be set (optional, disabled by default)
  - External dependency on Railway-deployed crawler service (tiny-crawl-production.up.railway.app)
  - Crawler service must be running and accessible when enabled

## Batch Processing for Rate Limiting

To avoid overwhelming target servers and prevent rate limiting issues, articles are now processed in controlled batches:

- **Configuration:** `ARTICLE_FETCHER.BATCH_SIZE = 5` (configurable in constants.ts)
- **Strategy:** Process 3-5 articles concurrently per batch, then move to next batch
- **Benefits:**
  - Prevents sudden traffic spikes to target servers
  - Reduces risk of being rate-limited or blocked
  - More polite crawling behavior (respects server resources)
  - Better memory management (limits concurrent JSDOM parsing)
  - Clear batch progress indicators in logs

### Batch Processing Example

```
Fetching and extracting article content...

📦 Processing batch 1/2 (5 articles)...

📄 Fetching: https://blog.jim-nielsen.com/2025/icons-in-menus/
  🌐 Method: Default Fetch (Axios + Readability)
📄 Fetching: https://example.com/article2
  🌐 Method: Default Fetch (Axios + Readability)
📄 Fetching: https://example.com/article3
  🌐 Method: Default Fetch (Axios + Readability)
📄 Fetching: https://example.com/article4
  🌐 Method: Default Fetch (Axios + Readability)
📄 Fetching: https://example.com/article5
  🌐 Method: Default Fetch (Axios + Readability)
  🔍 Extracting content (this may take a few seconds)...
  ✅ Readability extracted 4002 chars
  📝 Meta description found (82 chars)
  ✅ Completed: https://blog.jim-nielsen.com/2025/icons-in-menus/ (Default Fetch)
  ...

📦 Processing batch 2/2 (3 articles)...

📄 Fetching: https://example.com/article6
  🌐 Method: Default Fetch (Axios + Readability)
  ...
```

## Logging Improvements

Enhanced logging provides clear visibility into the extraction process:

- `📦 Processing batch X/Y (N articles)...` - Shows batch progress
- `📄 Fetching: {url}` - Shows which article is currently being processed
- `🌐 Method: Default Fetch (Axios + Readability)` - Explicitly shows initial method
- `🕷️  Switching to: Crawler Fallback` - Explicitly shows when crawler is triggered
- `🔍 Extracting content (this may take a few seconds)...` - Readability is working
- `✅ Readability extracted {chars} chars` - Successful Readability extraction
- `⚠️  Readability extraction failed for {url}` - Readability failed, will try fallback
- `📝 Meta description found ({chars} chars)` - Meta description available
- `⚠️  No meta description found` - No meta tags available
- `🕷️  Attempting crawler API fallback for {url}` - Crawler API is being tried
- `✅ Crawler API retrieved {chars} chars` - Crawler API succeeded
- `⚠️  Crawler API failed for {url}: {error}` - Crawler API failed
- `✅ Completed: {url} (Default Fetch)` - Success with default method
- `✅ Completed: {url} (Crawler Fallback)` - Success with crawler
- `⚠️  No content extracted for {url}` - All methods failed
- `❌ Failed to fetch article {url}: {error}` - Complete fetch failure

This gives users clear feedback about progress and helps debug extraction issues.

### Example Output - Default Fetch Success

```
Fetching and extracting article content...

📦 Processing batch 1/1 (3 articles)...

📄 Fetching: https://blog.jim-nielsen.com/2025/icons-in-menus/
  🌐 Method: Default Fetch (Axios + Readability)
📄 Fetching: https://example.com/article2
  🌐 Method: Default Fetch (Axios + Readability)
📄 Fetching: https://example.com/article3
  🌐 Method: Default Fetch (Axios + Readability)
  🔍 Extracting content (this may take a few seconds)...
  ✅ Readability extracted 4002 chars
  📝 Meta description found (82 chars)
  ✅ Completed: https://blog.jim-nielsen.com/2025/icons-in-menus/ (Default Fetch)
  🔍 Extracting content (this may take a few seconds)...
  ✅ Readability extracted 2145 chars
  📝 Meta description found (51 chars)
  ✅ Completed: https://example.com/article2 (Default Fetch)
  🔍 Extracting content (this may take a few seconds)...
  ✅ Readability extracted 3421 chars
  ✅ Completed: https://example.com/article3 (Default Fetch)
```

### Example Output - Crawler Fallback Triggered

```
📄 Fetching: https://difficult-site.com/article
  🌐 Method: Default Fetch (Axios + Readability)
  🔍 Extracting content (this may take a few seconds)...
  ⚠️  Readability extraction failed for https://difficult-site.com/article
  ⚠️  No meta description found
  🕷️  Switching to: Crawler Fallback
  🕷️  Attempting crawler API fallback for https://difficult-site.com/article
  ✅ Crawler API retrieved 3542 chars
  ✅ Completed: https://difficult-site.com/article (Crawler Fallback)
```

Users can now:
- See which batch is being processed and total progress (`batch 1/2`)
- See which URL is currently being processed (no more mystery hangs)
- **Know exactly which extraction method is being used** (`Default Fetch` vs `Crawler Fallback`)
- Understand when and why crawler fallback is triggered
- See completion status with the successful method explicitly labeled
- Debug issues by seeing exact failure points

### Known Limitations

**JSDOM Parsing Performance:**
- JSDOM (used by Readability) can be slow for complex HTML pages with lots of JavaScript/CSS
- Some pages may take 10-30 seconds to parse (especially large enterprise sites)
- This is a known limitation of server-side HTML parsing
- The `🔍 Extracting content...` message indicates active processing
- Articles are processed in parallel, so one slow page doesn't block others completely

**Recommended Solutions:**
1. For sites that consistently hang: Enable crawler API fallback (`CRAWLER_API_URL`)
2. Reduce `HN_STORY_LIMIT` for faster testing
3. Use `--no-cache` flag sparingly to avoid redundant slow processing
