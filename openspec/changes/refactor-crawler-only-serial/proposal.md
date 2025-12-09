# Change: Refactor to Crawler-Only with Serial Processing

## Why

The current implementation uses JSDOM + Readability for local content extraction, with Crawler API as fallback. This approach has critical issues:

1. **JSDOM blocks the event loop**: JSDOM parsing is synchronous and can hang indefinitely on complex pages, blocking Node.js's event loop and preventing timeout mechanisms from working
2. **Parallel requests cause timeouts**: When 5 crawler API requests run in parallel, the crawler service gets overwhelmed and all requests timeout
3. **Unreliable extraction**: Local Readability extraction frequently fails on JavaScript-heavy sites, anti-crawling protected sites, and sites with complex DOM structures

The solution is to:
- Remove local JSDOM/Readability extraction entirely
- Use Crawler API exclusively for all content extraction
- Process articles serially (one at a time) to avoid overwhelming the crawler service
- Remove default content length limit to preserve full article content

## What Changes

- **BREAKING**: Remove JSDOM and Readability dependencies from articleFetcher.ts
- **BREAKING**: Remove local content extraction logic
- Use Crawler API as the sole content extraction method
- Change from parallel batch processing to serial processing (one URL at a time)
- Simplify code significantly (~150 lines vs ~300 lines)
- Add progress logging for each article
- **Change `MAX_CONTENT_LENGTH` default to 0 (no limit)**, while preserving the ability to set a limit if needed

## Impact

- **Affected specs:** 
  - `article-content-extraction` - complete rewrite of extraction strategy
  
- **Affected code:**
  - `src/services/articleFetcher.ts` - major refactor
  - `src/config/constants.ts` - change MAX_CONTENT_LENGTH default
  
- **User benefits:**
  - No more hanging on complex pages (crawler has its own timeout)
  - More reliable content extraction via headless browser
  - Clear progress indication (1/30, 2/30, etc.)
  - Predictable processing time
  - Full article content preserved (no truncation by default)

- **Trade-offs:**
  - Slower processing (serial vs parallel)
  - Requires `CRAWLER_API_URL` to be configured (no longer optional)
  - External dependency on crawler service

## Content Length Configuration

The `MAX_CONTENT_LENGTH` setting controls content truncation:

- **Default: 0 (no limit)** - Full article content is preserved
- **Set to positive value (e.g., 4000)** - Content will be truncated to that length

This allows flexibility for users who want to limit content size for API token optimization while defaulting to full content for better AI summarization quality.
