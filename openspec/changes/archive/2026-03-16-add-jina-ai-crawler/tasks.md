# Tasks: Add jina.ai Crawler Integration

## 1. Configuration and Types

- [x] 1.1 Add `CrawlerProviderType` enum to `src/config/constants.ts`
  - Values: 'crawler' | 'jina'
  - Default: 'crawler'
  - Add `getCrawlerProvider()` function

- [x] 1.2 Update `CrawlerConfig` interface in `src/config/schema.ts`
  - Add `provider: CrawlerProviderType` field
  - Make `apiUrl` and `apiToken` optional (conditionally required)

- [x] 1.3 Update `Env` interface in `src/types/worker.ts`
  - Add `CRAWLER_PROVIDER?: string` environment variable

- [x] 1.4 Update configuration builder in `src/config/builder.ts`
  - Update `buildCrawlerConfig` to handle provider selection
  - Import and use `getCrawlerProvider()`

## 2. Jina.ai Implementation

- [x] 2.1 Create `src/services/articleFetcher/jina.ts`
  - Implement `fetchWithJinaAPI(url: string)` function
  - Returns `{ content: string | null; description: string | null }`
  - Handle errors gracefully (return null on failure)
  - Extract first paragraph as description
  - Apply truncation if configured
  - Add appropriate logging with emoji indicators

- [x] 2.2 Add JINA_API constants to `src/config/constants.ts`
  - `JINA_API.BASE_URL = 'https://r.jina.ai'`
  - `JINA_API.REQUEST_TIMEOUT = 10000`

## 3. Provider Abstraction

- [x] 3.1 Refactor `src/services/articleFetcher/metadata.ts`
  - Add `crawlerProvider` parameter to `fetchArticleMetadata()`
  - Add `crawlerProvider` parameter to `fetchArticlesBatch()`
  - Import both `fetchWithCrawlerAPI` and `fetchWithJinaAPI`
  - Route to appropriate provider based on parameter
  - Update logging to show which provider is being used

- [x] 3.2 Update `src/services/articleFetcher/index.ts`
  - Export new types/functions if needed

## 4. Integration Points

- [x] 4.1 Update `src/worker/sources/hackernews.ts`
  - Pass `crawlerProvider` from config to `fetchArticlesBatch()`
  - Get provider from `env.CRAWLER_PROVIDER`

- [x] 4.2 Update `src/services/task/executor.ts`
  - Pass `crawlerProvider` from config to `fetchArticlesBatch()`
  - Access via `this.env.CRAWLER_PROVIDER`

- [x] 4.3 Update `src/worker/statemachine/index.ts`
  - Log crawler provider in debug output (alongside CRAWLER_API_URL)

## 5. Testing

- [x] 5.1 Create unit tests for `fetchWithJinaAPI` in `src/__tests__/services/articleFetcher.test.ts`
  - Test successful fetch
  - Test error handling (404, 429, timeout)
  - Test description extraction
  - Test URL encoding

- [x] 5.2 Update existing crawler tests
  - Ensure backward compatibility (default provider = 'crawler')
  - Test provider selection logic

- [x] 5.3 Update mock environment in `src/__tests__/helpers/workerEnvironment.ts`
  - Add `CRAWLER_PROVIDER: 'crawler'` to default mock env

## 6. Documentation Update (REQUIRED)

- [x] 6.1 Update README.md
  - Add jina.ai as crawler option in features
  - Document `CRAWLER_PROVIDER` environment variable
  - Add example configurations for both providers

- [x] 6.2 Update `docs/configuration.md`
  - Document crawler provider selection
  - Explain when to use each provider
  - Document rate limits for jina.ai

- [x] 6.3 Update `.env.example` if exists
  - Add `CRAWLER_PROVIDER=jina` example
  - Document that jina.ai requires no additional tokens

- [x] 6.4 Update `wrangler.toml.example`
  - Add `CRAWLER_PROVIDER` to vars section
  - Add comment explaining provider options

## 7. Validation

- [x] 7.1 Run TypeScript compilation
  ```bash
  npx tsc --noEmit
  ```

- [x] 7.2 Run tests
  ```bash
  npm test
  ```

- [x] 7.3 Validate with openspec
  ```bash
  openspec validate add-jina-ai-crawler --strict
  ```

## 8. Manual Testing Checklist

- [ ] 8.1 Test jina.ai provider
  - Set `CRAWLER_PROVIDER=jina`
  - Run `/trigger-export-sync` endpoint
  - Verify articles are fetched successfully
  - Check logs show jina.ai being used

- [ ] 8.2 Test crawler provider (backward compatibility)
  - Set `CRAWLER_PROVIDER=crawler` (or unset)
  - Verify existing behavior unchanged

- [ ] 8.3 Test error handling
  - Test with invalid URL
  - Test with rate limit (if possible)
  - Verify graceful degradation
