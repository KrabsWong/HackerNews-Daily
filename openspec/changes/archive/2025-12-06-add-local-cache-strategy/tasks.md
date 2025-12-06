# Tasks: Add Local Cache Strategy

## Phase 1: Constants Consolidation

### Task 1.1: Create constants configuration file
- [x] Create `src/config/constants.ts`
- [x] Define `API_CONFIG` group with HackerNews and DeepSeek API settings
- [x] Define `STORY_LIMITS` group with story count constraints
- [x] Define `SUMMARY_CONFIG` group with summary length settings
- [x] Define `CONTENT_CONFIG` group with article extraction settings
- [x] Define `CACHE_CONFIG` group with cache settings (TTL, paths)
- [x] Define `SERVER_CONFIG` group with web server settings
- [x] Add comprehensive JSDoc comments for each constant

### Task 1.2: Migrate existing constants
- [x] Update `src/api/hackerNews.ts` to import from constants file
- [x] Update `src/services/translator.ts` to import from constants file
- [x] Update `src/services/articleFetcher.ts` to import from constants file
- [x] Update `src/index.ts` to import from constants file
- [x] Update `src/server/app.ts` to import from constants file
- [x] Remove duplicate constant definitions from all files

### Task 1.3: Verify constants migration
- [x] Run `npm run build` to verify no TypeScript errors
- [x] Run application to verify behavior unchanged
- [x] Search codebase for any remaining hardcoded values

## Phase 2: Cache Service Implementation

### Task 2.1: Create cache service
- [x] Create `src/services/cache.ts`
- [x] Implement `CacheData` interface with timestamp, config, and stories
- [x] Implement `getCachePath()` function
- [x] Implement `ensureCacheDir()` function
- [x] Implement `readCache()` function with error handling
- [x] Implement `writeCache()` function with error handling
- [x] Implement `isCacheValid()` function with TTL and config checks
- [x] Implement `clearCache()` function

### Task 2.2: Integrate cache into main flow
- [x] Add `--no-cache` and `--refresh` flag parsing to `parseArgs()`
- [x] Add cache check at start of `main()` function
- [x] Return cached data when valid cache exists
- [x] Save processed data to cache after successful fetch
- [x] Display appropriate messages for cache hit/miss

### Task 2.3: Add cache environment variables
- [x] Add `CACHE_TTL_MINUTES` to `.env.example` with default 30
- [x] Add `CACHE_ENABLED` to `.env.example` with default true
- [x] Document new environment variables in README.md

## Phase 3: Testing and Documentation

### Task 3.1: Update .gitignore
- [x] Add `.cache/` directory to `.gitignore`

### Task 3.2: Update README
- [x] Document cache feature and behavior
- [x] Document new CLI flags (`--no-cache`, `--refresh`)
- [x] Document new environment variables
- [x] Add troubleshooting section for cache issues

### Task 3.3: Manual testing
- [x] Test fresh fetch creates cache file
- [x] Test subsequent fetch uses cache
- [x] Test `--no-cache` flag bypasses cache
- [x] Test `--refresh` flag refreshes cache
- [x] Test cache expiration after TTL
- [x] Test `CACHE_ENABLED=false` disables caching
- [x] Test corrupted cache file recovery
- [x] Test web mode with caching

## Dependencies

```
Phase 1 (Constants) ──► Phase 2 (Cache) ──► Phase 3 (Docs)
```

- Phase 2 depends on Phase 1 (cache needs constants)
- Phase 3 depends on Phase 2 (docs need complete implementation)
- Tasks within each phase can be parallelized
