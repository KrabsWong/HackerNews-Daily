# Design: add-hn-daily-cli

## Architecture Overview

This CLI tool follows a simple three-layer architecture:

```
┌─────────────────────────────────────────┐
│         CLI Interface (index.ts)         │
│  - Orchestration & User interaction      │
│  - Progress display & error handling     │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴───────┐
       │               │
       ▼               ▼
┌──────────────┐  ┌────────────────┐
│   HN API     │  │  Translation   │
│   Fetcher    │  │    Service     │
│ (api/        │  │ (services/     │
│  hackerNews) │  │  translator)   │
└──────────────┘  └────────────────┘
       │               │
       └───────┬───────┘
               ▼
        External APIs
  (HN API, DeepSeek API)
```

## Component Design

### 1. HN API Fetcher (src/api/hackerNews.ts)
**Purpose:** Abstracts all HackerNews API interactions

**Key Functions:**
- `fetchBestStories(): Promise<number[]>` - Get story IDs
- `fetchStoryDetails(id: number): Promise<Story | null>` - Get story data
- `filterByTime(stories: Story[], hours: number): Story[]` - Time filtering

**Design Decisions:**
- Use axios for HTTP requests (better error handling than native fetch)
- Return null for failed individual story fetches (fail gracefully)
- Implement 24-hour filtering client-side (HN API doesn't support time filters)
- Limit to 30 stories before fetching details (reduce API calls)

**Error Handling:**
- Network errors → throw descriptive error to be caught by CLI
- Invalid story data → skip story, log warning, continue
- Timeout → 10 second timeout per request

### 2. Translation Service (src/services/translator.ts)
**Purpose:** Handles all DeepSeek API translation logic

**Key Functions:**
- `init()` - Load and validate API key from env
- `translateTitle(title: string): Promise<string>` - Translate single title
- `translateBatch(titles: string[]): Promise<string[]>` - Process multiple titles

**Design Decisions:**
- Use DeepSeek Chat Completions API (not completion API)
- Prompt: "Translate this HackerNews title to Chinese. Only output the translation: {title}"
- Sequential translation (simpler than batching, sufficient for 30 stories)
- Fallback to original on error (preserve user experience)
- Cache API key after first load (avoid repeated env reads)

**Error Handling:**
- Missing API key → fail fast at startup
- Translation error → log warning, return original title
- Rate limit → retry once after 1 second delay

### 3. CLI Interface (src/index.ts)
**Purpose:** Orchestrate workflow and present results

**Workflow:**
```typescript
1. Load environment (.env file)
2. Validate configuration (API key exists)
3. Display "Fetching HackerNews stories..."
4. Fetch stories from HN API
5. Filter by 24h time window
6. Display "Translating titles..."
7. Translate each title sequentially
8. Display "Rendering results..."
9. Format as console table
10. Output table to terminal
```

**Table Format:**
```
┌──────┬────────────────────────┬────────────────────────┬────────┬─────────────────┐
│ Rank │ Title (Chinese)        │ Title (English)        │ Score  │ URL             │
├──────┼────────────────────────┼────────────────────────┼────────┼─────────────────┤
│ 1    │ 翻译的中文标题           │ Original English Title │ 342    │ https://...     │
└──────┴────────────────────────┴────────────────────────┴────────┴─────────────────┘
```

**Configuration:**
- Use `dotenv` to load .env file
- Required: `DEEPSEEK_API_KEY`
- Optional: `HN_STORY_LIMIT` (default: 30), `HN_TIME_WINDOW_HOURS` (default: 24)

## Technology Choices

### TypeScript over JavaScript
- **Rationale:** Type safety for API responses, better IDE support, catches errors early
- **Trade-off:** Requires build step, but worth it for maintainability

### Axios over Native Fetch
- **Rationale:** Better error handling, automatic JSON parsing, timeout support
- **Trade-off:** External dependency, but widely used and stable

### cli-table3 for Output
- **Rationale:** Well-maintained, flexible formatting, handles long text
- **Trade-off:** Could use simple console.log, but table improves readability

### Sequential Translation over Batching
- **Rationale:** Simpler implementation, sufficient performance for 30 stories
- **Trade-off:** Slower than batching, but DeepSeek API is fast (~100-200ms/request)
- **Future:** Can optimize to batching if speed becomes an issue

## Data Models

```typescript
interface HNStory {
  id: number;
  title: string;
  url?: string;
  score: number;
  time: number; // Unix timestamp
  type: string;
}

interface ProcessedStory {
  rank: number;
  titleChinese: string;
  titleEnglish: string;
  score: number;
  url: string;
}

interface TranslationRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
}

interface TranslationResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}
```

## Error Handling Strategy

1. **Fail Fast:** Configuration errors (missing API key) exit immediately
2. **Fail Gracefully:** Individual translation failures fallback to original
3. **Fail Informatively:** Network errors show actionable messages to user
4. **No Silent Failures:** All errors logged to console with context

## Performance Considerations

- **Target:** Complete execution in < 30 seconds for 30 stories
- **Bottleneck:** Translation API calls (~100-200ms each)
- **Optimization:** Could parallelize translations with Promise.all (future enhancement)
- **Acceptable:** Current sequential approach is simple and meets performance needs

## Security Considerations

- API key stored in .env (not committed to git)
- .env.example provided without actual keys
- No sensitive data logged to console
- HTTPS for all API calls

## Testing Strategy

**Unit Tests (Future):**
- Mock axios responses for HN API
- Mock DeepSeek API responses
- Test time filtering logic
- Test error handling paths

**Manual Testing (Initial):**
- Run with valid configuration
- Test with missing API key
- Test with network disconnected
- Test with invalid API key
- Verify table formatting with various title lengths

## Future Enhancements (Out of Current Scope)

- Caching translated titles (avoid re-translation)
- Support for multiple languages
- JSON output mode for scripting
- Interactive mode with story selection
- Background scheduling with cron
- Web UI for browsing history
