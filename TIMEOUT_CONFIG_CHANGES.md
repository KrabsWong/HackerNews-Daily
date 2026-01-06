# Timeout Configuration Centralization

## Summary

Centralized all timeout configurations into a single `TIMEOUT_CONFIG` constant in `config/constants.ts` for easier management and consistency.

## Changes

### New: TIMEOUT_CONFIG Constant

All timeout values are now defined in one place:

```typescript
export const TIMEOUT_CONFIG = {
  DEFAULT: 10000,              // Default timeout for generic HTTP requests
  HN_API: 10000,              // HackerNews API requests
  ALGOLIA_API: 10000,         // Algolia API requests
  LLM_API: 30000,             // LLM API requests (translation/summarization)
  ARTICLE_FETCH: 10000,       // Article fetcher requests
  CRAWLER_API: 10000,         // Crawler API requests
  CONTENT_FILTER: 15000,      // Content filter AI classification
  TELEGRAM_API: 30000,        // Telegram API requests
  GITHUB_API: 30000,          // GitHub API requests (reserved for future use)
} as const;
```

### Updated Files

1. **config/constants.ts**
   - Added `TIMEOUT_CONFIG` constant
   - Updated all API configuration constants to use `TIMEOUT_CONFIG`:
     - `HN_API.REQUEST_TIMEOUT` → `TIMEOUT_CONFIG.HN_API`
     - `DEEPSEEK_API.REQUEST_TIMEOUT` → `TIMEOUT_CONFIG.LLM_API`
     - `OPENROUTER_API.REQUEST_TIMEOUT` → `TIMEOUT_CONFIG.LLM_API`
     - `ZHIPU_API.REQUEST_TIMEOUT` → `TIMEOUT_CONFIG.LLM_API`
     - `ALGOLIA_HN_API.REQUEST_TIMEOUT` → `TIMEOUT_CONFIG.ALGOLIA_API`
     - `ARTICLE_FETCHER.REQUEST_TIMEOUT` → `TIMEOUT_CONFIG.ARTICLE_FETCH`
     - `CRAWLER_API.REQUEST_TIMEOUT` → `TIMEOUT_CONFIG.CRAWLER_API`
     - `CONTENT_FILTER_CONSTANTS.TIMEOUT` → `TIMEOUT_CONFIG.CONTENT_FILTER`

2. **utils/fetch.ts**
   - Imported `TIMEOUT_CONFIG`
   - `fetchJSON()` default timeout: `10000` → `TIMEOUT_CONFIG.DEFAULT`
   - `post()` default timeout: `10000` → `TIMEOUT_CONFIG.DEFAULT`

3. **services/articleFetcher/crawler.ts**
   - Imported `CRAWLER_API`
   - Timeout value: `10000` → `CRAWLER_API.REQUEST_TIMEOUT`

4. **worker/publishers/telegram/client.ts**
   - Removed local `REQUEST_TIMEOUT` constant
   - Imported `TIMEOUT_CONFIG`
   - Timeout value: `REQUEST_TIMEOUT` → `TIMEOUT_CONFIG.TELEGRAM_API`

## Benefits

1. **Centralized Management**: All timeout values in one location
2. **Consistency**: Same timeout for same type of operations
3. **Easy Adjustment**: Change timeout values in one place
4. **Type Safety**: Using `as const` ensures immutability
5. **Documentation**: Clear comments explain each timeout's purpose

## Usage Examples

### Using API-specific timeout

```typescript
import { HN_API } from '../config/constants';

fetch(url, { 
  timeout: HN_API.REQUEST_TIMEOUT  // 10000ms
});
```

### Using generic timeout

```typescript
import { TIMEOUT_CONFIG } from '../config/constants';

fetch(url, { 
  timeout: TIMEOUT_CONFIG.DEFAULT  // 10000ms
});
```

### Override timeout when needed

```typescript
// Use shorter timeout for specific case
fetch(url, { 
  timeout: 5000  // Override default
});
```

## Timeout Values Summary

| Service | Timeout | Reason |
|---------|---------|--------|
| Default | 10s | General HTTP requests |
| HN API | 10s | Fast API, usually responds quickly |
| Algolia API | 10s | Fast search API |
| LLM API | 30s | AI processing takes longer |
| Article Fetch | 10s | Balanced for speed and reliability |
| Crawler API | 10s | Content extraction service |
| Content Filter | 15s | AI classification processing |
| Telegram API | 30s | External service, may be slower |
| GitHub API | 30s | External service (reserved) |

## Migration

No breaking changes - all existing behavior preserved. The changes are internal refactoring only.

## Testing

- ✅ TypeScript compilation passes
- ✅ Worker build succeeds (815.87 KB)
- ✅ All fetch utility tests pass (27/27)
- ✅ Timeout behavior unchanged

## Future Improvements

Consider making timeouts configurable via environment variables:

```typescript
// Example: Allow override via env
export const TIMEOUT_CONFIG = {
  DEFAULT: parseInt(env.DEFAULT_TIMEOUT || '10000'),
  // ...
} as const;
```
