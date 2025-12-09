# Implementation Tasks

## 1. Configuration Setup

- [x] 1.1 Add `CRAWLER_API` configuration group to `src/config/constants.ts`
  - Add `BASE_URL` getter reading from `CRAWLER_API_URL` env var
  - Add `REQUEST_TIMEOUT` set to 10000ms (unified with default fetch timeout)
  - Add `ENABLED` getter checking if BASE_URL is set
  - Add JSDoc comments for each property

- [x] 1.1.1 Update `ARTICLE_FETCHER.REQUEST_TIMEOUT` to 10000ms
  - Increase from 5000ms to 10000ms for more forgiving timeout
  - Update JSDoc comment to reflect unified timeout strategy

- [x] 1.2 Add `BATCH_SIZE` to `ARTICLE_FETCHER` configuration in `src/config/constants.ts`
  - Set default to 5 articles per batch
  - Add JSDoc explaining rate limiting benefits
  - Document recommended range (3-5)

- [x] 1.3 Update `.env.example` with crawler API documentation
  - Add "Crawler API Configuration" section
  - Document `CRAWLER_API_URL` with example value
  - Explain purpose and optional nature
  - Add example: `https://tiny-crawl-production.up.railway.app`
  - Recommend disabling by default (commented out)

## 2. Crawler API Client Implementation

- [x] 2.1 Add `fetchWithCrawlerAPI()` helper function in `src/services/articleFetcher.ts`
  - Accept URL parameter
  - Check if crawler is enabled (CRAWLER_API.ENABLED)
  - Send POST request to `{CRAWLER_API.BASE_URL}/crawl`
  - Include JSON payload: `{"url": targetUrl}`
  - Set Content-Type: application/json
  - Use CRAWLER_API.REQUEST_TIMEOUT (10s)
  - Handle axios errors gracefully
  - Return markdown string or null on failure

- [x] 2.2 Parse crawler API response
  - Check for successful response (HTTP 200)
  - Parse JSON: `{success: boolean, url: string, markdown: string, timestamp: string}`
  - Extract and validate "markdown" field
  - Return null if success=false or markdown is empty
  - Log appropriate warnings for failures

## 3. Fallback Logic Integration

- [x] 3.1 Modify `fetchArticleMetadata()` function
  - Keep existing axios + Readability extraction as primary method
  - After primary extraction fails (fullContent is null), check if crawler is enabled
  - If enabled and no content extracted, call `fetchWithCrawlerAPI(url)`
  - If crawler returns markdown, set it as `fullContent`
  - If crawler also fails, continue with existing meta description fallback
  - Ensure return type remains `ArticleMetadata` unchanged

- [x] 3.2 Add decision logic for when to trigger crawler
  - Skip crawler if Readability extraction succeeded (fullContent is not null)
  - Skip crawler if meta description is available and fullContent is null (preserve existing behavior)
  - Only call crawler when both fullContent and description are null
  - Log when crawler fallback is triggered
  
## 3.3 Batch Processing Implementation

- [x] 3.3.1 Add `processBatch()` helper function in `src/services/articleFetcher.ts`
  - Accept urls array and batchSize parameter
  - Split URLs into batches using slice()
  - Process each batch sequentially (await each batch completion)
  - Within each batch, process URLs in parallel using Promise.allSettled
  - Log batch progress: `📦 Processing batch X/Y (N articles)...`
  - Collect and return all results

- [x] 3.3.2 Modify `fetchArticlesBatch()` to use batch processing
  - Replace direct Promise.allSettled with call to processBatch()
  - Pass ARTICLE_FETCHER.BATCH_SIZE as batch size
  - Preserve existing error handling (failed articles return null metadata)
  - Update function documentation to mention controlled concurrency

## 4. Error Handling and Logging

- [x] 4.1 Add comprehensive error logging
  - Log when crawler fallback is triggered: `"🕷️  Attempting crawler API fallback for ${url}"`
  - Log crawler success: `"✅ Crawler API retrieved ${chars} chars"`
  - Log crawler failure: `"⚠️  Crawler API failed for ${url}: ${error}"`
  - Log when crawler is skipped (not configured): Silently skip (no log spam)
  - Preserve existing warning logs for axios failures

- [x] 4.2 Ensure graceful degradation at all levels
  - Handle crawler timeout (10s) without blocking
  - Return null on any crawler error
  - Never throw exceptions from `fetchWithCrawlerAPI()`
  - Ensure `fetchArticleMetadata()` always returns ArticleMetadata even if all methods fail

- [x] 4.3 Add detailed progress logging with method labels
  - Log batch progress: `"📦 Processing batch X/Y (N articles)..."`
  - Log current URL being processed: `"📄 Fetching: ${url}"`
  - **Log extraction method explicitly**: `"🌐 Method: Default Fetch (Axios + Readability)"`
  - Log intermediate processing: `"🔍 Extracting content (this may take a few seconds)..."`
  - Log Readability extraction success: `"✅ Readability extracted ${chars} chars"`
  - Log Readability extraction failure: `"⚠️  Readability extraction failed for ${url}"`
  - Log meta description found: `"📝 Meta description found (${chars} chars)"`
  - **Log method switch**: `"🕷️  Switching to: Crawler Fallback"` or `"🕷️  Switching to: Crawler Fallback (due to fetch failure)"`
  - **Log completion with method**: `"✅ Completed: ${url} (Default Fetch)"` or `"✅ Completed: ${url} (Crawler Fallback)"`
  - Log no content case: `"⚠️  No content extracted for ${url}"`
  - Log complete fetch failure: `"❌ Failed to fetch article ${url}: ${error}"`
  - Use emoji icons for clear visual distinction of different states

## 5. Testing and Validation

- [x] 5.1 Manual testing with crawler API enabled
  - Test with URL that blocks axios (e.g., Cloudflare protected site)
  - Verify crawler fallback is triggered
  - Verify markdown content is extracted
  - Verify AI summary generation works with crawler-fetched content

- [x] 5.2 Manual testing with crawler API disabled
  - Test without `CRAWLER_API_URL` set
  - Verify existing behavior preserved
  - Verify no errors when crawler is not configured
  - Verify graceful fallback to meta description

- [x] 5.3 Test error scenarios
  - Test with invalid crawler API URL
  - Test with crawler API timeout
  - Test with crawler API returning error response
  - Verify all scenarios degrade gracefully

## 6. Documentation

- [x] 6.1 Update README.md
  - Add section about crawler API configuration
  - Explain how to set `CRAWLER_API_URL`
  - Document the fallback strategy (Readability → Meta Description → Crawler API)
  - Note that crawler is optional

- [x] 6.2 Add code comments
  - Document the multi-tier fallback strategy in `fetchArticleMetadata()`
  - Add comment explaining unified 10s timeout strategy
  - Add comment about the crawler API response format

## 7. Finalization

- [x] 7.1 Run full end-to-end test
  - Run `npm run fetch` with various story sets
  - Verify no regressions in existing functionality
  - Check console output for proper logging
  - Verify markdown export includes crawler-fetched content

- [x] 7.2 Code review self-check
  - Verify TypeScript strict mode compliance
  - Check for any magic numbers (all should be in constants)
  - Ensure consistent error handling patterns
  - Verify no breaking changes to existing interfaces
