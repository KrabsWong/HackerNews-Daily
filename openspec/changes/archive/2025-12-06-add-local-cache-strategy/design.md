# Design: Local Cache Strategy

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        src/index.ts                         │
│                      (Main Entry Point)                     │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    src/services/cache.ts                    │
│                      (Cache Service)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ - checkCache(): CachedData | null                   │   │
│  │ - saveCache(data: ProcessedStory[]): void           │   │
│  │ - isCacheValid(): boolean                           │   │
│  │ - clearCache(): void                                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────┬───────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────┐
│                     .cache/stories.json                     │
│                      (Cache Storage)                        │
│  {                                                          │
│    "timestamp": 1701849600000,                              │
│    "config": { "storyLimit": 30, "timeWindow": 24 },        │
│    "stories": [...]                                         │
│  }                                                          │
└─────────────────────────────────────────────────────────────┘
```

## Cache Flow

```
Start
  │
  ▼
┌─────────────────────┐
│ Parse CLI arguments │
│ (--no-cache flag?)  │
└─────────┬───────────┘
          │
          ▼
    ┌─────────────┐     Yes
    │ --no-cache? │──────────┐
    └─────┬───────┘          │
          │ No               │
          ▼                  │
┌─────────────────────┐      │
│ Check cache exists  │      │
│ and is valid        │      │
└─────────┬───────────┘      │
          │                  │
    ┌─────┴─────┐            │
    │           │            │
  Valid     Invalid/         │
    │       Missing          │
    ▼           │            │
┌─────────┐     │            │
│ Return  │     ▼            ▼
│ cached  │  ┌─────────────────────┐
│ data    │  │ Fetch from APIs     │
└─────────┘  │ (HN + DeepSeek)     │
             └─────────┬───────────┘
                       │
                       ▼
             ┌─────────────────────┐
             │ Save to cache       │
             └─────────┬───────────┘
                       │
                       ▼
             ┌─────────────────────┐
             │ Return fresh data   │
             └─────────────────────┘
```

## Cache File Structure

Location: `.cache/stories.json`

```typescript
interface CacheData {
  // Unix timestamp when cache was created
  timestamp: number;
  
  // Configuration used to generate this cache
  // Used to invalidate cache when config changes
  config: {
    storyLimit: number;
    timeWindowHours: number;
    summaryMaxLength: number;
  };
  
  // The cached processed stories
  stories: ProcessedStory[];
}
```

## Cache Invalidation Rules

Cache is considered **invalid** when:
1. Cache file does not exist
2. Cache file is corrupted (invalid JSON)
3. `timestamp + TTL < now` (TTL expired)
4. `config` differs from current configuration
5. `--no-cache` or `--refresh` flag is provided

## Constants Organization

```
src/config/
└── constants.ts
    ├── API_CONFIG
    │   ├── HN_API_BASE
    │   ├── DEEPSEEK_API_BASE
    │   └── REQUEST_TIMEOUTS
    │
    ├── STORY_LIMITS
    │   ├── MAX_STORY_LIMIT
    │   ├── WARN_THRESHOLD
    │   └── MAX_FETCH_LIMIT
    │
    ├── SUMMARY_CONFIG
    │   ├── DEFAULT_LENGTH
    │   ├── MIN_LENGTH
    │   └── MAX_LENGTH
    │
    ├── CACHE_CONFIG
    │   ├── DEFAULT_TTL_MINUTES
    │   ├── CACHE_DIR
    │   └── CACHE_FILE
    │
    └── SERVER_CONFIG
        └── DEFAULT_PORT
```

## Trade-offs

### File-based vs In-memory Cache
**Chosen: File-based**
- Pros: Persists across process restarts, simple implementation
- Cons: Slower than memory, file I/O overhead

### Single File vs Multiple Files
**Chosen: Single File**
- Pros: Simple cache invalidation, atomic updates
- Cons: All-or-nothing refresh, larger file size

### JSON vs Binary Format
**Chosen: JSON**
- Pros: Human-readable, easy debugging, native Node.js support
- Cons: Larger file size than binary

## Error Handling

1. **Cache read errors**: Log warning, proceed with fresh fetch
2. **Cache write errors**: Log warning, continue without caching
3. **Invalid cache format**: Delete corrupted cache, fetch fresh
