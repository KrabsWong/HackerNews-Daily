# Implementation Tasks

## 1. Refactor articleFetcher.ts

- [x] 1.1 Remove JSDOM and Readability imports
- [x] 1.2 Remove `extractArticleContent()` function
- [x] 1.3 Simplify `fetchWithCrawlerAPI()` to return both content and description
- [x] 1.4 Rewrite `fetchArticleMetadata()` to only use Crawler API
- [x] 1.5 Change `processBatch()` to process URLs serially (one at a time)
- [x] 1.6 Add clear progress logging (X/Y format)

## 2. Update Configuration

- [x] 2.1 Update `.env.example` to indicate `CRAWLER_API_URL` is now required
- [x] 2.2 Add warning log if `CRAWLER_API_URL` is not configured
- [x] 2.3 Change `MAX_CONTENT_LENGTH` default to 0 (no limit)
- [x] 2.4 Update truncation logic to only apply when MAX_CONTENT_LENGTH > 0

## 3. Validation

- [x] 3.1 Run `npm run build` to verify TypeScript compilation
- [x] 3.2 Run `npm run fetch` to verify serial processing works
- [x] 3.3 Verify timeout handling works correctly
